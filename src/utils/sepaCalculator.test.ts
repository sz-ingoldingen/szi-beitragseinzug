import { describe, it, expect } from 'vitest';
import {
  isHonoraryMember,
  parseMembersCSV,
  processContributions,
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
});
