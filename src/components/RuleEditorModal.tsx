import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Download,
  RotateCcw,
  Sparkles,
  Check,
  AlertCircle,
  FileCode,
  Sliders,
  Calendar,
  Users,
  Shield,
  Tag,
  Plus,
  Trash2,
  Search,
  Info,
  Edit3,
  Save,
  Lock,
} from 'lucide-react';
import { FeeRuleSet, DEFAULT_SZI_RULES, StatusClassifications, feeRuleSetSchema } from '../types/rules';
import { areRuleSetsEqual } from '../utils/comparison';
import { isBuiltinRuleSet } from '../utils/rulesStorage';
import { MEMBER_STATUS_LABELS } from '../utils/sepaCalculator';

type ClassificationCategory = 'active' | 'passive' | 'honorary' | 'guest' | 'none';

function getCategoryForCode(code: string, classifications?: StatusClassifications): ClassificationCategory {
  if (!classifications) return 'none';
  const clean = code.toLowerCase().trim();
  if (classifications.activeCodes?.some(c => c.toLowerCase().trim() === clean)) return 'active';
  if (classifications.passiveCodes?.some(c => c.toLowerCase().trim() === clean)) return 'passive';
  if (classifications.honoraryCodes?.some(c => c.toLowerCase().trim() === clean)) return 'honorary';
  if (classifications.guestCodes?.some(c => c.toLowerCase().trim() === clean)) return 'guest';
  return 'none';
}

/**
 * Konvertiert ein ISO-Datum (YYYY-MM-DD) oder deutsches Datum in deutsches Anzeigeformat (DD.MM.YYYY).
 */
export function formatToGermanDate(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  const deMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (deMatch) {
    const day = deMatch[1].padStart(2, '0');
    const month = deMatch[2].padStart(2, '0');
    const year = deMatch[3];
    return `${day}.${month}.${year}`;
  }
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d}.${m}.${y}`;
  }
  return trimmed;
}

/**
 * Konvertiert ein deutsches Datum (DD.MM.YYYY) in ISO-Format (YYYY-MM-DD).
 */
export function parseGermanToIsoDate(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  const deMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (deMatch) {
    const day = deMatch[1].padStart(2, '0');
    const month = deMatch[2].padStart(2, '0');
    const year = deMatch[3];
    return `${year}-${month}-${day}`;
  }
  return trimmed;
}

interface RuleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRuleSet: FeeRuleSet;
  onApplyRuleSet: (ruleSet: FeeRuleSet) => void;
  onSetAsBaseline?: (ruleSet: FeeRuleSet) => void;
}

export function RuleEditorModal({
  isOpen,
  onClose,
  activeRuleSet,
  onApplyRuleSet,
  onSetAsBaseline,
}: RuleEditorModalProps): React.JSX.Element | null {
  const [formData, setFormData] = useState<FeeRuleSet>(() => {
    const source = activeRuleSet || DEFAULT_SZI_RULES;
    const cloned = JSON.parse(JSON.stringify(source));
    return {
      ...DEFAULT_SZI_RULES,
      ...cloned,
      statusClassifications: {
        ...DEFAULT_SZI_RULES.statusClassifications,
        ...(cloned.statusClassifications || {}),
      },
      exemptions: {
        ...DEFAULT_SZI_RULES.exemptions,
        ...(cloned.exemptions || {}),
      },
    };
  });
  const [activeTab, setActiveTab] = useState<'rates' | 'thresholds' | 'status' | 'meta'>('rates');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  // Deutsches Datum State
  const [germanDateStr, setGermanDateStr] = useState<string>(() =>
    formatToGermanDate(activeRuleSet?.effectiveFrom || DEFAULT_SZI_RULES.effectiveFrom)
  );

  // Synchronisiere State beim Öffnen des Modals
  useEffect(() => {
    if (isOpen) {
      const source = activeRuleSet || DEFAULT_SZI_RULES;
      const isDefault = isBuiltinRuleSet(source.id, source);
      const cloned = JSON.parse(JSON.stringify(source));

      // Wenn vom schreibgeschützten Standard gestartet wird, bereite ein neues Szenario vor
      if (isDefault) {
        cloned.name = cloned.name === DEFAULT_SZI_RULES.name ? 'SZI Beitragsanpassung (Entwurf)' : `${cloned.name} (Entwurf)`;
      }

      setFormData({
        ...DEFAULT_SZI_RULES,
        ...cloned,
        statusClassifications: {
          ...DEFAULT_SZI_RULES.statusClassifications,
          ...(cloned.statusClassifications || {}),
        },
        exemptions: {
          ...DEFAULT_SZI_RULES.exemptions,
          ...(cloned.exemptions || {}),
        },
      });
      setGermanDateStr(formatToGermanDate(cloned.effectiveFrom || DEFAULT_SZI_RULES.effectiveFrom));
      setValidationError('');
      setSaveSuccessMsg('');
    }
  }, [isOpen, activeRuleSet]);

  const handleGermanDateChange = (val: string) => {
    setGermanDateStr(val);
    const iso = parseGermanToIsoDate(val);
    setFormData(prev => ({
      ...prev,
      effectiveFrom: iso || val,
    }));
  };

  // Status-Zuordnung State
  const [statusSearch, setStatusSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | ClassificationCategory>('all');
  const [newStatusCode, setNewStatusCode] = useState<string>('');
  const [newStatusCategory, setNewStatusCategory] = useState<ClassificationCategory>('active');
  const [newKeyword, setNewKeyword] = useState<string>('');

  const handleResetToDefault = () => {
    setFormData(JSON.parse(JSON.stringify(DEFAULT_SZI_RULES)));
    setGermanDateStr(formatToGermanDate(DEFAULT_SZI_RULES.effectiveFrom));
    setValidationError('');
    setSaveSuccessMsg('Standardwerte (SZI 2025) geladen.');
    setTimeout(() => setSaveSuccessMsg(''), 2500);
  };

  const handleLoadCurrent = () => {
    const cloned = JSON.parse(JSON.stringify(activeRuleSet));
    setFormData({
      ...DEFAULT_SZI_RULES,
      ...cloned,
      statusClassifications: {
        ...DEFAULT_SZI_RULES.statusClassifications,
        ...(cloned.statusClassifications || {}),
      },
      exemptions: {
        ...DEFAULT_SZI_RULES.exemptions,
        ...(cloned.exemptions || {}),
      },
    });
    setGermanDateStr(formatToGermanDate(activeRuleSet.effectiveFrom));
    setValidationError('');
    setSaveSuccessMsg('Aktives Regelwerk geladen.');
    setTimeout(() => setSaveSuccessMsg(''), 2500);
  };

  // Status Handlers
  const handleSetCategory = (code: string, newCat: ClassificationCategory) => {
    const clean = code.toLowerCase().trim();
    const current = formData.statusClassifications || {
      activeCodes: [],
      passiveCodes: [],
      guestCodes: [],
      honoraryCodes: [],
    };

    const next: StatusClassifications = {
      activeCodes: (current.activeCodes || []).filter(c => c.toLowerCase().trim() !== clean),
      passiveCodes: (current.passiveCodes || []).filter(c => c.toLowerCase().trim() !== clean),
      honoraryCodes: (current.honoraryCodes || []).filter(c => c.toLowerCase().trim() !== clean),
      guestCodes: (current.guestCodes || []).filter(c => c.toLowerCase().trim() !== clean),
    };

    if (newCat === 'active') next.activeCodes.push(clean);
    if (newCat === 'passive') next.passiveCodes.push(clean);
    if (newCat === 'honorary') next.honoraryCodes.push(clean);
    if (newCat === 'guest') next.guestCodes.push(clean);

    setFormData({
      ...formData,
      statusClassifications: next,
    });
  };

  const handleDeleteCustomCode = (code: string) => {
    handleSetCategory(code, 'none');
  };

  const handleAddCustomCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newStatusCode.toLowerCase().trim();
    if (!clean) return;
    handleSetCategory(clean, newStatusCategory);
    setNewStatusCode('');
  };

  const handleAddKeyword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newKeyword.toLowerCase().trim();
    if (!clean) return;
    const current = formData.exemptions?.honoraryKeywords || [];
    if (!current.map(k => k.toLowerCase().trim()).includes(clean)) {
      setFormData({
        ...formData,
        exemptions: {
          ...(formData.exemptions || { regularBoardIsPayable: true }),
          honoraryKeywords: [...current, clean],
        },
      });
    }
    setNewKeyword('');
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    const current = formData.exemptions?.honoraryKeywords || [];
    setFormData({
      ...formData,
      exemptions: {
        ...(formData.exemptions || { regularBoardIsPayable: true }),
        honoraryKeywords: current.filter(k => k.toLowerCase().trim() !== keywordToRemove.toLowerCase().trim()),
      },
    });
  };

  // Liste aller bekannten & eingetragenen Status-Codes
  const allKnownCodes = useMemo(() => {
    const set = new Set<string>([
      ...Object.keys(MEMBER_STATUS_LABELS),
      ...(formData.statusClassifications?.activeCodes || []),
      ...(formData.statusClassifications?.passiveCodes || []),
      ...(formData.statusClassifications?.guestCodes || []),
      ...(formData.statusClassifications?.honoraryCodes || []),
    ]);
    return Array.from(set).sort((a, b) => {
      const labelA = MEMBER_STATUS_LABELS[a] || a;
      const labelB = MEMBER_STATUS_LABELS[b] || b;
      return labelA.localeCompare(labelB, 'de');
    });
  }, [formData.statusClassifications]);

  const statusCounts = useMemo(() => {
    const counts = {
      all: allKnownCodes.length,
      active: 0,
      passive: 0,
      honorary: 0,
      guest: 0,
      none: 0,
    };
    for (const code of allKnownCodes) {
      const cat = getCategoryForCode(code, formData.statusClassifications);
      counts[cat]++;
    }
    return counts;
  }, [allKnownCodes, formData.statusClassifications]);

  const filteredCodes = useMemo(() => {
    return allKnownCodes.filter(code => {
      const label = MEMBER_STATUS_LABELS[code] || '';
      const matchesSearch =
        !statusSearch ||
        code.toLowerCase().includes(statusSearch.toLowerCase()) ||
        label.toLowerCase().includes(statusSearch.toLowerCase());
      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      const cat = getCategoryForCode(code, formData.statusClassifications);
      return cat === statusFilter;
    });
  }, [allKnownCodes, statusSearch, statusFilter, formData.statusClassifications]);

  const validateCurrent = (): FeeRuleSet | null => {
    const isoDate = parseGermanToIsoDate(germanDateStr) || germanDateStr;
    const toValidate = {
      ...formData,
      effectiveFrom: isoDate,
    };
    const res = feeRuleSetSchema.safeParse(toValidate);
    if (!res.success) {
      const err = res.error.issues[0];
      setValidationError(`${err.path.join('.')}: ${err.message}`);
      return null;
    }
    setValidationError('');
    return res.data as FeeRuleSet;
  };

  const isDraftModified = useMemo(() => !areRuleSetsEqual(formData, DEFAULT_SZI_RULES), [formData]);

  const handleApply = () => {
    let valid = validateCurrent();
    if (!valid) return;

    if (!valid.name || !valid.name.trim()) {
      valid.name = 'Unbenanntes Szenario';
    }

    if (isBuiltinRuleSet(valid.id, valid)) {
      valid = {
        ...valid,
        id: `szi-szenario-${Date.now()}`,
        isOfficial: false,
        isDefault: false,
      };
    }

    onApplyRuleSet(valid);
    setSaveSuccessMsg(`Szenario „${valid.name}“ erfolgreich im Browser gespeichert & angewendet!`);
    setTimeout(() => {
      setSaveSuccessMsg('');
      onClose();
    }, 800);
  };

  const handleApplyAsBaseline = () => {
    let valid = validateCurrent();
    if (!valid) return;

    if (!valid.name || !valid.name.trim()) {
      valid.name = 'Unbenanntes Szenario';
    }

    if (isBuiltinRuleSet(valid.id, valid)) {
      valid = {
        ...valid,
        id: `szi-szenario-${Date.now()}`,
        isOfficial: false,
        isDefault: false,
      };
    }

    if (onSetAsBaseline) {
      onSetAsBaseline(valid);
      setSaveSuccessMsg(`Szenario „${valid.name}“ als Vergleichsbasis gesetzt!`);
      setTimeout(() => {
        setSaveSuccessMsg('');
        onClose();
      }, 800);
    }
  };

  const handleDownloadJson = () => {
    let valid = validateCurrent();
    if (!valid) return;

    if (!valid.name || !valid.name.trim()) {
      valid.name = 'Unbenanntes Szenario';
    }

    if (isBuiltinRuleSet(valid.id, valid)) {
      valid = {
        ...valid,
        id: `szi-szenario-${Date.now()}`,
      };
    }

    const jsonStr = JSON.stringify(valid, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedName = valid.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    link.setAttribute('download', `${sanitizedName || 'beitragsordnung'}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const isStartingFromDefault = isBuiltinRuleSet(activeRuleSet?.id, activeRuleSet);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#DFD0F2] max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#261420] via-[#3d1a33] to-[#572986] text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileCode className="w-6 h-6 text-[#EFC415]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">
                  {isStartingFromDefault ? 'Neues Beitrags-Szenario erstellen' : 'Berechnungsgrundlage anpassen'}
                </h3>
                {isStartingFromDefault ? (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#EFC415]/20 text-[#EFC415] border border-[#EFC415]/40 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Standard ist schreibgeschützt
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 flex items-center gap-1">
                    <Save className="w-3 h-3" />
                    Gespeichertes Szenario
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-300">
                {isStartingFromDefault
                  ? 'Basiert auf der offiziellen Satzung 2025. Deine Anpassungen werden als neues Szenario im Browser gespeichert.'
                  : `Änderungen am Szenario „${activeRuleSet?.name}“ werden lokal in deinem Browser aktualisiert.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transparenter Szenario-Titel & Ausgangsbasis Leiste */}
        <div className="bg-[#FAF9FB] border-b border-stone-200 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                Name des Szenarios / der Berechnung:
              </label>
              <span className="text-[11px] font-medium text-stone-400">
                (wird in Auswahllisten und Exporten angezeigt)
              </span>
            </div>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="z. B. GV 2026: Beitragsanpassung (+5 €)"
              className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-1.5 text-sm font-semibold text-[#261420] focus:ring-2 focus:ring-[#9565C8] outline-none shadow-xs"
            />
          </div>
          <div className="shrink-0 flex sm:flex-col items-start sm:items-end justify-between">
            <span className="text-[11px] text-stone-500 font-medium mb-1">Speicherziel:</span>
            <span className="text-xs font-semibold text-[#572986] flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-[#DFD0F2] shadow-xs">
              <Save className="w-3.5 h-3.5 text-[#9565C8]" />
              <span>Lokaler Browser-Speicher</span>
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-6 pt-3 gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shrink-0 relative z-10">
          <button
            type="button"
            onClick={() => setActiveTab('rates')}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'rates'
                ? 'bg-white text-[#572986] border-[#9565C8] shadow-xs'
                : 'text-stone-600 hover:text-stone-900 border-transparent'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Beitragssätze (€)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('thresholds')}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'thresholds'
                ? 'bg-white text-[#572986] border-[#9565C8] shadow-xs'
                : 'text-stone-600 hover:text-stone-900 border-transparent'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Altersgrenzen & Stichtag</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'status'
                ? 'bg-white text-[#572986] border-[#9565C8] shadow-xs'
                : 'text-stone-600 hover:text-stone-900 border-transparent'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Status-Zuordnung</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('meta')}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'meta'
                ? 'bg-white text-[#572986] border-[#9565C8] shadow-xs'
                : 'text-stone-600 hover:text-stone-900 border-transparent'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Bezeichnung & Metadaten</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
          {validationError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{validationError}</span>
            </div>
          )}

          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* TAB 1: BEITRÄGE */}
          {activeTab === 'rates' && (
            <div className="space-y-6">
              {/* Einzelzahler */}
              <div className="bg-stone-50/70 p-4 rounded-xl border border-stone-200 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#261420]">
                  <Users className="w-4 h-4 text-[#9565C8]" />
                  <span>Einzelzahler (Jahresbeitrag)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">
                      Erwachsener aktiv (€)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.rates.single.adultActive}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          rates: {
                            ...formData.rates,
                            single: { ...formData.rates.single, adultActive: parseFloat(e.target.value) || 0 },
                          },
                        })
                      }
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#9565C8] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">
                      Erwachsener passiv (€)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.rates.single.adultPassive}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          rates: {
                            ...formData.rates,
                            single: { ...formData.rates.single, adultPassive: parseFloat(e.target.value) || 0 },
                          },
                        })
                      }
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#9565C8] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">
                      Jugendliche unter 18 (€)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.rates.single.youthUnder18}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          rates: {
                            ...formData.rates,
                            single: { ...formData.rates.single, youthUnder18: parseFloat(e.target.value) || 0 },
                          },
                        })
                      }
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#9565C8] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Familienbeitrag */}
              <div className="bg-stone-50/70 p-4 rounded-xl border border-stone-200 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#261420]">
                  <Sparkles className="w-4 h-4 text-[#9565C8]" />
                  <span>Familienbeitrag (§ 2 Beitragsordnung)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">
                      Sockelbetrag als Zahler (€)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.rates.family.basePayer}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          rates: {
                            ...formData.rates,
                            family: { ...formData.rates.family, basePayer: parseFloat(e.target.value) || 0 },
                          },
                        })
                      }
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#9565C8] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">
                      Aktiver Partner / Ehepartner (€)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.rates.family.activePartner}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          rates: {
                            ...formData.rates,
                            family: { ...formData.rates.family, activePartner: parseFloat(e.target.value) || 0 },
                          },
                        })
                      }
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#9565C8] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">
                      1. aktives Kind unter Höchstalter (€)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.rates.family.firstActiveChild}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          rates: {
                            ...formData.rates,
                            family: { ...formData.rates.family, firstActiveChild: parseFloat(e.target.value) || 0 },
                          },
                        })
                      }
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#9565C8] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">
                      Ab 2. aktivem Kind (€)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.rates.family.subsequentActiveChild}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          rates: {
                            ...formData.rates,
                            family: { ...formData.rates.family, subsequentActiveChild: parseFloat(e.target.value) || 0 },
                          },
                        })
                      }
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#9565C8] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Sondergebühren */}
              <div className="bg-stone-50/70 p-4 rounded-xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#261420]">
                    <Sliders className="w-4 h-4 text-[#9565C8]" />
                    <span>Sondergebühren & Kaution</span>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                    Hinweis: Noch ohne Berechnungsfunktion
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  Diese satzungsmäßigen Werte werden im Regelwerk und JSON-Export dokumentiert, fließen derzeit jedoch noch nicht automatisch in die Beitragsberechnung ein.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-stone-600">
                        Rechnungsgebühr (§ 1 Abs. 4) (€)
                      </label>
                      <span className="text-[10px] text-stone-400 font-medium">Inaktiv</span>
                    </div>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.rates.specialFees?.invoiceExtraCharge ?? 5.0}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          rates: {
                            ...formData.rates,
                            specialFees: {
                              ...formData.rates.specialFees,
                              invoiceExtraCharge: parseFloat(e.target.value) || 0,
                              instrumentDeposit: formData.rates.specialFees?.instrumentDeposit ?? 100.0,
                            },
                          },
                        })
                      }
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#9565C8] outline-none"
                    />
                    <span className="text-[11px] text-stone-500 mt-1 block">
                      Wird bei Rechnungszahlern derzeit noch nicht automatisch auf den Beitrag addiert.
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-stone-600">
                        Instrumentenkaution (§ 4) (€)
                      </label>
                      <span className="text-[10px] text-stone-400 font-medium">Inaktiv</span>
                    </div>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={formData.rates.specialFees?.instrumentDeposit ?? 100.0}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          rates: {
                            ...formData.rates,
                            specialFees: {
                              ...formData.rates.specialFees,
                              invoiceExtraCharge: formData.rates.specialFees?.invoiceExtraCharge ?? 5.0,
                              instrumentDeposit: parseFloat(e.target.value) || 0,
                            },
                          },
                        })
                      }
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#9565C8] outline-none"
                    />
                    <span className="text-[11px] text-stone-500 mt-1 block">
                      Wird in der SEPA-Beitragsberechnung derzeit noch nicht automatisch eingezogen.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ALTERSGRENZEN & STICHTAG */}
          {activeTab === 'thresholds' && (
            <div className="space-y-6">
              <div className="bg-stone-50/70 p-4 rounded-xl border border-stone-200 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#261420]">
                  <Calendar className="w-4 h-4 text-[#9565C8]" />
                  <span>Altersgrenzen</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">
                      Volljährigkeit / Beitragsfreiheit Kinder (Jahre)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={formData.ageThresholds.youthExemptMaxAge}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          ageThresholds: {
                            ...formData.ageThresholds,
                            youthExemptMaxAge: parseInt(e.target.value, 10) || 18,
                          },
                        })
                      }
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#9565C8] outline-none"
                    />
                    <span className="text-[11px] text-stone-500 mt-1 block">
                      Kinder & Jugendliche unter diesem Alter sind beitragsfrei (Standard: 18).
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">
                      Familienkind-Höchstalter (§ 2) (Jahre)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={formData.ageThresholds.familyChildMaxAge}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          ageThresholds: {
                            ...formData.ageThresholds,
                            familyChildMaxAge: parseInt(e.target.value, 10) || 25,
                          },
                        })
                      }
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#9565C8] outline-none"
                    />
                    <span className="text-[11px] text-stone-500 mt-1 block">
                      Ab diesem Alter scheiden Kinder aus dem Familienbeitrag aus (Standard: 25).
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-stone-50/70 p-4 rounded-xl border border-stone-200 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#261420]">
                  <Calendar className="w-4 h-4 text-[#9565C8]" />
                  <span>Stichtag für Altersberechnungen</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">
                      Tag des Monats
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.timing.cutoffDay}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          timing: { ...formData.timing, cutoffDay: parseInt(e.target.value, 10) || 15 },
                        })
                      }
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#9565C8] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">
                      Monat (1 = Jan, 4 = April, 12 = Dez)
                    </label>
                    <select
                      value={formData.timing.cutoffMonth}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          timing: { ...formData.timing, cutoffMonth: parseInt(e.target.value, 10) || 4 },
                        })
                      }
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#9565C8] outline-none"
                    >
                      <option value={1}>Januar (1)</option>
                      <option value={2}>Februar (2)</option>
                      <option value={3}>März (3)</option>
                      <option value={4}>April (4) [SZI Standard]</option>
                      <option value={5}>Mai (5)</option>
                      <option value={6}>Juni (6)</option>
                      <option value={7}>Juli (7)</option>
                      <option value={8}>August (8)</option>
                      <option value={9}>September (9)</option>
                      <option value={10}>Oktober (10)</option>
                      <option value={11}>November (11)</option>
                      <option value={12}>Dezember (12)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STATUS-ZUORDNUNG */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Info Banner */}
              <div className="bg-[#FAF9FB] border border-[#DFD0F2] rounded-xl p-4 flex gap-3 text-xs text-stone-700">
                <Info className="w-5 h-5 text-[#9565C8] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-[#261420]">
                    Zuordnung der 26 Status-Codes aus zunft.app zu Abrechnungskategorien
                  </p>
                  <p className="text-stone-600 leading-relaxed">
                    Mitglieder mit einem <strong>aktiven Status</strong> zahlen den vollen Erwachsenenbeitrag bzw. lösen Partner-/Kinderzuschläge aus.
                    Mitglieder mit einem <strong>passiven Status</strong> zahlen den ermäßigten Beitrag bzw. sind im Familienverbund inklusive.
                    <strong>Ehrenmitglieder</strong> sind gem. § 1 Abs. 6 beitragsfrei (0,00 €).
                  </p>
                </div>
              </div>

              {/* Suchleiste & Filter-Chips */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                  <input
                    type="text"
                    value={statusSearch}
                    onChange={e => setStatusSearch(e.target.value)}
                    placeholder="Status oder Code durchsuchen (z. B. Jungaktiv, twen, passiv, sponsor)..."
                    className="w-full bg-white border border-stone-300 rounded-xl pl-9 pr-8 py-2 text-xs focus:ring-2 focus:ring-[#9565C8] outline-none"
                  />
                  {statusSearch && (
                    <button
                      type="button"
                      onClick={() => setStatusSearch('')}
                      className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600 p-0.5 rounded text-xs"
                      title="Suche zurücksetzen"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-stone-500 font-medium mr-1">Filter:</span>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      statusFilter === 'all'
                        ? 'bg-[#572986] text-white shadow-xs font-semibold'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Alle ({statusCounts.all})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('active')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      statusFilter === 'active'
                        ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    Aktiv ({statusCounts.active})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('passive')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      statusFilter === 'passive'
                        ? 'bg-blue-600 text-white shadow-xs font-semibold'
                        : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                    }`}
                  >
                    Passiv ({statusCounts.passive})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('honorary')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      statusFilter === 'honorary'
                        ? 'bg-amber-600 text-white shadow-xs font-semibold'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    Ehrenmitglied ({statusCounts.honorary})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('guest')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      statusFilter === 'guest'
                        ? 'bg-purple-600 text-white shadow-xs font-semibold'
                        : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                    }`}
                  >
                    Gast ({statusCounts.guest})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('none')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      statusFilter === 'none'
                        ? 'bg-stone-500 text-white shadow-xs font-semibold'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Inaktiv / Keine ({statusCounts.none})
                  </button>
                </div>
              </div>

              {/* Status-Liste */}
              <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100 overflow-hidden shadow-xs">
                {filteredCodes.length === 0 ? (
                  <div className="p-8 text-center text-xs text-stone-500">
                    Keine Status-Codes gefunden, die den Kriterien entsprechen.
                  </div>
                ) : (
                  filteredCodes.map(code => {
                    const label = MEMBER_STATUS_LABELS[code] || code;
                    const cat = getCategoryForCode(code, formData.statusClassifications);
                    const isStandardCode = Boolean(MEMBER_STATUS_LABELS[code]);

                    return (
                      <div
                        key={code}
                        className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-stone-50/70 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-800">{label}</span>
                          <span className="font-mono text-[11px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded border border-stone-200">
                            {code}
                          </span>
                          {!isStandardCode && (
                            <span className="text-[10px] bg-purple-100 text-purple-800 font-medium px-1.5 py-0.5 rounded-full">
                              Benutzerdefiniert
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <div className="inline-flex rounded-lg bg-stone-100 p-0.5 border border-stone-200">
                            <button
                              type="button"
                              onClick={() => handleSetCategory(code, 'active')}
                              className={`px-2 py-1 text-[11px] rounded-md transition-all ${
                                cat === 'active'
                                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                  : 'text-stone-600 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              Aktiv
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetCategory(code, 'passive')}
                              className={`px-2 py-1 text-[11px] rounded-md transition-all ${
                                cat === 'passive'
                                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                                  : 'text-stone-600 hover:text-blue-700 hover:bg-blue-50'
                              }`}
                            >
                              Passiv
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetCategory(code, 'honorary')}
                              className={`px-2 py-1 text-[11px] rounded-md transition-all ${
                                cat === 'honorary'
                                  ? 'bg-amber-600 text-white font-bold shadow-xs'
                                  : 'text-stone-600 hover:text-amber-700 hover:bg-amber-50'
                              }`}
                            >
                              Ehrenmitglied
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetCategory(code, 'guest')}
                              className={`px-2 py-1 text-[11px] rounded-md transition-all ${
                                cat === 'guest'
                                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                                  : 'text-stone-600 hover:text-purple-700 hover:bg-purple-50'
                              }`}
                            >
                              Gast
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetCategory(code, 'none')}
                              className={`px-2 py-1 text-[11px] rounded-md transition-all ${
                                cat === 'none'
                                  ? 'bg-stone-500 text-white font-bold shadow-xs'
                                  : 'text-stone-400 hover:text-stone-700 hover:bg-stone-200'
                              }`}
                              title="Inaktiv / Keine Abrechnungsklasse"
                            >
                              Inaktiv
                            </button>
                          </div>

                          {!isStandardCode && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomCode(code)}
                              className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Diesen benutzerdefinierten Status entfernen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Neuen Status-Code anlegen */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#261420]">
                  <Plus className="w-4 h-4 text-[#9565C8]" />
                  <span>Neuen / weiteren Status-Code hinzufügen</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    value={newStatusCode}
                    onChange={e => setNewStatusCode(e.target.value)}
                    placeholder="Code eingeben (z. B. student, alumni)..."
                    className="w-full sm:flex-1 bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-[#9565C8] outline-none"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomCode();
                      }
                    }}
                  />
                  <select
                    value={newStatusCategory}
                    onChange={e => setNewStatusCategory(e.target.value as ClassificationCategory)}
                    className="w-full sm:w-auto bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-[#9565C8] outline-none"
                  >
                    <option value="active">Zuordnung: Aktiv</option>
                    <option value="passive">Zuordnung: Passiv</option>
                    <option value="honorary">Zuordnung: Ehrenmitglied</option>
                    <option value="guest">Zuordnung: Gast</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddCustomCode}
                    disabled={!newStatusCode.trim()}
                    className="w-full sm:w-auto px-3.5 py-1.5 bg-[#9565C8] hover:bg-[#824EBB] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Hinzufügen</span>
                  </button>
                </div>
              </div>

              {/* Ehrenamts-Schlagwörter & Vorstands-Ausnahmen */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#261420]">
                  <Shield className="w-4 h-4 text-[#9565C8]" />
                  <span>Automatische Beitragsbefreiung für Ehrenämter (§ 1 Abs. 6)</span>
                </div>
                <p className="text-[11px] text-stone-600">
                  Enthält die Vereins- oder Vorstandsfunktion eines Mitglieds eines dieser Schlagwörter (z. B. <em>Ehrenvorstand</em>, <em>Ehrendirigent</em>), ist das Mitglied beitragsfrei (0,00 €).
                </p>

                {/* Tag Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(formData.exemptions?.honoraryKeywords || []).map(keyword => (
                    <span
                      key={keyword}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-medium"
                    >
                      <span>{keyword}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(keyword)}
                        className="text-amber-600 hover:text-amber-900 rounded p-0.5"
                        title={`"${keyword}" entfernen`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                {/* Neues Schlagwort hinzufügen */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={e => setNewKeyword(e.target.value)}
                    placeholder="Weiteres Schlagwort (z. B. ehrenbeirat)..."
                    className="flex-1 bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-[#9565C8] outline-none"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddKeyword();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    disabled={!newKeyword.trim()}
                    className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 disabled:opacity-50 text-stone-800 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Hinzufügen</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-stone-200 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="regularBoardIsPayable"
                    checked={formData.exemptions?.regularBoardIsPayable ?? true}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        exemptions: {
                          ...(formData.exemptions || { honoraryKeywords: [] }),
                          regularBoardIsPayable: e.target.checked,
                        },
                      })
                    }
                    className="rounded border-stone-300 text-[#9565C8] focus:ring-[#9565C8]"
                  />
                  <label htmlFor="regularBoardIsPayable" className="text-xs text-stone-700">
                    Reguläre Vorstandsmitglieder (1./2. Vorstand, Kassier, Schriftführer etc.) sind beitragspflichtig
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: METADATEN */}
          {activeTab === 'meta' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Eindeutige ID (Dateiname-tauglich)
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={e => setFormData({ ...formData, id: e.target.value })}
                  placeholder="z. B. szi-anpassung-2027"
                  className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#9565C8] outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Name / Bezeichnung
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z. B. SZI Beitragsanpassung 2027 (GV-Entwurf B)"
                  className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#9565C8] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Gültig ab (Datum)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={germanDateStr}
                    onChange={e => handleGermanDateChange(e.target.value)}
                    placeholder="TT.MM.JJJJ (z. B. 05.04.2025)"
                    className="w-full bg-white border border-stone-300 rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-[#9565C8] outline-none font-mono"
                  />
                  <div className="absolute right-2 flex items-center">
                    <input
                      type="date"
                      value={parseGermanToIsoDate(germanDateStr)}
                      onChange={e => {
                        if (e.target.value) {
                          const german = formatToGermanDate(e.target.value);
                          setGermanDateStr(german);
                          setFormData(prev => ({ ...prev, effectiveFrom: e.target.value }));
                        }
                      }}
                      className="w-7 h-7 opacity-0 cursor-pointer absolute right-0 z-10"
                      title="Datum im Kalender auswählen"
                    />
                    <button
                      type="button"
                      className="p-1 text-stone-400 hover:text-[#9565C8] transition-colors pointer-events-none"
                      title="Kalender öffnen"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Format: TT.MM.JJJJ (z. B. 05.04.2025). Kann getippt oder über das Kalendersymbol gewählt werden.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Beschreibung / Notiz für den Vorstand
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Notizen zum Beschluss oder den Hintergründen der Anpassung..."
                  className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#9565C8] outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-stone-100 border-t border-stone-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors flex items-center gap-1.5"
              title="Setzt die Eingabefelder auf die originale Beitragsordnung 2025 zurück"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Standard 2025 laden</span>
            </button>
            <button
              type="button"
              onClick={handleLoadCurrent}
              className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors flex items-center gap-1.5"
              title="Kopiert das aktuell in der App aktive Regelwerk zur weiteren Bearbeitung"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Aktives duplizieren</span>
            </button>

            {isDraftModified ? (
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300"
                title="Die aktuellen Eingaben weichen von der Standard-Beitragsordnung SZI 2025 ab."
              >
                <Edit3 className="w-3 h-3 text-amber-600 shrink-0" />
                <span>Angepasst</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                title="Entspricht dem offiziellen SZI Standard 2025."
              >
                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Standard 2025</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleDownloadJson}
              className="px-3.5 py-2 text-xs font-semibold text-[#572986] bg-white border border-[#DFD0F2] rounded-xl hover:bg-[#FAF9FB] transition-all flex items-center gap-1.5 shadow-xs"
              title="Speichert eine valide .json-Datei auf deinen Computer (z. B. zum Weiterleiten an Vorstandskollegen)"
            >
              <Download className="w-4 h-4 text-[#9565C8]" />
              <span>Als JSON exportieren</span>
            </button>

            {onSetAsBaseline && (
              <button
                type="button"
                onClick={handleApplyAsBaseline}
                className="px-3.5 py-2 text-xs font-semibold text-stone-700 bg-stone-200 hover:bg-stone-300 rounded-xl transition-all"
                title="Nutzt dieses Regelwerk als Vergleichsbasis (Baseline)"
              >
                <span>Als Vergleichsbasis</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 text-xs font-bold text-white bg-[#9565C8] hover:bg-[#824EBB] active:bg-[#572986] rounded-xl shadow-md transition-all flex items-center gap-1.5"
              title="Speichert das Szenario im Browser und wendet es sofort auf die Beitragsberechnung an"
            >
              <Save className="w-4 h-4" />
              <span>Im Browser speichern & anwenden</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
