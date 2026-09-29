import React from 'react';
import { Info, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { InactiveMember } from '../utils/sepaCalculator.ts';

interface InactivePanelProps {
  inactiveMembers: InactiveMember[];
  showInactive: boolean;
  onToggleShow: () => void;
  inactiveSearch: string;
  onSearchChange: (query: string) => void;
}

export function InactivePanel({
  inactiveMembers,
  showInactive,
  onToggleShow,
  inactiveSearch,
  onSearchChange,
}: InactivePanelProps): React.JSX.Element | null {
  if (inactiveMembers.length === 0) return null;

  const filteredMembers = inactiveMembers.filter(m =>
    !inactiveSearch.trim() ||
    m.fullName.toLowerCase().includes(inactiveSearch.toLowerCase()) ||
    m.id.includes(inactiveSearch) ||
    m.status.toLowerCase().includes(inactiveSearch.toLowerCase()) ||
    m.reasonText.toLowerCase().includes(inactiveSearch.toLowerCase())
  );

  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden transition-all">
      {/* Header (Clickable Banner) */}
      <div
        onClick={onToggleShow}
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-200/70 border border-slate-300/70 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4 text-slate-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {inactiveMembers.length} inaktive Verbindungen (Gekündigt / Verstorben)
              </span>
              <span className="text-[11px] font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                Rein informativ · Kein Einzug
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Mitglieder mit Beendigung der Mitgliedschaft oder Todesfall werden separat geführt. Es erfolgt kein Beitragseinzug (0,00 €).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300/80 px-3 py-1.5 rounded-xl shadow-xs shrink-0">
          <span>{showInactive ? 'Ausblenden' : 'Details anzeigen'}</span>
          {showInactive ? (
            <ChevronUp className="w-4 h-4 text-slate-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-600" />
          )}
        </div>
      </div>

      {/* Aufgeklappter Inhalt */}
      {showInactive && (
        <div className="p-4 border-t border-slate-200 bg-white/70 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                placeholder="In inaktiven Mitgliedern suchen..."
                value={inactiveSearch}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-[#9565C8] focus:outline-none bg-white"
              />
            </div>
            <div className="text-xs text-stone-500">
              Zeige {filteredMembers.length} von {inactiveMembers.length} inaktiven Verbindungen
            </div>
          </div>

          <div className="border border-stone-200 rounded-xl overflow-hidden bg-white max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2 px-3">Nr</th>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Kategorie</th>
                  <th className="py-2 px-3">Alter</th>
                  <th className="py-2 px-3">Status / Begründung</th>
                  <th className="py-2 px-3 text-right">Beitrag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredMembers.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/60">
                    <td className="py-1.5 px-3 font-mono text-stone-500">#{m.id}</td>
                    <td className="py-1.5 px-3 font-semibold text-[#261420]">{m.fullName}</td>
                    <td className="py-1.5 px-3">
                      {m.inactiveType === 'deceased' ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-200 text-stone-800">
                          Verstorben
                        </span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-800">
                          Gekündigt / Ausgetreten
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-stone-600">
                      {m.age !== null ? `${m.age} J.` : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-slate-600 text-[11px]">
                      {m.reasonText}
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-600">
                        0,00 €
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
