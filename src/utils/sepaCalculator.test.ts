import { describe, it, expect } from 'vitest';
import {
  isHonoraryMember,
  isResigned,
  isDeceased,
  isInactiveMember,
  parseMembersCSV,
  processContributions,
  generateAuditCsv,
  Member,
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

      // Zahler zahlt nur den Familienbeitrag für sich selbst (20 € gem. famPayerFlag)
      const group = result.payerGroups[0];
      expect(group.memberCount).toBe(1);
      expect(group.members.find(m => m.id === '1003')).toBeUndefined();
      expect(group.totalAmount).toBe(20.0);
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
});
