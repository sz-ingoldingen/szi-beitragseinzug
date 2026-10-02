import { describe, it, expect } from 'vitest';
import { feeRuleSetSchema, DEFAULT_SZI_RULES, FeeRuleSet } from '../types/rules';
import { parseMembersCSV, processContributions, Member } from './sepaCalculator';
import {
  compareContributionResults,
  generateComparisonAuditCsv,
  areRuleSetsEqual,
} from './comparison';
import { SAMPLE_CSV } from './sampleData';
import { formatToGermanDate, parseGermanToIsoDate } from '../components/RuleEditorModal';

describe('Rules Engine & Validation Tests', () => {
  describe('feeRuleSetSchema Validierung', () => {
    it('validiert das Standard-Regelwerk erfolgreich', () => {
      const parsed = feeRuleSetSchema.safeParse(DEFAULT_SZI_RULES);
      expect(parsed.success).toBe(true);
    });

    it('lehnt negative Beträge strikt ab', () => {
      const invalid = JSON.parse(JSON.stringify(DEFAULT_SZI_RULES));
      invalid.rates.single.adultActive = -25.0;

      const parsed = feeRuleSetSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toContain('nicht negativ');
      }
    });

    it('lehnt unlogische Altersgrenzen ab (familyChildMaxAge < youthExemptMaxAge)', () => {
      const invalid = JSON.parse(JSON.stringify(DEFAULT_SZI_RULES));
      invalid.ageThresholds.youthExemptMaxAge = 18;
      invalid.ageThresholds.familyChildMaxAge = 16; // Fehler!

      const parsed = feeRuleSetSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toContain('nicht kleiner als die Volljährigkeitsgrenze');
      }
    });

    it('lehnt ungültige Stichtags-Monate ab', () => {
      const invalid = JSON.parse(JSON.stringify(DEFAULT_SZI_RULES));
      invalid.timing.cutoffMonth = 13; // Fehler

      const parsed = feeRuleSetSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toContain('Monat muss zwischen 1 (Januar) und 12');
      }
    });
  });

  describe('Szenario-Tests mit variierten Beitragsordnungen', () => {
    const currentYear = new Date().getFullYear();

    it('Szenario: Preiserhöhung (Aktiv 30 €, Passiv 15 €, Familiensockel 25 €, Partner 12 €)', () => {
      const customRules: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        id: 'szi-erhoehung-2027',
        name: 'SZI Beitragsanpassung 2027',
        rates: {
          single: {
            adultActive: 30.0,
            adultPassive: 15.0,
            youthUnder18: 0.0,
            defaultFallback: 15.0,
          },
          family: {
            basePayer: 25.0,
            activePartner: 12.0,
            passivePartner: 0.0,
            firstActiveChild: 12.0,
            subsequentActiveChild: 0.0,
            passiveChild: 0.0,
            youthUnder18: 0.0,
          },
        },
      };

      const members = parseMembersCSV(SAMPLE_CSV);
      const resOld = processContributions(members, DEFAULT_SZI_RULES);
      const resNew = processContributions(members, customRules);

      // Einzelzahler aktiv (10503) zahlt nun 30 € statt 25 €
      const gActive = resNew.payerGroups.find(g => g.payerId === '10503');
      expect(gActive?.totalAmount).toBe(30.0);
      expect(gActive?.members[0].fee).toBe(30.0);
      expect(gActive?.members[0].reason).toContain('30 €');

      // Familie Mustermann (10401)
      // Alt: Max (20 €) + Partnerin (10 €) + 1. aktives Kind (10 €) + Kind2 (0 €) = 40 €
      // Neu: Max (25 €) + Partnerin (12 €) + 1. aktives Kind (12 €) + Kind2 (0 €) = 49 €
      const gFamily = resNew.payerGroups.find(g => g.payerId === '10401');
      expect(gFamily?.totalAmount).toBe(49.0);

      // Gesamtsumme muss gestiegen sein
      const sumOld = resOld.payerGroups.reduce((acc, g) => acc + g.totalAmount, 0);
      const sumNew = resNew.payerGroups.reduce((acc, g) => acc + g.totalAmount, 0);
      expect(sumNew).toBeGreaterThan(sumOld);
    });

    it('Szenario: Altersgrenze für Familienkinder wird von 25 auf 27 angehoben', () => {
      const customRules: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        id: 'szi-alter-27',
        name: 'SZI mit Altersgrenze 27',
        ageThresholds: {
          youthExemptMaxAge: 18,
          familyChildMaxAge: 27,
        },
      };

      // 26-jähriges aktives Kind
      const testMembers: Member[] = [
        {
          rowIndex: 2,
          id: '2001',
          firstName: 'Vater',
          lastName: 'Muster',
          fullName: 'Vater Muster',
          status: 'active',
          birthDate: '01.01.1970',
          age: currentYear - 1970,
          accountHolder: 'Vater Muster',
          iban: 'DE23100000001234567890',
          bic: 'TESTDEDDXXX',
          sepaMandate: 'MANDAT-VATER',
          signatureDate: '01.01.2020',
          parent1: '0',
          parent2: '0',
          partner: '0',
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
          id: '2002',
          firstName: 'Sohn26',
          lastName: 'Muster',
          fullName: 'Sohn26 Muster',
          status: 'active',
          birthDate: `01.01.${currentYear - 26}`,
          age: 26,
          accountHolder: 'Vater Muster',
          iban: '',
          bic: '',
          sepaMandate: '',
          signatureDate: '',
          parent1: '2001',
          parent2: '0',
          partner: '0',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
      ];

      // Mit Standard-Regeln (Grenze 25) fällt der Sohn heraus
      const resStandard = processContributions(testMembers, DEFAULT_SZI_RULES);
      expect(resStandard.unassignedMembers.length).toBe(1);
      expect(resStandard.unassignedMembers[0].id).toBe('2002');
      expect(resStandard.payerGroups[0].memberCount).toBe(1);

      // Mit angehobener Grenze 27 bleibt der Sohn in der Familie!
      const resExtended = processContributions(testMembers, customRules);
      expect(resExtended.unassignedMembers.length).toBe(0);
      expect(resExtended.payerGroups.length).toBe(1);
      expect(resExtended.payerGroups[0].memberCount).toBe(2);
      expect(resExtended.payerGroups[0].totalAmount).toBe(30.0); // 20 € Sockel + 10 € 1. aktives Kind
    });
  });

  describe('A/B-Vergleichslogik (compareContributionResults)', () => {
    it('berechnet Differenzen zwischen zwei Regelwerken präzise', () => {
      const members = parseMembersCSV(SAMPLE_CSV);
      const resBaseline = processContributions(members, DEFAULT_SZI_RULES);

      const modifiedRules: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        rates: {
          ...DEFAULT_SZI_RULES.rates,
          single: {
            ...DEFAULT_SZI_RULES.rates.single,
            adultActive: 30.0, // +5 €
          },
          family: {
            ...DEFAULT_SZI_RULES.rates.family,
            basePayer: 25.0, // +5 €
          },
        },
      };
      const resTarget = processContributions(members, modifiedRules);

      const comparison = compareContributionResults(resTarget, resBaseline);

      expect(comparison.deltaTotalAmount).toBeGreaterThan(0);
      expect(comparison.increasedCount).toBeGreaterThan(0);
      expect(comparison.decreasedCount).toBe(0);

      const gFamily = comparison.payerDeltas.get('10401');
      expect(gFamily).toBeDefined();
      expect(gFamily?.deltaAmount).toBe(5.0); // Sockel von 20 auf 25 = +5 €
      expect(gFamily?.status).toBe('increased');
    });

    it('erzeugt eine valide Vergleichs-Audit-CSV mit Differenz-Spalten', () => {
      const members = parseMembersCSV(SAMPLE_CSV);
      const resBaseline = processContributions(members, DEFAULT_SZI_RULES);
      const resTarget = processContributions(members, {
        ...DEFAULT_SZI_RULES,
        rates: {
          ...DEFAULT_SZI_RULES.rates,
          single: { ...DEFAULT_SZI_RULES.rates.single, adultActive: 30.0 },
        },
      });

      const csv = generateComparisonAuditCsv(resTarget, resBaseline, 'Modell 2027', 'Ist 2025');
      expect(csv).toContain('Beitrag (Modell 2027)');
      expect(csv).toContain('Beitrag (Ist 2025)');
      expect(csv).toContain('Differenz (€)');
      expect(csv).toContain('+5,00');
    });
  });

  describe('Status-Klassifizierungen & Ehrenamts-Befreiungen', () => {
    it('berücksichtigt benutzerdefinierte Status-Codes in activeCodes und passiveCodes', () => {
      const studentMember: Member = {
        rowIndex: 2,
        id: '9901',
        firstName: 'Laura',
        lastName: 'Studentin',
        fullName: 'Laura Studentin',
        status: 'student', // Neuer benutzerdefinierter Status-Code
        birthDate: '10.05.2001',
        age: 24,
        accountHolder: 'Laura Studentin',
        iban: 'DE23100000001234567890',
        bic: 'TESTDEDDXXX',
        sepaMandate: 'MANDAT-9901',
        signatureDate: '01.01.2023',
        parent1: '0',
        parent2: '0',
        partner: '0',
        boardFunction: '',
        clubFunction: '',
        otherFunction: '',
        maskGroup: '',
        danceGroup: '',
        comment: '',
        raw: [],
      };

      // 1. Ohne Zuordnung greift Standard-Fallback (12 €)
      const resFallback = processContributions([studentMember], DEFAULT_SZI_RULES);
      expect(resFallback.payerGroups[0].totalAmount).toBe(12.0);

      // 2. Regelwerk mit 'student' in activeCodes -> Zahlt 25 €
      const activeRules: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        statusClassifications: {
          ...DEFAULT_SZI_RULES.statusClassifications,
          activeCodes: [...DEFAULT_SZI_RULES.statusClassifications.activeCodes, 'student'],
        },
      };
      const resActive = processContributions([studentMember], activeRules);
      expect(resActive.payerGroups[0].totalAmount).toBe(25.0);
      expect(resActive.payerGroups[0].members[0].reason).toContain('aktiv');

      // 3. Regelwerk mit 'student' in honoraryCodes -> Zahlt 0 €
      const honoraryRules: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        statusClassifications: {
          ...DEFAULT_SZI_RULES.statusClassifications,
          honoraryCodes: [...DEFAULT_SZI_RULES.statusClassifications.honoraryCodes, 'student'],
        },
      };
      const resHonorary = processContributions([studentMember], honoraryRules);
      expect(resHonorary.payerGroups[0].totalAmount).toBe(0.0);
      expect(resHonorary.payerGroups[0].members[0].reason).toContain('Beitragsfrei');
    });

    it('erkennt neue Ehrenamts-Schlagwörter in exemptions.honoraryKeywords', () => {
      const boardMember: Member = {
        rowIndex: 3,
        id: '9902',
        firstName: 'Hans',
        lastName: 'Beirat',
        fullName: 'Hans Beirat',
        status: 'passive',
        birthDate: '10.05.1960',
        age: 65,
        accountHolder: 'Hans Beirat',
        iban: 'DE23100000001234567890',
        bic: 'TESTDEDDXXX',
        sepaMandate: 'MANDAT-9902',
        signatureDate: '01.01.2020',
        parent1: '0',
        parent2: '0',
        partner: '0',
        boardFunction: 'Ehrenbeirat des Vereins', // Spezielles neues Ehrenamt
        clubFunction: '',
        otherFunction: '',
        maskGroup: '',
        danceGroup: '',
        comment: '',
        raw: [],
      };

      // 1. Mit Standard-Schlagwörtern ist "ehrenbeirat" bereits über 'ehren' abgedeckt
      const resStd = processContributions([boardMember], DEFAULT_SZI_RULES);
      expect(resStd.payerGroups[0].totalAmount).toBe(0.0);

      // 2. Benutzerdefiniertes Schlagwort 'seniorenbeirat' testen
      const customMember = { ...boardMember, boardFunction: 'Seniorenbeirat' };
      const resBefore = processContributions([customMember], DEFAULT_SZI_RULES);
      expect(resBefore.payerGroups[0].totalAmount).toBe(12.0); // Passivbeitrag, da Seniorenbeirat regulär nicht befreit ist

      const customKeywordsRule: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        exemptions: {
          ...DEFAULT_SZI_RULES.exemptions,
          honoraryKeywords: [...DEFAULT_SZI_RULES.exemptions.honoraryKeywords, 'seniorenbeirat'],
        },
      };
      const resAfter = processContributions([customMember], customKeywordsRule);
      expect(resAfter.payerGroups[0].totalAmount).toBe(0.0); // Jetzt beitragsfrei!
    });

    it('verarbeitet neue Status-Codes ("azubi") korrekt bei Partnern und Kindern im Familienverbund', () => {
      const familyMembers: Member[] = [
        {
          rowIndex: 2,
          id: '5001',
          firstName: 'Sabine',
          lastName: 'Muster',
          fullName: 'Sabine Muster',
          status: 'passive',
          birthDate: '01.01.1980',
          age: 45,
          accountHolder: 'Sabine Muster',
          iban: 'DE23100000001234567890',
          bic: 'TESTDEDDXXX',
          sepaMandate: 'MANDAT-5001',
          signatureDate: '01.01.2020',
          parent1: '0',
          parent2: '0',
          partner: '5002',
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
          id: '5002',
          firstName: 'Klaus',
          lastName: 'Muster',
          fullName: 'Klaus Muster',
          status: 'azubi', // Neuer Status
          birthDate: '01.01.1978',
          age: 47,
          accountHolder: 'Sabine Muster',
          iban: '',
          bic: '',
          sepaMandate: '',
          signatureDate: '',
          parent1: '0',
          parent2: '0',
          partner: '5001',
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
          id: '5003',
          firstName: 'Leon',
          lastName: 'Muster',
          fullName: 'Leon Muster',
          status: 'azubi', // Neuer Status
          birthDate: '01.01.2005',
          age: 20, // 20 Jahre: Kind über 18, unter 25
          accountHolder: 'Sabine Muster',
          iban: '',
          bic: '',
          sepaMandate: '',
          signatureDate: '',
          parent1: '5001',
          parent2: '5002',
          partner: '0',
          boardFunction: '',
          clubFunction: '',
          otherFunction: '',
          maskGroup: '',
          danceGroup: '',
          comment: '',
          raw: [],
        },
      ];

      // Fall 1: 'azubi' ist in activeCodes eingetragen
      const azubiActiveRules: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        statusClassifications: {
          ...DEFAULT_SZI_RULES.statusClassifications,
          activeCodes: [...DEFAULT_SZI_RULES.statusClassifications.activeCodes, 'azubi'],
        },
      };
      const resActive = processContributions(familyMembers, azubiActiveRules);
      expect(resActive.payerGroups.length).toBe(1);
      // Sabine (20 € Sockel) + Klaus (10 € Partner aktiv) + Leon (10 € 1. Kind aktiv) = 40 €
      expect(resActive.payerGroups[0].totalAmount).toBe(40.0);
      expect(resActive.payerGroups[0].members.find(m => m.id === '5002')?.fee).toBe(10.0);
      expect(resActive.payerGroups[0].members.find(m => m.id === '5003')?.fee).toBe(10.0);

      // Fall 2: 'azubi' ist in passiveCodes eingetragen
      const azubiPassiveRules: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        statusClassifications: {
          ...DEFAULT_SZI_RULES.statusClassifications,
          passiveCodes: [...DEFAULT_SZI_RULES.statusClassifications.passiveCodes, 'azubi'],
        },
      };
      const resPassive = processContributions(familyMembers, azubiPassiveRules);
      // Sabine (20 € Sockel) + Klaus (0 € passiv) + Leon (0 € passiv) = 20 €
      expect(resPassive.payerGroups[0].totalAmount).toBe(20.0);
      expect(resPassive.payerGroups[0].members.find(m => m.id === '5002')?.fee).toBe(0.0);
      expect(resPassive.payerGroups[0].members.find(m => m.id === '5003')?.fee).toBe(0.0);
    });

    it('behandelt Status-Codes, die in der alten Berechnung existierten, in der neuen aber entfernt/nicht klassifiziert wurden (Fallback & A/B-Differenz)', () => {
      // Mitglied mit Status 'twen' (Jungaktiv 18-25)
      const twenMember: Member = {
        rowIndex: 2,
        id: '6001',
        firstName: 'Felix',
        lastName: 'Jungaktiv',
        fullName: 'Felix Jungaktiv',
        status: 'twen',
        birthDate: '01.01.2003',
        age: 22,
        accountHolder: 'Felix Jungaktiv',
        iban: 'DE23100000001234567890',
        bic: 'TESTDEDDXXX',
        sepaMandate: 'MANDAT-6001',
        signatureDate: '01.01.2021',
        parent1: '0',
        parent2: '0',
        partner: '0',
        boardFunction: '',
        clubFunction: '',
        otherFunction: '',
        maskGroup: '',
        danceGroup: '',
        comment: '',
        raw: [],
      };

      // 1. Alte Berechnung (Standard 2025): 'twen' ist in activeCodes -> zahlt 25 €
      const resOld = processContributions([twenMember], DEFAULT_SZI_RULES);
      expect(resOld.payerGroups[0].totalAmount).toBe(25.0);
      expect(resOld.payerGroups[0].members[0].reason).toContain('aktiv');

      // 2. Neue Berechnung: 'twen' wurde aus activeCodes ENTFERNT und ist in keiner anderen Liste
      const rulesWithoutTwen: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        statusClassifications: {
          ...DEFAULT_SZI_RULES.statusClassifications,
          activeCodes: DEFAULT_SZI_RULES.statusClassifications.activeCodes.filter(c => c !== 'twen'),
          passiveCodes: DEFAULT_SZI_RULES.statusClassifications.passiveCodes.filter(c => c !== 'twen'),
          honoraryCodes: DEFAULT_SZI_RULES.statusClassifications.honoraryCodes.filter(c => c !== 'twen'),
          guestCodes: DEFAULT_SZI_RULES.statusClassifications.guestCodes.filter(c => c !== 'twen'),
        },
      };

      const resNew = processContributions([twenMember], rulesWithoutTwen);
      // Greift auf defaultFallback (12 €) zurück, kein Absturz, kein NaN!
      expect(resNew.payerGroups[0].totalAmount).toBe(12.0);
      expect(resNew.payerGroups[0].members[0].reason).toContain('als passiv veranlagt (12 €)');

      // 3. A/B-Vergleich muss die Differenz von -13,00 € sauber ausweisen
      const comparison = compareContributionResults(resNew, resOld);
      expect(comparison.deltaTotalAmount).toBe(-13.0);
      expect(comparison.decreasedCount).toBe(1);
      const deltaGroup = comparison.payerDeltas.get('6001');
      expect(deltaGroup).toBeDefined();
      expect(deltaGroup?.deltaAmount).toBe(-13.0);
      expect(deltaGroup?.status).toBe('decreased');
    });

    it('erlaubt das Aberkennen des Ehrenmitglied-Status durch Entfernen aus honoraryCodes', () => {
      const sponsorMember: Member = {
        rowIndex: 2,
        id: '7001',
        firstName: 'Ernst',
        lastName: 'Ehemaliger',
        fullName: 'Ernst Ehemaliger',
        status: 'sponsor', // zunft.app Ehrenmitglied
        birthDate: '01.01.1950',
        age: 75,
        accountHolder: 'Ernst Ehemaliger',
        iban: 'DE23100000001234567890',
        bic: 'TESTDEDDXXX',
        sepaMandate: 'MANDAT-7001',
        signatureDate: '01.01.2020',
        parent1: '0',
        parent2: '0',
        partner: '0',
        boardFunction: '',
        clubFunction: '',
        otherFunction: '',
        maskGroup: '',
        danceGroup: '',
        comment: '',
        raw: [],
      };

      // 1. Standard: 'sponsor' ist beitragsfrei (0 €)
      const resStandard = processContributions([sponsorMember], DEFAULT_SZI_RULES);
      expect(resStandard.payerGroups[0].totalAmount).toBe(0.0);

      // 2. Regelwerk, in dem 'sponsor' kein Ehrenmitglied mehr ist, sondern als passiv eingestuft wird
      const rulesSponsorPassive: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        statusClassifications: {
          ...DEFAULT_SZI_RULES.statusClassifications,
          honoraryCodes: DEFAULT_SZI_RULES.statusClassifications.honoraryCodes.filter(c => c !== 'sponsor'),
          passiveCodes: [...DEFAULT_SZI_RULES.statusClassifications.passiveCodes, 'sponsor'],
        },
      };

      const resPassive = processContributions([sponsorMember], rulesSponsorPassive);
      expect(resPassive.payerGroups[0].totalAmount).toBe(12.0); // Zahlt regulären Passivbeitrag
      expect(resPassive.payerGroups[0].members[0].reason).toContain('passiv');
    });
  });

  describe('Deutsche Datumsformatierung in der Erfassungshilfe (effectiveFrom)', () => {
    it('formatiert ISO-Daten sauber in deutsches Format TT.MM.JJJJ', () => {
      expect(formatToGermanDate('2025-04-05')).toBe('05.04.2025');
      expect(formatToGermanDate('2027-01-01')).toBe('01.01.2027');
      expect(formatToGermanDate('05.04.2025')).toBe('05.04.2025'); // Unverändert, da bereits deutsch
      expect(formatToGermanDate('')).toBe('');
    });

    it('konvertiert deutsche Datumsangaben TT.MM.JJJJ in ISO-Format YYYY-MM-DD zur Speicherung', () => {
      expect(parseGermanToIsoDate('05.04.2025')).toBe('2025-04-05');
      expect(parseGermanToIsoDate('1.1.2027')).toBe('2027-01-01');
      expect(parseGermanToIsoDate('2025-04-05')).toBe('2025-04-05'); // Unverändert, falls bereits ISO
      expect(parseGermanToIsoDate('')).toBe('');
    });
  });

  describe('Inhaltlicher Regelwerks-Vergleich (areRuleSetsEqual)', () => {
    it('erkennt DEFAULT_SZI_RULES und Klone als inhaltlich identisch', () => {
      expect(areRuleSetsEqual(DEFAULT_SZI_RULES, DEFAULT_SZI_RULES)).toBe(true);
      const clone = JSON.parse(JSON.stringify(DEFAULT_SZI_RULES));
      expect(areRuleSetsEqual(DEFAULT_SZI_RULES, clone)).toBe(true);
    });

    it('ignoriert Metadaten (id, name, description, version, effectiveFrom)', () => {
      const variantWithDiffMeta: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        id: 'szi-kopie-2025',
        name: 'Eine andere Bezeichnung',
        description: 'Neue Notizen',
        version: '9.9.9',
        effectiveFrom: '2099-01-01',
      };
      expect(areRuleSetsEqual(DEFAULT_SZI_RULES, variantWithDiffMeta)).toBe(true);
    });

    it('erkennt Abweichungen bei Beitragssätzen', () => {
      const modifiedRates: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        rates: {
          ...DEFAULT_SZI_RULES.rates,
          single: {
            ...DEFAULT_SZI_RULES.rates.single,
            adultActive: 26.0, // statt 25.0
          },
        },
      };
      expect(areRuleSetsEqual(DEFAULT_SZI_RULES, modifiedRates)).toBe(false);
    });

    it('erkennt Abweichungen bei Altersgrenzen und Stichtag', () => {
      const modifiedAge: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        ageThresholds: {
          ...DEFAULT_SZI_RULES.ageThresholds,
          familyChildMaxAge: 26, // statt 25
        },
      };
      expect(areRuleSetsEqual(DEFAULT_SZI_RULES, modifiedAge)).toBe(false);

      const modifiedTiming: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        timing: {
          cutoffDay: 1,
          cutoffMonth: 5,
        },
      };
      expect(areRuleSetsEqual(DEFAULT_SZI_RULES, modifiedTiming)).toBe(false);
    });

    it('erkennt Abweichungen bei Status-Klassifizierungen und ignoriert Casing/Reihenfolge', () => {
      // Gleiche Codes, aber andere Groß-/Kleinschreibung und vertauschte Reihenfolge
      const reorderedCodes: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        statusClassifications: {
          ...DEFAULT_SZI_RULES.statusClassifications,
          activeCodes: [...DEFAULT_SZI_RULES.statusClassifications.activeCodes].reverse().map(c => c.toUpperCase()),
        },
      };
      expect(areRuleSetsEqual(DEFAULT_SZI_RULES, reorderedCodes)).toBe(true);

      // Ein Code hinzugefügt
      const codeAdded: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        statusClassifications: {
          ...DEFAULT_SZI_RULES.statusClassifications,
          activeCodes: [...DEFAULT_SZI_RULES.statusClassifications.activeCodes, 'neuer_status'],
        },
      };
      expect(areRuleSetsEqual(DEFAULT_SZI_RULES, codeAdded)).toBe(false);
    });

    it('behandelt null und undefined sicher', () => {
      expect(areRuleSetsEqual(null, null)).toBe(true);
      expect(areRuleSetsEqual(undefined, undefined)).toBe(true);
      expect(areRuleSetsEqual(DEFAULT_SZI_RULES, null)).toBe(false);
      expect(areRuleSetsEqual(null, DEFAULT_SZI_RULES)).toBe(false);
    });
  });

  describe('Anpassungs-Sichtbarkeit und Reset-Workflow', () => {
    it('trennt modifizierte Regeln mit Standard-ID sauber in ein angepasstes Profil ab', () => {
      const userEditedRules: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        rates: {
          ...DEFAULT_SZI_RULES.rates,
          single: {
            ...DEFAULT_SZI_RULES.rates.single,
            adultActive: 30.0,
          },
        },
      };

      // Benutzer hat ID nicht geändert
      expect(userEditedRules.id).toBe(DEFAULT_SZI_RULES.id);
      expect(areRuleSetsEqual(userEditedRules, DEFAULT_SZI_RULES)).toBe(false);

      // Simulation des Profil-Schutzes (handleAddRuleSet):
      let rulesToAdd = userEditedRules;
      if (userEditedRules.id === DEFAULT_SZI_RULES.id && !areRuleSetsEqual(userEditedRules, DEFAULT_SZI_RULES)) {
        rulesToAdd = {
          ...userEditedRules,
          id: 'szi-angepasst',
          name: `${DEFAULT_SZI_RULES.name} (Angepasst)`,
        };
      }

      expect(rulesToAdd.id).toBe('szi-angepasst');
      expect(rulesToAdd.name).toContain('(Angepasst)');

      // A/B Vergleich gegen das originale DEFAULT_SZI_RULES
      const members = parseMembersCSV(SAMPLE_CSV);
      const resBaseline = processContributions(members, DEFAULT_SZI_RULES);
      const resTarget = processContributions(members, rulesToAdd);
      const diff = compareContributionResults(resTarget, resBaseline);

      expect(diff.deltaTotalAmount).toBeGreaterThan(0);
      expect(diff.increasedCount).toBeGreaterThan(0);

      // Reset-Simulation: Rückkehr auf DEFAULT_SZI_RULES
      const activeAfterReset = DEFAULT_SZI_RULES;
      expect(areRuleSetsEqual(activeAfterReset, DEFAULT_SZI_RULES)).toBe(true);
    });
  });
});
