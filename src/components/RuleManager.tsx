import React, { useRef, useState } from 'react';
import {
  Upload,
  Download,
  RotateCcw,
  Sparkles,
  GitCompare,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Save,
  Lock,
  Copy,
  Trash2,
  Plus,
  GitBranch,
} from 'lucide-react';
import { FeeRuleSet, DEFAULT_SZI_RULES, feeRuleSetSchema } from '../types/rules';
import { areRuleSetsEqual } from '../utils/comparison';
import { isBuiltinRuleSet } from '../utils/rulesStorage';

interface RuleManagerProps {
  availableRuleSets: FeeRuleSet[];
  activeRuleSet: FeeRuleSet;
  baselineRuleSet: FeeRuleSet | null;
  onSelectActiveRuleSet: (ruleSet: FeeRuleSet) => void;
  onSelectBaselineRuleSet: (ruleSet: FeeRuleSet | null) => void;
  onAddRuleSet: (ruleSet: FeeRuleSet) => void;
  onDuplicateRuleSet?: (ruleSet: FeeRuleSet) => void;
  onDeleteRuleSet?: (id: string) => void;
  onResetToDefault: () => void;
  onOpenEditor: () => void;
  onOpenNewScenario?: () => void;
  onOpenGitHubPublish?: () => void;
}

export function RuleManager({
  availableRuleSets,
  activeRuleSet,
  baselineRuleSet,
  onSelectActiveRuleSet,
  onSelectBaselineRuleSet,
  onAddRuleSet,
  onDuplicateRuleSet,
  onDeleteRuleSet,
  onResetToDefault,
  onOpenEditor,
  onOpenNewScenario,
  onOpenGitHubPublish,
}: RuleManagerProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorToast, setErrorToast] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string>('');

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorToast(msg);
      setTimeout(() => setErrorToast(''), 4000);
    } else {
      setSuccessToast(msg);
      setTimeout(() => setSuccessToast(''), 3000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        const parsedJson = JSON.parse(text);
        const validation = feeRuleSetSchema.safeParse(parsedJson);

        if (!validation.success) {
          const firstErr = validation.error.issues[0];
          showToast(`Ungültige Regeldatei: ${firstErr.path.join('.')} - ${firstErr.message}`, true);
          return;
        }

        let validRuleSet = validation.data as FeeRuleSet;
        if (isBuiltinRuleSet(validRuleSet.id)) {
          validRuleSet = {
            ...validRuleSet,
            id: `szi-import-${Date.now()}`,
            name: `${validRuleSet.name} (Importiert)`,
          };
        }
        onAddRuleSet(validRuleSet);
        onSelectActiveRuleSet(validRuleSet);
        showToast(`Szenario „${validRuleSet.name}“ erfolgreich geladen & im Browser gespeichert!`);
      } catch (err) {
        showToast('Die Datei konnte nicht als JSON gelesen werden.', true);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadActive = () => {
    const jsonStr = JSON.stringify(activeRuleSet, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedName = activeRuleSet.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    link.setAttribute('download', `${sanitizedName || 'beitragsordnung'}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteActive = () => {
    if (isBuiltinRuleSet(activeRuleSet.id)) return;
    const confirmed = window.confirm(`Möchtest du das Szenario „${activeRuleSet.name}“ wirklich aus deinem Browser löschen?`);
    if (confirmed && onDeleteRuleSet) {
      onDeleteRuleSet(activeRuleSet.id);
      showToast(`Szenario „${activeRuleSet.name}“ wurde gelöscht.`);
    }
  };

  const isBuiltin = isBuiltinRuleSet(activeRuleSet.id, activeRuleSet);
  const isModifiedFromDefault = !areRuleSetsEqual(activeRuleSet, DEFAULT_SZI_RULES);
  const canReset = !isBuiltin || isModifiedFromDefault;

  // Trennung in offizielle Satzungsvorlagen (GitHub-Katalog) und benutzerdefinierte lokale Szenarien
  const builtinList = availableRuleSets.filter(r => isBuiltinRuleSet(r.id, r));
  const customList = availableRuleSets.filter(r => !isBuiltinRuleSet(r.id, r));

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-[#DFD0F2] overflow-hidden transition-all">
      {/* HAUPTBEREICH: Aktive Berechnungsgrundlage & Aktionen */}
      <div className="p-4 sm:p-5 space-y-3.5">
        {/* Zeile 1: Auswahl der Berechnungsgrundlage + Badge (links) & Datei-Tools (rechts) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-[#572986] bg-[#FAF9FB] px-2.5 py-1 rounded-md border border-[#DFD0F2] shrink-0">
              Berechnungsgrundlage
            </span>

            <select
              value={activeRuleSet.id}
              onChange={e => {
                const selected = availableRuleSets.find(r => r.id === e.target.value);
                if (selected) onSelectActiveRuleSet(selected);
              }}
              className="bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-bold text-[#261420] focus:ring-2 focus:ring-[#9565C8] outline-none shadow-xs max-w-[280px] sm:max-w-md truncate"
            >
              <optgroup label="🏛️ Offizielle Satzungen & Vorjahre (GitHub)">
                {builtinList.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.isDefault ? '★ (Standard)' : ''}
                  </option>
                ))}
              </optgroup>
              {customList.length > 0 && (
                <optgroup label="💾 Gespeicherte Szenarien (im Browser)">
                  {customList.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            {/* Status-Badge: Vollständig freistehend und geschützt */}
            {isBuiltin ? (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border shadow-xs shrink-0 ${
                  activeRuleSet.isDefault
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                }`}
                title={activeRuleSet.isDefault ? 'Offizieller Hauptstandard des Vereins.' : 'Offiziell hinterlegte Beitragsordnung / Vorjahr aus dem GitHub-Archiv.'}
              >
                <Lock className={`w-3.5 h-3.5 shrink-0 ${activeRuleSet.isDefault ? 'text-emerald-600' : 'text-indigo-600'}`} />
                <span>{activeRuleSet.isDefault ? 'Offizieller Standard' : 'Offizielles Vorjahr'}</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 shadow-xs shrink-0"
                title="Dieses Szenario ist lokal in deinem Browser gespeichert."
              >
                <Save className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Im Browser gespeichert</span>
              </span>
            )}
          </div>

          {/* Werkzeuge rechts: Neu / Export / Import */}
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={onOpenNewScenario || onOpenEditor}
              className="px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition-all flex items-center gap-1 shadow-xs"
              title="Ein neues Beitrags-Szenario anlegen"
            >
              <Plus className="w-3.5 h-3.5 text-stone-500" />
              <span>Neu</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadActive}
              className="px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition-all flex items-center gap-1 shadow-xs"
              title="Aktive Berechnungsgrundlage als JSON-Datei herunterladen"
            >
              <Download className="w-3.5 h-3.5 text-stone-500" />
              <span>Export</span>
            </button>

            <label className="cursor-pointer px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition-all flex items-center gap-1 shadow-xs">
              <Upload className="w-3.5 h-3.5 text-stone-500" />
              <span>Import</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Zeile 2: Aktions-Buttons EINDEUTIG zur aktiven Beitragsordnung */}
        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-stone-100">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1 hidden sm:inline shrink-0">
            Aktionen:
          </span>

          {/* Bearbeiten */}
          <button
            type="button"
            onClick={onOpenEditor}
            className="px-3.5 py-1.5 text-xs font-semibold text-[#261420] bg-[#FEFCE8] hover:bg-[#FDE68A] border border-[#FDE68A] rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
            title={isBuiltin ? 'Beitragsordnung bearbeiten (erstellt neues Szenario)' : `Szenario „${activeRuleSet.name}“ bearbeiten`}
          >
            {isBuiltin ? <Sparkles className="w-3.5 h-3.5 text-[#EFC415]" /> : <Edit3 className="w-3.5 h-3.5 text-amber-600" />}
            <span>{isBuiltin ? 'Berechnung anpassen' : 'Szenario bearbeiten'}</span>
          </button>

          {/* Klonen */}
          {onDuplicateRuleSet && (
            <button
              type="button"
              onClick={() => onDuplicateRuleSet(activeRuleSet)}
              className="px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-300 hover:bg-stone-50 rounded-xl transition-all flex items-center gap-1 shadow-xs"
              title={isBuiltin ? `Eine editierbare Kopie von „${activeRuleSet.name}“ als neues Szenario anlegen` : `Dieses Szenario duplizieren, um eine Variante zu testen`}
            >
              <Copy className="w-3.5 h-3.5 text-stone-500" />
              <span>Klonen</span>
            </button>
          )}

          {/* Auf GitHub veröffentlichen (nur für lokale Szenarien) */}
          {!isBuiltin && onOpenGitHubPublish && (
            <button
              type="button"
              onClick={onOpenGitHubPublish}
              className="px-3 py-1.5 text-xs font-semibold text-[#572986] hover:text-[#3d1a33] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
              title="Dieses lokale Szenario über GitHub als offizielle Beitragsordnung im Archiv für alle hinterlegen"
            >
              <GitBranch className="w-3.5 h-3.5 text-[#9565C8]" />
              <span>Auf GitHub veröffentlichen</span>
            </button>
          )}

          {/* Zurücksetzen auf Standard-Regelwerk */}
          {canReset && (
            <button
              type="button"
              onClick={onResetToDefault}
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
              title="Aktives Szenario verlassen und auf den offiziellen Standard zurücksetzen"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Auf Standard zurücksetzen</span>
            </button>
          )}

          {/* Löschen (nur für Custom) */}
          {!isBuiltin && onDeleteRuleSet && (
            <button
              type="button"
              onClick={handleDeleteActive}
              className="px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all flex items-center gap-1"
              title="Dieses gespeicherte Szenario aus dem Browser löschen"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Löschen</span>
            </button>
          )}
        </div>
      </div>

      {/* UNTERER BEREICH: Getrennter A/B-Vergleichs-Streifen (eindeutig visuell abgegrenzt) */}
      <div className="bg-[#FAF9FB] border-t border-[#DFD0F2] px-4 sm:px-5 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-bold text-[#572986]">
            <GitCompare className="w-4 h-4 text-[#9565C8]" />
            <span>A/B-Vergleichsbasis:</span>
          </div>

          <select
            value={baselineRuleSet ? baselineRuleSet.id : ''}
            onChange={e => {
              if (!e.target.value) {
                onSelectBaselineRuleSet(null);
              } else {
                const selected = availableRuleSets.find(r => r.id === e.target.value);
                if (selected) onSelectBaselineRuleSet(selected);
              }
            }}
            className="bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#261420] focus:ring-2 focus:ring-[#9565C8] outline-none shadow-xs max-w-[280px] sm:max-w-none truncate"
          >
            <option value="">Kein Vergleich (Nur Einzelansicht)</option>
            <optgroup label="🏛️ Offizielle Satzungen & Vorjahre (GitHub)">
              {builtinList.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.isDefault ? '★' : ''} {r.id === activeRuleSet.id ? '(Aktuell aktiv)' : ''}
                </option>
              ))}
            </optgroup>
            {customList.length > 0 && (
              <optgroup label="💾 Gespeicherte Szenarien">
                {customList.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.id === activeRuleSet.id ? '(Aktuell aktiv)' : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          {baselineRuleSet && (
            <button
              type="button"
              onClick={() => onSelectBaselineRuleSet(null)}
              className="px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-xs"
              title="A/B-Vergleich beenden"
            >
              Vergleich aufheben
            </button>
          )}
        </div>

        {/* Beschreibung / Status */}
        <div className="flex items-center gap-2 text-[11px] text-stone-500">
          {baselineRuleSet ? (
            <span className="font-semibold text-[#572986]">
              Vergleich mit „{baselineRuleSet.name}“ aktiv – Deltas werden in den KPIs und der Tabelle angezeigt.
            </span>
          ) : (
            <span className="italic truncate max-w-lg" title={activeRuleSet.description}>
              {activeRuleSet.description || 'Wähle eine Vergleichsbasis, um Vorher/Nachher-Differenzen centgenau zu berechnen.'}
            </span>
          )}
        </div>
      </div>

      {/* Toasts / Benachrichtigungen */}
      {errorToast && (
        <div className="m-4 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorToast}</span>
        </div>
      )}

      {successToast && (
        <div className="m-4 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}
    </div>
  );
}
