import Papa from 'papaparse';

export interface Member {
  rowIndex: number;
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  status: string;
  birthDate: string;
  age: number | null;
  accountHolder: string;
  iban: string;
  bic: string;
  sepaMandate: string;
  signatureDate: string;
  parent1: string;
  parent2: string;
  partner: string;
  famPayerFlag: string;
  famMemberFlag: string;
  boardFunction: string;
  clubFunction: string;
  otherFunction: string;
  maskGroup: string;
  danceGroup: string;
  comment: string;
  resignedDate?: string;
  raw: string[];
}

export interface CalculatedMember extends Member {
  fee: number;
  reason: string;
}

export interface PayerGroup {
  payerId: string;
  payerName: string;
  iban: string;
  bic: string;
  mandate: string;
  signatureDate: string;
  totalAmount: number;
  memberCount: number;
  members: CalculatedMember[];
  isFamily: boolean;
  errors: string[];
  warnings: string[];
  isValid: boolean;
  selectedForExport: boolean;
}

export interface UnassignedMember extends Member {
  issue: string;
}

export interface InactiveMember extends Member {
  inactiveType: 'resigned' | 'deceased';
  reasonText: string;
}

export interface ContributionResult {
  payerGroups: PayerGroup[];
  unassignedMembers: UnassignedMember[];
  inactiveMembers: InactiveMember[];
}

/**
 * Alle 26 möglichen Mitglieder-Status-Codes aus der Vereinsverwaltung (ClubDesk).
 */
export const MemberStatus = {
  // Aktive Mitglieder
  ACTIVE: 'active',
  PREMIUM: 'premium', // Aktiv (50%)
  LIMITED: 'limited', // Aktiv (Limitiert)
  TWEN: 'twen', // Jungaktiv
  TEEN: 'teen', // Jugend
  CHILD: 'child', // Kind
  INFANT: 'infant', // Kleinkind

  // Passive Mitglieder
  PASSIVE: 'passive', // Passiv
  PPREM: 'pprem', // Passiv (Premium)
  PLIMIT: 'plimit', // Passiv (Limitiert)
  PTWEN: 'ptwen', // Passiv (Jungaktiv)
  PTEEN: 'pteen', // Passiv (Jugend)
  PKID: 'pkid', // Passiv (Kind)
  PINFANT: 'pinfant', // Passiv (Kleinkind)
  SENIOR: 'senior', // Rentner

  // Gast-Mitglieder
  GUEST: 'guest', // Gast
  GPREM: 'gprem', // Gast (Premium)
  GLIMIT: 'glimit', // Gast (Limitiert)
  GTWEN: 'gtwen', // Gast (Jungaktiv)
  GTEEN: 'gteen', // Gast (Jugend)
  GKID: 'gkid', // Gast (Kind)
  GINFANT: 'ginfant', // Gast (Kleinkind)

  // Ehrenmitglied
  SPONSOR: 'sponsor', // In der Vereinsverwaltung als "Ehrenmitglied" hinterlegt

  // Temporär / Inaktiv
  TEMP: 'temp', // Temporär
  RESIGNED: 'resigned', // Ausgeschieden
  DECEASED: 'deceased', // Verstorben
} as const;

export type MemberStatusCode = (typeof MemberStatus)[keyof typeof MemberStatus] | string;

/**
 * TypeScript Enum-Äquivalent für MemberStatus.
 */
export enum MemberStatusEnum {
  PREMIUM = 'premium',
  ACTIVE = 'active',
  LIMITED = 'limited',
  INFANT = 'infant',
  CHILD = 'child',
  TEEN = 'teen',
  TWEN = 'twen',
  PASSIVE = 'passive',
  PPREM = 'pprem',
  PLIMIT = 'plimit',
  PINFANT = 'pinfant',
  PKID = 'pkid',
  PTEEN = 'pteen',
  PTWEN = 'ptwen',
  GUEST = 'guest',
  GPREM = 'gprem',
  GLIMIT = 'glimit',
  GINFANT = 'ginfant',
  GKID = 'gkid',
  GTEEN = 'gteen',
  GTWEN = 'gtwen',
  SENIOR = 'senior',
  SPONSOR = 'sponsor',
  TEMP = 'temp',
  RESIGNED = 'resigned',
  DECEASED = 'deceased',
}

/**
 * Klarnamen / Labels aller 26 Status-Codes gem. offizieller Konfiguration.
 */
export const MEMBER_STATUS_LABELS: Record<string, string> = {
  [MemberStatus.PREMIUM]: 'Aktiv (50%)',
  [MemberStatus.ACTIVE]: 'Aktiv',
  [MemberStatus.LIMITED]: 'Aktiv (Limitiert)',
  [MemberStatus.INFANT]: 'Kleinkind',
  [MemberStatus.CHILD]: 'Kind',
  [MemberStatus.TEEN]: 'Jugend',
  [MemberStatus.TWEN]: 'Jungaktiv',

  [MemberStatus.PASSIVE]: 'Passiv',
  [MemberStatus.PPREM]: 'Passiv (Premium)',
  [MemberStatus.PLIMIT]: 'Passiv (Limitiert)',
  [MemberStatus.PINFANT]: 'Passiv (Kleinkind)',
  [MemberStatus.PKID]: 'Passiv (Kind)',
  [MemberStatus.PTEEN]: 'Passiv (Jugend)',
  [MemberStatus.PTWEN]: 'Passiv (Jungaktiv)',
  [MemberStatus.SENIOR]: 'Rentner',

  [MemberStatus.GUEST]: 'Gast',
  [MemberStatus.GPREM]: 'Gast (Premium)',
  [MemberStatus.GLIMIT]: 'Gast (Limitiert)',
  [MemberStatus.GINFANT]: 'Gast (Kleinkind)',
  [MemberStatus.GKID]: 'Gast (Kind)',
  [MemberStatus.GTEEN]: 'Gast (Jugend)',
  [MemberStatus.GTWEN]: 'Gast (Jungaktiv)',

  [MemberStatus.SPONSOR]: 'Ehrenmitglied',
  [MemberStatus.TEMP]: 'Temporär',
  [MemberStatus.RESIGNED]: 'Ausgeschieden',
  [MemberStatus.DECEASED]: 'Verstorben',
};

/**
 * Status-Codes aktiver Musiker / Mitwirkender.
 */
export const ACTIVE_STATUS_CODES: ReadonlySet<string> = new Set([
  MemberStatus.ACTIVE,
  MemberStatus.PREMIUM,
  MemberStatus.LIMITED,
  MemberStatus.TWEN,
  MemberStatus.TEEN,
  MemberStatus.CHILD,
  MemberStatus.INFANT,
]);

/**
 * Status-Codes erwachsener Aktiver (Vollbeitrag 25 € als Einzelzahler).
 */
export const ADULT_ACTIVE_STATUS_CODES: ReadonlySet<string> = new Set([
  MemberStatus.ACTIVE,
  MemberStatus.PREMIUM,
  MemberStatus.LIMITED,
  MemberStatus.TWEN,
]);

/**
 * Status-Codes passiver Mitglieder (12 € als Einzelzahler).
 */
export const PASSIVE_STATUS_CODES: ReadonlySet<string> = new Set([
  MemberStatus.PASSIVE,
  MemberStatus.PPREM,
  MemberStatus.PLIMIT,
  MemberStatus.PINFANT,
  MemberStatus.PKID,
  MemberStatus.PTEEN,
  MemberStatus.PTWEN,
  MemberStatus.SENIOR,
]);

/**
 * Status-Codes für Kinder und Jugendliche (< 18 Jahre beitragsfrei).
 */
export const CHILD_YOUTH_STATUS_CODES: ReadonlySet<string> = new Set([
  MemberStatus.INFANT,
  MemberStatus.CHILD,
  MemberStatus.TEEN,
  MemberStatus.PINFANT,
  MemberStatus.PKID,
  MemberStatus.PTEEN,
  MemberStatus.GINFANT,
  MemberStatus.GKID,
  MemberStatus.GTEEN,
]);

/**
 * Status-Codes für Gast-Mitglieder.
 */
export const GUEST_STATUS_CODES: ReadonlySet<string> = new Set([
  MemberStatus.GUEST,
  MemberStatus.GPREM,
  MemberStatus.GLIMIT,
  MemberStatus.GINFANT,
  MemberStatus.GKID,
  MemberStatus.GTEEN,
  MemberStatus.GTWEN,
]);

/**
 * Gibt die lesbare Bezeichnung für einen Status-Code zurück.
 */
export function getMemberStatusLabel(status: string): string {
  const clean = (status || '').toLowerCase().trim();
  return MEMBER_STATUS_LABELS[clean] || status || 'Unbekannt';
}

/**
 * Prüft, ob ein Status als aktiv gilt.
 */
export function isActiveStatus(status: string): boolean {
  const clean = (status || '').toLowerCase().trim();
  return ACTIVE_STATUS_CODES.has(clean) || clean === 'aktiv';
}

/**
 * Prüft, ob ein Status als passiv gilt.
 */
export function isPassiveStatus(status: string): boolean {
  const clean = (status || '').toLowerCase().trim();
  return PASSIVE_STATUS_CODES.has(clean) || clean === 'passiv';
}

/**
 * Prüft, ob ein Status auf ein Kind oder einen Jugendlichen hinweist.
 */
export function isChildOrYouthStatus(status: string): boolean {
  const clean = (status || '').toLowerCase().trim();
  return CHILD_YOUTH_STATUS_CODES.has(clean) || clean.includes('kind') || clean.includes('jugend');
}

/**
 * Prüft, ob ein Status ein Gast-Status ist.
 */
export function isGuestStatus(status: string): boolean {
  const clean = (status || '').toLowerCase().trim();
  return GUEST_STATUS_CODES.has(clean) || clean.startsWith('gast');
}

/**
 * Validiert eine deutsche IBAN per Modulo 97 (ISO 7064).
 */
export function isValidIBAN(iban: string): boolean {
  if (!iban) return false;
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  if (!clean.startsWith('DE') || clean.length !== 22) return false;

  const rearranged = clean.slice(4) + clean.slice(0, 4);
  const digits = rearranged
    .split('')
    .map(ch => {
      const code = ch.charCodeAt(0);
      return code >= 65 && code <= 90 ? (code - 55).toString() : ch;
    })
    .join('');

  let remainder = 0;
  for (let i = 0; i < digits.length; i += 7) {
    const chunk = remainder.toString() + digits.substring(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }
  return remainder === 1;
}

/**
 * Berechnet das Alter basierend auf einem Geburtsdatum (DD.MM.YYYY oder YYYY-MM-DD).
 */
export function calculateAge(birthDateStr: string, referenceDate: Date = new Date()): number | null {
  if (!birthDateStr) return null;
  const clean = birthDateStr.trim();
  let day: number, month: number, year: number;

  if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts.length < 3) return null;
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length < 3) return null;
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else {
    return null;
  }

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  const birthDate = new Date(year, month - 1, day);
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const m = referenceDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Normalisiert Namen zum Vergleichen (z.B. "Mustermann, Max" <-> "Max Mustermann").
 */
export function normalizeName(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[,;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .sort()
    .join(' ');
}

/**
 * Prüft, ob ein Mitglied ein beitragsbefreites Ehrenamt (z.B. Ehrenvorstand, Ehrenamtsinhaber)
 * oder Ehrenmitglied ist (§ 1 Abs. 6 Beitragsordnung).
 * Reguläre Vorstandsmitglieder (1./2. Vorstand, Schriftführerin, Kassier, Beisitzer etc.)
 * sind NICHT beitragsfrei und zahlen den regulären Mitgliedsbeitrag.
 */
export function isHonoraryMember(member: Member): boolean {
  const statusClean = (member.status || '').toLowerCase().trim();
  if (
    statusClean === MemberStatus.SPONSOR ||
    statusClean === 'sponsor' ||
    statusClean === 'ehrenmitglied' ||
    statusClean === 'honorary'
  ) {
    return true;
  }

  const fields = [
    member.boardFunction,
    member.clubFunction,
    member.otherFunction,
  ];

  const hasHonoraryRole = fields.some(f => {
    if (!f) return false;
    const lower = f.toLowerCase().trim();
    return lower.includes('ehren') || lower === 'honorary';
  });

  if (hasHonoraryRole) return true;

  if (member.comment) {
    const commentLower = member.comment.toLowerCase().trim();
    if (
      commentLower.includes('ehrenmitglied') ||
      commentLower.includes('ehrenvorstand') ||
      commentLower.includes('ehrendirigent') ||
      commentLower.includes('ehrenamtsinhaber') ||
      commentLower.includes('ehrenvorsitz')
    ) {
      return true;
    }
  }

  return false;
}

/** Abwärtskompatibler Alias */
export const isHonoraryBoard = isHonoraryMember;

/**
 * Prüft, ob ein Mitglied ausgetreten / gekündigt ist.
 */
export function isResigned(member: Member): boolean {
  const status = (member.status || '').toLowerCase().trim();
  const comment = (member.comment || '').toLowerCase().trim();
  const resignedStr = (member.resignedDate || (member.raw && member.raw[5] ? member.raw[5].trim() : '')).trim();
  const hasResignedDate = resignedStr.length > 0 && resignedStr !== '0';

  return (
    status === MemberStatus.RESIGNED ||
    status === 'resigned' ||
    status === 'ausgeschieden' ||
    status.includes('ausgetret') ||
    status.includes('austritt') ||
    status.includes('gekündigt') ||
    status.includes('gekuendigt') ||
    status.includes('inaktiv') ||
    status.includes('retired') ||
    status.includes('ehemalig') ||
    comment.includes('ausgetret') ||
    comment.includes('austritt') ||
    comment.includes('gekündigt') ||
    comment.includes('gekuendigt') ||
    hasResignedDate
  );
}

/**
 * Prüft, ob ein Mitglied verstorben ist.
 */
export function isDeceased(member: Member): boolean {
  const status = (member.status || '').toLowerCase().trim();
  const comment = (member.comment || '').toLowerCase().trim();
  return (
    status === MemberStatus.DECEASED ||
    status === 'deceased' ||
    status === 'verstorben' ||
    comment.includes('verstorben')
  );
}

/**
 * Prüft, ob ein Mitglied inaktiv ist (gekündigt/ausgetreten oder verstorben).
 */
export function isInactiveMember(member: Member): boolean {
  return isResigned(member) || isDeceased(member);
}

/**
 * Parst die Roh-CSV und überführt die Zeilen in ein typisiertes Format.
 */
export function parseMembersCSV(csvText: string): Member[] {
  const result = Papa.parse<string[]>(csvText.trim(), {
    header: false,
    skipEmptyLines: true,
  });

  if (!result.data || result.data.length < 2) {
    throw new Error('Die CSV-Datei enthält keine ausreichenden Datenzeilen.');
  }

  const headerRow = result.data[0].map(h => (h || '').trim());
  const rows = result.data.slice(1);

  let parent1Idx = -1;
  let parent2Idx = -1;
  headerRow.forEach((col, idx) => {
    if (col === 'Elternteil') {
      if (parent1Idx === -1) parent1Idx = idx;
      else parent2Idx = idx;
    }
  });

  const getCol = (row: string[], colName: string, fallbackIdx = -1): string => {
    const idx = headerRow.indexOf(colName);
    if (idx !== -1 && row[idx] !== undefined) return (row[idx] || '').trim();
    if (fallbackIdx !== -1 && row[fallbackIdx] !== undefined) return (row[fallbackIdx] || '').trim();
    return '';
  };

  return rows.map((r, rowIndex) => {
    const memberId = getCol(r, 'Mitgliedsnummer', 0);
    const firstName = getCol(r, 'Vorname', 8);
    const lastName = getCol(r, 'Nachname', 7);
    const status = getCol(r, 'Status', 6).toLowerCase();
    const birthDate = getCol(r, 'Geburtsdatum', 11);
    const age = calculateAge(birthDate);

    const accountHolder = getCol(r, 'Kontoinhaber', 21);
    const iban = getCol(r, 'IBAN', 22).replace(/\s+/g, '').toUpperCase();
    const bic = getCol(r, 'BIC', 23).replace(/\s+/g, '').toUpperCase();
    const sepaMandate = getCol(r, 'SEPA-Mandat', 24);
    const signatureDate = getCol(r, 'Unterschriftsdatum', 25);

    const parent1 = parent1Idx !== -1 && r[parent1Idx] !== undefined ? r[parent1Idx].trim() : '0';
    const parent2 = parent2Idx !== -1 && r[parent2Idx] !== undefined ? r[parent2Idx].trim() : '0';
    const partner = getCol(r, 'Lebenspartner', 28) || '0';

    const famPayerFlag = getCol(r, 'Familienbeitrag (Zahler)', 35) || '0';
    const famMemberFlag = getCol(r, 'Familienbeitrag', 36) || '0';

    const boardFunction = getCol(r, 'Funktion Vorstandschaft', 18);
    const clubFunction = getCol(r, 'Funktion im Verein', 19);
    const otherFunction = getCol(r, 'Sonstige Funktion', 20);

    const maskGroup = getCol(r, 'Maskengruppe', 31);
    const danceGroup = getCol(r, 'Tanzgruppe', 33);
    const comment = getCol(r, 'Kommentar', 41);
    const resignedDate =
      getCol(r, 'Ausgetreten seit (Import)') ||
      getCol(r, 'Ausgetreten seit') ||
      getCol(r, 'Austrittsdatum') ||
      getCol(r, 'Ausgetreten am') ||
      getCol(r, 'Kündigungsdatum') ||
      getCol(r, 'Austritt') ||
      (r[5] !== undefined ? r[5].trim() : '');

    return {
      rowIndex: rowIndex + 2,
      id: memberId,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      status,
      birthDate,
      age,
      accountHolder,
      iban,
      bic,
      sepaMandate,
      signatureDate,
      parent1,
      parent2,
      partner,
      famPayerFlag,
      famMemberFlag,
      boardFunction,
      clubFunction,
      otherFunction,
      maskGroup,
      danceGroup,
      comment,
      resignedDate,
      raw: r,
    };
  });
}

/**
 * Hauptberechnung: Gruppierung der Zahler und Berechnung der Beiträge.
 */
export function processContributions(members: Member[]): ContributionResult {
  const memberMap = new Map<string, Member>();
  members.forEach(m => memberMap.set(m.id, m));

  const payers: Member[] = [];
  const nonPayers: Member[] = [];

  members.forEach(m => {
    const hasValidIban = m.iban.length > 0;
    const hasMandate = m.sepaMandate.length > 0 && m.sepaMandate.toLowerCase() !== 'n.a.';
    if (hasValidIban && hasMandate) {
      payers.push(m);
    } else {
      nonPayers.push(m);
    }
  });

  const payerGroups = new Map<string, { payer: Member; members: Member[]; assignedMemberIds: Set<string> }>();
  payers.forEach(p => {
    payerGroups.set(p.id, {
      payer: p,
      members: [p],
      assignedMemberIds: new Set([p.id]),
    });
  });

  const unassignedMembers: UnassignedMember[] = [];
  const inactiveMembers: InactiveMember[] = [];

  // Alle gekündigten und verstorbenen Mitglieder erfassen
  members.forEach(m => {
    if (isInactiveMember(m)) {
      inactiveMembers.push({
        ...m,
        inactiveType: isDeceased(m) ? 'deceased' : 'resigned',
        reasonText: isDeceased(m)
          ? 'Verstorben (kein Beitragseinzug)'
          : (m.raw && m.raw[5] && m.raw[5] !== '0'
              ? `Ausgetreten seit ${m.raw[5]} (kein Beitragseinzug)`
              : 'Gekündigt / Ausgetreten (kein Beitragseinzug)'),
      });
    }
  });

  nonPayers.forEach(m => {
    let matchedPayerId: string | null = null;
    const isOver25ActiveOrPassive = !isInactiveMember(m) && m.age !== null && m.age >= 25;
    const isPartnerMatch = Boolean(m.partner && m.partner !== '0' && payerGroups.has(m.partner));

    if (isOver25ActiveOrPassive) {
      if (isPartnerMatch) {
        matchedPayerId = m.partner;
      }
      // Wenn aktiv/passiv, >= 25 und kein Lebenspartner: Herauslösung aus dem Familienbeitrag (§ 2 Beitragsordnung)
    } else {
      if (isPartnerMatch) {
        matchedPayerId = m.partner;
      } else if (m.parent1 && m.parent1 !== '0' && payerGroups.has(m.parent1)) {
        matchedPayerId = m.parent1;
      } else if (m.parent2 && m.parent2 !== '0' && payerGroups.has(m.parent2)) {
        matchedPayerId = m.parent2;
      }

      if (!matchedPayerId) {
        const p1 = memberMap.get(m.parent1);
        const p2 = memberMap.get(m.parent2);
        if (p1 && p1.partner && payerGroups.has(p1.partner)) {
          matchedPayerId = p1.partner;
        } else if (p2 && p2.partner && payerGroups.has(p2.partner)) {
          matchedPayerId = p2.partner;
        }
      }

      if (!matchedPayerId && m.accountHolder) {
        const normHolder = normalizeName(m.accountHolder);
        for (const [payerId, group] of payerGroups.entries()) {
          const p = group.payer;
          const normPayerHolder = normalizeName(p.accountHolder);
          const normPayerName = normalizeName(p.fullName);
          if (normHolder === normPayerHolder || normHolder === normPayerName) {
            matchedPayerId = payerId;
            break;
          }
        }
      }
    }

    if (matchedPayerId && payerGroups.has(matchedPayerId)) {
      const group = payerGroups.get(matchedPayerId)!;
      group.members.push(m);
      group.assignedMemberIds.add(m.id);
    } else {
      // Gekündigte/verstorbene Mitglieder ohne Zahler sind KEIN Fehler/Problem, sondern regulär inaktiv!
      if (!isInactiveMember(m)) {
        unassignedMembers.push({
          ...m,
          issue: isOver25ActiveOrPassive
            ? 'Mitglied ist ≥ 25 Jahre alt ohne eigene IBAN (neue Mitgliedschaft erforderlich gem. § 2 Beitragsordnung).'
            : 'Kein Zahler mit gültiger IBAN/Mandat zugeordnet.',
        });
      }
    }
  });

  const results: PayerGroup[] = [];

  payerGroups.forEach(group => {
    const payer = group.payer;
    const groupMembers = group.members;
    const isMultiMember = groupMembers.length > 1;
    const hasFamilyFlag = groupMembers.some(m => m.famPayerFlag === '1' || m.famMemberFlag === '1');
    const isFamily = isMultiMember || hasFamilyFlag;

    // Prüfen, ob der Zahler als Familie abgerechnet wird (20 €), aber keine weiteren aktiven Angehörigen mehr hat
    const otherLivingMembers = groupMembers.filter(m => m.id !== payer.id && !isInactiveMember(m));
    const isSingleFamilyPayer = isFamily && otherLivingMembers.length === 0;

    // Wenn alle Mitglieder in der Gruppe gekündigt/verstorben sind, ist kein Einzug nötig:
    // Sie werden nicht in die aktiven Lastschriften aufgenommen
    const allMembersInactive = groupMembers.every(isInactiveMember);
    if (allMembersInactive) {
      return;
    }

    let activeChildrenCount = 0;
    let totalAmount = 0;
    const memberDetails: CalculatedMember[] = [];

    const warnings: string[] = [];
    const errors: string[] = [];

    if (!isValidIBAN(payer.iban)) {
      errors.push('Ungültige IBAN (Prüfziffer stimmt nicht).');
    }
    if (!payer.sepaMandate || payer.sepaMandate.toLowerCase() === 'n.a.') {
      errors.push('Fehlendes SEPA-Mandat.');
    }
    if (!payer.signatureDate) {
      warnings.push('Unterschriftsdatum des Mandats fehlt.');
    }
    if (isSingleFamilyPayer) {
      let regularFee = '25,00 € (aktiv)';
      if (isHonoraryMember(payer)) {
        regularFee = '0,00 € (Ehrenmitglied beitragsfrei)';
      } else if (payer.status === 'passive' || isPassiveStatus(payer.status)) {
        regularFee = '12,00 € (passiv)';
      } else if (payer.status !== 'active' && !isActiveStatus(payer.status)) {
        regularFee = `12,00 € (${getMemberStatusLabel(payer.status)})`;
      }
      warnings.push(
        `Alleinstehender Familienzahler: Keine weiteren aktiven Familienangehörigen zugeordnet (z. B. Angehörige ausgetreten oder ≥ 25 Jahre). Umstellung auf regulären Einzelbeitrag (${regularFee}) und neue Mitgliedschaft erforderlich.`
      );
    }

    groupMembers.forEach(m => {
      const isPayerSelf = m.id === payer.id;
      let fee = 0;
      let reason = '';

      const isResignedOrDeceased = isInactiveMember(m);
      const isHonorary = isHonoraryMember(m);
      const isChildByStatus = isChildOrYouthStatus(m.status);
      const isUnder18 = m.age !== null ? m.age < 18 : isChildByStatus;

      if (isResignedOrDeceased) {
        fee = 0;
        reason = isDeceased(m) ? 'Verstorben (0 €)' : 'Ausgetreten / Gekündigt (0 €)';
      } else if (isPayerSelf) {
        if (isFamily) {
          fee = 20.0;
          reason = isSingleFamilyPayer
            ? 'Familienbeitrag (Zahler) – Hinweis: Keine weiteren Familienangehörigen zugeordnet (Umstellung auf Einzelbeitrag nötig)'
            : 'Familienbeitrag (Zahler)';
        } else {
          if (isHonorary) {
            fee = 0;
            reason = 'Beitragsfrei gem. § 1 Abs. 6 (Ehrenvorstand / Ehrenmitglied)';
          } else if (isUnder18) {
            fee = 0;
            reason = 'Jugendlicher unter 18 beitragsfrei';
          } else if (m.status === 'active' || isActiveStatus(m.status)) {
            fee = 25.0;
            reason = m.status === 'active'
              ? 'Erwachsener aktiv (25 €)'
              : `Erwachsener aktiv (${getMemberStatusLabel(m.status)}) (25 €)`;
          } else if (m.status === 'passive' || isPassiveStatus(m.status)) {
            fee = 12.0;
            reason = m.status === 'passive'
              ? 'Erwachsener passiv (12 €)'
              : `Erwachsener passiv (${getMemberStatusLabel(m.status)}) (12 €)`;
          } else {
            fee = 12.0;
            reason = `Status ${getMemberStatusLabel(m.status)} als passiv veranlagt (12 €)`;
          }
        }
      } else {
        if (isHonorary) {
          fee = 0;
          reason = 'Beitragsfrei gem. § 1 Abs. 6 (Ehrenvorstand / Ehrenmitglied)';
        } else if (isUnder18) {
          fee = 0;
          reason = 'Kind/Jugendlicher unter 18 beitragsfrei';
        } else if (m.partner === payer.id || payer.partner === m.id) {
          if (m.status === 'active' || isActiveStatus(m.status)) {
            fee = 10.0;
            reason = 'Aktiver Lebenspartner (+10 €)';
          } else {
            fee = 0.0;
            reason = 'Passiver Lebenspartner (im Familienbeitrag abgedeckt)';
          }
        } else if (m.age !== null && m.age < 25) {
          if (m.status === 'active' || isActiveStatus(m.status)) {
            activeChildrenCount++;
            if (activeChildrenCount === 1) {
              fee = 10.0;
              reason = '1. aktives Kind unter 25 Jahren (+10 €)';
            } else {
              fee = 0.0;
              reason = `${activeChildrenCount}. aktives Kind unter 25 (beitragsfrei)`;
            }
          } else {
            fee = 0.0;
            reason = 'Passives Kind unter 25 Jahren (im Familienbeitrag abgedeckt)';
          }
        } else {
          errors.push(`Mitglied ${m.fullName} ist ≥ 25 Jahre alt (§ 2 Beitragsordnung) und darf nicht über die Familie abgebucht werden.`);
          fee = 0;
          reason = 'Fehler: Mitglied ≥ 25 Jahre (eigene Mitgliedschaft erforderlich)';
        }
      }

      totalAmount += fee;
      memberDetails.push({
        ...m,
        fee,
        reason,
      });
    });

    results.push({
      payerId: payer.id,
      payerName: payer.accountHolder || payer.fullName,
      iban: payer.iban,
      bic: payer.bic,
      mandate: payer.sepaMandate,
      signatureDate: payer.signatureDate,
      totalAmount,
      memberCount: groupMembers.length,
      members: memberDetails,
      isFamily,
      errors,
      warnings,
      isValid: errors.length === 0,
      selectedForExport: errors.length === 0 && totalAmount > 0,
    });
  });

  return {
    payerGroups: results,
    unassignedMembers,
    inactiveMembers,
  };
}

/**
 * Erzeugt die finale SEPA-CSV (7 Spalten).
 */
export function generateSepaCsv(payerGroups: PayerGroup[], purpose = 'Mitgliedsbeitrag Schalmeienzug Ingoldingen e.V'): string {
  const headers = [
    'Kontoinhaber',
    'IBAN',
    'BIC',
    'Mandatsreferenz-Nummer',
    'Unterschriftsdatum',
    'Verwendungszweck',
    'Betrag',
  ];

  const rows = payerGroups
    .filter(g => g.selectedForExport && g.totalAmount > 0)
    .map(g => [
      g.payerName,
      g.iban,
      g.bic,
      g.mandate,
      g.signatureDate,
      purpose,
      g.totalAmount.toFixed(2).replace('.', ','),
    ]);

  return Papa.unparse({
    fields: headers,
    data: rows,
  }, {
    delimiter: ';',
  });
}

/**
 * Erzeugt den detaillierten Prüfbericht für den Kassierer.
 */
export function generateAuditCsv(
  payerGroups: PayerGroup[],
  unassignedMembers: UnassignedMember[],
  inactiveMembers: InactiveMember[] = []
): string {
  const headers = [
    'Mitgliedsnummer',
    'Name',
    'Status',
    'Alter',
    'Geburtsdatum',
    'Zahler',
    'IBAN (Zahler)',
    'Einzelbeitrag (€)',
    'Berechnungsgrund / Notiz',
    'Funktion',
    'Maskengruppe',
  ];

  const rows: (string | number)[][] = [];

  payerGroups.forEach(g => {
    g.members.forEach(m => {
      rows.push([
        m.id,
        m.fullName,
        m.status,
        m.age ?? '',
        m.birthDate,
        g.payerName,
        g.iban,
        m.fee.toFixed(2).replace('.', ','),
        m.reason,
        m.boardFunction || m.otherFunction || '',
        m.maskGroup || '',
      ]);
    });
  });

  unassignedMembers.forEach(m => {
    rows.push([
      m.id,
      m.fullName,
      m.status,
      m.age ?? '',
      m.birthDate,
      'NICHT ZUGEORDNET',
      '',
      '0,00',
      `FEHLER: ${m.issue}`,
      m.boardFunction || m.otherFunction || '',
      m.maskGroup || '',
    ]);
  });

  inactiveMembers.forEach(m => {
    rows.push([
      m.id,
      m.fullName,
      m.status,
      m.age ?? '',
      m.birthDate,
      m.inactiveType === 'deceased' ? 'VERSTORBEN' : 'AUSGETRETEN / GEKÜNDIGT',
      '',
      '0,00',
      `INFO: ${m.reasonText}`,
      m.boardFunction || m.otherFunction || '',
      m.maskGroup || '',
    ]);
  });

  return Papa.unparse({
    fields: headers,
    data: rows,
  }, {
    delimiter: ';',
  });
}

export type StatusFilterType =
  | 'all'
  | 'active'
  | 'passive'
  | 'honorary'
  | 'family'
  | 'single'
  | 'free';

export type ValidityFilterType = 'all' | 'valid' | 'issues';

/**
 * Prüft, ob eine Zahlergruppe zum ausgewählten Status-Filter passt.
 */
export function matchesStatusFilter(group: PayerGroup, filter: StatusFilterType): boolean {
  switch (filter) {
    case 'all':
      return true;

    case 'active':
      // Hat mindestens ein aktives Mitglied, das nicht inaktiv (ausgetreten/verstorben) ist
      return group.members.some(
        m => (m.status === 'active' || isActiveStatus(m.status)) && !isInactiveMember(m)
      );

    case 'passive':
      // Hat keine aktiven Mitglieder, sondern nur passive (oder beitragsfreie Kinder)
      return (
        !group.members.some(
          m => (m.status === 'active' || isActiveStatus(m.status)) && !isInactiveMember(m)
        ) &&
        group.members.some(m => !isInactiveMember(m))
      );

    case 'honorary':
      // Mindestens ein Mitglied in der Gruppe ist Ehrenmitglied / beitragsbefreites Ehrenamt (§ 1 Abs. 6)
      return group.members.some(m => isHonoraryMember(m));

    case 'family':
      // Familienbeitrag (Gruppe als Familie markiert bzw. Mehrpersonenverbund)
      return group.isFamily;

    case 'single':
      // Einzelzahler
      return !group.isFamily;

    case 'free':
      // Beitragsfrei (Gesamteinzugssumme 0,00 €)
      return group.totalAmount === 0;

    default:
      return true;
  }
}

/**
 * Prüft, ob eine Zahlergruppe zum Gültigkeits-/Prüffilter passt.
 */
export function matchesValidityFilter(group: PayerGroup, filter: ValidityFilterType): boolean {
  if (filter === 'valid') {
    return group.isValid;
  }
  if (filter === 'issues') {
    return !group.isValid || group.warnings.length > 0;
  }
  return true;
}

/**
 * Prüft, ob eine Zahlergruppe mit der Suchanfrage übereinstimmt (Name, IBAN, BIC, Mandat, Mitgliedsdaten).
 */
export function matchesSearchQuery(group: PayerGroup, query: string): boolean {
  if (!query || !query.trim()) return true;
  const q = query.toLowerCase().trim();

  // Prüfe Zahlerangaben
  if (
    group.payerName.toLowerCase().includes(q) ||
    group.iban.toLowerCase().includes(q) ||
    group.payerId.toLowerCase().includes(q) ||
    (group.bic && group.bic.toLowerCase().includes(q)) ||
    (group.mandate && group.mandate.toLowerCase().includes(q))
  ) {
    return true;
  }

  // Prüfe Mitgliederangaben der Gruppe (inklusive Klarnamen des Status)
  return group.members.some(m =>
    m.fullName.toLowerCase().includes(q) ||
    m.id.toLowerCase().includes(q) ||
    m.status.toLowerCase().includes(q) ||
    getMemberStatusLabel(m.status).toLowerCase().includes(q) ||
    (m.boardFunction && m.boardFunction.toLowerCase().includes(q)) ||
    (m.clubFunction && m.clubFunction.toLowerCase().includes(q)) ||
    (m.otherFunction && m.otherFunction.toLowerCase().includes(q)) ||
    (m.comment && m.comment.toLowerCase().includes(q))
  );
}

/**
 * Kombinierte Filterfunktion für Zahlergruppen.
 */
export function filterPayerGroup(
  group: PayerGroup,
  statusFilter: StatusFilterType,
  validityFilter: ValidityFilterType,
  searchQuery: string
): boolean {
  return (
    matchesStatusFilter(group, statusFilter) &&
    matchesValidityFilter(group, validityFilter) &&
    matchesSearchQuery(group, searchQuery)
  );
}
