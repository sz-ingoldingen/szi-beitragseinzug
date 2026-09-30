import { describe, it, expect } from 'vitest';
import {
  isHonoraryMember,
  isResigned,
  isDeceased,
  isInactiveMember,
  parseMembersCSV,
  processContributions,
  generateAuditCsv,
  generateSepaCsv,
  calculateAge,
  getDefaultCutoffDate,
  isInvoicePayer,
  isStandingOrderPayer,
  isValidIBAN,
  Member,
  matchesStatusFilter,
  matchesValidityFilter,
  matchesSearchQuery,
  filterPayerGroup,
  MemberStatus,
  MemberStatusEnum,
  MEMBER_STATUS_LABELS,
  getMemberStatusLabel,
  isActiveStatus,
  isPassiveStatus,
  isChildOrYouthStatus,
  isGuestStatus,
  maskIBAN,
} from './sepaCalculator';
import { SAMPLE_CSV } from './sampleData';

describe('Ehrenamt & Ehrenmitglied vs. regulärer Vorstand (§ 1 Abs. 6)', () => {
  const createMember = (overrides: Partial<Member>): Member => ({
    rowIndex: 1,
    id: '99999',
    firstName: 'Test',
    lastName: 'Person',
    fullName: 'Test Person',
    status: 'active',
    birthDate: '01.01.1980',
    age: 46,
    accountHolder: 'Test Person',
    iban: 'DE23100000001234567890',
    bic: 'TESTDEDDXXX',
    sepaMandate: 'MANDAT-01',
    signatureDate: '01.01.2020',
    parent1: '0',
    parent2: '0',
    partner: '0',
    famPayerFlag: '0',
    famMemberFlag: '0',
    boardFunction: '',
    clubFunction: '',
    otherFunction: '',
    maskGroup: '',
    danceGroup: '',
    comment: '',
    raw: [],
    ...overrides,
  });

  describe('isHonoraryMember Erkennung', () => {
    it('erkennt reguläre Vorstandsfunktionen korrekt als NICHT beitragsfrei (false)', () => {
      expect(isHonoraryMember(createMember({ boardFunction: '1. Vorstand' }))).toBe(false);
      expect(isHonoraryMember(createMember({ boardFunction: '2. Vorständin' }))).toBe(false);
      expect(isHonoraryMember(createMember({ boardFunction: 'Schriftführerin' }))).toBe(false);
      expect(isHonoraryMember(createMember({ boardFunction: 'Kassierer' }))).toBe(false);
      expect(isHonoraryMember(createMember({ boardFunction: 'Beisitzer' }))).toBe(false);
      expect(isHonoraryMember(createMember({ boardFunction: 'Beisitzerin' }))).toBe(false);
      expect(isHonoraryMember(createMember({ boardFunction: 'Jugendleiter' }))).toBe(false);
      expect(isHonoraryMember(createMember({ clubFunction: 'Stimmleiter' }))).toBe(false);
      expect(isHonoraryMember(createMember({ clubFunction: 'Dirigent' }))).toBe(false);
      expect(isHonoraryMember(createMember({ otherFunction: 'Kassenprüfer' }))).toBe(false);
    });

    it('erkennt Ehrenvorstand und Ehrenämter als beitragsfrei (true)', () => {
      expect(isHonoraryMember(createMember({ boardFunction: 'Ehrenvorstand' }))).toBe(true);
      expect(isHonoraryMember(createMember({ boardFunction: 'Ehrenvorsitzender' }))).toBe(true);
      expect(isHonoraryMember(createMember({ boardFunction: 'Ehrenamtsinhaber' }))).toBe(true);
      expect(isHonoraryMember(createMember({ clubFunction: 'Ehrenmitglied' }))).toBe(true);
      expect(isHonoraryMember(createMember({ clubFunction: 'Ehrendirigent' }))).toBe(true);
      expect(isHonoraryMember(createMember({ otherFunction: 'Ehrenmitglied' }))).toBe(true);
      expect(isHonoraryMember(createMember({ status: 'ehrenmitglied' }))).toBe(true);
      expect(isHonoraryMember(createMember({ status: 'honorary' }))).toBe(true);
      expect(isHonoraryMember(createMember({ comment: 'Zum Ehrenmitglied ernannt 2022' }))).toBe(true);
    });
  });

  describe('Beitragsberechnung mit Beispieldaten', () => {
    const members = parseMembersCSV(SAMPLE_CSV);
    const result = processContributions(members);

    it('verarbeitet alle Zahler ohne nicht zugeordnete Mitglieder', () => {
      expect(result.unassignedMembers.length).toBe(0);
      expect(result.payerGroups.length).toBe(7);
    });

    it('Gruppe 1 (Mustermann): Schriftführerin zahlt als normales Vorstandsmitglied (10 €)', () => {
      const g1 = result.payerGroups.find(g => g.payerId === '10401');
      expect(g1).toBeDefined();
      expect(g1?.totalAmount).toBe(40.0);

      const max = g1?.members.find(m => m.id === '10401');
      expect(max?.fee).toBe(20.0);
      expect(max?.reason).toBe('Familienbeitrag (Zahler)');

      const partner = g1?.members.find(m => m.id === '10402');
      expect(partner?.fee).toBe(10.0);
      expect(partner?.reason).toBe('Aktiver Lebenspartner (+10 €)');

      const schriftfuehrerin = g1?.members.find(m => m.id === '10399');
      // Kind1 ist 24 J., aktiv, Schriftführerin -> kein Ehrenamt, daher 1. aktives Kind unter 25 (+10 €)
      expect(schriftfuehrerin?.fee).toBe(10.0);
      expect(schriftfuehrerin?.reason).toBe('1. aktives Kind unter 25 Jahren (+10 €)');

      const kind2 = g1?.members.find(m => m.id === '10400');
      expect(kind2?.fee).toBe(0.0);
      expect(kind2?.reason).toBe('Kind/Jugendlicher unter 18 beitragsfrei');
    });

    it('Gruppe 2 (Mustername): Beisitzerin zahlt regulär als aktive Partnerin (10 €)', () => {
      const g2 = result.payerGroups.find(g => g.payerId === '10195');
      expect(g2).toBeDefined();
      expect(g2?.totalAmount).toBe(30.0);

      const mann = g2?.members.find(m => m.id === '10195');
      expect(mann?.fee).toBe(20.0);

      const frau = g2?.members.find(m => m.id === '10185');
      // Beisitzerin ist normales Vorstandsmitglied -> zahlt als aktive Partnerin 10 €
      expect(frau?.fee).toBe(10.0);
      expect(frau?.reason).toBe('Aktiver Lebenspartner (+10 €)');
    });

    it('Reguläres Vorstandsmitglied als Einzelzahler (10503, Markus Weber - 1. Vorstand) zahlt 25 €', () => {
      const g = result.payerGroups.find(g => g.payerId === '10503');
      expect(g).toBeDefined();
      expect(g?.totalAmount).toBe(25.0);
      expect(g?.members[0].fee).toBe(25.0);
      expect(g?.members[0].reason).toBe('Erwachsener aktiv (25 €)');
    });

    it('Ehrenvorstand als Einzelzahler (10504, Anton Albrecht) ist beitragsfrei (0 €)', () => {
      const g = result.payerGroups.find(g => g.payerId === '10504');
      expect(g).toBeDefined();
      expect(g?.totalAmount).toBe(0.0);
      expect(g?.members[0].fee).toBe(0.0);
      expect(g?.members[0].reason).toContain('§ 1 Abs. 6');
    });

    it('Ehrenmitglied als Einzelzahler (10505, Josef Maier) ist beitragsfrei (0 €)', () => {
      const g = result.payerGroups.find(g => g.payerId === '10505');
      expect(g).toBeDefined();
      expect(g?.totalAmount).toBe(0.0);
      expect(g?.members[0].fee).toBe(0.0);
      expect(g?.members[0].reason).toContain('§ 1 Abs. 6');
    });
  });

  describe('Altersgrenze: Kind wird 25 Jahre alt (§ 2 Beitragsordnung)', () => {
    const currentYear = new Date().getFullYear();

    it('Test 1: Kind ist 25+, hat KEINE eigene IBAN, aber Elternteil ist als Zahler eingetragen -> Fehler/Klärungsfall', () => {
      const members: Member[] = [
        {
          rowIndex: 2,
          id: '1001',
          firstName: 'Max',
          lastName: 'Mustermann',
          fullName: 'Max Mustermann',
          status: 'active',
          birthDate: '01.01.1970',
          age: currentYear - 1970,
          accountHolder: 'Mustermann, Max',
          iban: 'DE23100000001234567890',
          bic: 'TESTDEDDXXX',
          sepaMandate: 'MANDAT-01',
          signatureDate: '01.01.2020',
          parent1: '0',
          parent2: '0',
          partner: '1002',
          famPayerFlag: '1',
          famMemberFlag: '0',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
        {
          rowIndex: 3,
          id: '1002',
          firstName: 'Musterfrau',
          lastName: 'Mustermann',
          fullName: 'Musterfrau Mustermann',
          status: 'active',
          birthDate: '01.01.1972',
          age: currentYear - 1972,
          accountHolder: 'Mustermann, Max',
          iban: '',
          bic: '',
          sepaMandate: '',
          signatureDate: '',
          parent1: '0',
          parent2: '0',
          partner: '1001',
          famPayerFlag: '0',
          famMemberFlag: '1',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
        {
          rowIndex: 4,
          id: '1003',
          firstName: 'Kind',
          lastName: 'Mustermann',
          fullName: 'Kind Mustermann',
          status: 'active',
          birthDate: `01.01.${currentYear - 25}`,
          age: 25,
          accountHolder: 'Mustermann, Max',
          iban: '',
          bic: '',
          sepaMandate: '',
          signatureDate: '',
          parent1: '1001',
          parent2: '1002',
          partner: '0',
          famPayerFlag: '0',
          famMemberFlag: '1',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
      ];

      const result = processContributions(members);

      // 1. Kind darf NICHT mehr der Elterngruppe zugeordnet werden
      expect(result.unassignedMembers.length).toBe(1);
      const unassignedChild = result.unassignedMembers[0];
      expect(unassignedChild.id).toBe('1003');
      expect(unassignedChild.issue).toContain('25 Jahre');
      expect(unassignedChild.issue).toContain('neue Mitgliedschaft');

      // 2. Elterngruppe umfasst nur noch die Eltern (Max 20 € + Partnerin 10 € = 30 €)
      expect(result.payerGroups.length).toBe(1);
      const group = result.payerGroups[0];
      expect(group.payerId).toBe('1001');
      expect(group.memberCount).toBe(2);
      expect(group.members.find(m => m.id === '1003')).toBeUndefined();
      expect(group.totalAmount).toBe(30.0);
    });

    it('Test 2: Kind ist 25+, hat eine EIGENE IBAN / Mandat eingetragen (Eltern stehen noch als parent1/2 drin)', () => {
      const members: Member[] = [
        {
          rowIndex: 2,
          id: '1001',
          firstName: 'Max',
          lastName: 'Mustermann',
          fullName: 'Max Mustermann',
          status: 'active',
          birthDate: '01.01.1970',
          age: currentYear - 1970,
          accountHolder: 'Mustermann, Max',
          iban: 'DE23100000001234567890',
          bic: 'TESTDEDDXXX',
          sepaMandate: 'MANDAT-01',
          signatureDate: '01.01.2020',
          parent1: '0',
          parent2: '0',
          partner: '1002',
          famPayerFlag: '1',
          famMemberFlag: '0',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
        {
          rowIndex: 3,
          id: '1002',
          firstName: 'Musterfrau',
          lastName: 'Mustermann',
          fullName: 'Musterfrau Mustermann',
          status: 'active',
          birthDate: '01.01.1972',
          age: currentYear - 1972,
          accountHolder: 'Mustermann, Max',
          iban: '',
          bic: '',
          sepaMandate: '',
          signatureDate: '',
          parent1: '0',
          parent2: '0',
          partner: '1001',
          famPayerFlag: '0',
          famMemberFlag: '1',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
        {
          rowIndex: 4,
          id: '1003',
          firstName: 'Kind',
          lastName: 'Mustermann',
          fullName: 'Kind Mustermann',
          status: 'active',
          birthDate: `01.01.${currentYear - 25}`,
          age: 25,
          accountHolder: 'Kind Mustermann',
          iban: 'DE50100000000000000001', // Eigene gültige IBAN
          bic: 'TESTDEDDXXX',
          sepaMandate: 'MANDAT-03', // Eigenes Mandat
          signatureDate: '01.01.2026',
          parent1: '1001',
          parent2: '1002',
          partner: '0',
          famPayerFlag: '0',
          famMemberFlag: '0',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
      ];

      const result = processContributions(members);

      // 1. Es entstehen ZWEI getrennte Zahlergruppen
      expect(result.unassignedMembers.length).toBe(0);
      expect(result.payerGroups.length).toBe(2);

      const elternGruppe = result.payerGroups.find(g => g.payerId === '1001');
      expect(elternGruppe).toBeDefined();
      expect(elternGruppe?.memberCount).toBe(2);
      expect(elternGruppe?.totalAmount).toBe(30.0); // 20 € + 10 €

      const kindGruppe = result.payerGroups.find(g => g.payerId === '1003');
      expect(kindGruppe).toBeDefined();
      expect(kindGruppe?.memberCount).toBe(1);
      expect(kindGruppe?.totalAmount).toBe(25.0); // 25 € über eigenes Konto
      expect(kindGruppe?.members[0].reason).toBe('Erwachsener aktiv (25 €)');
    });

    it('Test 3: Passives Kind wird 25+ (ohne eigene IBAN) -> Fehler/Klärungsfall (kein Einzug über Zahler)', () => {
      const members: Member[] = [
        {
          rowIndex: 2,
          id: '1001',
          firstName: 'Max',
          lastName: 'Mustermann',
          fullName: 'Max Mustermann',
          status: 'passive',
          birthDate: '01.01.1970',
          age: currentYear - 1970,
          accountHolder: 'Mustermann, Max',
          iban: 'DE23100000001234567890',
          bic: 'TESTDEDDXXX',
          sepaMandate: 'MANDAT-01',
          signatureDate: '01.01.2020',
          parent1: '0',
          parent2: '0',
          partner: '0',
          famPayerFlag: '1',
          famMemberFlag: '0',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
        {
          rowIndex: 3,
          id: '1003',
          firstName: 'Kind',
          lastName: 'Mustermann',
          fullName: 'Kind Mustermann',
          status: 'passive',
          birthDate: `01.01.${currentYear - 26}`,
          age: 26,
          accountHolder: 'Mustermann, Max',
          iban: '',
          bic: '',
          sepaMandate: '',
          signatureDate: '',
          parent1: '1001',
          parent2: '0',
          partner: '0',
          famPayerFlag: '0',
          famMemberFlag: '1',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
      ];

      const result = processContributions(members);

      // Passives Kind >= 25 darf nicht über den Zahler abgebucht werden
      expect(result.unassignedMembers.length).toBe(1);
      const unassignedChild = result.unassignedMembers[0];
      expect(unassignedChild.id).toBe('1003');
      expect(unassignedChild.issue).toContain('25 Jahre');
      expect(unassignedChild.issue).toContain('neue Mitgliedschaft');

      // Zahler wird automatisch auf Einzelzahler umgestellt (passiv: 12 €)
      const group = result.payerGroups[0];
      expect(group.memberCount).toBe(1);
      expect(group.members.find(m => m.id === '1003')).toBeUndefined();
      expect(group.isFamily).toBe(false);
      expect(group.totalAmount).toBe(12.0);
    });

    it('Test 4: Familie mit 2 Kindern (Kind 1 wird 25, Kind 2 ist U18 z. B. 16 J., aktiv) -> Kind 2 bleibt beitragsfrei (0 €)', () => {
      const members: Member[] = [
        {
          rowIndex: 2,
          id: '1001',
          firstName: 'Max',
          lastName: 'Mustermann',
          fullName: 'Max Mustermann',
          status: 'active',
          birthDate: '01.01.1970',
          age: currentYear - 1970,
          accountHolder: 'Mustermann, Max',
          iban: 'DE23100000001234567890',
          bic: 'TESTDEDDXXX',
          sepaMandate: 'MANDAT-01',
          signatureDate: '01.01.2020',
          parent1: '0',
          parent2: '0',
          partner: '1002',
          famPayerFlag: '1',
          famMemberFlag: '0',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
        {
          rowIndex: 3,
          id: '1002',
          firstName: 'Musterfrau',
          lastName: 'Mustermann',
          fullName: 'Musterfrau Mustermann',
          status: 'active',
          birthDate: '01.01.1972',
          age: currentYear - 1972,
          accountHolder: 'Mustermann, Max',
          iban: '',
          bic: '',
          sepaMandate: '',
          signatureDate: '',
          parent1: '0',
          parent2: '0',
          partner: '1001',
          famPayerFlag: '0',
          famMemberFlag: '1',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
        {
          rowIndex: 4,
          id: '1003',
          firstName: 'Kind1',
          lastName: 'Mustermann',
          fullName: 'Kind1 Mustermann',
          status: 'active',
          birthDate: `01.01.${currentYear - 25}`,
          age: 25,
          accountHolder: 'Mustermann, Max',
          iban: '',
          bic: '',
          sepaMandate: '',
          signatureDate: '',
          parent1: '1001',
          parent2: '1002',
          partner: '0',
          famPayerFlag: '0',
          famMemberFlag: '1',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
        {
          rowIndex: 5,
          id: '1004',
          firstName: 'Kind2',
          lastName: 'Mustermann',
          fullName: 'Kind2 Mustermann',
          status: 'active',
          birthDate: `01.01.${currentYear - 16}`,
          age: 16,
          accountHolder: 'Mustermann, Max',
          iban: '',
          bic: '',
          sepaMandate: '',
          signatureDate: '',
          parent1: '1001',
          parent2: '1002',
          partner: '0',
          famPayerFlag: '0',
          famMemberFlag: '1',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
      ];

      const result = processContributions(members);

      // 1. Kind 1 (25 Jahre) fällt heraus -> unassigned error
      expect(result.unassignedMembers.length).toBe(1);
      expect(result.unassignedMembers[0].id).toBe('1003');

      // 2. Familie umfasst Vater (20 €), Mutter (10 €) und Kind 2
      expect(result.payerGroups.length).toBe(1);
      const group = result.payerGroups[0];
      expect(group.memberCount).toBe(3);

      const kind2 = group.members.find(m => m.id === '1004');
      expect(kind2).toBeDefined();
      expect(kind2?.fee).toBe(0.0);
      expect(kind2?.reason).toBe('Kind/Jugendlicher unter 18 beitragsfrei');

      // Gesamt: 20 € (Vater) + 10 € (Mutter) + 0 € (Kind 2 U18) = 30 €
      expect(group.totalAmount).toBe(30.0);
    });

    it('Test 5: Familie mit 2 Kindern (Kind 1 wird 25, Kind 2 ist Ü18 z. B. 20 J., aktiv) -> Kind 2 rückt nach und zahlt 10 €', () => {
      const members: Member[] = [
        {
          rowIndex: 2,
          id: '1001',
          firstName: 'Max',
          lastName: 'Mustermann',
          fullName: 'Max Mustermann',
          status: 'active',
          birthDate: '01.01.1970',
          age: currentYear - 1970,
          accountHolder: 'Mustermann, Max',
          iban: 'DE23100000001234567890',
          bic: 'TESTDEDDXXX',
          sepaMandate: 'MANDAT-01',
          signatureDate: '01.01.2020',
          parent1: '0',
          parent2: '0',
          partner: '1002',
          famPayerFlag: '1',
          famMemberFlag: '0',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
        {
          rowIndex: 3,
          id: '1002',
          firstName: 'Musterfrau',
          lastName: 'Mustermann',
          fullName: 'Musterfrau Mustermann',
          status: 'active',
          birthDate: '01.01.1972',
          age: currentYear - 1972,
          accountHolder: 'Mustermann, Max',
          iban: '',
          bic: '',
          sepaMandate: '',
          signatureDate: '',
          parent1: '0',
          parent2: '0',
          partner: '1001',
          famPayerFlag: '0',
          famMemberFlag: '1',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
        {
          rowIndex: 4,
          id: '1003',
          firstName: 'Kind1',
          lastName: 'Mustermann',
          fullName: 'Kind1 Mustermann',
          status: 'active',
          birthDate: `01.01.${currentYear - 25}`,
          age: 25,
          accountHolder: 'Mustermann, Max',
          iban: '',
          bic: '',
          sepaMandate: '',
          signatureDate: '',
          parent1: '1001',
          parent2: '1002',
          partner: '0',
          famPayerFlag: '0',
          famMemberFlag: '1',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
        {
          rowIndex: 5,
          id: '1004',
          firstName: 'Kind2',
          lastName: 'Mustermann',
          fullName: 'Kind2 Mustermann',
          status: 'active',
          birthDate: `01.01.${currentYear - 20}`,
          age: 20,
          accountHolder: 'Mustermann, Max',
          iban: '',
          bic: '',
          sepaMandate: '',
          signatureDate: '',
          parent1: '1001',
          parent2: '1002',
          partner: '0',
          famPayerFlag: '0',
          famMemberFlag: '1',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
      ];

      const result = processContributions(members);

      // 1. Kind 1 (25 Jahre) fällt heraus -> unassigned error
      expect(result.unassignedMembers.length).toBe(1);
      expect(result.unassignedMembers[0].id).toBe('1003');

      // 2. Familie umfasst Vater (20 €), Mutter (10 €) und Kind 2
      expect(result.payerGroups.length).toBe(1);
      const group = result.payerGroups[0];
      expect(group.memberCount).toBe(3);

      const kind2 = group.members.find(m => m.id === '1004');
      expect(kind2).toBeDefined();
      // Kind 2 ist faktisch das einzige Kind im Familienbeitrag und als aktives Kind Ü18 nun das 1. aktive Kind -> 10 €
      expect(kind2?.fee).toBe(10.0);
      expect(kind2?.reason).toBe('1. aktives Kind unter 25 Jahren (+10 €)');

      // Gesamt: 20 € (Vater) + 10 € (Mutter) + 10 € (Kind 2 Ü18 aktiv) = 40 €
      expect(group.totalAmount).toBe(40.0);
    });

    it('Test 6 (Vergleich): Beide Kinder unter 25 (Kind 1 ist 24 J. aktiv, Kind 2 ist 20 J. aktiv) -> Kind 1 zahlt 10 €, Kind 2 zahlt 0 €', () => {
      const members: Member[] = [
        {
          rowIndex: 2,
          id: '1001',
          firstName: 'Max',
          lastName: 'Mustermann',
          fullName: 'Max Mustermann',
          status: 'active',
          birthDate: '01.01.1970',
          age: currentYear - 1970,
          accountHolder: 'Mustermann, Max',
          iban: 'DE23100000001234567890',
          bic: 'TESTDEDDXXX',
          sepaMandate: 'MANDAT-01',
          signatureDate: '01.01.2020',
          parent1: '0',
          parent2: '0',
          partner: '1002',
          famPayerFlag: '1',
          famMemberFlag: '0',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
        {
          rowIndex: 3,
          id: '1002',
          firstName: 'Musterfrau',
          lastName: 'Mustermann',
          fullName: 'Musterfrau Mustermann',
          status: 'active',
          birthDate: '01.01.1972',
          age: currentYear - 1972,
          accountHolder: 'Mustermann, Max',
          iban: '',
          bic: '',
          sepaMandate: '',
          signatureDate: '',
          parent1: '0',
          parent2: '0',
          partner: '1001',
          famPayerFlag: '0',
          famMemberFlag: '1',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
        {
          rowIndex: 4,
          id: '1003',
          firstName: 'Kind1',
          lastName: 'Mustermann',
          fullName: 'Kind1 Mustermann',
          status: 'active',
          birthDate: `01.01.${currentYear - 24}`,
          age: 24,
          accountHolder: 'Mustermann, Max',
          iban: '',
          bic: '',
          sepaMandate: '',
          signatureDate: '',
          parent1: '1001',
          parent2: '1002',
          partner: '0',
          famPayerFlag: '0',
          famMemberFlag: '1',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
        {
          rowIndex: 5,
          id: '1004',
          firstName: 'Kind2',
          lastName: 'Mustermann',
          fullName: 'Kind2 Mustermann',
          status: 'active',
          birthDate: `01.01.${currentYear - 20}`,
          age: 20,
          accountHolder: 'Mustermann, Max',
          iban: '',
          bic: '',
          sepaMandate: '',
          signatureDate: '',
          parent1: '1001',
          parent2: '1002',
          partner: '0',
          famPayerFlag: '0',
          famMemberFlag: '1',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
      ];

      const result = processContributions(members);

      // Beide Kinder < 25 -> kein Klärungsfall
      expect(result.unassignedMembers.length).toBe(0);

      const group = result.payerGroups[0];
      expect(group.memberCount).toBe(4);

      const kind1 = group.members.find(m => m.id === '1003');
      const kind2 = group.members.find(m => m.id === '1004');

      // Kind 1 ist 1. aktives Kind -> 10 €
      expect(kind1?.fee).toBe(10.0);
      expect(kind1?.reason).toBe('1. aktives Kind unter 25 Jahren (+10 €)');

      // Kind 2 ist 2. aktives Kind -> beitragsfrei (0 €)
      expect(kind2?.fee).toBe(0.0);
      expect(kind2?.reason).toBe('2. aktives Kind unter 25 (beitragsfrei)');

      // Gesamt: 20 € (Vater) + 10 € (Mutter) + 10 € (Kind 1) + 0 € (Kind 2) = 40 €
      expect(group.totalAmount).toBe(40.0);
    });
  });

  describe('Gekündigte & verstorbene Mitglieder (Info ohne Warnung, kein Einzug)', () => {
    it('erkennt Ausgetretene / Gekündigte über Status und Spalte 6 korrekt', () => {
      expect(isResigned(createMember({ status: 'resigned' }))).toBe(true);
      expect(isResigned(createMember({ status: 'ausgetreten' }))).toBe(true);
      expect(isResigned(createMember({ status: 'gekündigt' }))).toBe(true);
      expect(isResigned(createMember({ status: 'gekuendigt' }))).toBe(true);
      expect(isResigned(createMember({ status: 'active', raw: ['', '', '', '', '', '2023'] }))).toBe(true);
      expect(isResigned(createMember({ status: 'active', raw: ['', '', '', '', '', '0'] }))).toBe(false);
      expect(isResigned(createMember({ status: 'active' }))).toBe(false);
    });

    it('erkennt Verstorbene über Status und Kommentar korrekt', () => {
      expect(isDeceased(createMember({ status: 'deceased' }))).toBe(true);
      expect(isDeceased(createMember({ status: 'verstorben' }))).toBe(true);
      expect(isDeceased(createMember({ status: 'active', comment: 'Im Januar verstorben' }))).toBe(true);
      expect(isDeceased(createMember({ status: 'active', comment: 'Reguläres Mitglied' }))).toBe(false);
    });

    it('isInactiveMember bündelt Gekündigte und Verstorbene', () => {
      expect(isInactiveMember(createMember({ status: 'resigned' }))).toBe(true);
      expect(isInactiveMember(createMember({ status: 'verstorben' }))).toBe(true);
      expect(isInactiveMember(createMember({ status: 'active' }))).toBe(false);
    });

    it('behandelt inaktive Mitglieder in SAMPLE_CSV als reine Info (0 €) ohne Warnung', () => {
      const members = parseMembersCSV(SAMPLE_CSV);
      const result = processContributions(members);

      // 1. Gekündigte & verstorbene Personen werden in inactiveMembers gesammelt
      expect(result.inactiveMembers.length).toBe(2);
      const resignedMember = result.inactiveMembers.find(m => m.id === '10342');
      const deceasedMember = result.inactiveMembers.find(m => m.id === '10506');

      expect(resignedMember).toBeDefined();
      expect(resignedMember?.inactiveType).toBe('resigned');
      expect(resignedMember?.reasonText).toContain('Ausgetreten');

      expect(deceasedMember).toBeDefined();
      expect(deceasedMember?.inactiveType).toBe('deceased');
      expect(deceasedMember?.reasonText).toContain('Verstorben');

      // 2. Inaktive Mitglieder landen NICHT in unassignedMembers (keine Warnung/Fehler)
      expect(result.unassignedMembers.length).toBe(0);

      // 3. Reines inaktives Mitglied (10506) erzeugt keine leere 0 € Zahlergruppe
      const deceasedGroup = result.payerGroups.find(g => g.payerId === '10506');
      expect(deceasedGroup).toBeUndefined();

      // 4. Inaktives Mitglied in einer Familie (10342 bei Mustername) wird mit 0 € geführt
      const g2 = result.payerGroups.find(g => g.payerId === '10195');
      const kind1InGroup = g2?.members.find(m => m.id === '10342');
      expect(kind1InGroup?.fee).toBe(0.0);
      expect(kind1InGroup?.reason).toContain('Ausgetreten');

      // 5. Prüfbericht (Audit-CSV) führt inaktive Mitglieder mit INFO und 0,00 €
      const auditCsv = generateAuditCsv(result.payerGroups, result.unassignedMembers, result.inactiveMembers);
      expect(auditCsv).toContain('INFO: Ausgetreten seit 2022');
      expect(auditCsv).toContain('INFO: Verstorben (kein Beitragseinzug)');
      expect(auditCsv).not.toContain('FEHLER: Kein Zahler');
    });
  });

  describe('Alleinstehende Familienzahler (keine weiteren Angehörigen vorhanden)', () => {
    const currentYear = new Date().getFullYear();

    it('stellt aktiven Familienzahler ohne Angehörige automatisch auf Einzelzahler um (25 € berechnet, keine Warnung)', () => {
      const members: Member[] = [
        {
          rowIndex: 2,
          id: '2001',
          firstName: 'Allein',
          lastName: 'Zahler',
          fullName: 'Allein Zahler',
          status: 'active',
          birthDate: '01.01.1980',
          age: currentYear - 1980,
          accountHolder: 'Zahler, Allein',
          iban: 'DE23100000001234567890',
          bic: 'TESTDEDDXXX',
          sepaMandate: 'MANDAT-SINGLE-FAM',
          signatureDate: '01.01.2020',
          parent1: '0',
          parent2: '0',
          partner: '0',
          famPayerFlag: '1',
          famMemberFlag: '0',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
      ];

      const result = processContributions(members);
      expect(result.payerGroups.length).toBe(1);

      const group = result.payerGroups[0];
      expect(group.memberCount).toBe(1);
      expect(group.isFamily).toBe(false);
      expect(group.totalAmount).toBe(25.0); // Automatisch auf Einzelzahler (aktiv: 25 €) umgestellt
      expect(group.members[0].fee).toBe(25.0);
      expect(group.members[0].reason).toContain('Erwachsener aktiv');

      // Keine Warnung vorhanden
      expect(group.warnings.length).toBe(0);
      const singleWarning = group.warnings.find(w => w.includes('Alleinstehender Familienzahler'));
      expect(singleWarning).toBeUndefined();
    });

    it('stellt passiven Familienzahler ohne Angehörige automatisch auf Einzelzahler um (12 € berechnet, keine Warnung)', () => {
      const members: Member[] = [
        {
          rowIndex: 2,
          id: '2002',
          firstName: 'Passiv',
          lastName: 'Allein',
          fullName: 'Passiv Allein',
          status: 'passive',
          birthDate: '01.01.1975',
          age: currentYear - 1975,
          accountHolder: 'Allein, Passiv',
          iban: 'DE23100000001234567890',
          bic: 'TESTDEDDXXX',
          sepaMandate: 'MANDAT-SINGLE-FAM2',
          signatureDate: '01.01.2020',
          parent1: '0',
          parent2: '0',
          partner: '0',
          famPayerFlag: '1',
          famMemberFlag: '0',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
      ];

      const result = processContributions(members);
      const group = result.payerGroups[0];
      expect(group.isFamily).toBe(false);
      expect(group.totalAmount).toBe(12.0); // Automatisch auf Einzelzahler (passiv: 12 €) umgestellt
      expect(group.members[0].fee).toBe(12.0);
      expect(group.members[0].reason).toContain('Erwachsener passiv');

      expect(group.warnings.length).toBe(0);
      const singleWarning = group.warnings.find(w => w.includes('Alleinstehender Familienzahler'));
      expect(singleWarning).toBeUndefined();
    });

    it('stellt Zahler auf Einzelzahler um (25 €) ohne Warnung, wenn einzige Partnerin verstorben oder ausgetreten ist', () => {
      const members: Member[] = [
        {
          rowIndex: 2,
          id: '2003',
          firstName: 'Witwer',
          lastName: 'Zahler',
          fullName: 'Witwer Zahler',
          status: 'active',
          birthDate: '01.01.1960',
          age: currentYear - 1960,
          accountHolder: 'Zahler, Witwer',
          iban: 'DE23100000001234567890',
          bic: 'TESTDEDDXXX',
          sepaMandate: 'MANDAT-WITWER',
          signatureDate: '01.01.2020',
          parent1: '0',
          parent2: '0',
          partner: '2004',
          famPayerFlag: '1',
          famMemberFlag: '0',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
        {
          rowIndex: 3,
          id: '2004',
          firstName: 'Verstorbene',
          lastName: 'Zahler',
          fullName: 'Verstorbene Zahler',
          status: 'deceased',
          birthDate: '01.01.1962',
          age: currentYear - 1962,
          accountHolder: 'Zahler, Witwer',
          iban: '',
          bic: '',
          sepaMandate: '',
          signatureDate: '',
          parent1: '0',
          parent2: '0',
          partner: '2003',
          famPayerFlag: '0',
          famMemberFlag: '1',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: 'Verstorben',
          raw: [],
        },
      ];

      const result = processContributions(members);
      const group = result.payerGroups[0];

      // Zahler ist die einzige lebende Person in der Gruppe -> Umstellung auf Einzelzahler (aktiv: 25 €)
      expect(group.isFamily).toBe(false);
      expect(group.totalAmount).toBe(25.0);
      expect(group.members[0].fee).toBe(25.0);
      expect(group.members[0].reason).toContain('Erwachsener aktiv');
      expect(group.members[1].fee).toBe(0.0);

      // Keine Warnung wegen alleistehendem Familienzahler
      expect(group.warnings.length).toBe(0);
      const singleWarning = group.warnings.find(w => w.includes('Alleinstehender Familienzahler'));
      expect(singleWarning).toBeUndefined();
    });

    it('stellt Sponsor/Payer, dessen Töchter ausgetreten sind, automatisch auf Einzelzahler (0 €) ohne Warnung um', () => {
      const members: Member[] = [
        {
          rowIndex: 2,
          id: '3001',
          firstName: 'Sponsor',
          lastName: 'Muster',
          fullName: 'Sponsor Muster',
          status: 'sponsor',
          birthDate: '01.01.1965',
          age: currentYear - 1965,
          accountHolder: 'Muster, Sponsor',
          iban: 'DE23100000001234567890',
          bic: 'TESTDEDDXXX',
          sepaMandate: 'MANDAT-SPONSOR',
          signatureDate: '01.01.2020',
          parent1: '0',
          parent2: '0',
          partner: '0',
          famPayerFlag: '0', // WICHTIG: Flag ist 0, aber Töchter hängen an ihm dran
          famMemberFlag: '0',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
        {
          rowIndex: 3,
          id: '3002',
          firstName: 'Tochter1',
          lastName: 'Muster',
          fullName: 'Tochter1 Muster',
          status: 'ausgetreten',
          birthDate: '01.01.2000',
          age: currentYear - 2000,
          accountHolder: 'Muster, Sponsor',
          iban: '',
          bic: '',
          sepaMandate: '',
          signatureDate: '',
          parent1: '3001',
          parent2: '0',
          partner: '0',
          famPayerFlag: '0',
          famMemberFlag: '0',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
        {
          rowIndex: 4,
          id: '3003',
          firstName: 'Tochter2',
          lastName: 'Muster',
          fullName: 'Tochter2 Muster',
          status: 'resigned',
          birthDate: '01.01.2003',
          age: currentYear - 2003,
          accountHolder: 'Muster, Sponsor',
          iban: '',
          bic: '',
          sepaMandate: '',
          signatureDate: '',
          parent1: '3001',
          parent2: '0',
          partner: '0',
          famPayerFlag: '0',
          famMemberFlag: '0',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
      ];

      const result = processContributions(members);
      expect(result.payerGroups.length).toBe(1);

      const group = result.payerGroups[0];
      // Sponsor wurde automatisch auf Einzelzahler umgestellt. Sponsor ist Ehrenmitglied -> 0 €
      expect(group.isFamily).toBe(false);
      expect(group.totalAmount).toBe(0.0);
      expect(group.members[0].fee).toBe(0.0);
      expect(group.members[0].reason).toContain('Beitragsfrei gem. § 1 Abs. 6');

      // Töchter sind mit 0 € erfasst
      expect(group.members[1].fee).toBe(0.0);
      expect(group.members[2].fee).toBe(0.0);

      // Keine Warnung vorhanden
      expect(group.warnings.length).toBe(0);
      const singleWarning = group.warnings.find(w => w.includes('Alleinstehender Familienzahler'));
      expect(singleWarning).toBeUndefined();
    });
  });

  describe('Filterlogik für Zahlergruppen (Status, Ehrenmitglieder, Familienbeitrag, etc.)', () => {
    const members = parseMembersCSV(SAMPLE_CSV);
    const { payerGroups } = processContributions(members);

    it('StatusFilter "all": liefert alle Zahlergruppen zurück', () => {
      const filtered = payerGroups.filter(g => matchesStatusFilter(g, 'all'));
      expect(filtered.length).toBe(7);
    });

    it('StatusFilter "active": liefert Gruppen mit aktiven Mitgliedern (5 Zahler)', () => {
      const filtered = payerGroups.filter(g => matchesStatusFilter(g, 'active'));
      expect(filtered.length).toBe(5);
      const payerIds = filtered.map(g => g.payerId);
      expect(payerIds).toContain('10401'); // Mustermann (Familie mit Aktiven)
      expect(payerIds).toContain('10195'); // Mustername (Familie mit aktiver Frau)
      expect(payerIds).toContain('10501'); // Hans Huber (Aktiv)
      expect(payerIds).toContain('10503'); // Markus Weber (Aktiv, 1. Vorstand)
      expect(payerIds).toContain('10504'); // Anton Albrecht (Aktiv, Ehrenvorstand)
      expect(payerIds).not.toContain('10502'); // Peter Schmidt (Reiner Passiver)
      expect(payerIds).not.toContain('10505'); // Josef Maier (Reiner Passiver)
    });

    it('StatusFilter "passive": liefert nur reine passive Gruppen (2 Zahler)', () => {
      const filtered = payerGroups.filter(g => matchesStatusFilter(g, 'passive'));
      expect(filtered.length).toBe(2);
      const payerIds = filtered.map(g => g.payerId);
      expect(payerIds).toContain('10502'); // Peter Schmidt
      expect(payerIds).toContain('10505'); // Josef Maier (Ehrenmitglied, passiv)
    });

    it('StatusFilter "honorary": liefert Gruppen mit Ehrenmitgliedern / beitragsbefreitem Ehrenamt (§ 1 Abs. 6)', () => {
      const filtered = payerGroups.filter(g => matchesStatusFilter(g, 'honorary'));
      expect(filtered.length).toBe(2);
      const payerIds = filtered.map(g => g.payerId);
      expect(payerIds).toContain('10504'); // Anton Albrecht (Ehrenvorstand)
      expect(payerIds).toContain('10505'); // Josef Maier (Ehrenmitglied)
      expect(payerIds).not.toContain('10503'); // Markus Weber (1. Vorstand ist regulär, nicht ehrenamtlich befreit)
    });

    it('StatusFilter "family": liefert Familienzahler (2 Gruppen)', () => {
      const filtered = payerGroups.filter(g => matchesStatusFilter(g, 'family'));
      expect(filtered.length).toBe(2);
      const payerIds = filtered.map(g => g.payerId);
      expect(payerIds).toContain('10401'); // Mustermann Max
      expect(payerIds).toContain('10195'); // Mustername Mann
      expect(payerIds).not.toContain('10501'); // Hans Huber (Einzelzahler)
    });

    it('StatusFilter "single": liefert Einzelzahler (5 Gruppen)', () => {
      const filtered = payerGroups.filter(g => matchesStatusFilter(g, 'single'));
      expect(filtered.length).toBe(5);
      const payerIds = filtered.map(g => g.payerId);
      expect(payerIds).toContain('10501');
      expect(payerIds).toContain('10502');
      expect(payerIds).toContain('10503');
      expect(payerIds).toContain('10504');
      expect(payerIds).toContain('10505');
      expect(payerIds).not.toContain('10401');
      expect(payerIds).not.toContain('10195');
    });

    it('StatusFilter "free": liefert beitragsfreie Lastschriften (0,00 €) zurück', () => {
      const filtered = payerGroups.filter(g => matchesStatusFilter(g, 'free'));
      expect(filtered.length).toBe(2);
      const payerIds = filtered.map(g => g.payerId);
      expect(payerIds).toContain('10504'); // Anton Albrecht (0 €)
      expect(payerIds).toContain('10505'); // Josef Maier (0 €)
      filtered.forEach(g => expect(g.totalAmount).toBe(0));
    });

    it('ValidityFilter: prüft Gültigkeit und Warnungen korrekt', () => {
      const valid = payerGroups.filter(g => matchesValidityFilter(g, 'valid'));
      expect(valid.length).toBe(7); // Alle im Sample sind valid (keine IBAN-/Mandatsfehler)

      const issues = payerGroups.filter(g => matchesValidityFilter(g, 'issues'));
      expect(issues.length).toBe(0); // Keine künstlichen Partner-Warnungen mehr; reguläre Familien sind fehlerfrei
    });

    it('matchesSearchQuery: findet Zahler nach Name, IBAN und Gruppenmitgliedern', () => {
      // Suche nach Name des Zahlers
      expect(payerGroups.filter(g => matchesSearchQuery(g, 'Weber')).length).toBe(1);
      // Suche nach Vorname des Zahlers
      expect(payerGroups.filter(g => matchesSearchQuery(g, 'Markus')).length).toBe(1);
      // Suche nach IBAN
      expect(payerGroups.filter(g => matchesSearchQuery(g, 'DE89370400440532013000')).length).toBe(1);
      // Suche nach Mitglied in Gruppe (Musterfrau ist Angehörige bei Max Mustermann 10401)
      expect(payerGroups.filter(g => matchesSearchQuery(g, 'Musterfrau')).length).toBe(1);
      // Suche nach Funktion (Ehrenvorstand)
      expect(payerGroups.filter(g => matchesSearchQuery(g, 'Ehrenvorstand')).length).toBe(1);
    });

    it('filterPayerGroup: kombiniert Status, Gültigkeit und Suchbegriff', () => {
      // Nur aktive Familienzahler mit Suchbegriff "Mustermann"
      const result = payerGroups.filter(g =>
        filterPayerGroup(g, 'family', 'all', 'Mustermann')
      );
      expect(result.length).toBe(1);
      expect(result[0].payerId).toBe('10401');

      // Ehrenmitglieder mit Suchbegriff "Maier"
      const maierResult = payerGroups.filter(g =>
        filterPayerGroup(g, 'honorary', 'all', 'Maier')
      );
      expect(maierResult.length).toBe(1);
      expect(maierResult[0].payerId).toBe('10505');

      // Ehrenmitglieder mit Suchbegriff "Huber" -> keine Treffer
      const noneResult = payerGroups.filter(g =>
        filterPayerGroup(g, 'honorary', 'all', 'Huber')
      );
      expect(noneResult.length).toBe(0);
    });
  });

  describe('MemberStatus Konstanten, Enums & Status-Klassifizierung (alle 26 Status-Codes)', () => {
    it('definiert alle 26 Status-Codes in MemberStatus und MemberStatusEnum', () => {
      const keys = Object.values(MemberStatus);
      expect(keys.length).toBe(26);

      // Prüfe Schlüssel aller 26 Status
      expect(MemberStatus.PREMIUM).toBe('premium');
      expect(MemberStatus.ACTIVE).toBe('active');
      expect(MemberStatus.LIMITED).toBe('limited');
      expect(MemberStatus.INFANT).toBe('infant');
      expect(MemberStatus.CHILD).toBe('child');
      expect(MemberStatus.TEEN).toBe('teen');
      expect(MemberStatus.TWEN).toBe('twen');

      expect(MemberStatus.PASSIVE).toBe('passive');
      expect(MemberStatus.PPREM).toBe('pprem');
      expect(MemberStatus.PLIMIT).toBe('plimit');
      expect(MemberStatus.PINFANT).toBe('pinfant');
      expect(MemberStatus.PKID).toBe('pkid');
      expect(MemberStatus.PTEEN).toBe('pteen');
      expect(MemberStatus.PTWEN).toBe('ptwen');
      expect(MemberStatus.SENIOR).toBe('senior');

      expect(MemberStatus.GUEST).toBe('guest');
      expect(MemberStatus.GPREM).toBe('gprem');
      expect(MemberStatus.GLIMIT).toBe('glimit');
      expect(MemberStatus.GINFANT).toBe('ginfant');
      expect(MemberStatus.GKID).toBe('gkid');
      expect(MemberStatus.GTEEN).toBe('gteen');
      expect(MemberStatus.GTWEN).toBe('gtwen');

      expect(MemberStatus.SPONSOR).toBe('sponsor');
      expect(MemberStatus.TEMP).toBe('temp');
      expect(MemberStatus.RESIGNED).toBe('resigned');
      expect(MemberStatus.DECEASED).toBe('deceased');

      // MemberStatusEnum stimmt überein
      expect(MemberStatusEnum.SPONSOR).toBe('sponsor');
      expect(MemberStatusEnum.SENIOR).toBe('senior');
      expect(MemberStatusEnum.TWEN).toBe('twen');
    });

    it('MEMBER_STATUS_LABELS enthält alle 26 Klarnamen aus der Vereinsverwaltung', () => {
      expect(Object.keys(MEMBER_STATUS_LABELS).length).toBe(26);

      // Aktive
      expect(getMemberStatusLabel('premium')).toBe('Aktiv (50%)');
      expect(getMemberStatusLabel('active')).toBe('Aktiv');
      expect(getMemberStatusLabel('limited')).toBe('Aktiv (Limitiert)');
      expect(getMemberStatusLabel('infant')).toBe('Kleinkind');
      expect(getMemberStatusLabel('child')).toBe('Kind');
      expect(getMemberStatusLabel('teen')).toBe('Jugend');
      expect(getMemberStatusLabel('twen')).toBe('Jungaktiv');

      // Passive
      expect(getMemberStatusLabel('passive')).toBe('Passiv');
      expect(getMemberStatusLabel('pprem')).toBe('Passiv (Premium)');
      expect(getMemberStatusLabel('plimit')).toBe('Passiv (Limitiert)');
      expect(getMemberStatusLabel('pinfant')).toBe('Passiv (Kleinkind)');
      expect(getMemberStatusLabel('pkid')).toBe('Passiv (Kind)');
      expect(getMemberStatusLabel('pteen')).toBe('Passiv (Jugend)');
      expect(getMemberStatusLabel('ptwen')).toBe('Passiv (Jungaktiv)');
      expect(getMemberStatusLabel('senior')).toBe('Rentner');

      // Gäste
      expect(getMemberStatusLabel('guest')).toBe('Gast');
      expect(getMemberStatusLabel('gprem')).toBe('Gast (Premium)');
      expect(getMemberStatusLabel('glimit')).toBe('Gast (Limitiert)');
      expect(getMemberStatusLabel('ginfant')).toBe('Gast (Kleinkind)');
      expect(getMemberStatusLabel('gkid')).toBe('Gast (Kind)');
      expect(getMemberStatusLabel('gteen')).toBe('Gast (Jugend)');
      expect(getMemberStatusLabel('gtwen')).toBe('Gast (Jungaktiv)');

      // Sonderstatus
      expect(getMemberStatusLabel('sponsor')).toBe('Ehrenmitglied');
      expect(getMemberStatusLabel('temp')).toBe('Temporär');
      expect(getMemberStatusLabel('resigned')).toBe('Ausgeschieden');
      expect(getMemberStatusLabel('deceased')).toBe('Verstorben');
    });

    it('isActiveStatus klassifiziert Musiker / Aktive korrekt', () => {
      expect(isActiveStatus('active')).toBe(true);
      expect(isActiveStatus('premium')).toBe(true);
      expect(isActiveStatus('limited')).toBe(true);
      expect(isActiveStatus('twen')).toBe(true);
      expect(isActiveStatus('teen')).toBe(true);
      expect(isActiveStatus('child')).toBe(true);
      expect(isActiveStatus('infant')).toBe(true);

      expect(isActiveStatus('passive')).toBe(false);
      expect(isActiveStatus('senior')).toBe(false);
      expect(isActiveStatus('guest')).toBe(false);
      expect(isActiveStatus('sponsor')).toBe(false);
      expect(isActiveStatus('resigned')).toBe(false);
    });

    it('isPassiveStatus klassifiziert passive Mitglieder korrekt', () => {
      expect(isPassiveStatus('passive')).toBe(true);
      expect(isPassiveStatus('pprem')).toBe(true);
      expect(isPassiveStatus('plimit')).toBe(true);
      expect(isPassiveStatus('pinfant')).toBe(true);
      expect(isPassiveStatus('pkid')).toBe(true);
      expect(isPassiveStatus('pteen')).toBe(true);
      expect(isPassiveStatus('ptwen')).toBe(true);
      expect(isPassiveStatus('senior')).toBe(true);

      expect(isPassiveStatus('active')).toBe(false);
      expect(isPassiveStatus('twen')).toBe(false);
      expect(isPassiveStatus('guest')).toBe(false);
    });

    it('isChildOrYouthStatus klassifiziert Kinder und Jugendliche korrekt', () => {
      expect(isChildOrYouthStatus('infant')).toBe(true);
      expect(isChildOrYouthStatus('child')).toBe(true);
      expect(isChildOrYouthStatus('teen')).toBe(true);
      expect(isChildOrYouthStatus('pinfant')).toBe(true);
      expect(isChildOrYouthStatus('pkid')).toBe(true);
      expect(isChildOrYouthStatus('pteen')).toBe(true);
      expect(isChildOrYouthStatus('ginfant')).toBe(true);
      expect(isChildOrYouthStatus('gkid')).toBe(true);
      expect(isChildOrYouthStatus('gteen')).toBe(true);

      expect(isChildOrYouthStatus('active')).toBe(false);
      expect(isChildOrYouthStatus('twen')).toBe(false);
      expect(isChildOrYouthStatus('passive')).toBe(false);
      expect(isChildOrYouthStatus('senior')).toBe(false);
    });

    it('isGuestStatus klassifiziert Gäste korrekt', () => {
      expect(isGuestStatus('guest')).toBe(true);
      expect(isGuestStatus('gprem')).toBe(true);
      expect(isGuestStatus('glimit')).toBe(true);
      expect(isGuestStatus('ginfant')).toBe(true);
      expect(isGuestStatus('gkid')).toBe(true);
      expect(isGuestStatus('gteen')).toBe(true);
      expect(isGuestStatus('gtwen')).toBe(true);

      expect(isGuestStatus('active')).toBe(false);
      expect(isGuestStatus('passive')).toBe(false);
    });

    it('isHonoraryMember erkennt Status "sponsor" sofort als beitragsfreies Ehrenmitglied (§ 1 Abs. 6)', () => {
      const sponsorMember: Member = {
        rowIndex: 1,
        id: '5001',
        firstName: 'Ehren',
        lastName: 'Mann',
        fullName: 'Ehren Mann',
        status: MemberStatus.SPONSOR, // 'sponsor'
        birthDate: '01.01.1950',
        age: 76,
        accountHolder: 'Ehren Mann',
        iban: 'DE23100000001234567890',
        bic: 'TESTDEDDXXX',
        sepaMandate: 'MANDAT-EHREN',
        signatureDate: '01.01.2020',
        parent1: '0',
        parent2: '0',
        partner: '0',
        famPayerFlag: '0',
        famMemberFlag: '0',
        boardFunction: '',
        clubFunction: '',
        otherFunction: '',
        maskGroup: '',
        danceGroup: '',
        comment: '',
        raw: [],
      };

      expect(isHonoraryMember(sponsorMember)).toBe(true);

      const result = processContributions([sponsorMember]);
      expect(result.payerGroups.length).toBe(1);
      const group = result.payerGroups[0];
      // Als Einzelzahler mit Status sponsor ist der Beitrag 0 €
      expect(group.totalAmount).toBe(0.0);
      expect(group.members[0].fee).toBe(0.0);
      expect(group.members[0].reason).toContain('Beitragsfrei gem. § 1 Abs. 6');
    });
  });

  describe('Stichtag 15.04. für Altersberechnungen & Fälligkeit', () => {
    it('getDefaultCutoffDate liefert den 15. April des Jahres', () => {
      const cutoff = getDefaultCutoffDate(2026);
      expect(cutoff.getFullYear()).toBe(2026);
      expect(cutoff.getMonth()).toBe(3); // 3 = April (0-indexiert)
      expect(cutoff.getDate()).toBe(15);
    });

    it('berechnet Alter bezogen auf den Stichtag 15.04. (Person wird im Herbst 18 -> bleibt 17 zum Stichtag)', () => {
      const cutoff = new Date(2026, 3, 15);
      // Geburtstag im August 2008 -> wird erst im August 2026 18 Jahre alt
      const ageAutumn = calculateAge('20.08.2008', cutoff);
      expect(ageAutumn).toBe(17);

      // Geburtstag vor dem 15.04.2008 -> ist zum Stichtag bereits 18
      const ageSpring = calculateAge('10.04.2008', cutoff);
      expect(ageSpring).toBe(18);
    });

    it('berechnet Alter bezogen auf 15.04. für Altersgrenze 25 (Person wird im Herbst 25 -> bleibt 24 zum Stichtag)', () => {
      const cutoff = new Date(2026, 3, 15);
      // Geburtstag im Oktober 2001 -> wird erst im Oktober 2026 25 Jahre alt
      const ageAutumn = calculateAge('01.10.2001', cutoff);
      expect(ageAutumn).toBe(24);

      // Geburtstag vor dem 15.04.2001 -> ist zum Stichtag bereits 25
      const ageSpring = calculateAge('01.01.2001', cutoff);
      expect(ageSpring).toBe(25);
    });
  });

  describe('Ehrenmitglieder im Familienverbund (§ 1 Abs. 6 & G1/G6)', () => {
    it('Ehrenmitglied als Familienzahler: zahlt 0 €; Hinweis für Familie wird erzeugt', () => {
      const members: Member[] = [
        createMember({
          id: '2001',
          firstName: 'Anton',
          lastName: 'Ehrenvorstand',
          fullName: 'Anton Ehrenvorstand',
          accountHolder: 'Anton Ehrenvorstand',
          iban: 'DE23100000001234567890',
          bic: 'TESTDEDDXXX',
          sepaMandate: 'MANDAT-ANTON',
          signatureDate: '01.01.2020',
          boardFunction: 'Ehrenvorstand',
          status: 'active',
          famPayerFlag: '1',
          partner: '2002',
        }),
        createMember({
          id: '2002',
          firstName: 'Berta',
          lastName: 'Ehrenvorstand',
          fullName: 'Berta Ehrenvorstand',
          accountHolder: 'Anton Ehrenvorstand',
          iban: '',
          sepaMandate: '',
          status: 'active',
          birthDate: '01.01.1975',
          age: 51,
          partner: '2001',
        }),
      ];

      const result = processContributions(members);
      expect(result.payerGroups.length).toBe(1);

      const group = result.payerGroups[0];
      // Anton (Ehrenvorstand) ist beitragsfrei (0 €)
      expect(group.members[0].fee).toBe(0.0);
      expect(group.members[0].reason).toContain('Beitragsfrei gem. § 1 Abs. 6');

      // Berta übernimmt den Familiensockel
      expect(group.members[1].fee).toBe(20.0);
      expect(group.members[1].reason).toContain('Familienbeitrag über Angehörige(n)');

      // Gesamtsumme ist 20 €
      expect(group.totalAmount).toBe(20.0);

      // Warnung/Hinweis vorhanden, dass Zahler Ehrenmitglied ist
      expect(group.warnings.some(w => w.includes('fällt aus dem Familienbeitrag heraus'))).toBe(true);
    });

    it('Ehrenmitglied als Angehörige: zahlt 0 €, Zahler ohne weitere Angehörige wird auf Einzelbeitrag umgestellt', () => {
      const members: Member[] = [
        createMember({
          id: '2010',
          firstName: 'Max',
          lastName: 'Normal',
          fullName: 'Max Normal',
          accountHolder: 'Max Normal',
          iban: 'DE23100000001234567890',
          bic: 'TESTDEDDXXX',
          sepaMandate: 'MANDAT-MAX',
          signatureDate: '01.01.2020',
          status: 'active',
          famPayerFlag: '1',
          partner: '2011',
        }),
        createMember({
          id: '2011',
          firstName: 'Maria',
          lastName: 'Normal',
          fullName: 'Maria Normal',
          accountHolder: 'Max Normal',
          iban: '',
          sepaMandate: '',
          status: 'active',
          clubFunction: 'Ehrenmitglied', // Maria ist Ehrenmitglied!
          birthDate: '01.01.1975',
          age: 51,
          partner: '2010',
        }),
      ];

      const result = processContributions(members);
      expect(result.payerGroups.length).toBe(1);

      const group = result.payerGroups[0];
      // Maria ist beitragsfrei (0 €)
      expect(group.members[1].fee).toBe(0.0);
      expect(group.members[1].reason).toContain('Beitragsfrei gem. § 1 Abs. 6');

      // Max wird als Einzelzahler (aktiv: 25 €) veranlagt, da Maria als Ehrenmitglied aus dem Familienverbund herausfällt
      expect(group.isFamily).toBe(false);
      expect(group.members[0].fee).toBe(25.0);
      expect(group.totalAmount).toBe(25.0);

      // Hinweis über Herauslösung vorhanden
      expect(group.warnings.some(w => w.includes('Maria Normal ist beitragsfreies Ehrenmitglied'))).toBe(true);
    });

    it('Ehrenmitglied als Familienzahler mit nur beitragsfreien Kindern (< 18 J.): Gesamtbetrag 0 € ohne Warnung', () => {
      const members: Member[] = [
        createMember({
          id: '2020',
          firstName: 'Josef',
          lastName: 'Ehrendirigent',
          fullName: 'Josef Ehrendirigent',
          accountHolder: 'Josef Ehrendirigent',
          iban: 'DE23100000001234567890',
          bic: 'TESTDEDDXXX',
          sepaMandate: 'MANDAT-JOSEF',
          signatureDate: '01.01.2020',
          clubFunction: 'Ehrendirigent',
          status: 'active',
          famPayerFlag: '1',
        }),
        createMember({
          id: '2021',
          firstName: 'Kind',
          lastName: 'Ehrendirigent',
          fullName: 'Kind Ehrendirigent',
          accountHolder: 'Josef Ehrendirigent',
          iban: '',
          sepaMandate: '',
          status: 'child',
          birthDate: '01.01.2015',
          age: 11,
          parent1: '2020',
        }),
      ];

      const result = processContributions(members);
      const group = result.payerGroups[0];
      expect(group.totalAmount).toBe(0.0);
      expect(group.members[0].fee).toBe(0.0);
      expect(group.members[1].fee).toBe(0.0);
      // Da alle legitim beitragsfrei sind, keine Warnung bzgl. fehlendem Familienzahler
      expect(group.warnings.some(w => w.includes('Für die Familie liegt kein regulärer Familienbeitragszahler vor'))).toBe(false);
    });
  });

  describe('Ehrenmitglieder ohne IBAN (§ 1 Abs. 6 - keine Warnung, kein Fehler)', () => {
    it('Ehrenmitglied ohne IBAN/Mandat erzeugt keine Warnung, keinen Fehler und landet nicht in unassignedMembers', () => {
      const honoraryNoIban: Member = {
        rowIndex: 1,
        id: '6001',
        firstName: 'Josef',
        lastName: 'Ehrenmann',
        fullName: 'Josef Ehrenmann',
        status: MemberStatus.SPONSOR, // 'sponsor'
        birthDate: '01.01.1945',
        age: 81,
        accountHolder: '',
        iban: '',
        bic: '',
        sepaMandate: '',
        signatureDate: '',
        parent1: '0',
        parent2: '0',
        partner: '0',
        famPayerFlag: '0',
        famMemberFlag: '0',
        boardFunction: '',
        clubFunction: 'Ehrenmitglied',
        otherFunction: '',
        maskGroup: '',
        danceGroup: '',
        comment: '',
        raw: [],
      };

      const result = processContributions([honoraryNoIban]);

      // 1. Landet NICHT in unassignedMembers (kein Fehler!)
      expect(result.unassignedMembers.length).toBe(0);

      // 2. Bildet eine eigene PayerGroup mit 0,00 €
      expect(result.payerGroups.length).toBe(1);
      const group = result.payerGroups[0];
      expect(group.totalAmount).toBe(0.0);
      expect(group.members[0].fee).toBe(0.0);
      expect(group.members[0].reason).toContain('Beitragsfrei gem. § 1 Abs. 6');

      // 3. Keine Fehler und keine Warnungen (z.B. keine IBAN-Warnung)
      expect(group.errors.length).toBe(0);
      expect(group.warnings.length).toBe(0);
      expect(group.isValid).toBe(true);
      expect(group.selectedForExport).toBe(false);

      // 4. Audit-CSV enthält beitragsfreien Eintrag ohne FEHLER:
      const auditCsv = generateAuditCsv(result.payerGroups, result.unassignedMembers, result.inactiveMembers);
      expect(auditCsv).toContain('Beitragsfrei gem. § 1 Abs. 6');
      expect(auditCsv).not.toContain('FEHLER:');
    });

    it('Ehrenmitglied ohne IBAN mit Kind (< 18 J.): Gesamtbetrag 0 € ohne Warnung/Fehler', () => {
      const members: Member[] = [
        createMember({
          id: '6010',
          firstName: 'Anton',
          lastName: 'Ehrenvorstand',
          fullName: 'Anton Ehrenvorstand',
          accountHolder: '',
          iban: '',
          sepaMandate: '',
          boardFunction: 'Ehrenvorstand',
          status: 'active',
          famPayerFlag: '1',
        }),
        createMember({
          id: '6011',
          firstName: 'Junior',
          lastName: 'Ehrenvorstand',
          fullName: 'Junior Ehrenvorstand',
          accountHolder: '',
          iban: '',
          sepaMandate: '',
          status: 'child',
          birthDate: '01.01.2015',
          age: 11,
          parent1: '6010',
        }),
      ];

      const result = processContributions(members);
      expect(result.unassignedMembers.length).toBe(0);
      expect(result.payerGroups.length).toBe(1);

      const group = result.payerGroups[0];
      expect(group.totalAmount).toBe(0.0);
      expect(group.errors.length).toBe(0);
      expect(group.warnings.length).toBe(0);
      expect(group.isValid).toBe(true);
    });

    it('Zwei Ehrenmitglieder (Ehepaar, beide ohne IBAN): Gesamtbetrag 0 € ohne Warnung/Fehler', () => {
      const members: Member[] = [
        createMember({
          id: '6020',
          firstName: 'Hans',
          lastName: 'Ehrenpaar',
          fullName: 'Hans Ehrenpaar',
          accountHolder: '',
          iban: '',
          sepaMandate: '',
          status: 'sponsor',
          clubFunction: 'Ehrenmitglied',
          partner: '6021',
        }),
        createMember({
          id: '6021',
          firstName: 'Hanna',
          lastName: 'Ehrenpaar',
          fullName: 'Hanna Ehrenpaar',
          accountHolder: '',
          iban: '',
          sepaMandate: '',
          status: 'sponsor',
          clubFunction: 'Ehrenmitglied',
          partner: '6020',
        }),
      ];

      const result = processContributions(members);
      expect(result.unassignedMembers.length).toBe(0);
      expect(result.payerGroups.length).toBe(1);

      const group = result.payerGroups[0];
      expect(group.totalAmount).toBe(0.0);
      expect(group.errors.length).toBe(0);
      expect(group.warnings.length).toBe(0);
      expect(group.isValid).toBe(true);
    });
  });

  describe('Rechnungszahler (IBAN "Per Rechnung" & Ausschluss aus SEPA)', () => {
    it('isInvoicePayer erkennt verschiedene Schreibweisen von "Per Rechnung"', () => {
      expect(isInvoicePayer('Per Rechnung')).toBe(true);
      expect(isInvoicePayer('per rechnung')).toBe(true);
      expect(isInvoicePayer('RECHNUNG')).toBe(true);
      expect(isInvoicePayer('Rechnungszahler')).toBe(true);
      expect(isInvoicePayer('DE23100000001234567890')).toBe(false);
      expect(isInvoicePayer('')).toBe(false);
    });

    it('erfasst Rechnungszahler als gültig, aber automatisch von SEPA-Export ausgenommen', () => {
      const invoiceMember = createMember({
        id: '3001',
        firstName: 'Rechnungs',
        lastName: 'Zahler',
        fullName: 'Rechnungs Zahler',
        accountHolder: 'Rechnungs Zahler',
        iban: 'Per Rechnung',
        bic: '',
        sepaMandate: '',
        status: 'active',
      });

      const result = processContributions([invoiceMember]);
      expect(result.payerGroups.length).toBe(1);

      const group = result.payerGroups[0];
      expect(group.isInvoice).toBe(true);
      expect(group.isValid).toBe(true);
      expect(group.errors.length).toBe(0); // Kein IBAN- oder Mandatsfehler!
      expect(group.selectedForExport).toBe(false); // Nicht für SEPA ausgewählt
      expect(group.totalAmount).toBe(25.0); // Beitrag wird trotzdem berechnet
      expect(group.warnings.some(w => w.includes('Zahlungsart: Per Rechnung'))).toBe(true);

      // In SEPA-CSV darf der Rechnungszahler NICHT exportiert werden
      const sepaCsv = generateSepaCsv(result.payerGroups);
      expect(sepaCsv).not.toContain('Rechnungs Zahler');

      // StatusFilter "invoice" findet die Gruppe
      expect(matchesStatusFilter(group, 'invoice')).toBe(true);
      expect(matchesStatusFilter(group, 'active')).toBe(true);
    });
  });

  describe('Dauerauftragszahler (IBAN "DAUERAUFTRAG" & Ausschluss aus SEPA)', () => {
    it('isStandingOrderPayer erkennt verschiedene Schreibweisen von "DAUERAUFTRAG"', () => {
      expect(isStandingOrderPayer('DAUERAUFTRAG')).toBe(true);
      expect(isStandingOrderPayer('Dauerauftrag')).toBe(true);
      expect(isStandingOrderPayer('dauerauftrag')).toBe(true);
      expect(isStandingOrderPayer('Per Dauerauftrag')).toBe(true);
      expect(isStandingOrderPayer('DAUERAUFTRAG ')).toBe(true);
      expect(isStandingOrderPayer('Dauerauftragszahler')).toBe(true);
      expect(isStandingOrderPayer('DE23100000001234567890')).toBe(false);
      expect(isStandingOrderPayer('')).toBe(false);
    });

    it('isValidIBAN und maskIBAN behandeln DAUERAUFTRAG als valide und maskieren nicht', () => {
      expect(isValidIBAN('DAUERAUFTRAG')).toBe(true);
      expect(isValidIBAN('Dauerauftrag')).toBe(true);
      expect(maskIBAN('DAUERAUFTRAG')).toBe('DAUERAUFTRAG');
      expect(maskIBAN('Dauerauftrag')).toBe('Dauerauftrag');
    });

    it('erfasst Dauerauftragszahler als gültig, aber automatisch von SEPA-Export ausgenommen', () => {
      const standingMember = createMember({
        id: '3501',
        firstName: 'Dauer',
        lastName: 'Zahler',
        fullName: 'Dauer Zahler',
        accountHolder: 'Dauer Zahler',
        iban: 'DAUERAUFTRAG',
        bic: '',
        sepaMandate: '',
        status: 'active',
      });

      const result = processContributions([standingMember]);
      expect(result.payerGroups.length).toBe(1);

      const group = result.payerGroups[0];
      expect(group.isStandingOrder).toBe(true);
      expect(group.isValid).toBe(true);
      expect(group.errors.length).toBe(0); // Kein IBAN- oder Mandatsfehler!
      expect(group.selectedForExport).toBe(false); // Nicht für SEPA ausgewählt
      expect(group.totalAmount).toBe(25.0); // Beitrag wird trotzdem berechnet
      expect(group.warnings.some(w => w.includes('Zahlungsart: Dauerauftrag'))).toBe(true);

      // In SEPA-CSV darf der Dauerauftragszahler NICHT exportiert werden
      const sepaCsv = generateSepaCsv(result.payerGroups);
      expect(sepaCsv).not.toContain('Dauer Zahler');

      // Im Prüfbericht (Audit-CSV) muss er für den Bankkonto-Abgleich enthalten sein
      const auditCsv = generateAuditCsv(result.payerGroups, []);
      expect(auditCsv).toContain('Dauer Zahler');
      expect(auditCsv).toContain('DAUERAUFTRAG');
      expect(auditCsv).toContain('25,00');

      // StatusFilter "standingOrder" findet die Gruppe
      expect(matchesStatusFilter(group, 'standingOrder')).toBe(true);
      expect(matchesStatusFilter(group, 'active')).toBe(true);
      expect(matchesStatusFilter(group, 'invoice')).toBe(false);
    });

    it('Familie mit Dauerauftrag zahlt Verbundbeitrag und ist von SEPA ausgenommen', () => {
      const father = createMember({
        id: '3510',
        firstName: 'Familien',
        lastName: 'Vater',
        fullName: 'Familien Vater',
        accountHolder: 'Familien Vater',
        iban: 'DAUERAUFTRAG',
        bic: '',
        sepaMandate: '',
        status: 'active',
        partner: '3511',
      });

      const mother = createMember({
        id: '3511',
        firstName: 'Familien',
        lastName: 'Mutter',
        fullName: 'Familien Mutter',
        accountHolder: 'Familien Vater',
        iban: '',
        bic: '',
        sepaMandate: '',
        status: 'active',
        partner: '3510',
      });

      const result = processContributions([father, mother]);
      expect(result.payerGroups.length).toBe(1);

      const group = result.payerGroups[0];
      expect(group.isFamily).toBe(true);
      expect(group.isStandingOrder).toBe(true);
      expect(group.isValid).toBe(true);
      expect(group.totalAmount).toBe(30.0); // 20 € Sockel + 10 € aktive Mutter
      expect(group.selectedForExport).toBe(false);

      const sepaCsv = generateSepaCsv(result.payerGroups);
      expect(sepaCsv).not.toContain('Familien Vater');

      const auditCsv = generateAuditCsv(result.payerGroups, []);
      expect(auditCsv).toContain('Familien Vater');
      expect(auditCsv).toContain('Familien Mutter');
      expect(auditCsv).toContain('DAUERAUFTRAG');
    });
  });

  describe('Warnung bei Status "Kind" mit Alter >= 18 zum Stichtag', () => {
    it('erzeugt Warnung bei Mitglied mit Status "child" und Alter >= 18', () => {
      const grownChild = createMember({
        id: '4001',
        firstName: 'Erwachsenes',
        lastName: 'Kind',
        fullName: 'Erwachsenes Kind',
        accountHolder: 'Erwachsenes Kind',
        iban: 'DE23100000001234567890',
        bic: 'TESTDEDDXXX',
        sepaMandate: 'MANDAT-KIND',
        signatureDate: '01.01.2020',
        status: 'child', // Status ist Kind
        birthDate: '01.01.2006', // 20 Jahre alt
        age: 20,
      });

      const result = processContributions([grownChild]);
      const group = result.payerGroups[0];

      // Warnung bzgl. Alter >= 18 bei Status Kind vorhanden
      expect(group.warnings.some(w => w.includes('Status „Kind“, ist aber zum Stichtag (15.04.) bereits 20 Jahre alt'))).toBe(true);
      // Zahlt als Erwachsener aktiv (25 €), da status 'child' ein aktiver Status ist
      expect(group.totalAmount).toBe(25.0);
    });

    it('erzeugt Warnung bei passiver Jugend/Kind (Status "pkid") mit Alter >= 18 (zahlt 12 € passiv)', () => {
      const grownPassiveChild = createMember({
        id: '4002',
        firstName: 'Passives',
        lastName: 'Kind',
        fullName: 'Passives Kind',
        accountHolder: 'Passives Kind',
        iban: 'DE23100000001234567890',
        bic: 'TESTDEDDXXX',
        sepaMandate: 'MANDAT-PKID',
        signatureDate: '01.01.2020',
        status: 'pkid', // Status ist Passiv (Kind)
        birthDate: '01.01.2006', // 20 Jahre alt
        age: 20,
      });

      const result = processContributions([grownPassiveChild]);
      const group = result.payerGroups[0];

      expect(group.warnings.some(w => w.includes('Status „Passiv (Kind)“, ist aber zum Stichtag (15.04.) bereits 20 Jahre alt'))).toBe(true);
      expect(group.totalAmount).toBe(12.0); // Passiv veranlagt (12 €)
    });
  });

  describe('Internationale IBANs & Warnung bei Nicht-DE', () => {
    it('erkennt ausländische IBAN mit gültigem MOD 97 als valide mit Prüfhinweis (Warnung)', () => {
      // Gültige österreichische IBAN (AT611904300234573201)
      const foreignPayer = createMember({
        id: '5001',
        firstName: 'Ösi',
        lastName: 'Musiker',
        fullName: 'Ösi Musiker',
        accountHolder: 'Ösi Musiker',
        iban: 'AT611904300234573201',
        bic: 'TESTDEDDXXX',
        sepaMandate: 'MANDAT-AT',
        signatureDate: '01.01.2020',
        status: 'active',
      });

      expect(isValidIBAN('AT611904300234573201')).toBe(true);

      const result = processContributions([foreignPayer]);
      const group = result.payerGroups[0];

      expect(group.isValid).toBe(true);
      expect(group.errors.length).toBe(0);
      expect(group.warnings.some(w => w.includes('Ausländische IBAN'))).toBe(true);
      expect(group.selectedForExport).toBe(true);
    });
  });

  describe('Lebenspartner ohne eigene IBAN/Mandat (§ 2 Beitragsordnung)', () => {
    it('erzeugt keine Warnung bei Lastschrifteinzug über das Mandat des Partners (regulärer Familienbeitrag)', () => {
      const payer = createMember({
        id: '6001',
        firstName: 'Paul',
        lastName: 'Payer',
        fullName: 'Paul Payer',
        iban: 'DE23100000001234567890',
        bic: 'TESTDEDDXXX',
        sepaMandate: 'MANDAT-6001',
        signatureDate: '01.01.2020',
        status: 'active',
        partner: '6002',
        famPayerFlag: '1',
      });
      const partner = createMember({
        id: '6002',
        firstName: 'Paula',
        lastName: 'Partner',
        fullName: 'Paula Partner',
        iban: '',
        bic: '',
        sepaMandate: '',
        signatureDate: '',
        status: 'active',
        partner: '6001',
        famMemberFlag: '1',
      });

      const result = processContributions([payer, partner]);
      const group = result.payerGroups[0];

      // Regulärer Familienbeitrag über den gemeinsamen Zahler: Gültig ohne Warnung
      expect(group.isValid).toBe(true);
      expect(group.warnings.length).toBe(0);
      expect(group.errors.length).toBe(0);
      expect(group.totalAmount).toBe(30.0); // 20 € Sockel + 10 € aktiver Partner
    });

    it('erzeugt keine Partner-Warnung bei Rechnungszahlern mit Lebenspartner', () => {
      const invoicePayer = createMember({
        id: '6003',
        firstName: 'Ralf',
        lastName: 'Rechnung',
        fullName: 'Ralf Rechnung',
        iban: 'Per Rechnung',
        status: 'active',
        partner: '6004',
        famPayerFlag: '1',
      });
      const invoicePartner = createMember({
        id: '6004',
        firstName: 'Rita',
        lastName: 'Rechnung',
        fullName: 'Rita Rechnung',
        iban: '',
        status: 'active',
        partner: '6003',
        famMemberFlag: '1',
      });

      const result = processContributions([invoicePayer, invoicePartner]);
      const group = result.payerGroups[0];

      // Rechnungszahler-Hinweis ist vorhanden, aber KEINE Warnung wegen Lebenspartner
      expect(group.warnings).toContain('Zahlungsart: Per Rechnung (Selbstzahler, kein SEPA-Einzug).');
      expect(group.warnings.some(w => w.includes('Lebenspartner'))).toBe(false);
    });
  });

  describe('Datenschutz & IBAN-Maskierung (maskIBAN)', () => {
    it('maskiert Standard-IBANs unter Beibehaltung von Prefix und Suffix', () => {
      expect(maskIBAN('DE23100000001234567890')).toBe('DE23 •••• •••• 7890');
      expect(maskIBAN('DE23 1000 0000 1234 5678 90')).toBe('DE23 •••• •••• 7890');
    });

    it('maskiert ausländische IBANs korrekt', () => {
      expect(maskIBAN('AT611904300234573201')).toBe('AT61 •••• •••• 3201');
    });

    it('belässt Rechnungszahler und kurze Strings unmaskiert', () => {
      expect(maskIBAN('Per Rechnung')).toBe('Per Rechnung');
      expect(maskIBAN('')).toBe('');
      expect(maskIBAN('DE12')).toBe('DE12');
    });
  });

  describe('Familienermittlung rein über Zuordnung (kein Familienzahlerflag) & Partner-Prüfung', () => {
    it('erkennt Familie rein über Zuordnung, selbst wenn famPayerFlag und famMemberFlag 0 sind', () => {
      const payer = createMember({
        id: '7001',
        firstName: 'Felix',
        lastName: 'Familie',
        fullName: 'Felix Familie',
        iban: 'DE12345678901234567890',
        sepaMandate: 'MANDAT-7001',
        status: 'active',
        partner: '7002',
        famPayerFlag: '0',
      });
      const partner = createMember({
        id: '7002',
        firstName: 'Frida',
        lastName: 'Familie',
        fullName: 'Frida Familie',
        iban: '',
        status: 'active',
        partner: '7001',
        famMemberFlag: '0',
      });

      const result = processContributions([payer, partner]);
      const group = result.payerGroups[0];

      expect(group.isFamily).toBe(true);
      expect(group.totalAmount).toBe(30.0); // 20 € Sockel + 10 € aktiver Partner
      expect(group.members.length).toBe(2);
      expect(group.warnings.length).toBe(0);
    });

    it('erkennt Alleinstehende nicht als Familie, selbst wenn famPayerFlag 1 ist', () => {
      const single = createMember({
        id: '7003',
        firstName: 'Simon',
        lastName: 'Single',
        fullName: 'Simon Single',
        iban: 'DE12345678901234567890',
        sepaMandate: 'MANDAT-7003',
        status: 'active',
        partner: '',
        famPayerFlag: '1', // Altes/falsches Flag im Altdatenbestand
      });

      const result = processContributions([single]);
      const group = result.payerGroups[0];

      expect(group.isFamily).toBe(false);
      expect(group.totalAmount).toBe(25.0);
      expect(group.warnings.length).toBe(0);
    });

    it('unterstützt bidirektionale Partnerverknüpfung (Zahler verweist auf Partner, Partnerfeld beim Partner ist leer)', () => {
      const payer = createMember({
        id: '7004',
        firstName: 'Bernd',
        lastName: 'Bidi',
        fullName: 'Bernd Bidi',
        iban: 'DE12345678901234567890',
        sepaMandate: 'MANDAT-7004',
        status: 'active',
        partner: '7005', // Zahler hat Partner eingetragen
        famPayerFlag: '0',
      });
      const partner = createMember({
        id: '7005',
        firstName: 'Bettina',
        lastName: 'Bidi',
        fullName: 'Bettina Bidi',
        iban: '',
        status: 'active',
        partner: '', // Beim Partner wurde das Feld in zunft.app nicht gepflegt
        famMemberFlag: '0',
      });

      const result = processContributions([payer, partner]);
      const group = result.payerGroups[0];

      expect(group.members.length).toBe(2);
      expect(group.isFamily).toBe(true);
      expect(group.totalAmount).toBe(30.0);
    });

    it('erzeugt Warnung (Stammdaten prüfen) wenn Zahler einen Lebenspartner hinterlegt hat, der nicht in der Liste existiert', () => {
      const payer = createMember({
        id: '8001',
        firstName: 'Peter',
        lastName: 'Partnerlos',
        fullName: 'Peter Partnerlos',
        iban: 'DE12345678901234567890',
        sepaMandate: 'MANDAT-8001',
        status: 'active',
        partner: '99999', // Partner-ID existiert nicht im Verein
        famPayerFlag: '0',
      });

      const result = processContributions([payer]);
      const group = result.payerGroups[0];

      expect(group.warnings.some(w =>
        w.includes('Hinterlegte(r) Lebenspartner(in) (Nr. 99999) von Peter Partnerlos existiert nicht in der Mitgliederliste (Stammdaten prüfen).')
      )).toBe(true);
      // Zahler zahlt als Einzelperson (25 €)
      expect(group.isFamily).toBe(false);
      expect(group.totalAmount).toBe(25.0);
    });

    it('erzeugt Hinweis in unassignedMembers wenn unzugeordnetes Mitglied einen Partner hat, der nicht existiert', () => {
      const orphan = createMember({
        id: '8002',
        firstName: 'Olga',
        lastName: 'OhneZahler',
        fullName: 'Olga OhneZahler',
        iban: '',
        status: 'active',
        partner: '99999', // Partner existiert nicht
      });

      const result = processContributions([orphan]);
      expect(result.unassignedMembers.length).toBe(1);
      const unassigned = result.unassignedMembers[0];
      expect(unassigned.issue).toContain('Hinterlegte(r) Lebenspartner(in) Nr. 99999 existiert nicht in der Mitgliederliste – Stammdaten prüfen');
    });

    it('erzeugt keine Warnung wenn Lebenspartner regulär in der Mitgliederliste vorhanden ist', () => {
      const payer = createMember({
        id: '8003',
        firstName: 'Klaus',
        lastName: 'Klar',
        fullName: 'Klaus Klar',
        status: 'active',
        partner: '8004',
      });
      const partner = createMember({
        id: '8004',
        firstName: 'Klara',
        lastName: 'Klar',
        fullName: 'Klara Klar',
        iban: '',
        sepaMandate: '',
        status: 'active',
        partner: '8003',
      });

      const result = processContributions([payer, partner]);
      const group = result.payerGroups[0];

      expect(group.warnings.length).toBe(0);
      expect(group.errors.length).toBe(0);
      expect(group.isValid).toBe(true);
    });

    it('erkennt Familie rein über Eltern-Kind-Beziehung völlig ohne Zugehörigkeitsflag', () => {
      const parent = createMember({
        id: '9001',
        firstName: 'Markus',
        lastName: 'Mama',
        fullName: 'Markus Mama',
        status: 'active',
        partner: '0',
      });
      const child = createMember({
        id: '9002',
        firstName: 'Charly',
        lastName: 'Kind',
        fullName: 'Charly Kind',
        iban: '',
        sepaMandate: '',
        status: 'active',
        age: 19,
        parent1: '9001',
      });

      const result = processContributions([parent, child]);
      const group = result.payerGroups[0];

      expect(group.isFamily).toBe(true);
      expect(group.members.length).toBe(2);
      expect(group.totalAmount).toBe(30.0); // 20 € Sockel + 10 € 1. aktives Kind
    });

    it('unterstützt indirekte Eltern-Zuordnung (Kind verweist auf Mutter ohne IBAN, Mutter ist Zahler-Vater zugeordnet)', () => {
      const father = createMember({
        id: '9003',
        firstName: 'Frank',
        lastName: 'Familie',
        fullName: 'Frank Familie',
        status: 'active',
        partner: '9004',
      });
      const mother = createMember({
        id: '9004',
        firstName: 'Monika',
        lastName: 'Familie',
        fullName: 'Monika Familie',
        iban: '',
        sepaMandate: '',
        status: 'passive',
        partner: '', // Einseitig beim Vater hinterlegt
      });
      const child = createMember({
        id: '9005',
        firstName: 'Clara',
        lastName: 'Familie',
        fullName: 'Clara Familie',
        iban: '',
        sepaMandate: '',
        status: 'active',
        age: 16,
        parent1: '9004', // Kind verweist auf Mutter (die selbst keine IBAN hat)
        parent2: '0',
      });

      const result = processContributions([father, mother, child]);
      expect(result.payerGroups.length).toBe(1);
      const group = result.payerGroups[0];

      expect(group.members.length).toBe(3);
      expect(group.isFamily).toBe(true);
      expect(group.totalAmount).toBe(20.0); // 20 € Sockel (Mutter passiv 0 €, Kind U18 0 €)
    });

    it('erzeugt Hinweis in unassignedMembers wenn Elternteil in Mitgliederliste fehlt', () => {
      const orphanChild = createMember({
        id: '9006',
        firstName: 'Oskar',
        lastName: 'OhneEltern',
        fullName: 'Oskar OhneEltern',
        iban: '',
        sepaMandate: '',
        status: 'active',
        age: 12,
        parent1: '99998', // Unbekanntes Elternteil
      });

      const result = processContributions([orphanChild]);
      expect(result.unassignedMembers.length).toBe(1);
      expect(result.unassignedMembers[0].issue).toContain(
        'Hinterlegtes Elternteil Nr. 99998 existiert nicht in der Mitgliederliste – Stammdaten prüfen'
      );
    });
  });
});


