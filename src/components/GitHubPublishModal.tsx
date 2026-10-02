import React, { useState } from 'react';
import {
  X,
  Download,
  ExternalLink,
  CheckCircle2,
  GitBranch,
  ShieldCheck,
  FileCode,
  Clock,
} from 'lucide-react';
import { FeeRuleSet } from '../types/rules';

interface GitHubPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  ruleSet: FeeRuleSet;
}

export const GITHUB_REPO_URL = 'https://github.com/sz-ingoldingen/szi-beitragseinzug';
export const GITHUB_UPLOAD_URL = `${GITHUB_REPO_URL}/upload/main/public/rules`;
export const GITHUB_FOLDER_URL = `${GITHUB_REPO_URL}/tree/main/public/rules`;
export const GITHUB_COMMITS_URL = `${GITHUB_REPO_URL}/commits/main/public/rules`;

function getSuggestedFilename(ruleSet: FeeRuleSet): string {
  if (ruleSet.filename) return ruleSet.filename;
  const yearMatch = (ruleSet.effectiveFrom || '').match(/(\d{4})/);
  if (yearMatch) {
    return `szi_beitragsordnung_${yearMatch[1]}.json`;
  }
  const safeName = ruleSet.name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `szi_${safeName || 'szenario'}.json`;
}

export function GitHubPublishModal({
  isOpen,
  onClose,
  ruleSet,
}: GitHubPublishModalProps): React.JSX.Element | null {
  const [targetFilename, setTargetFilename] = useState<string>(() => getSuggestedFilename(ruleSet));
  const [isDefaultStandard, setIsDefaultStandard] = useState<boolean>(() => ruleSet.isDefault ?? true);
  const [hasDownloaded, setHasDownloaded] = useState<boolean>(false);

  // Aktualisiere Dateiname, wenn sich das übergebene Regelwerk ändert
  React.useEffect(() => {
    setTargetFilename(getSuggestedFilename(ruleSet));
    setIsDefaultStandard(ruleSet.isDefault ?? true);
    setHasDownloaded(false);
  }, [ruleSet]);

  if (!isOpen) return null;

  const cleanFilename = targetFilename.trim().endsWith('.json')
    ? targetFilename.trim()
    : `${targetFilename.trim()}.json`;

  const handleDownloadFile = () => {
    const yearMatch = (ruleSet.effectiveFrom || '').match(/(\d{4})/);
    const fallbackSlug = cleanFilename.replace(/\.json$/, '').replace(/^szi_/, '');
    const cleanId = isDefaultStandard && yearMatch
      ? `szi-standard-${yearMatch[1]}`
      : ruleSet.id.startsWith('szi-standard-')
        ? ruleSet.id
        : `szi-standard-${fallbackSlug}`;

    const fileContent: FeeRuleSet = {
      ...ruleSet,
      id: cleanId,
      filename: cleanFilename,
      isOfficial: true,
      isDefault: isDefaultStandard,
    };

    const jsonStr = JSON.stringify(fileContent, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', cleanFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setHasDownloaded(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#DFD0F2] max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#261420] via-[#3d1a33] to-[#572986] text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <GitBranch className="w-6 h-6 text-[#EFC415]" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Beitragsordnung auf GitHub veröffentlichen</h3>
              <p className="text-xs text-stone-300">
                Geführter 3-Schritte-Workflow für Vorstandsmitglieder (ohne Programmierung)
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

        {/* Infoleiste: Welches Regelwerk wird bereitgestellt */}
        <div className="bg-[#FAF9FB] border-b border-stone-200 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-stone-500 font-medium">Bereitstellungs-Quelle: </span>
            <span className="font-bold text-[#261420]">{ruleSet.name}</span>
            {ruleSet.effectiveFrom && (
              <span className="ml-2 text-stone-500">(Gültig ab {ruleSet.effectiveFrom})</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-stone-600 font-mono text-[11px] bg-white px-2 py-1 rounded border border-stone-200">
            <FileCode className="w-3.5 h-3.5 text-[#9565C8]" />
            <span>public/rules/{cleanFilename}</span>
          </div>
        </div>

        {/* Inhalt & Schritte */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">

          {/* Konfiguration: Dateiname & Rolle */}
          <div className="bg-purple-50/50 border border-purple-200/80 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-[#572986] uppercase tracking-wide">
              Ziel-Konfiguration im Vereinsarchiv
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Dateiname auf GitHub:
                </label>
                <input
                  type="text"
                  value={targetFilename}
                  onChange={e => {
                    setTargetFilename(e.target.value);
                    setHasDownloaded(false);
                  }}
                  placeholder="z. B. szi_beitragsordnung_2026.json"
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 font-mono text-xs text-[#261420] focus:ring-2 focus:ring-[#9565C8] outline-none"
                />
                <span className="text-[10px] text-stone-500 mt-0.5 block">
                  Tipp: Eindeutige Namen wie <code>szi_2026.json</code> ermöglichen jahresgenauen Vergleich.
                </span>
              </div>

              <div className="flex flex-col justify-center">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isDefaultStandard}
                    onChange={e => {
                      setIsDefaultStandard(e.target.checked);
                      setHasDownloaded(false);
                    }}
                    className="mt-0.5 rounded text-[#572986] focus:ring-[#9565C8]"
                  />
                  <div>
                    <span className="font-semibold text-stone-800">
                      Als aktuellen Hauptstandard festlegen
                    </span>
                    <p className="text-[11px] text-stone-500 leading-normal mt-0.5">
                      {isDefaultStandard
                        ? 'Wird als Standard-Berechnungsgrundlage für alle Vorstandsmitglieder beim Laden ausgewählt.'
                        : 'Wird als historischer Stand bzw. Vergleichsszenario im Katalog hinterlegt.'}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
          
          {/* Schritt 1 */}
          <div className="border border-stone-200 rounded-xl p-4 bg-white shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#572986] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <h4 className="text-sm font-bold text-[#261420]">
                  Satzungsdatei herunterladen
                </h4>
              </div>
              {hasDownloaded && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Heruntergeladen
                </span>
              )}
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Lädt die Beitragsordnung als validierte Datei <strong>{cleanFilename}</strong> auf deinen Computer herunter.
            </p>

            <button
              type="button"
              onClick={handleDownloadFile}
              className={`w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs ${
                hasDownloaded
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                  : 'bg-[#9565C8] hover:bg-[#824EBB] text-white shadow-md'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Datei „{cleanFilename}“ herunterladen</span>
            </button>
          </div>

          {/* Schritt 2 */}
          <div className={`border rounded-xl p-4 transition-all shadow-xs space-y-3 ${
            hasDownloaded ? 'border-stone-200 bg-white' : 'border-stone-200 bg-stone-50/60 opacity-80'
          }`}>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#572986] text-white text-xs font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <h4 className="text-sm font-bold text-[#261420]">
                GitHub-Upload im Webbrowser öffnen
              </h4>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Öffnet die Upload-Seite für den Ordner <code>public/rules/</code> auf GitHub. Ziehe die soeben heruntergeladene Datei <strong>{cleanFilename}</strong> dort einfach per Drag & Drop hinein.
            </p>

            <a
              href={GITHUB_UPLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-stone-800 bg-[#FAF9FB] hover:bg-white border border-[#DFD0F2] rounded-xl hover:shadow-xs transition-all"
            >
              <ExternalLink className="w-4 h-4 text-[#9565C8]" />
              <span>GitHub-Upload per Direktlink öffnen</span>
            </a>
          </div>

          {/* Schritt 3 */}
          <div className="border border-stone-200 rounded-xl p-4 bg-white shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#572986] text-white text-xs font-bold flex items-center justify-center shrink-0">
                3
              </span>
              <h4 className="text-sm font-bold text-[#261420]">
                Änderungen bestätigen & Automatisch im Katalog archivieren
              </h4>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Tippe unten auf der GitHub-Seite eine kurze Notiz ein (z. B. <em>„Beschluss GV: Beitragsordnung {ruleSet.effectiveFrom?.slice(0, 4) || 'neu'}“</em>) und klicke auf <strong>„Commit changes“</strong>.
            </p>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Was passiert danach?</strong> GitHub Actions führt automatisch alle Plausibilitätstests durch und baut den Jahreskatalog (<code>catalog.json</code>) neu. Nach ca. 60 Sekunden steht die Beitragsordnung allen Vorständen in den Auswahllisten zum beliebigen A/B-Vergleich zur Verfügung!
              </span>
            </div>
          </div>

          {/* Alternative Optionen / Links */}
          <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Revisionssicher & Versionskontrolliert</span>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={GITHUB_FOLDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#572986] underline flex items-center gap-1"
                title="Alle im Repository hinterlegten Beitragsordnungen und Jahre ansehen"
              >
                <span>Alle Ordnungen auf GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={GITHUB_COMMITS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#572986] underline flex items-center gap-1"
                title="Historie aller bisherigen Satzungsänderungen ansehen"
              >
                <span>Änderungshistorie</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-stone-100 border-t border-stone-200 px-6 py-3.5 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-xl hover:bg-stone-50 transition-all shadow-xs"
          >
            Schließen
          </button>
        </div>

      </div>
    </div>
  );
}
