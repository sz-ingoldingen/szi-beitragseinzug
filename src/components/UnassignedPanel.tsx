import React from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { UnassignedMember, getMemberStatusLabel } from '../utils/sepaCalculator.ts';

interface UnassignedPanelProps {
  unassignedMembers: UnassignedMember[];
  showUnassigned: boolean;
  onToggleShow: () => void;
  unassignedSearch: string;
  onSearchChange: (query: string) => void;
}

export function UnassignedPanel({
  unassignedMembers,
  showUnassigned,
  onToggleShow,
  unassignedSearch,
  onSearchChange,
}: UnassignedPanelProps): React.JSX.Element | null {
  if (unassignedMembers.length === 0) return null;

  const filteredMembers = unassignedMembers.filter(m =>
    !unassignedSearch.trim() ||
    m.fullName.toLowerCase().includes(unassignedSearch.toLowerCase()) ||
    m.id.includes(unassignedSearch) ||
    m.status.toLowerCase().includes(unassignedSearch.toLowerCase())
  );

  return (
    <div className="bg-amber-50/90 border border-amber-300/80 rounded-2xl shadow-sm overflow-hidden transition-all">
      {/* Header (Clickable Banner) */}
      <div
        onClick={onToggleShow}
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-amber-100/60 transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300/60 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-amber-950">
                {unassignedMembers.length} Mitglieder ohne hinterlegte Zahler-/Bankdaten
              </span>
              <span className="text-[11px] font-semibold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                Nicht im SEPA-Lauf
              </span>
            </div>
            <p className="text-xs text-amber-800/80 mt-0.5">
              Z.B. Barzahler, Kinder ohne hinterlegte Eltern oder Mitglieder ab 25 Jahren ohne eigene IBAN.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 bg-white/80 border border-amber-300/70 px-3 py-1.5 rounded-xl shadow-xs shrink-0">
          <span>{showUnassigned ? 'Ausblenden' : 'Details anzeigen'}</span>
          {showUnassigned ? (
            <ChevronUp className="w-4 h-4 text-amber-800" />
          ) : (
            <ChevronDown className="w-4 h-4 text-amber-800" />
          )}
        </div>
      </div>

      {/* Aufgeklappter Inhalt (Kompakt & Scrollbar mit Suche) */}
      {showUnassigned && (
        <div className="p-4 border-t border-amber-200 bg-white/70 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                placeholder="In nicht zugeordneten Mitgliedern suchen..."
                value={unassignedSearch}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-[#9565C8] focus:outline-none bg-white"
              />
            </div>
            <div className="text-xs text-stone-500">
              Zeige {filteredMembers.length} von {unassignedMembers.length} Mitgliedern
            </div>
          </div>

          <div className="border border-stone-200 rounded-xl overflow-hidden bg-white max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 sticky top-0 border-b border-stone-200 font-semibold">
                <tr>
                  <th className="py-2 px-3">Nr</th>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Alter</th>
                  <th className="py-2 px-3">Kontoinhaber (Eintrag)</th>
                  <th className="py-2 px-3">Grund / Notiz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredMembers.map(m => (
                  <tr key={m.id} className="hover:bg-amber-50/40">
                    <td className="py-1.5 px-3 font-mono text-stone-500">#{m.id}</td>
                    <td className="py-1.5 px-3 font-semibold text-[#261420]">{m.fullName}</td>
                    <td className="py-1.5 px-3">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-700">
                        {getMemberStatusLabel(m.status)}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-stone-600">
                      {m.age !== null ? `${m.age} J.` : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-stone-600 font-mono text-[11px]">
                      {m.accountHolder || '—'}
                    </td>
                    <td className="py-1.5 px-3 text-amber-800 text-[11px]">
                      {m.issue}
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
