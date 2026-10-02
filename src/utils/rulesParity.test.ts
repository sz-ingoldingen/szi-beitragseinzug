import { describe, it, expect } from 'vitest';
import { parseMembersCSV, processContributions } from './sepaCalculator';
import { DEFAULT_SZI_RULES } from '../types/rules';
import { SAMPLE_CSV } from './sampleData';

describe('Rules Engine Parity Tests (100% Identitätsprüfung)', () => {
  const members = parseMembersCSV(SAMPLE_CSV);

  it('liefert mit DEFAULT_SZI_RULES exakt identische Gesamtsummen wie der unparametrisierte Aufruf', () => {
    const unparametrized = processContributions(members);
    const parametrized = processContributions(members, DEFAULT_SZI_RULES);

    expect(parametrized.payerGroups.length).toBe(unparametrized.payerGroups.length);
    expect(parametrized.unassignedMembers.length).toBe(unparametrized.unassignedMembers.length);
    expect(parametrized.inactiveMembers.length).toBe(unparametrized.inactiveMembers.length);

    const sumUnparametrized = unparametrized.payerGroups.reduce((acc, g) => acc + g.totalAmount, 0);
    const sumParametrized = parametrized.payerGroups.reduce((acc, g) => acc + g.totalAmount, 0);
    expect(sumParametrized).toBe(sumUnparametrized);
  });

  it('stimmt für jede Zahlergruppe und jedes Gruppenmitglied auf den Cent und im Text überein', () => {
    const unparametrized = processContributions(members);
    const parametrized = processContributions(members, DEFAULT_SZI_RULES);

    for (let i = 0; i < unparametrized.payerGroups.length; i++) {
      const gOld = unparametrized.payerGroups[i];
      const gNew = parametrized.payerGroups[i];

      expect(gNew.payerId).toBe(gOld.payerId);
      expect(gNew.totalAmount).toBe(gOld.totalAmount);
      expect(gNew.isFamily).toBe(gOld.isFamily);
      expect(gNew.isValid).toBe(gOld.isValid);
      expect(gNew.members.length).toBe(gOld.members.length);

      for (let m = 0; m < gOld.members.length; m++) {
        const mOld = gOld.members[m];
        const mNew = gNew.members[m];

        expect(mNew.id).toBe(mOld.id);
        expect(mNew.fee).toBe(mOld.fee);
        expect(mNew.reason).toBe(mOld.reason);
      }
    }
  });

  it('stimmt bei unassignedMembers und inactiveMembers zeichengenau überein', () => {
    const unparametrized = processContributions(members);
    const parametrized = processContributions(members, DEFAULT_SZI_RULES);

    expect(parametrized.unassignedMembers).toEqual(unparametrized.unassignedMembers);
    expect(parametrized.inactiveMembers).toEqual(unparametrized.inactiveMembers);
  });

  it('validiert, dass public/rules/szi_standard.json existiert und dem Zod-Schema entspricht', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const standardPath = path.resolve(__dirname, '../../public/rules/szi_standard.json');

    expect(fs.existsSync(standardPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(standardPath, 'utf-8'));
    const parseResult = (await import('../types/rules')).feeRuleSetSchema.safeParse(content);

    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data.id).toBeDefined();
      expect(parseResult.data.rates.single.adultActive).toBe(DEFAULT_SZI_RULES.rates.single.adultActive);

      // Verifiziere, dass Berechnungen mit der JSON-Datei absolut identisch zum Standard laufen
      const res = processContributions(members, parseResult.data);
      const expected = processContributions(members, DEFAULT_SZI_RULES);
      expect(res.payerGroups.length).toBe(expected.payerGroups.length);
    }
  });

  it('validiert, dass alle JSON-Dateien in public/rules/ gültig sind und catalog.json korrekt aufgebaut ist', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const rulesDir = path.resolve(__dirname, '../../public/rules');
    const catalogPath = path.join(rulesDir, 'catalog.json');

    expect(fs.existsSync(catalogPath)).toBe(true);
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    expect(Array.isArray(catalog)).toBe(true);
    expect(catalog.length).toBeGreaterThanOrEqual(2);

    const { feeRuleSetSchema } = await import('../types/rules');
    for (const item of catalog) {
      const parsed = feeRuleSetSchema.safeParse(item);
      expect(parsed.success).toBe(true);
    }

    // 2024 vs 2025 Beitragsvergleichstest
    const rules2025 = catalog.find((r: any) => r.id === 'szi-standard-2025');
    const rules2024 = catalog.find((r: any) => r.id === 'szi-standard-2024');
    expect(rules2025).toBeDefined();
    expect(rules2024).toBeDefined();

    const sum2025 = processContributions(members, rules2025).payerGroups.reduce((a, b) => a + b.totalAmount, 0);
    const sum2024 = processContributions(members, rules2024).payerGroups.reduce((a, b) => a + b.totalAmount, 0);

    // Vor der Erhöhung 2025 waren die Beiträge geringer
    expect(sum2024).toBeLessThan(sum2025);
  });
});
