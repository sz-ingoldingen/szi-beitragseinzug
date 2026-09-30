import React from 'react';
import {
  RotateCcw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Award,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import {
  PayerGroup,
  isHonoraryMember,
  isInactiveMember,
  isActiveStatus,
  isPassiveStatus,
  isChildOrYouthStatus,
  getMemberStatusLabel,
  maskIBAN,
} from '../utils/sepaCalculator.ts';

interface PayerTableProps {
  filteredPayerGroups: PayerGroup[];
  totalPayerGroupsCount: number;
  isAnyFilterActive: boolean;
  onResetFilters: () => void;
  expandedPayers: Set<string>;
  onToggleExpand: (payerId: string) => void;
  onToggleAllExpand: () => void;
  onSelectAll: (select: boolean) => void;
  onTogglePayerSelection: (payerId: string) => void;
  privacyMode: boolean;
  onTogglePrivacyMode: () => void;
  revealedIbans: Set<string>;
  onToggleRevealIban: (payerId: string) => void;
}

export function PayerTable({
  filteredPayerGroups,
  totalPayerGroupsCount,
  isAnyFilterActive,
  onResetFilters,
  expandedPayers,
  onToggleExpand,
  onToggleAllExpand,
  onSelectAll,
  onTogglePayerSelection,
  privacyMode,
  onTogglePrivacyMode,
  revealedIbans,
  onToggleRevealIban,
}: PayerTableProps): React.JSX.Element {
  const allFilteredSelected =
    filteredPayerGroups.length > 0 &&
    filteredPayerGroups.every(g => g.selectedForExport);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      {/* Tabellen-Kopfzeile */}
      <div className="p-4 border-b border-stone-200 flex items-center justify-between flex-wrap gap-3 bg-stone-50">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="w-4 h-4 rounded text-[#9565C8] focus:ring-[#9565C8] border-stone-300 cursor-pointer accent-[#9565C8]"
          />
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            {filteredPayerGroups.length} Zahler / Lastschriften angezeigt
            {isAnyFilterActive && totalPayerGroupsCount !== filteredPayerGroups.length && (
              <span className="text-stone-400 font-normal ml-1">
                (von {totalPayerGroupsCount} gesamt)
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Datenschutz-Schalter */}
          <button
            type="button"
            onClick={onTogglePrivacyMode}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium shadow-sm transition flex items-center gap-1.5 ${
              privacyMode
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
            }`}
            title={
              privacyMode
                ? 'Datenschutz aktiv (IBANs geschützt). Klicken für Klartextansicht.'
                : 'Datenschutz aus (IBANs sichtbar). Klicken für geschützte Ansicht.'
            }
          >
            {privacyMode ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-emerald-700" />
                <span>Datenschutz aktiv</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-stone-600" />
                <span>Datenschutz aus</span>
              </>
            )}
          </button>

          {/* Auf-/Einklappen */}
          <button
            type="button"
            onClick={onToggleAllExpand}
            className="text-xs text-stone-700 hover:text-stone-900 px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-medium shadow-sm transition"
          >
            {expandedPayers.size === filteredPayerGroups.length
              ? 'Alle einklappen'
              : 'Alle aufklappen'}
          </button>
        </div>
      </div>

      {/* Liste der Zahler */}
      <div className="divide-y divide-stone-200">
        {filteredPayerGroups.map(group => {
          const isExpanded = expandedPayers.has(group.payerId);

          return (
            <div
              key={group.payerId}
              className={`transition-colors ${
                group.selectedForExport ? 'bg-white' : 'bg-stone-50/70 opacity-60'
              }`}
            >
              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start md:items-center gap-3.5">
                  <input
                    type="checkbox"
                    checked={group.selectedForExport}
                    onChange={() => onTogglePayerSelection(group.payerId)}
                    className="w-4 h-4 mt-1 md:mt-0 rounded text-[#9565C8] focus:ring-[#9565C8] border-stone-300 cursor-pointer accent-[#9565C8]"
                  />

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#261420] text-base">
                        {group.payerName}
                      </span>
                      <span className="text-xs text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded font-mono">
                        #{group.payerId}
                      </span>
                      {group.isFamily ? (
                        <span className="text-xs bg-[#F7F3FB] text-[#824EBB] border border-[#DFD0F2] px-2.5 py-0.5 rounded-full font-semibold">
                          Familie ({group.memberCount} Pers.)
                        </span>
                      ) : (
                        <span className="text-xs bg-stone-100 text-stone-600 border border-stone-200 px-2.5 py-0.5 rounded-full font-medium">
                          Einzelzahler
                        </span>
                      )}
                      {group.isInvoice && (
                        <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full font-semibold">
                          Per Rechnung
                        </span>
                      )}
                      {group.members.some(m => isHonoraryMember(m)) && (
                        <span className="text-xs bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 shadow-2xs">
                          <Award className="w-3 h-3 text-[#C69214]" />
                          Ehrenmitglied
                        </span>
                      )}
                      {group.members.some(m => (m.status === 'active' || isActiveStatus(m.status)) && !isInactiveMember(m)) ? (
                        <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-medium">
                          Aktiv
                        </span>
                      ) : (
                        <span className="text-xs bg-stone-100 text-stone-600 border border-stone-200 px-2.5 py-0.5 rounded-full font-medium">
                          Passiv
                        </span>
                      )}
                      {group.totalAmount === 0 && (
                        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                          0,00 € (Frei)
                        </span>
                      )}
                      {!group.isValid && (
                        <span className="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          Ungültig
                        </span>
                      )}
                      {group.isValid && group.warnings.length > 0 && (
                        <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Hinweis
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-stone-500 flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 font-mono">
                      {group.isInvoice ? (
                        <span className="font-sans text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Zahlungsweg: Per Rechnung (Selbstzahler, kein SEPA-Lastschrifteinzug)
                        </span>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1">
                            IBAN: <strong className="text-stone-700 font-mono">
                              {group.iban ? (
                                privacyMode && !revealedIbans.has(group.payerId)
                                  ? maskIBAN(group.iban)
                                  : group.iban
                              ) : (
                                <span className="text-stone-400 font-sans italic font-normal">
                                  {group.totalAmount === 0 ? 'Nicht erforderlich (Beitragsfrei)' : '—'}
                                </span>
                              )}
                            </strong>
                            {group.iban && privacyMode && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleRevealIban(group.payerId);
                                }}
                                className="text-stone-400 hover:text-stone-700 p-0.5 rounded hover:bg-stone-200/60 transition-colors"
                                title={
                                  revealedIbans.has(group.payerId)
                                    ? 'IBAN für diesen Zahler wieder maskieren'
                                    : 'IBAN für diesen Zahler aufdecken'
                                }
                              >
                                {revealedIbans.has(group.payerId) ? (
                                  <EyeOff className="w-3.5 h-3.5 text-emerald-700" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5 text-stone-500" />
                                )}
                              </button>
                            )}
                          </span>
                          {group.bic && <span>BIC: {group.bic}</span>}
                          <span>Mandat: <strong>{group.mandate || (group.totalAmount === 0 ? '—' : '')}</strong></span>
                          {group.signatureDate && (
                            <span>Datum: {group.signatureDate}</span>
                          )}
                        </>
                      )}
                    </div>

                    {group.errors.length > 0 && (
                      <div className="text-xs text-rose-600 font-medium mt-1">
                        {group.errors.join(' ')}
                      </div>
                    )}
                    {group.warnings.length > 0 && (
                      <div className="text-xs text-amber-700 mt-1">
                        {group.warnings.join(' ')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-5 pl-7 md:pl-0">
                  <div className="text-right">
                    <div className="text-xl font-bold text-[#261420] font-mono">
                      {group.totalAmount.toFixed(2).replace('.', ',')} €
                    </div>
                    <div className="text-xs text-stone-500">
                      {group.memberCount} {group.memberCount === 1 ? 'Person' : 'Personen'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleExpand(group.payerId)}
                    className="p-2 text-stone-400 hover:text-[#9565C8] hover:bg-[#F7F3FB] rounded-xl transition"
                    title="Details ein-/ausblenden"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-[#9565C8]" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="bg-[#FAF9FC] px-4 py-3.5 border-t border-stone-200/80 pl-11">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-stone-500 border-b border-stone-300">
                          <th className="py-2 font-semibold">Mitgliedsnr</th>
                          <th className="py-2 font-semibold">Name</th>
                          <th className="py-2 font-semibold">Status / Alter</th>
                          <th className="py-2 font-semibold">Funktion</th>
                          <th className="py-2 font-semibold">Beitragsgrund</th>
                          <th className="py-2 font-semibold text-right">Einzelbeitrag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {group.members.map(m => (
                          <tr key={m.id} className="hover:bg-white/80 transition-colors">
                            <td className="py-2.5 font-mono text-stone-500">#{m.id}</td>
                            <td className="py-2.5 font-semibold text-[#261420]">
                              {m.fullName}
                              {m.id === group.payerId && (
                                <span className="ml-2 text-[10px] bg-[#9565C8] text-white px-1.5 py-0.5 rounded font-medium">
                                  Zahler
                                </span>
                              )}
                            </td>
                            <td className="py-2.5">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold mr-1.5 ${
                                  isHonoraryMember(m)
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : m.status === 'active' || isActiveStatus(m.status)
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : m.status === 'passive' || isPassiveStatus(m.status)
                                    ? 'bg-stone-200 text-stone-700'
                                    : isChildOrYouthStatus(m.status)
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-stone-100 text-stone-700'
                                }`}
                              >
                                {getMemberStatusLabel(m.status)}
                              </span>
                              <span className="text-stone-500">
                                {m.age !== null ? `${m.age} J.` : 'Kein Datum'}
                              </span>
                            </td>
                            <td className="py-2.5 text-stone-600 font-medium">
                              {m.boardFunction || m.otherFunction || m.clubFunction || '—'}
                            </td>
                            <td className="py-2.5 text-stone-600">{m.reason}</td>
                            <td className="py-2.5 font-bold text-[#261420] text-right font-mono">
                              {m.fee.toFixed(2).replace('.', ',')} €
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
        })}

        {filteredPayerGroups.length === 0 && (
          <div className="p-10 text-center text-stone-500 text-sm">
            <p className="font-semibold text-stone-700 mb-1">Keine Zahler gefunden</p>
            <p className="text-xs text-stone-500 mb-3">
              Keine Datensätze entsprechen den aktuellen Filtereinstellungen.
            </p>
            {isAnyFilterActive && (
              <button
                type="button"
                onClick={onResetFilters}
                className="text-xs bg-[#9565C8] hover:bg-[#824EBB] text-white px-3.5 py-1.5 rounded-xl font-medium shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Filter zurücksetzen</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
