import React from 'react';
import { Euro, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { StatusFilterType, ValidityFilterType } from '../utils/sepaCalculator.ts';

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
}

export function KpiCards({
  stats,
  statusFilter,
  validityFilter,
  onResetFilters,
  onStatusFilterChange,
  onValidityFilterChange,
}: KpiCardsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Gesamteinzugssumme */}
      <div
        onClick={onResetFilters}
        className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex items-center justify-between border-l-4 border-l-[#9565C8] cursor-pointer hover:shadow-md transition-shadow select-none"
        title="Klicken, um alle Lastschriften anzuzeigen"
      >
        <div>
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Gesamteinzugssumme
          </div>
          <div className="text-2xl font-bold text-[#261420] mt-1 font-mono whitespace-nowrap">
            {stats.totalEuro.toFixed(2).replace('.', ',')}&nbsp;€
          </div>
          <div className="text-xs text-stone-500 mt-0.5">
            {stats.selectedDebitsCount} Lastschriften aktiviert
          </div>
        </div>
        <div className="w-12 h-12 bg-[#F7F3FB] text-[#9565C8] rounded-xl flex items-center justify-center border border-[#DFD0F2]">
          <Euro className="w-6 h-6" />
        </div>
      </div>

      {/* Erfasste Personen */}
      <div
        onClick={onResetFilters}
        className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex items-center justify-between border-l-4 border-l-[#EFC415] cursor-pointer hover:shadow-md transition-shadow select-none"
        title="Klicken, um alle anzuzeigen"
      >
        <div>
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Erfasste Personen
          </div>
          <div className="text-2xl font-bold text-[#261420] mt-1">
            {stats.totalMembersInDebits} Mitglieder
          </div>
          <div className="text-xs text-stone-500 mt-0.5">
            in gewählten Lastschriften
          </div>
        </div>
        <div className="w-12 h-12 bg-[#FEFCE8] text-[#EFC415] rounded-xl flex items-center justify-center border border-[#FDE68A]">
          <Users className="w-6 h-6" />
        </div>
      </div>

      {/* Beitragsfrei */}
      <div
        onClick={() => onStatusFilterChange(statusFilter === 'free' ? 'all' : 'free')}
        className={`bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex items-center justify-between border-l-4 border-l-emerald-600 cursor-pointer hover:shadow-md transition-all select-none ${
          statusFilter === 'free' ? 'ring-2 ring-emerald-500 bg-emerald-50/20' : ''
        }`}
        title="Klicken, um nach beitragsfreien Zahlern (0 €) zu filtern"
      >
        <div>
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Beitragsfrei
          </div>
          <div className="text-2xl font-bold text-[#261420] mt-1">
            {stats.freeMembersCount} Personen
          </div>
          <div className="text-xs text-stone-500 mt-0.5">
            Ehrenamt, &lt;18 J., 2. Kind
          </div>
        </div>
        <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center border border-emerald-200">
          <CheckCircle className="w-6 h-6" />
        </div>
      </div>

      {/* Prüfhinweise */}
      <div
        onClick={() => onValidityFilterChange(validityFilter === 'issues' ? 'all' : 'issues')}
        className={`bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex items-center justify-between border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md transition-all select-none ${
          validityFilter === 'issues' ? 'ring-2 ring-amber-500 bg-amber-50/20' : ''
        }`}
        title="Klicken, um nach Prüfhinweisen zu filtern"
      >
        <div>
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Prüfhinweise
          </div>
          <div className="text-2xl font-bold text-[#261420] mt-1">
            {stats.issuesCount} Fälle
          </div>
          <div className="text-xs text-stone-500 mt-0.5">
            {stats.issuesCount === 0 ? 'Keine Unstimmigkeiten' : 'Prüfung empfohlen'}
          </div>
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
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
