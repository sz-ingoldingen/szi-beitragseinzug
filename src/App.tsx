import React, { useState, useMemo } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Users,
  ShieldCheck,
  RefreshCw,
  Euro,
  Info,
  Award,
  ListFilter,
  RotateCcw,
} from 'lucide-react';
import {
  parseMembersCSV,
  processContributions,
  generateSepaCsv,
  generateAuditCsv,
  PayerGroup,
  UnassignedMember,
  InactiveMember,
  StatusFilterType,
  ValidityFilterType,
  matchesStatusFilter,
  matchesValidityFilter,
  filterPayerGroup,
  isHonoraryMember,
  isInactiveMember,
} from './utils/sepaCalculator.ts';
import { SAMPLE_CSV } from './utils/sampleData.ts';

export default function App(): React.JSX.Element {
  const [, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [validityFilter, setValidityFilter] = useState<ValidityFilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('Mitgliedsbeitrag Schalmeienzug Ingoldingen e.V');
  const [expandedPayers, setExpandedPayers] = useState<Set<string>>(new Set());
  const [payerGroupsState, setPayerGroupsState] = useState<PayerGroup[]>([]);
  const [unassignedMembersState, setUnassignedMembersState] = useState<UnassignedMember[]>([]);
  const [showUnassigned, setShowUnassigned] = useState<boolean>(false);
  const [unassignedSearch, setUnassignedSearch] = useState<string>('');
  const [inactiveMembersState, setInactiveMembersState] = useState<InactiveMember[]>([]);
  const [showInactive, setShowInactive] = useState<boolean>(false);
  const [inactiveSearch, setInactiveSearch] = useState<string>('');
  const [, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleProcessData = (text: string, name = 'Mitgliederliste.csv') => {
    try {
      setIsProcessing(true);
      setErrorMsg('');
      const members = parseMembersCSV(text);
      const { payerGroups, unassignedMembers, inactiveMembers } = processContributions(members);
      setPayerGroupsState(payerGroups);
      setUnassignedMembersState(unassignedMembers);
      setInactiveMembersState(inactiveMembers);
      setCsvContent(text);
      setFileName(name);
      setExpandedPayers(new Set(payerGroups.slice(0, 3).map(p => p.payerId)));
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setErrorMsg(err.message || 'Fehler beim Parsen der CSV-Datei.');
      } else {
        setErrorMsg('Fehler beim Parsen der CSV-Datei.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        handleProcessData(content, file.name);
      }
    };
    reader.readAsText(file, 'ISO-8859-1');
  };

  const handleLoadSample = () => {
    handleProcessData(SAMPLE_CSV, 'Beispieldaten_SZI.csv');
  };

  const handleToggleExpand = (payerId: string) => {
    setExpandedPayers(prev => {
      const next = new Set(prev);
      if (next.has(payerId)) next.delete(payerId);
      else next.add(payerId);
      return next;
    });
  };

  const handleTogglePayerSelection = (payerId: string) => {
    setPayerGroupsState(prev =>
      prev.map(g => (g.payerId === payerId ? { ...g, selectedForExport: !g.selectedForExport } : g))
    );
  };

  const handleSelectAll = (select: boolean) => {
    const filteredIds = new Set(filteredPayerGroups.map(g => g.payerId));
    setPayerGroupsState(prev =>
      prev.map(g => {
        if (filteredIds.has(g.payerId)) {
          return { ...g, selectedForExport: select && g.isValid && g.totalAmount > 0 };
        }
        return g;
      })
    );
  };

  const filteredPayerGroups = useMemo(() => {
    return payerGroupsState.filter(group =>
      filterPayerGroup(group, statusFilter, validityFilter, searchQuery)
    );
  }, [payerGroupsState, validityFilter, statusFilter, searchQuery]);

  const filterCounts = useMemo(() => {
    return {
      all: payerGroupsState.length,
      active: payerGroupsState.filter(g => matchesStatusFilter(g, 'active')).length,
      passive: payerGroupsState.filter(g => matchesStatusFilter(g, 'passive')).length,
      honorary: payerGroupsState.filter(g => matchesStatusFilter(g, 'honorary')).length,
      family: payerGroupsState.filter(g => matchesStatusFilter(g, 'family')).length,
      single: payerGroupsState.filter(g => matchesStatusFilter(g, 'single')).length,
      free: payerGroupsState.filter(g => matchesStatusFilter(g, 'free')).length,
      valid: payerGroupsState.filter(g => matchesValidityFilter(g, 'valid')).length,
      issues: payerGroupsState.filter(g => matchesValidityFilter(g, 'issues')).length,
    };
  }, [payerGroupsState]);

  const isAnyFilterActive =
    statusFilter !== 'all' || validityFilter !== 'all' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setStatusFilter('all');
    setValidityFilter('all');
    setSearchQuery('');
  };

  const stats = useMemo(() => {
    const selected = payerGroupsState.filter(g => g.selectedForExport);
    const totalEuro = selected.reduce((sum, g) => sum + g.totalAmount, 0);
    const totalMembersInDebits = selected.reduce((sum, g) => sum + g.memberCount, 0);
    const issuesCount = payerGroupsState.filter(g => !g.isValid || g.warnings.length > 0).length + unassignedMembersState.length;
    const freeMembersCount = payerGroupsState
      .flatMap(g => g.members)
      .filter(m => m.fee === 0 && m.status !== 'resigned' && m.status !== 'deceased').length;

    return {
      selectedDebitsCount: selected.length,
      totalEuro,
      totalMembersInDebits,
      issuesCount,
      freeMembersCount,
    };
  }, [payerGroupsState, unassignedMembersState]);

  const handleDownloadSepa = () => {
    const csvStr = generateSepaCsv(payerGroupsState, purpose);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SEPA_Lastschriften_SZI_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAudit = () => {
    const csvStr = generateAuditCsv(payerGroupsState, unassignedMembersState, inactiveMembersState);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SZI_Beitragsberechnung_Detail_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#FAF9FB] text-[#261420] pb-24">
      {/* Header mit authentischen Vereinsfarben (Violett, Schwarz & Gold) */}
      <header className="bg-[#261420] text-white shadow-xl sticky top-0 z-30 border-b-4 border-[#AC8AD7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="shrink-0">
              <img
                src={`${import.meta.env.BASE_URL}szi_wappen.png`}
                alt="Schalmeienzug Ingoldingen e.V. Wappen"
                className="w-12 h-14 object-contain rounded-xl shadow-md border border-[#AC8AD7]/30"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Schalmeienzug Ingoldingen e.V.
                </h1>
                <span className="text-xs bg-[#AC8AD7] text-[#261420] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  1985
                </span>
                <span className="text-xs bg-[#EFC415] text-[#261420] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  SEPA
                </span>
              </div>
              <p className="text-xs text-[#E4D5F7]">
                Automatische Beitragsberechnung & Lastschriftenerstellung (Beitragsordnung 2025)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs bg-[#361B2E] text-[#E4D5F7] border border-[#572986] px-3 py-1.5 rounded-lg shadow-sm">
              <ShieldCheck className="w-4 h-4 text-[#AC8AD7]" />
              <span>100% Client-Side (TypeScript & DSGVO-sicher)</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {payerGroupsState.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-[#DFD0F2] p-8 sm:p-12 text-center max-w-2xl mx-auto my-8">
            <div className="w-28 h-32 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg overflow-hidden border border-[#DFD0F2] bg-[#1c1a1b] p-1">
              <img
                src={`${import.meta.env.BASE_URL}szi_wappen.png`}
                alt="SZI Wappen"
                className="w-full h-full object-contain rounded-xl drop-shadow"
              />
            </div>
            <h2 className="text-2xl font-bold text-[#261420] mb-2">
              Mitglieder-CSV importieren
            </h2>
            <p className="text-sm text-stone-600 mb-8 max-w-lg mx-auto">
              Lade die Mitglieder-CSV des Schalmeienzugs Ingoldingen hoch.
              Die Anwendung gruppiert Familienzahler, berechnet die Beiträge gemäß Beitragsordnung und generiert die SEPA-Datei für die Bank.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <label className="cursor-pointer bg-[#9565C8] hover:bg-[#824EBB] active:bg-[#572986] text-white font-semibold px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2 transform hover:-translate-y-0.5">
                <Upload className="w-5 h-5" />
                <span>CSV-Datei auswählen</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleLoadSample}
                className="bg-[#FEFCE8] hover:bg-[#FDE68A] text-[#7A6000] font-semibold px-6 py-3 rounded-xl border border-[#FDE68A] transition-all flex items-center gap-2"
              >
                <FileSpreadsheet className="w-5 h-5 text-[#EFC415]" />
                <span>Beispieldaten laden</span>
              </button>
            </div>

            {errorMsg && (
              <div className="mt-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">
                {errorMsg}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* KPI Cards (Interaktiv) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => { setStatusFilter('all'); setValidityFilter('all'); }}
                className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex items-center justify-between border-l-4 border-l-[#9565C8] cursor-pointer hover:shadow-md transition-shadow select-none"
                title="Klicken, um alle Lastschriften anzuzeigen"
              >
                <div>
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    Gesamteinzugssumme
                  </div>
                  <div className="text-2xl font-bold text-[#261420] mt-1 font-mono">
                    {stats.totalEuro.toFixed(2).replace('.', ',')} €
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {stats.selectedDebitsCount} Lastschriften aktiviert
                  </div>
                </div>
                <div className="w-12 h-12 bg-[#F7F3FB] text-[#9565C8] rounded-xl flex items-center justify-center border border-[#DFD0F2]">
                  <Euro className="w-6 h-6" />
                </div>
              </div>

              <div
                onClick={() => { setStatusFilter('all'); setValidityFilter('all'); }}
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

              <div
                onClick={() => setStatusFilter(statusFilter === 'free' ? 'all' : 'free')}
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

              <div
                onClick={() => setValidityFilter(validityFilter === 'issues' ? 'all' : 'issues')}
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

            {/* Filter- und Steuerleiste */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-4 space-y-4">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Suche nach Name, Mitgliedsnummer, IBAN, Funktion..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9565C8] focus:border-transparent bg-stone-50/50"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 text-xs font-bold"
                      title="Suche leeren"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isAnyFilterActive && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-xs text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2 rounded-xl font-medium transition flex items-center gap-1.5 shadow-xs"
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
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Status- & Beitragsart-Schnellfilter */}
              <div className="pt-3 border-t border-stone-100 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Status / Tarif Filter Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-stone-500 mr-1 flex items-center gap-1">
                      <ListFilter className="w-3.5 h-3.5 text-stone-400" />
                      Status:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'all', label: 'Alle', count: filterCounts.all, activeStyle: 'bg-[#261420] text-white border-[#261420]' },
                        { id: 'active', label: 'Aktiv', count: filterCounts.active, activeStyle: 'bg-[#9565C8] text-white border-[#9565C8]' },
                        { id: 'passive', label: 'Passiv', count: filterCounts.passive, activeStyle: 'bg-stone-700 text-white border-stone-700' },
                        { id: 'honorary', label: 'Ehrenmitglieder', count: filterCounts.honorary, activeStyle: 'bg-[#C69214] text-white border-[#A5780F]' },
                        { id: 'family', label: 'Familienbeitrag', count: filterCounts.family, activeStyle: 'bg-[#7042A6] text-white border-[#7042A6]' },
                        { id: 'single', label: 'Einzelzahler', count: filterCounts.single, activeStyle: 'bg-slate-700 text-white border-slate-700' },
                        { id: 'free', label: 'Beitragsfrei (0 €)', count: filterCounts.free, activeStyle: 'bg-emerald-700 text-white border-emerald-700' },
                      ].map(opt => {
                        const isActive = statusFilter === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setStatusFilter(opt.id as StatusFilterType)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                              isActive
                                ? `${opt.activeStyle} shadow-sm`
                                : 'bg-stone-100 hover:bg-stone-200/80 text-stone-700 border-stone-200'
                            }`}
                          >
                            <span>{opt.label}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-stone-200 text-stone-600'
                              }`}
                            >
                              {opt.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Prüf-Filter Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap lg:justify-end">
                    <span className="text-xs font-semibold text-stone-500 mr-1">Prüfung:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'all', label: 'Alle', count: filterCounts.all, activeStyle: 'bg-[#261420] text-white border-[#261420]' },
                        { id: 'valid', label: 'Gültig', count: filterCounts.valid, activeStyle: 'bg-emerald-700 text-white border-emerald-700' },
                        { id: 'issues', label: 'Mit Hinweisen', count: filterCounts.issues, activeStyle: 'bg-amber-600 text-white border-amber-600' },
                      ].map(opt => {
                        const isActive = validityFilter === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setValidityFilter(opt.id as ValidityFilterType)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                              isActive
                                ? `${opt.activeStyle} shadow-sm`
                                : 'bg-stone-100 hover:bg-stone-200/80 text-stone-700 border-stone-200'
                            }`}
                          >
                            <span>{opt.label}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-stone-200 text-stone-600'
                              }`}
                            >
                              {opt.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-stone-500 font-medium">Datei:</span>
                  <span className="font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                    {fileName}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-1 max-w-lg">
                  <span className="text-stone-600 font-medium whitespace-nowrap">Verwendungszweck (SEPA):</span>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-[#9565C8] focus:outline-none bg-stone-50/50"
                  />
                </div>
              </div>
            </div>

            {/* Unassigned Collapsible Box */}
            {unassignedMembersState.length > 0 && (
              <div className="bg-amber-50/90 border border-amber-300/80 rounded-2xl shadow-sm overflow-hidden transition-all">
                {/* Header (Clickable Banner) */}
                <div
                  onClick={() => setShowUnassigned(prev => !prev)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-amber-100/60 transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300/60 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-amber-950">
                          {unassignedMembersState.length} Mitglieder ohne hinterlegte Zahler-/Bankdaten
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
                          onChange={(e) => setUnassignedSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-[#9565C8] focus:outline-none bg-white"
                        />
                      </div>
                      <div className="text-xs text-stone-500">
                        Zeige {
                          unassignedMembersState.filter(m =>
                            !unassignedSearch.trim() ||
                            m.fullName.toLowerCase().includes(unassignedSearch.toLowerCase()) ||
                            m.id.includes(unassignedSearch) ||
                            m.status.toLowerCase().includes(unassignedSearch.toLowerCase())
                          ).length
                        } von {unassignedMembersState.length} Mitgliedern
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
                          {unassignedMembersState
                            .filter(m =>
                              !unassignedSearch.trim() ||
                              m.fullName.toLowerCase().includes(unassignedSearch.toLowerCase()) ||
                              m.id.includes(unassignedSearch) ||
                              m.status.toLowerCase().includes(unassignedSearch.toLowerCase())
                            )
                            .map(m => (
                              <tr key={m.id} className="hover:bg-amber-50/40">
                                <td className="py-1.5 px-3 font-mono text-stone-500">#{m.id}</td>
                                <td className="py-1.5 px-3 font-semibold text-[#261420]">{m.fullName}</td>
                                <td className="py-1.5 px-3">
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-700">
                                    {m.status}
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
            )}

            {/* Inaktive Mitglieder (Gekündigt / Verstorben) - Rein informativ, ohne Warnung */}
            {inactiveMembersState.length > 0 && (
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden transition-all">
                {/* Header (Clickable Banner) */}
                <div
                  onClick={() => setShowInactive(prev => !prev)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-200/70 border border-slate-300/70 flex items-center justify-center shrink-0">
                      <Info className="w-4 h-4 text-slate-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {inactiveMembersState.length} inaktive Verbindungen (Gekündigt / Verstorben)
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
                          onChange={(e) => setInactiveSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-[#9565C8] focus:outline-none bg-white"
                        />
                      </div>
                      <div className="text-xs text-stone-500">
                        Zeige {
                          inactiveMembersState.filter(m =>
                            !inactiveSearch.trim() ||
                            m.fullName.toLowerCase().includes(inactiveSearch.toLowerCase()) ||
                            m.id.includes(inactiveSearch) ||
                            m.status.toLowerCase().includes(inactiveSearch.toLowerCase()) ||
                            m.reasonText.toLowerCase().includes(inactiveSearch.toLowerCase())
                          ).length
                        } von {inactiveMembersState.length} inaktiven Verbindungen
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
                          {inactiveMembersState
                            .filter(m =>
                              !inactiveSearch.trim() ||
                              m.fullName.toLowerCase().includes(inactiveSearch.toLowerCase()) ||
                              m.id.includes(inactiveSearch) ||
                              m.status.toLowerCase().includes(inactiveSearch.toLowerCase()) ||
                              m.reasonText.toLowerCase().includes(inactiveSearch.toLowerCase())
                            )
                            .map(m => (
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
            )}

            {/* Zahler Tabelle */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="p-4 border-b border-stone-200 flex items-center justify-between flex-wrap gap-3 bg-stone-50">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={
                      filteredPayerGroups.length > 0 &&
                      filteredPayerGroups.every(g => g.selectedForExport)
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded text-[#9565C8] focus:ring-[#9565C8] border-stone-300 cursor-pointer accent-[#9565C8]"
                  />
                  <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    {filteredPayerGroups.length} Zahler / Lastschriften angezeigt
                    {isAnyFilterActive && payerGroupsState.length !== filteredPayerGroups.length && (
                      <span className="text-stone-400 font-normal ml-1">
                        (von {payerGroupsState.length} gesamt)
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedPayers(
                        new Set(
                          expandedPayers.size === filteredPayerGroups.length
                            ? []
                            : filteredPayerGroups.map(g => g.payerId)
                        )
                      )
                    }
                    className="text-xs text-stone-700 hover:text-stone-900 px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-medium shadow-sm transition"
                  >
                    {expandedPayers.size === filteredPayerGroups.length
                      ? 'Alle einklappen'
                      : 'Alle aufklappen'}
                  </button>
                </div>
              </div>

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
                            onChange={() => handleTogglePayerSelection(group.payerId)}
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
                              {group.members.some(m => isHonoraryMember(m)) && (
                                <span className="text-xs bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 shadow-2xs">
                                  <Award className="w-3 h-3 text-[#C69214]" />
                                  Ehrenmitglied
                                </span>
                              )}
                              {group.members.some(m => m.status === 'active' && !isInactiveMember(m)) ? (
                                <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-medium">
                                  Aktiv
                                </span>
                              ) : (
                                <span className="text-xs bg-stone-100 text-stone-600 border border-stone-200 px-2 py-0.5 rounded-full font-medium">
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
                              <span>IBAN: <strong className="text-stone-700">{group.iban}</strong></span>
                              {group.bic && <span>BIC: {group.bic}</span>}
                              <span>Mandat: <strong>{group.mandate}</strong></span>
                              {group.signatureDate && (
                                <span>Datum: {group.signatureDate}</span>
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
                            onClick={() => handleToggleExpand(group.payerId)}
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
                                          m.status === 'active'
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                            : m.status === 'passive'
                                            ? 'bg-stone-200 text-stone-700'
                                            : m.status === 'child'
                                            ? 'bg-sky-100 text-sky-800'
                                            : 'bg-rose-100 text-rose-700'
                                        }`}
                                      >
                                        {m.status}
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
                        onClick={handleResetFilters}
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

            {/* Bottom Export Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#261420]/95 backdrop-blur-md text-white border-t-2 border-[#AC8AD7] shadow-2xl p-4 z-40">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    <span className="font-bold text-white">
                      {stats.selectedDebitsCount} Lastschriften
                    </span>{' '}
                    ausgewählt • Summe:{' '}
                    <span className="text-[#EFC415] font-mono font-bold text-lg">
                      {stats.totalEuro.toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadAudit}
                    className="border border-[#572986] hover:bg-[#361B2E] text-[#E4D5F7] font-medium px-4 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center gap-2 shadow-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[#AC8AD7]" />
                    <span>Prüfbericht (CSV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadSepa}
                    disabled={stats.selectedDebitsCount === 0}
                    className="bg-[#9565C8] hover:bg-[#824EBB] active:bg-[#572986] disabled:opacity-40 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
                  >
                    <Download className="w-4 h-4 text-[#FEFCE8]" />
                    <span>SEPA-CSV herunterladen</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
