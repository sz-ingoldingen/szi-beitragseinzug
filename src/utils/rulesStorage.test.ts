import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadAllRuleSets,
  saveCustomRuleSet,
  duplicateRuleSet,
  deleteCustomRuleSet,
  isBuiltinRuleSet,
  getStoredActiveRuleSetId,
  setStoredActiveRuleSetId,
  getStoredBaselineRuleSetId,
  setStoredBaselineRuleSetId,
  loadCustomRuleSets,
  mergeOfficialAndCustomRules,
  SZI_CUSTOM_RULE_SETS_KEY,
  SZI_ACTIVE_RULE_SET_ID_KEY,
  SZI_BASELINE_RULE_SET_ID_KEY,
} from './rulesStorage';
import { DEFAULT_SZI_RULES, FeeRuleSet } from '../types/rules';

describe('rulesStorage: LocalStorage Persistenz & Szenarien-Management', () => {
  // In-Memory LocalStorage Mock für isolierte Tests
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const storageMock = {
      getItem: (key: string) => (key in mockStore ? mockStore[key] : null),
      setItem: (key: string, val: string) => {
        mockStore[key] = String(val);
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      },
      length: 0,
      key: () => null,
    };
    vi.stubGlobal('localStorage', storageMock);
    vi.stubGlobal('window', { localStorage: storageMock });
  });

  describe('isBuiltinRuleSet', () => {
    it('erkennt den Standard 2025 als fest eingebaute Systemvorlage', () => {
      expect(isBuiltinRuleSet(DEFAULT_SZI_RULES.id)).toBe(true);
      expect(isBuiltinRuleSet('szi-standard-2025')).toBe(true);
      expect(isBuiltinRuleSet('szi-szenario-12345')).toBe(false);
      expect(isBuiltinRuleSet(null)).toBe(false);
      expect(isBuiltinRuleSet(undefined)).toBe(false);
    });
  });

  describe('loadAllRuleSets', () => {
    it('gibt standardmäßig immer mindestens DEFAULT_SZI_RULES an Index 0 zurück', () => {
      const all = loadAllRuleSets();
      expect(all.length).toBe(1);
      expect(all[0].id).toBe(DEFAULT_SZI_RULES.id);
      expect(all[0].name).toBe(DEFAULT_SZI_RULES.name);
    });

    it('lädt gespeicherte benutzerdefinierte Profile aus dem LocalStorage', () => {
      const custom: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        id: 'szi-test-szenario',
        name: 'Mein Test Szenario',
      };
      mockStore[SZI_CUSTOM_RULE_SETS_KEY] = JSON.stringify([custom]);

      const all = loadAllRuleSets();
      expect(all.length).toBe(2);
      expect(all[0].id).toBe(DEFAULT_SZI_RULES.id);
      expect(all[1].id).toBe('szi-test-szenario');
      expect(all[1].name).toBe('Mein Test Szenario');
    });

    it('filtert korrupte oder manipulierte Einträge mit Standard-ID sicher heraus', () => {
      const spoofed: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        id: DEFAULT_SZI_RULES.id, // Sollte nicht in customList landen
        name: 'Manipulierter Standard',
      };
      mockStore[SZI_CUSTOM_RULE_SETS_KEY] = JSON.stringify([spoofed, { invalid: 'daten' }]);

      const all = loadAllRuleSets();
      expect(all.length).toBe(1);
      expect(all[0].name).toBe(DEFAULT_SZI_RULES.name); // Echter Standard bleibt geschützt!
    });
  });

  describe('saveCustomRuleSet', () => {
    it('schützt die Standard-ID vor Überschreiben und generiert eine Szenario-ID', () => {
      const attemptToOverwrite: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        rates: {
          ...DEFAULT_SZI_RULES.rates,
          single: {
            ...DEFAULT_SZI_RULES.rates.single,
            adultActive: 35.0,
          },
        },
      };

      const saved = saveCustomRuleSet(attemptToOverwrite);
      expect(saved.id).not.toBe(DEFAULT_SZI_RULES.id);
      expect(saved.id).toContain('szi-szenario-');
      expect(saved.rates.single.adultActive).toBe(35.0);

      const all = loadAllRuleSets();
      expect(all.length).toBe(2);
      expect(all[0].id).toBe(DEFAULT_SZI_RULES.id);
      expect(all[0].rates.single.adultActive).toBe(25.0); // Standard unverändert!
      expect(all[1].id).toBe(saved.id);
    });

    it('aktualisiert ein bestehendes benutzerdefiniertes Szenario', () => {
      const initial: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        id: 'szi-szenario-1',
        name: 'Entwurf Version 1',
      };
      saveCustomRuleSet(initial);

      const updated: FeeRuleSet = {
        ...initial,
        name: 'Entwurf Version 2 (Aktualisiert)',
      };
      saveCustomRuleSet(updated);

      const all = loadAllRuleSets();
      expect(all.length).toBe(2);
      expect(all[1].name).toBe('Entwurf Version 2 (Aktualisiert)');
    });

    it('wirft einen Fehler bei unvaliden Daten', () => {
      const invalid: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        id: 'szi-bad',
        rates: {
          ...DEFAULT_SZI_RULES.rates,
          single: {
            ...DEFAULT_SZI_RULES.rates.single,
            adultActive: -10, // Negativ ist verboten
          },
        },
      };

      expect(() => saveCustomRuleSet(invalid)).toThrow();
    });
  });

  describe('duplicateRuleSet', () => {
    it('erzeugt ein neues Szenario mit neuer ID und (Kopie)-Namen', () => {
      const duplicated = duplicateRuleSet(DEFAULT_SZI_RULES);
      expect(duplicated.id).toContain('szi-szenario-');
      expect(duplicated.name).toContain('(Kopie)');

      const all = loadAllRuleSets();
      expect(all.length).toBe(2);
      expect(all[1].id).toBe(duplicated.id);
    });

    it('erlaubt die Angabe eines individuellen Namens beim Duplizieren', () => {
      const duplicated = duplicateRuleSet(DEFAULT_SZI_RULES, 'GV 2026 Variante B');
      expect(duplicated.name).toBe('GV 2026 Variante B');
    });
  });

  describe('deleteCustomRuleSet', () => {
    it('verweigert das Löschen des Standards strikt', () => {
      const success = deleteCustomRuleSet(DEFAULT_SZI_RULES.id);
      expect(success).toBe(false);
      expect(loadAllRuleSets().length).toBe(1);
    });

    it('löscht benutzerdefinierte Szenarien erfolgreich aus dem LocalStorage', () => {
      const custom: FeeRuleSet = {
        ...DEFAULT_SZI_RULES,
        id: 'szi-delete-me',
        name: 'Zu löschendes Profil',
      };
      saveCustomRuleSet(custom);
      expect(loadAllRuleSets().length).toBe(2);

      const success = deleteCustomRuleSet('szi-delete-me');
      expect(success).toBe(true);

      const allAfter = loadAllRuleSets();
      expect(allAfter.length).toBe(1);
      expect(allAfter[0].id).toBe(DEFAULT_SZI_RULES.id);
    });
  });

  describe('Active & Baseline ID Tracking', () => {
    it('verwaltet die aktive Regelwerk-ID', () => {
      expect(getStoredActiveRuleSetId()).toBe(DEFAULT_SZI_RULES.id);

      setStoredActiveRuleSetId('szi-szenario-999');
      expect(getStoredActiveRuleSetId()).toBe('szi-szenario-999');
      expect(mockStore[SZI_ACTIVE_RULE_SET_ID_KEY]).toBe('szi-szenario-999');
    });

    it('verwaltet die Vergleichsbasis-ID (Baseline)', () => {
      expect(getStoredBaselineRuleSetId()).toBeNull();

      setStoredBaselineRuleSetId(DEFAULT_SZI_RULES.id);
      expect(getStoredBaselineRuleSetId()).toBe(DEFAULT_SZI_RULES.id);
      expect(mockStore[SZI_BASELINE_RULE_SET_ID_KEY]).toBe(DEFAULT_SZI_RULES.id);

      setStoredBaselineRuleSetId(null);
      expect(getStoredBaselineRuleSetId()).toBeNull();
      expect(mockStore[SZI_BASELINE_RULE_SET_ID_KEY]).toBeUndefined();
    });
  });

  describe('mergeOfficialAndCustomRules & loadCustomRuleSets', () => {
    it('lädt gespeicherte Custom-Regeln isoliert ohne Standards', () => {
      expect(loadCustomRuleSets().length).toBe(0);
      saveCustomRuleSet({ ...DEFAULT_SZI_RULES, id: 'szi-custom-x', name: 'Custom X' });
      expect(loadCustomRuleSets().length).toBe(1);
    });

    it('führt offizielle Katalog-Regeln und Custom-Regeln kollisionsfrei zusammen', () => {
      const official1: FeeRuleSet = { ...DEFAULT_SZI_RULES, id: 'szi-standard-2025', name: 'Standard 2025', isOfficial: true };
      const official2: FeeRuleSet = { ...DEFAULT_SZI_RULES, id: 'szi-standard-2024', name: 'Standard 2024', isOfficial: true };
      const custom: FeeRuleSet = { ...DEFAULT_SZI_RULES, id: 'szi-custom-abc', name: 'Entwurf ABC', isOfficial: false };

      const merged = mergeOfficialAndCustomRules([official1, official2], [custom]);
      expect(merged.length).toBe(3);
      expect(merged[0].id).toBe('szi-standard-2025');
      expect(merged[1].id).toBe('szi-standard-2024');
      expect(merged[2].id).toBe('szi-custom-abc');
      expect(merged[0].isOfficial).toBe(true);
      expect(merged[1].isOfficial).toBe(true);
    });
  });
});
