import Papa from 'papaparse';
import { ContributionResult, PayerGroup } from './sepaCalculator';
import { FeeRuleSet } from '../types/rules';

export type DeltaStatus = 'increased' | 'decreased' | 'unchanged' | 'new' | 'removed';

export interface MemberDelta {
  memberId: string;
  fullName: string;
  targetFee: number;
  baselineFee: number;
  deltaFee: number;
  targetReason: string;
  baselineReason: string;
}

export interface PayerDelta {
  payerId: string;
  payerName: string;
  targetAmount: number;
  baselineAmount: number;
  deltaAmount: number;
  status: DeltaStatus;
  memberCount: number;
  memberDeltas: MemberDelta[];
}

export interface ComparisonSummary {
  targetTotalAmount: number;
  baselineTotalAmount: number;
  deltaTotalAmount: number;
  percentageDelta: number;
  increasedCount: number;
  decreasedCount: number;
  unchangedCount: number;
  newPayersCount: number;
  removedPayersCount: number;
  payerDeltas: Map<string, PayerDelta>;
}

/**
 * Vergleicht zwei Berechnungsergebnisse (z. B. Ziel-Regelwerk vs. Referenz/Baseline).
 */
export function compareContributionResults(
  target: ContributionResult,
  baseline: ContributionResult
): ComparisonSummary {
  const targetMap = new Map<string, PayerGroup>();
  target.payerGroups.forEach(g => targetMap.set(g.payerId, g));

  const baselineMap = new Map<string, PayerGroup>();
  baseline.payerGroups.forEach(g => baselineMap.set(g.payerId, g));

  const allPayerIds = new Set<string>([...targetMap.keys(), ...baselineMap.keys()]);
  const payerDeltas = new Map<string, PayerDelta>();

  let targetTotalAmount = 0;
  let baselineTotalAmount = 0;
  let increasedCount = 0;
  let decreasedCount = 0;
  let unchangedCount = 0;
  let newPayersCount = 0;
  let removedPayersCount = 0;

  allPayerIds.forEach(payerId => {
    const targetGroup = targetMap.get(payerId);
    const baselineGroup = baselineMap.get(payerId);

    const targetAmount = targetGroup ? targetGroup.totalAmount : 0;
    const baselineAmount = baselineGroup ? baselineGroup.totalAmount : 0;
    const deltaAmount = Math.round((targetAmount - baselineAmount) * 100) / 100;

    targetTotalAmount += targetAmount;
    baselineTotalAmount += baselineAmount;

    let status: DeltaStatus = 'unchanged';
    if (!baselineGroup && targetGroup) {
      status = 'new';
      newPayersCount++;
    } else if (baselineGroup && !targetGroup) {
      status = 'removed';
      removedPayersCount++;
    } else if (deltaAmount > 0.001) {
      status = 'increased';
      increasedCount++;
    } else if (deltaAmount < -0.001) {
      status = 'decreased';
      decreasedCount++;
    } else {
      status = 'unchanged';
      unchangedCount++;
    }

    // Ermittle Mitgliederebene-Deltas
    const memberDeltas: MemberDelta[] = [];
    const targetMembers = new Map(targetGroup?.members.map(m => [m.id, m]));
    const baselineMembers = new Map(baselineGroup?.members.map(m => [m.id, m]));
    const memberIds = new Set([...targetMembers.keys(), ...baselineMembers.keys()]);

    memberIds.forEach(mId => {
      const tm = targetMembers.get(mId);
      const bm = baselineMembers.get(mId);
      const tFee = tm ? tm.fee : 0;
      const bFee = bm ? bm.fee : 0;
      const dFee = Math.round((tFee - bFee) * 100) / 100;

      memberDeltas.push({
        memberId: mId,
        fullName: tm?.fullName || bm?.fullName || mId,
        targetFee: tFee,
        baselineFee: bFee,
        deltaFee: dFee,
        targetReason: tm?.reason || 'Nicht in Gruppe',
        baselineReason: bm?.reason || 'Nicht in Gruppe',
      });
    });

    payerDeltas.set(payerId, {
      payerId,
      payerName: targetGroup?.payerName || baselineGroup?.payerName || payerId,
      targetAmount,
      baselineAmount,
      deltaAmount,
      status,
      memberCount: targetGroup?.memberCount || baselineGroup?.memberCount || 0,
      memberDeltas,
    });
  });

  const deltaTotalAmount = Math.round((targetTotalAmount - baselineTotalAmount) * 100) / 100;
  const percentageDelta = baselineTotalAmount > 0
    ? Math.round((deltaTotalAmount / baselineTotalAmount) * 1000) / 10
    : 0;

  return {
    targetTotalAmount,
    baselineTotalAmount,
    deltaTotalAmount,
    percentageDelta,
    increasedCount,
    decreasedCount,
    unchangedCount,
    newPayersCount,
    removedPayersCount,
    payerDeltas,
  };
}

/**
 * Generiert eine erweiterte Prüf- und Vergleichs-CSV für Generalversammlungen und Vorstandssitzungen.
 */
export function generateComparisonAuditCsv(
  target: ContributionResult,
  baseline: ContributionResult,
  targetName = 'Neuer Tarif',
  baselineName = 'Referenz / Bisher'
): string {
  const summary = compareContributionResults(target, baseline);
  const headers = [
    'Zahler-ID',
    'Zahler-Name',
    'IBAN',
    'Mitglieds-ID',
    'Mitglieds-Name',
    'Status',
    'Alter',
    `Beitrag (${targetName})`,
    `Beitrag (${baselineName})`,
    'Differenz (€)',
    `Begründung (${targetName})`,
    `Begründung (${baselineName})`,
  ];

  const rows: (string | number)[][] = [];

  summary.payerDeltas.forEach(pDelta => {
    const targetGroup = target.payerGroups.find(g => g.payerId === pDelta.payerId);
    const iban = targetGroup?.iban || '';

    pDelta.memberDeltas.forEach(mDelta => {
      const tm = targetGroup?.members.find(m => m.id === mDelta.memberId);
      const sign = mDelta.deltaFee > 0 ? '+' : '';

      rows.push([
        pDelta.payerId,
        pDelta.payerName,
        iban,
        mDelta.memberId,
        mDelta.fullName,
        tm?.status || '',
        tm?.age ?? '',
        mDelta.targetFee.toFixed(2).replace('.', ','),
        mDelta.baselineFee.toFixed(2).replace('.', ','),
        `${sign}${mDelta.deltaFee.toFixed(2).replace('.', ',')}`,
        mDelta.targetReason,
        mDelta.baselineReason,
      ]);
    });
  });

  return Papa.unparse({
    fields: headers,
    data: rows,
  }, {
    delimiter: ';',
  });
}

/**
 * Prüft, ob zwei Regelwerke inhaltlich bzgl. aller Berechnungsparameter identisch sind
 * (Tarife, Altersgrenzen, Stichtag, Status-Codes, Ausnahmen).
 * Metadaten wie ID, Name, Beschreibung oder Version werden ignoriert.
 */
export function areRuleSetsEqual(a?: FeeRuleSet | null, b?: FeeRuleSet | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  const extractCalcCore = (rules: FeeRuleSet) => ({
    timing: {
      cutoffDay: rules.timing?.cutoffDay ?? 15,
      cutoffMonth: rules.timing?.cutoffMonth ?? 4,
    },
    ageThresholds: {
      youthExemptMaxAge: rules.ageThresholds?.youthExemptMaxAge ?? 18,
      familyChildMaxAge: rules.ageThresholds?.familyChildMaxAge ?? 25,
    },
    rates: {
      single: {
        adultActive: rules.rates?.single?.adultActive,
        adultPassive: rules.rates?.single?.adultPassive,
        youthUnder18: rules.rates?.single?.youthUnder18 ?? 0,
        defaultFallback: rules.rates?.single?.defaultFallback ?? 12,
      },
      family: {
        basePayer: rules.rates?.family?.basePayer,
        activePartner: rules.rates?.family?.activePartner,
        passivePartner: rules.rates?.family?.passivePartner ?? 0,
        firstActiveChild: rules.rates?.family?.firstActiveChild,
        subsequentActiveChild: rules.rates?.family?.subsequentActiveChild ?? 0,
        passiveChild: rules.rates?.family?.passiveChild ?? 0,
        youthUnder18: rules.rates?.family?.youthUnder18 ?? 0,
      },
      specialFees: {
        invoiceExtraCharge: rules.rates?.specialFees?.invoiceExtraCharge ?? 5,
        instrumentDeposit: rules.rates?.specialFees?.instrumentDeposit ?? 100,
      },
    },
    statusClassifications: {
      activeCodes: [...(rules.statusClassifications?.activeCodes || [])].map(s => s.toLowerCase().trim()).sort(),
      passiveCodes: [...(rules.statusClassifications?.passiveCodes || [])].map(s => s.toLowerCase().trim()).sort(),
      guestCodes: [...(rules.statusClassifications?.guestCodes || [])].map(s => s.toLowerCase().trim()).sort(),
      honoraryCodes: [...(rules.statusClassifications?.honoraryCodes || [])].map(s => s.toLowerCase().trim()).sort(),
    },
    exemptions: {
      honoraryKeywords: [...(rules.exemptions?.honoraryKeywords || [])].map(s => s.toLowerCase().trim()).sort(),
      regularBoardIsPayable: rules.exemptions?.regularBoardIsPayable ?? true,
    },
  });

  return JSON.stringify(extractCalcCore(a)) === JSON.stringify(extractCalcCore(b));
}

