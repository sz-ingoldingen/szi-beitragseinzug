import { FeeRuleSet, DEFAULT_SZI_RULES, feeRuleSetSchema } from '../types/rules';

export const SZI_CUSTOM_RULE_SETS_KEY = 'szi_custom_rule_sets_v1';
export const SZI_ACTIVE_RULE_SET_ID_KEY = 'szi_active_rule_set_id_v1';
export const SZI_BASELINE_RULE_SET_ID_KEY = 'szi_baseline_rule_set_id_v1';

/**
 * Prüft, ob es sich um eine fest einprogrammierte oder offizielle Satzungsvorlage aus dem Repository handelt.
 */
export function isBuiltinRuleSet(id?: string | null, ruleSet?: FeeRuleSet | null): boolean {
  if (!id) return false;
  if (ruleSet?.isOfficial) return true;
  return id === DEFAULT_SZI_RULES.id || id.startsWith('szi-standard-');
}

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Hilfsfunktion zum sicheren Lesen aus dem LocalStorage.
 */
function safeGetItem(key: string): string | null {
  try {
    const storage = getStorage();
    if (storage) return storage.getItem(key);
  } catch (err) {
    console.warn(`[rulesStorage] Fehler beim Lesen von ${key}:`, err);
  }
  return null;
}

/**
 * Hilfsfunktion zum sicheren Schreiben in den LocalStorage.
 */
function safeSetItem(key: string, value: string): void {
  try {
    const storage = getStorage();
    if (storage) storage.setItem(key, value);
  } catch (err) {
    console.warn(`[rulesStorage] Fehler beim Schreiben von ${key}:`, err);
  }
}

/**
 * Hilfsfunktion zum sicheren Löschen aus dem LocalStorage.
 */
function safeRemoveItem(key: string): void {
  try {
    const storage = getStorage();
    if (storage) storage.removeItem(key);
  } catch (err) {
    console.warn(`[rulesStorage] Fehler beim Löschen von ${key}:`, err);
  }
}

/**
 * Lädt ausschließlich die im Browser (localStorage) gespeicherten benutzerdefinierten Szenarien.
 */
export function loadCustomRuleSets(): FeeRuleSet[] {
  const customList: FeeRuleSet[] = [];
  const rawJson = safeGetItem(SZI_CUSTOM_RULE_SETS_KEY);

  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const val = feeRuleSetSchema.safeParse(item);
          if (val.success) {
            // Offizielle IDs dürfen im Custom-Speicher nicht existieren
            if (!isBuiltinRuleSet(val.data.id, val.data as FeeRuleSet)) {
              customList.push(val.data as FeeRuleSet);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[rulesStorage] Fehler beim Parsen gespeicherter Szenarien:', err);
    }
  }

  return customList;
}

/**
 * Führt offizielle Regelwerke (z.B. aus catalog.json) und lokale Benutzer-Szenarien zusammen.
 * Offizielle Regelwerke stehen an oberster Stelle und können nicht überschrieben werden.
 */
export function mergeOfficialAndCustomRules(
  officialRules: FeeRuleSet[],
  customRules: FeeRuleSet[] = loadCustomRuleSets()
): FeeRuleSet[] {
  const map = new Map<string, FeeRuleSet>();

  // 1. Offizielle Regeln registrieren (mit Flag isOfficial: true)
  for (const r of officialRules) {
    map.set(r.id, { ...r, isOfficial: true });
  }

  // 2. Benutzer-Szenarien hinzufügen (außer wenn sie mit einer offiziellen ID kollidieren)
  for (const r of customRules) {
    if (!map.has(r.id)) {
      map.set(r.id, r);
    }
  }

  return Array.from(map.values());
}

/**
 * Lädt alle verfügbaren Beitrags-Regelwerke.
 * Der offizielle Vereinsstandard (DEFAULT_SZI_RULES) steht immer unveränderlich an Position 0.
 * Ergänzt werden alle im Browser (localStorage) gespeicherten benutzerdefinierten Szenarien.
 */
export function loadAllRuleSets(): FeeRuleSet[] {
  const customList = loadCustomRuleSets();
  return [DEFAULT_SZI_RULES, ...customList];
}

/**
 * Speichert ein benutzerdefiniertes Regelwerk im Browser (localStorage).
 * Verhindert das Überschreiben des schreibgeschützten Standards.
 */
export function saveCustomRuleSet(ruleSet: FeeRuleSet): FeeRuleSet {
  let toSave: FeeRuleSet = { ...ruleSet };

  // Schutz vor Überschreiben der Standard- oder offiziellen IDs
  if (isBuiltinRuleSet(toSave.id, toSave)) {
    const timestamp = Date.now();
    toSave = {
      ...toSave,
      id: `szi-szenario-${timestamp}`,
      name: toSave.name === DEFAULT_SZI_RULES.name ? `${DEFAULT_SZI_RULES.name} (Angepasst)` : `${toSave.name} (Angepasst)`,
      isOfficial: false,
      isDefault: false,
    };
  }

  // Schema-Validierung
  const validation = feeRuleSetSchema.safeParse(toSave);
  if (!validation.success) {
    throw new Error(`Ungültige Regeldaten: ${validation.error.issues[0]?.message}`);
  }

  const existingCustom = loadCustomRuleSets();
  const idx = existingCustom.findIndex(r => r.id === toSave.id);

  if (idx !== -1) {
    existingCustom[idx] = toSave;
  } else {
    existingCustom.push(toSave);
  }

  safeSetItem(SZI_CUSTOM_RULE_SETS_KEY, JSON.stringify(existingCustom));
  return toSave;
}

/**
 * Dupliziert ein bestehendes Regelwerk und speichert es als neues Szenario im Browser.
 */
export function duplicateRuleSet(source: FeeRuleSet, newName?: string): FeeRuleSet {
  const timestamp = Date.now();
  const cloned: FeeRuleSet = JSON.parse(JSON.stringify(source));
  
  const duplicated: FeeRuleSet = {
    ...cloned,
    id: `szi-szenario-${timestamp}`,
    name: newName || `${source.name} (Kopie)`,
    description: source.description
      ? `${source.description} (Kopie erstellt am ${new Date().toLocaleDateString('de-DE')})`
      : `Erstellt basierend auf „${source.name}“`,
  };

  return saveCustomRuleSet(duplicated);
}

/**
 * Löscht ein benutzerdefiniertes Regelwerk aus dem LocalStorage.
 * Das Löschen der Standard-Satzung ist strikt untersagt.
 */
export function deleteCustomRuleSet(id: string): boolean {
  if (isBuiltinRuleSet(id)) {
    console.warn('[rulesStorage] Das Standard-Regelwerk kann nicht gelöscht werden.');
    return false;
  }

  const remaining = loadCustomRuleSets().filter(r => r.id !== id);
  safeSetItem(SZI_CUSTOM_RULE_SETS_KEY, JSON.stringify(remaining));
  return true;
}

/**
 * Ermittelt die zuletzt gewählte ID des aktiven Regelwerks.
 */
export function getStoredActiveRuleSetId(): string {
  const stored = safeGetItem(SZI_ACTIVE_RULE_SET_ID_KEY);
  if (stored) return stored;
  return DEFAULT_SZI_RULES.id;
}

/**
 * Speichert die ID des aktuell aktiven Regelwerks.
 */
export function setStoredActiveRuleSetId(id: string): void {
  safeSetItem(SZI_ACTIVE_RULE_SET_ID_KEY, id);
}

/**
 * Ermittelt die zuletzt gewählte Vergleichsbasis-ID (Baseline).
 */
export function getStoredBaselineRuleSetId(): string | null {
  const stored = safeGetItem(SZI_BASELINE_RULE_SET_ID_KEY);
  return stored || null;
}

/**
 * Speichert die Vergleichsbasis-ID (Baseline).
 */
export function setStoredBaselineRuleSetId(id: string | null): void {
  if (id === null) {
    safeRemoveItem(SZI_BASELINE_RULE_SET_ID_KEY);
  } else {
    safeSetItem(SZI_BASELINE_RULE_SET_ID_KEY, id);
  }
}
