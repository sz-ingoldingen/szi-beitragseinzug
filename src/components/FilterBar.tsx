import React from 'react';
import {
  Search,
  RotateCcw,
  RefreshCw,
  ListFilter,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Award,
  FileText,
  Users,
  User,
  Repeat,
} from 'lucide-react';
import { StatusFilterType, ValidityFilterType } from '../utils/sepaCalculator.ts';

export interface FilterCounts {
  all: number;
  active: number;
  passive: number;
  honorary: number;
  family: number;
  single: number;
  free: number;
  invoice: number;
  standingOrder: number;
  valid: number;
  issues: number;
}

interface FilterBarProps {
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  statusFilter: StatusFilterType;
  onStatusFilterChange: (s: StatusFilterType) => void;
  validityFilter: ValidityFilterType;
  onValidityFilterChange: (v: ValidityFilterType) => void;
  filterCounts: FilterCounts;
  isAnyFilterActive: boolean;
  onResetFilters: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileName: string;
  purpose: string;
  onPurposeChange: (p: string) => void;
  filteredCount?: number;
  totalCount?: number;
}

interface FilterPillItem {
  id: string;
  label: string;
  count: number;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  activeStyle: string;
}

export function FilterBar({
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  validityFilter,
  onValidityFilterChange,
  filterCounts,
  isAnyFilterActive,
  onResetFilters,
  onFileUpload,
  fileName,
  purpose,
  onPurposeChange,
  filteredCount,
  totalCount,
}: FilterBarProps): React.JSX.Element {
  // Gruppe 1: Mitgliedsstatus
  const memberStatusOptions: FilterPillItem[] = [
    {
      id: 'active',
      label: 'Aktiv',
      count: filterCounts.active,
      activeStyle: 'bg-[#9565C8] text-white border-[#9565C8]',
    },
    {
      id: 'passive',
      label: 'Passiv',
      count: filterCounts.passive,
      activeStyle: 'bg-stone-700 text-white border-stone-700',
    },
    {
      id: 'honorary',
      label: 'Ehrenmitglieder',
      count: filterCounts.honorary,
      icon: Award,
      iconColor: 'text-[#C69214]',
      activeStyle: 'bg-[#C69214] text-white border-[#A5780F]',
    },
  ];

  // Gruppe 2: Beitragsart / Tarif
  const tariffOptions: FilterPillItem[] = [
    {
      id: 'family',
      label: 'Familienbeitrag',
      count: filterCounts.family,
      icon: Users,
      iconColor: 'text-[#7042A6]',
      activeStyle: 'bg-[#7042A6] text-white border-[#7042A6]',
    },
    {
      id: 'single',
      label: 'Einzelzahler',
      count: filterCounts.single,
      icon: User,
      iconColor: 'text-slate-600',
      activeStyle: 'bg-slate-700 text-white border-slate-700',
    },
    {
      id: 'free',
      label: 'Beitragsfrei (0 €)',
      count: filterCounts.free,
      activeStyle: 'bg-emerald-700 text-white border-emerald-700',
    },
  ];

  // Gruppe 3: Zahlungsweg
  const paymentOptions: FilterPillItem[] = [
    {
      id: 'invoice',
      label: 'Per Rechnung',
      count: filterCounts.invoice,
      icon: FileText,
      iconColor: 'text-amber-600',
      activeStyle: 'bg-amber-600 text-white border-amber-600',
    },
    {
      id: 'standingOrder',
      label: 'Dauerauftrag',
      count: filterCounts.standingOrder,
      icon: Repeat,
      iconColor: 'text-sky-600',
      activeStyle: 'bg-sky-700 text-white border-sky-700',
    },
  ];

  // Prüffilter
  const validityOptions: FilterPillItem[] = [
    {
      id: 'all',
      label: 'Alle',
      count: filterCounts.all,
      activeStyle: 'bg-[#261420] text-white border-[#261420]',
    },
    {
      id: 'valid',
      label: 'Gültig',
      count: filterCounts.valid,
      icon: CheckCircle,
      iconColor: 'text-emerald-600',
      activeStyle: 'bg-emerald-700 text-white border-emerald-700',
    },
    {
      id: 'issues',
      label: 'Mit Hinweisen',
      count: filterCounts.issues,
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      activeStyle: 'bg-amber-600 text-white border-amber-600',
    },
  ];

  const renderStatusButton = (opt: FilterPillItem) => {
    const isActive = statusFilter === opt.id;
    const IconComponent = opt.icon;
    return (
      <button
        key={opt.id}
        type="button"
        onClick={() =>
          onStatusFilterChange(isActive && opt.id !== 'all' ? 'all' : (opt.id as StatusFilterType))
        }
        className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
          isActive
            ? `${opt.activeStyle} shadow-sm`
            : 'bg-stone-100 hover:bg-stone-200/80 text-stone-700 border-stone-200'
        }`}
      >
        {IconComponent && (
          <IconComponent
            className={`w-3.5 h-3.5 ${isActive ? 'text-white' : opt.iconColor || 'text-stone-500'}`}
          />
        )}
        <span>{opt.label}</span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold ${
            isActive ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
          }`}
        >
          {opt.count}
        </span>
      </button>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-4 space-y-3.5">
      {/* Oberste Zeile: Suchfeld & Aktionen */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Suchfeld */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
          <input
            type="text"
            placeholder="Suche nach Name, Mitgliedsnummer, IBAN, Funktion..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9565C8] focus:border-transparent bg-stone-50/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 text-xs font-bold"
              title="Suche leeren"
            >
              ✕
            </button>
          )}
        </div>

        {/* Buttons rechts */}
        <div className="flex items-center gap-2">
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={onResetFilters}
              className="text-xs text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2 rounded-xl font-medium transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Alle aktiven Filter und Suchbegriffe zurücksetzen"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
              <span>Filter zurücksetzen</span>
            </button>
          )}

          <label className="cursor-pointer bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold px-3 py-2 rounded-xl border border-stone-300 transition flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-stone-600" />
            <span>Andere Datei</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Filter-Bereich */}
      <div className="pt-3 border-t border-stone-100 space-y-2.5">
        {/* Zeile 1: Status, Beitragsart & Zahlweg */}
        <div className="flex items-center gap-x-3 gap-y-2 flex-wrap">
          {/* Master-Filter Alle */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-stone-500 flex items-center gap-1 mr-0.5">
              <ListFilter className="w-3.5 h-3.5 text-stone-400" />
              Filter:
            </span>
            <button
              type="button"
              onClick={() => onStatusFilterChange('all')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#261420] text-white border-[#261420] shadow-sm'
                  : 'bg-stone-100 hover:bg-stone-200/80 text-stone-700 border-stone-200'
              }`}
            >
              <span>Alle</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold ${
                  statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
                }`}
              >
                {filterCounts.all}
              </span>
            </button>
          </div>

          <div className="h-4 w-px bg-stone-200 hidden md:block" />

          {/* Gruppe: Mitgliedsstatus */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-stone-400">Status:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {memberStatusOptions.map(renderStatusButton)}
            </div>
          </div>

          <div className="h-4 w-px bg-stone-200 hidden md:block" />

          {/* Gruppe: Tarif */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-stone-400">Tarif:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {tariffOptions.map(renderStatusButton)}
            </div>
          </div>

          <div className="h-4 w-px bg-stone-200 hidden md:block" />

          {/* Gruppe: Zahlweg */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-stone-400">Zahlweg:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {paymentOptions.map(renderStatusButton)}
            </div>
          </div>
        </div>

        {/* Zeile 2: Prüfung & Validierung */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-stone-500 flex items-center gap-1 mr-1">
              <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
              Prüfung:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {validityOptions.map(opt => {
                const isActive = validityFilter === opt.id;
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      onValidityFilterChange(
                        isActive && opt.id !== 'all' ? 'all' : (opt.id as ValidityFilterType)
                      )
                    }
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? `${opt.activeStyle} shadow-sm`
                        : 'bg-stone-100 hover:bg-stone-200/80 text-stone-700 border-stone-200'
                    }`}
                  >
                    {IconComponent && (
                      <IconComponent
                        className={`w-3.5 h-3.5 ${
                          isActive ? 'text-white' : opt.iconColor || 'text-stone-500'
                        }`}
                      />
                    )}
                    <span>{opt.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {opt.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Treffer-Info rechts */}
          <div className="flex items-center gap-2 text-stone-500">
            <span>
              Angezeigt:{' '}
              <strong className="text-stone-800 font-mono font-semibold">
                {filteredCount ?? filterCounts.all}
              </strong>{' '}
              von <span className="font-mono">{totalCount ?? filterCounts.all}</span> Zahlern
            </span>
            {isAnyFilterActive && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#9565C8]/10 text-[#572986] border border-[#9565C8]/20">
                Gefiltert
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dateiname & SEPA-Verwendungszweck */}
      <div className="pt-3 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-stone-500 font-medium">Datei:</span>
          <span className="font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
            {fileName}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-3xl">
          <span className="text-stone-600 font-medium whitespace-nowrap flex-shrink-0">
            Verwendungszweck (SEPA):
          </span>
          <input
            type="text"
            value={purpose}
            onChange={(e) => onPurposeChange(e.target.value)}
            className="flex-1 min-w-0 sm:min-w-[380px] px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-[#9565C8] focus:outline-none bg-stone-50/50"
          />
        </div>
      </div>
    </div>
  );
}
