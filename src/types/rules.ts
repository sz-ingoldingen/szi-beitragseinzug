import { z } from 'zod';

/**
 * Tarife für Einzelzahler.
 */
export interface SingleRates {
  adultActive: number;
  adultPassive: number;
  youthUnder18: number;
  defaultFallback: number;
}

/**
 * Tarife und Zuschläge im Familienverbund.
 */
export interface FamilyRates {
  basePayer: number;
  activePartner: number;
  passivePartner: number;
  firstActiveChild: number;
  subsequentActiveChild: number;
  passiveChild: number;
  youthUnder18: number;
}

/**
 * Spezielle Gebühren und Kautionen gem. Beitragsordnung.
 */
export interface SpecialFees {
  invoiceExtraCharge: number; // § 1 Abs. 4: Rechnungsgebühr (5 €)
  instrumentDeposit: number;  // § 4: Kaution (100 €)
}

/**
 * Schwellenwerte für Altersgrenzen.
 */
export interface AgeThresholds {
  youthExemptMaxAge: number; // In der Regel 18: Unter 18 beitragsfrei
  familyChildMaxAge: number; // In der Regel 25: Ab 25 eigene Mitgliedschaft (§ 2)
}

/**
 * Stichtag für Altersberechnungen.
 */
export interface TimingConfig {
  cutoffDay: number;   // 1 - 31 (Standard: 15)
  cutoffMonth: number; // 1 - 12 (Standard: 4 für April)
  comment?: string;
}

/**
 * Zuordnung von Mitgliedsstatus-Codes zu Berechnungskategorien.
 */
export interface StatusClassifications {
  activeCodes: string[];
  passiveCodes: string[];
  guestCodes: string[];
  honoraryCodes: string[];
}

/**
 * Befreiungs- und Ausnahme-Regelungen.
 */
export interface ExemptionsConfig {
  honoraryKeywords: string[];
  regularBoardIsPayable: boolean;
}

/**
 * Vollständiges Regelwerk für Beitragsberechnungen.
 */
export interface FeeRuleSet {
  $schema?: string;
  id: string;
  name: string;
  version: string;
  effectiveFrom: string;
  currency: string;
  description: string;
  isDefault?: boolean;
  filename?: string;
  isOfficial?: boolean;
  timing: TimingConfig;
  ageThresholds: AgeThresholds;
  rates: {
    single: SingleRates;
    family: FamilyRates;
    specialFees?: SpecialFees;
  };
  statusClassifications: StatusClassifications;
  exemptions: ExemptionsConfig;
}

/**
 * Zod-Schema zur strengen Validierung hochgeladener JSON-Regelwerke.
 */
export const feeRuleSetSchema = z.object({
  $schema: z.string().optional(),
  id: z.string().min(1, 'Eine ID für das Regelwerk ist erforderlich'),
  name: z.string().min(1, 'Ein Name für das Regelwerk ist erforderlich'),
  version: z.string().default('1.0.0'),
  effectiveFrom: z.string().default(''),
  currency: z.string().default('EUR'),
  description: z.string().default(''),
  isDefault: z.boolean().optional(),
  filename: z.string().optional(),
  isOfficial: z.boolean().optional(),

  timing: z.object({
    cutoffDay: z.number().int().min(1).max(31, 'Der Stichtag muss zwischen dem 1. und 31. liegen'),
    cutoffMonth: z.number().int().min(1).max(12, 'Der Stichtags-Monat muss zwischen 1 (Januar) und 12 (Dezember) liegen'),
    comment: z.string().optional(),
  }).default({
    cutoffDay: 15,
    cutoffMonth: 4,
    comment: 'Stichtag 15. April',
  }),

  ageThresholds: z.object({
    youthExemptMaxAge: z.number().int().min(0).max(30, 'Volljährigkeitsgrenze muss zwischen 0 und 30 liegen'),
    familyChildMaxAge: z.number().int().min(1).max(40, 'Familienkinder-Höchstalter muss zwischen 1 und 40 liegen'),
  }).refine(data => data.youthExemptMaxAge <= data.familyChildMaxAge, {
    message: 'Das Familienkinder-Höchstalter darf nicht kleiner als die Volljährigkeitsgrenze sein',
    path: ['familyChildMaxAge'],
  }),

  rates: z.object({
    single: z.object({
      adultActive: z.number().min(0, 'Betrag darf nicht negativ sein'),
      adultPassive: z.number().min(0, 'Betrag darf nicht negativ sein'),
      youthUnder18: z.number().min(0, 'Betrag darf nicht negativ sein').default(0),
      defaultFallback: z.number().min(0, 'Betrag darf nicht negativ sein').default(12.0),
    }),
    family: z.object({
      basePayer: z.number().min(0, 'Familiensockel darf nicht negativ sein'),
      activePartner: z.number().min(0, 'Partnerbeitrag darf nicht negativ sein'),
      passivePartner: z.number().min(0, 'Partnerbeitrag darf nicht negativ sein').default(0),
      firstActiveChild: z.number().min(0, 'Beitrag für 1. Kind darf nicht negativ sein'),
      subsequentActiveChild: z.number().min(0, 'Beitrag für Folgekinder darf nicht negativ sein').default(0),
      passiveChild: z.number().min(0, 'Beitrag für passives Kind darf nicht negativ sein').default(0),
      youthUnder18: z.number().min(0, 'Beitrag für U18 darf nicht negativ sein').default(0),
    }),
    specialFees: z.object({
      invoiceExtraCharge: z.number().min(0).default(5.0),
      instrumentDeposit: z.number().min(0).default(100.0),
    }).optional().default({
      invoiceExtraCharge: 5.0,
      instrumentDeposit: 100.0,
    }),
  }),

  statusClassifications: z.object({
    activeCodes: z.array(z.string()).default([]),
    passiveCodes: z.array(z.string()).default([]),
    guestCodes: z.array(z.string()).default([]),
    honoraryCodes: z.array(z.string()).default([]),
  }).default({
    activeCodes: ['active', 'premium', 'limited', 'twen', 'teen', 'child', 'infant'],
    passiveCodes: ['passive', 'pprem', 'plimit', 'pinfant', 'pkid', 'pteen', 'ptwen', 'senior'],
    guestCodes: ['guest', 'gprem', 'glimit', 'ginfant', 'gkid', 'gteen', 'gtwen'],
    honoraryCodes: ['sponsor', 'ehrenmitglied', 'honorary'],
  }),

  exemptions: z.object({
    honoraryKeywords: z.array(z.string()).default([]),
    regularBoardIsPayable: z.boolean().default(true),
  }).default({
    honoraryKeywords: [
      'ehren',
      'honorary',
      'ehrenvorstand',
      'ehrendirigent',
      'ehrenmitglied',
      'ehrenamtsinhaber',
      'ehrenvorsitz',
    ],
    regularBoardIsPayable: true,
  }),
});

/**
 * Offizielles Standard-Regelwerk des Schalmeienzugs Ingoldingen e.V.
 * Entspricht exakt der Beitragsordnung vom 05.04.2025 (1:1 Abbildung der bestehenden Logik).
 */
export const DEFAULT_SZI_RULES: FeeRuleSet = {
  $schema: 'https://szi-ingoldingen.de/schemas/fee-rules-v1.json',
  id: 'szi-standard-2025',
  name: 'SZI Beitragsordnung (Stand 05.04.2025)',
  version: '1.0.0',
  effectiveFrom: '2025-04-05',
  currency: 'EUR',
  description: 'Offizielle Beitragsordnung gem. Generalversammlungsbeschluss vom 05.04.2025',

  timing: {
    cutoffDay: 15,
    cutoffMonth: 4, // 4 = April (im Date-Objekt 4 - 1 = 3)
    comment: 'Stichtag für Altersberechnungen ist der 15. April des laufenden Jahres',
  },

  ageThresholds: {
    youthExemptMaxAge: 18,
    familyChildMaxAge: 25,
  },

  rates: {
    single: {
      adultActive: 25.0,
      adultPassive: 12.0,
      youthUnder18: 0.0,
      defaultFallback: 12.0,
    },
    family: {
      basePayer: 20.0,
      activePartner: 10.0,
      passivePartner: 0.0,
      firstActiveChild: 10.0,
      subsequentActiveChild: 0.0,
      passiveChild: 0.0,
      youthUnder18: 0.0,
    },
    specialFees: {
      invoiceExtraCharge: 5.0,
      instrumentDeposit: 100.0,
    },
  },

  statusClassifications: {
    activeCodes: [
      'active',
      'premium',
      'limited',
      'twen',
      'teen',
      'child',
      'infant',
    ],
    passiveCodes: [
      'passive',
      'pprem',
      'plimit',
      'pinfant',
      'pkid',
      'pteen',
      'ptwen',
      'senior',
    ],
    guestCodes: [
      'guest',
      'gprem',
      'glimit',
      'ginfant',
      'gkid',
      'gteen',
      'gtwen',
    ],
    honoraryCodes: [
      'sponsor',
      'ehrenmitglied',
      'honorary',
    ],
  },

  exemptions: {
    honoraryKeywords: [
      'ehren',
      'honorary',
      'ehrenvorstand',
      'ehrendirigent',
      'ehrenmitglied',
      'ehrenamtsinhaber',
      'ehrenvorsitz',
    ],
    regularBoardIsPayable: true,
  },
};
