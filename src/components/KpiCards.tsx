import React from 'react';
import { Euro, Users, CheckCircle, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { StatusFilterType, ValidityFilterType } from '../utils/sepaCalculator.ts';
import { ComparisonSummary } from '../utils/comparison.ts';

interface KpiStats {
  selectedDebitsCount: number;
  totalEuro: number;
  totalMembersInDebits: number;
  issuesCount: number;
  freeMembersCount: number;
}

interface KpiCardsProps {
  stats: KpiStats;
  statusFilter: StatusFilterType;
  validityFilter: ValidityFilterType;
  onResetFilters: () => void;
  onStatusFilterChange: (status: StatusFilterType) => void;
  onValidityFilterChange: (validity: ValidityFilterType) => void;
  comparison?: {
    summary: ComparisonSummary;
    baselineName: string;
  } | null;
}

export function KpiCards({
  stats,
  statusFilter,
  validityFilter,
  onResetFilters,
  onStatusFilterChange,
  onValidityFilterChange,
  comparison,
}: KpiCardsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Gesamteinzugssumme */}
      <div
        onClick={onResetFilters}
        className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex items-center justify-between border-l-4 border-l-[#9565C8] cursor-pointer hover:shadow-md transition-shadow select-none min-h-[110px]"
        title="Klicken, um alle Lastschriften anzuzeigen"
      >
        <div className="min-w-0 flex-1 pr-2">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Gesamteinzugssumme
          </div>
          <div className="text-2xl font-bold text-[#261420] font-mono whitespace-nowrap mt-1">
            {stats.totalEuro.toFixed(2).replace('.', ',')}&nbsp;€
          </div>
          {comparison && comparison.summary.deltaTotalAmount !== 0 && (
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 leading-none ${
                  comparison.summary.deltaTotalAmount > 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
                title={`Vergleich zu: ${comparison.baselineName}`}
              >
                {comparison.summary.deltaTotalAmount > 0 ? (
                  <TrendingUp className="w-3 h-3 shrink-0" />
                ) : (
                  <TrendingDown className="w-3 h-3 shrink-0" />
                )}
                <span>
                  {comparison.summary.deltaTotalAmount > 0 ? '+' : ''}
                  {comparison.summary.deltaTotalAmount.toFixed(2).replace('.', ',')} € (
                  {comparison.summary.percentageDelta > 0 ? '+' : ''}
                  {comparison.summary.percentageDelta}%)
                </span>
              </span>
            </div>
          )}
          <div className="text-xs text-stone-500 mt-1">
            {stats.selectedDebitsCount} Lastschriften aktiviert
            {comparison && (
              <span className="block text-[11px] text-stone-400 mt-0.5 truncate">
                {comparison.summary.increasedCount} mehr • {comparison.summary.decreasedCount} weniger
              </span>
            )}
          </div>
        </div>
        <div className="w-12 h-12 bg-[#F7F3FB] text-[#9565C8] rounded-xl flex items-center justify-center border border-[#DFD0F2] shrink-0">
          <Euro className="w-6 h-6" />
        </div>
      </div>

      {/* Erfasste Personen */}
      <div
        onClick={onResetFilters}
        className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex items-center justify-between border-l-4 border-l-[#EFC415] cursor-pointer hover:shadow-md transition-shadow select-none min-h-[110px]"
        title="Klicken, um alle anzuzeigen"
      >
        <div className="min-w-0 flex-1 pr-2">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Erfasste Personen
          </div>
          <div className="text-2xl font-bold text-[#261420] mt-1">
            {stats.totalMembersInDebits} Mitglieder
          </div>
          <div className="text-xs text-stone-500 mt-1">
            in gewählten Lastschriften
          </div>
        </div>
        <div className="w-12 h-12 bg-[#FEFCE8] text-[#EFC415] rounded-xl flex items-center justify-center border border-[#FDE68A] shrink-0">
          <Users className="w-6 h-6" />
        </div>
      </div>

      {/* Beitragsfrei */}
      <div
        onClick={() => onStatusFilterChange(statusFilter === 'free' ? 'all' : 'free')}
        className={`bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex items-center justify-between border-l-4 border-l-emerald-600 cursor-pointer hover:shadow-md transition-all select-none min-h-[110px] ${
          statusFilter === 'free' ? 'ring-2 ring-emerald-500 bg-emerald-50/20' : ''
        }`}
        title="Klicken, um nach beitragsfreien Zahlern (0 €) zu filtern"
      >
        <div className="min-w-0 flex-1 pr-2">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Beitragsfrei
          </div>
          <div className="text-2xl font-bold text-[#261420] mt-1">
            {stats.freeMembersCount} Personen
          </div>
          <div className="text-xs text-stone-500 mt-1">
            Ehrenamt, &lt;18 J., 2. Kind
          </div>
        </div>
        <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center border border-emerald-200 shrink-0">
          <CheckCircle className="w-6 h-6" />
        </div>
      </div>

      {/* Prüfhinweise */}
      <div
        onClick={() => onValidityFilterChange(validityFilter === 'issues' ? 'all' : 'issues')}
        className={`bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex items-center justify-between border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md transition-all select-none min-h-[110px] ${
          validityFilter === 'issues' ? 'ring-2 ring-amber-500 bg-amber-50/20' : ''
        }`}
        title="Klicken, um nach Prüfhinweisen zu filtern"
      >
        <div className="min-w-0 flex-1 pr-2">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Prüfhinweise
          </div>
          <div className="text-2xl font-bold text-[#261420] mt-1">
            {stats.issuesCount} Fälle
          </div>
          <div className="text-xs text-stone-500 mt-1">
            {stats.issuesCount === 0 ? 'Keine Unstimmigkeiten' : 'Prüfung empfohlen'}
          </div>
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            stats.issuesCount === 0
              ? 'bg-stone-100 text-stone-400'
              : 'bg-amber-50 text-amber-600 border border-amber-200'
          }`}
        >
          <AlertTriangle className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
