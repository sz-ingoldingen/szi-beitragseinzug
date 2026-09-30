import React, { useState, useMemo } from 'react';
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
} from './utils/sepaCalculator.ts';
import { SAMPLE_CSV } from './utils/sampleData.ts';
import {
  Header,
  UploadCard,
  KpiCards,
  FilterBar,
  UnassignedPanel,
  InactivePanel,
  PayerTable,
  ExportBar,
} from './components/index.ts';

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
  const [privacyMode, setPrivacyMode] = useState<boolean>(true);
  const [revealedIbans, setRevealedIbans] = useState<Set<string>>(new Set());
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
      const buffer = event.target?.result;
      if (buffer instanceof ArrayBuffer) {
        const uint8Array = new Uint8Array(buffer);
        let text = '';
        // 1. Prüfen auf UTF-8 Byte Order Mark (0xEF, 0xBB, 0xBF)
        if (uint8Array.length >= 3 && uint8Array[0] === 0xef && uint8Array[1] === 0xbb && uint8Array[2] === 0xbf) {
          text = new TextDecoder('utf-8').decode(uint8Array.subarray(3));
        } else {
          // 2. Versuche UTF-8 Dekodierung (fatal: true fängt ungültige Sequenzen ab)
          try {
            text = new TextDecoder('utf-8', { fatal: true }).decode(uint8Array);
          } catch {
            // 3. Fallback auf ISO-8859-1 (Standard bei älteren deutschen Windows/Excel-Exporten)
            text = new TextDecoder('iso-8859-1').decode(uint8Array);
          }
        }
        handleProcessData(text, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
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

  const handleToggleAllExpand = () => {
    setExpandedPayers(
      new Set(
        expandedPayers.size === filteredPayerGroups.length
          ? []
          : filteredPayerGroups.map(g => g.payerId)
      )
    );
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
          return {
            ...g,
            selectedForExport:
              select && g.isValid && g.totalAmount > 0 && !g.isInvoice && !g.isStandingOrder,
          };
        }
        return g;
      })
    );
  };

  const handleTogglePrivacyMode = () => {
    setPrivacyMode(prev => !prev);
    setRevealedIbans(new Set());
  };

  const handleToggleRevealIban = (payerId: string) => {
    setRevealedIbans(prev => {
      const next = new Set(prev);
      if (next.has(payerId)) next.delete(payerId);
      else next.add(payerId);
      return next;
    });
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
      invoice: payerGroupsState.filter(g => matchesStatusFilter(g, 'invoice')).length,
      standingOrder: payerGroupsState.filter(g => matchesStatusFilter(g, 'standingOrder')).length,
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
      {/* Header mit authentischen Vereinsfarben */}
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {payerGroupsState.length === 0 ? (
          <UploadCard
            onFileUpload={handleFileUpload}
            onLoadSample={handleLoadSample}
            errorMsg={errorMsg}
          />
        ) : (
          <>
            {/* KPI Cards (Interaktiv) */}
            <KpiCards
              stats={stats}
              statusFilter={statusFilter}
              validityFilter={validityFilter}
              onResetFilters={handleResetFilters}
              onStatusFilterChange={setStatusFilter}
              onValidityFilterChange={setValidityFilter}
            />

            {/* Filter- und Steuerleiste */}
            <FilterBar
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              validityFilter={validityFilter}
              onValidityFilterChange={setValidityFilter}
              filterCounts={filterCounts}
              isAnyFilterActive={isAnyFilterActive}
              onResetFilters={handleResetFilters}
              onFileUpload={handleFileUpload}
              fileName={fileName}
              purpose={purpose}
              onPurposeChange={setPurpose}
              filteredCount={filteredPayerGroups.length}
              totalCount={payerGroupsState.length}
            />

            {/* Unassigned Collapsible Box */}
            <UnassignedPanel
              unassignedMembers={unassignedMembersState}
              showUnassigned={showUnassigned}
              onToggleShow={() => setShowUnassigned(prev => !prev)}
              unassignedSearch={unassignedSearch}
              onSearchChange={setUnassignedSearch}
            />

            {/* Inaktive Mitglieder (Gekündigt / Verstorben) */}
            <InactivePanel
              inactiveMembers={inactiveMembersState}
              showInactive={showInactive}
              onToggleShow={() => setShowInactive(prev => !prev)}
              inactiveSearch={inactiveSearch}
              onSearchChange={setInactiveSearch}
            />

            {/* Zahler Tabelle */}
            <PayerTable
              filteredPayerGroups={filteredPayerGroups}
              totalPayerGroupsCount={payerGroupsState.length}
              isAnyFilterActive={isAnyFilterActive}
              onResetFilters={handleResetFilters}
              expandedPayers={expandedPayers}
              onToggleExpand={handleToggleExpand}
              onToggleAllExpand={handleToggleAllExpand}
              onSelectAll={handleSelectAll}
              onTogglePayerSelection={handleTogglePayerSelection}
              privacyMode={privacyMode}
              onTogglePrivacyMode={handleTogglePrivacyMode}
              revealedIbans={revealedIbans}
              onToggleRevealIban={handleToggleRevealIban}
            />

            {/* Bottom Export Bar */}
            <ExportBar
              selectedDebitsCount={stats.selectedDebitsCount}
              totalEuro={stats.totalEuro}
              onDownloadAudit={handleDownloadAudit}
              onDownloadSepa={handleDownloadSepa}
            />
          </>
        )}
      </main>
    </div>
  );
}
