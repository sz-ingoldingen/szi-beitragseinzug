import React, { useState, useMemo, useEffect } from 'react';
import {
  parseMembersCSV,
  processContributions,
  generateSepaCsv,
  generateAuditCsv,
  Member,
  PayerGroup,
  UnassignedMember,
  InactiveMember,
  StatusFilterType,
  ValidityFilterType,
  matchesStatusFilter,
  matchesValidityFilter,
  filterPayerGroup,
} from './utils/sepaCalculator.ts';
import { FeeRuleSet, DEFAULT_SZI_RULES, feeRuleSetSchema } from './types/rules.ts';
import {
  compareContributionResults,
  generateComparisonAuditCsv,
  areRuleSetsEqual,
} from './utils/comparison.ts';
import {
  loadAllRuleSets,
  loadCustomRuleSets,
  mergeOfficialAndCustomRules,
  saveCustomRuleSet,
  duplicateRuleSet,
  deleteCustomRuleSet,
  getStoredActiveRuleSetId,
  setStoredActiveRuleSetId,
  getStoredBaselineRuleSetId,
  setStoredBaselineRuleSetId,
} from './utils/rulesStorage.ts';
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
  RuleManager,
  RuleEditorModal,
  GitHubPublishModal,
} from './components/index.ts';

export default function App(): React.JSX.Element {
  const [, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [rawMembers, setRawMembers] = useState<Member[]>([]);
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

  // Rules Engine & Multi-Profil-State (mit LocalStorage Persistenz)
  const [availableRuleSets, setAvailableRuleSets] = useState<FeeRuleSet[]>(() => loadAllRuleSets());
  const [activeRuleSet, setActiveRuleSet] = useState<FeeRuleSet>(() => {
    const all = loadAllRuleSets();
    const storedId = getStoredActiveRuleSetId();
    const found = all.find(r => r.id === storedId);
    return found || all[0] || DEFAULT_SZI_RULES;
  });
  const [baselineRuleSet, setBaselineRuleSet] = useState<FeeRuleSet | null>(() => {
    const all = loadAllRuleSets();
    const storedBaselineId = getStoredBaselineRuleSetId();
    if (!storedBaselineId) return null;
    return all.find(r => r.id === storedBaselineId) || null;
  });
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isGitHubPublishOpen, setIsGitHubPublishOpen] = useState<boolean>(false);

  // Lade beim Start den offiziellen Regelwerks-Katalog vom Server / GitHub
  useEffect(() => {
    const fetchRuleCatalog = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL || '/';
        const catalogUrl = `${baseUrl.replace(/\/$/, '')}/rules/catalog.json?t=${Date.now()}`;
        const res = await fetch(catalogUrl, { cache: 'no-cache' });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json) && json.length > 0) {
            const validCatalogRules: FeeRuleSet[] = [];
            for (const item of json) {
              const val = feeRuleSetSchema.safeParse(item);
              if (val.success) {
                validCatalogRules.push({ ...(val.data as FeeRuleSet), isOfficial: true });
              }
            }

            if (validCatalogRules.length > 0) {
              // Führe offizielle Katalog-Regeln mit lokalen Benutzer-Szenarien zusammen
              const merged = mergeOfficialAndCustomRules(validCatalogRules, loadCustomRuleSets());
              setAvailableRuleSets(merged);

              // Ermittle den Standard (isDefault: true oder erstes Element)
              const defaultOfficial = validCatalogRules.find(r => r.isDefault) || validCatalogRules[0];
              const storedActiveId = getStoredActiveRuleSetId();

              setActiveRuleSet(curr => {
                if (curr.id === DEFAULT_SZI_RULES.id || curr.id === defaultOfficial.id || !storedActiveId || storedActiveId === DEFAULT_SZI_RULES.id) {
                  return defaultOfficial;
                }
                const found = merged.find(r => r.id === curr.id);
                return found || defaultOfficial;
              });

              setBaselineRuleSet(curr => {
                if (!curr) return null;
                const found = merged.find(r => r.id === curr.id);
                return found || null;
              });

              return;
            }
          }
        }
      } catch (err) {
        console.warn('[App] Katalog konnte nicht geladen werden, Fallback auf Einzeldatei / Bundle:', err);
      }

      // Fallback: Einzelne szi_standard.json versuchen, falls noch keine catalog.json existiert
      try {
        const baseUrl = import.meta.env.BASE_URL || '/';
        const url = `${baseUrl.replace(/\/$/, '')}/rules/szi_standard.json?t=${Date.now()}`;
        const res = await fetch(url, { cache: 'no-cache' });
        if (res.ok) {
          const json = await res.json();
          const validation = feeRuleSetSchema.safeParse(json);
          if (validation.success) {
            const fetchedStandard = { ...(validation.data as FeeRuleSet), isOfficial: true };
            const merged = mergeOfficialAndCustomRules([fetchedStandard], loadCustomRuleSets());
            setAvailableRuleSets(merged);
            setActiveRuleSet(curr => {
              if (curr.id === DEFAULT_SZI_RULES.id || curr.id === fetchedStandard.id) {
                return fetchedStandard;
              }
              return curr;
            });
          }
        }
      } catch {
        // Fallback auf statische Bundle-Regeln bei Offline-Betrieb
      }
    };
    fetchRuleCatalog();
  }, []);

  // Neuberechnung bei Änderung von Mitgliedern oder Regelwerk
  const recalculateData = (members: Member[], rules: FeeRuleSet) => {
    const { payerGroups, unassignedMembers, inactiveMembers } = processContributions(members, rules);
    setPayerGroupsState(payerGroups);
    setUnassignedMembersState(unassignedMembers);
    setInactiveMembersState(inactiveMembers);
  };

  const handleProcessData = (text: string, name = 'Mitgliederliste.csv') => {
    try {
      setIsProcessing(true);
      setErrorMsg('');
      const members = parseMembersCSV(text);
      setRawMembers(members);
      recalculateData(members, activeRuleSet);
      setCsvContent(text);
      setFileName(name);
      const res = processContributions(members, activeRuleSet);
      setExpandedPayers(new Set(res.payerGroups.slice(0, 3).map(p => p.payerId)));
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

  // Regelwerk-Aktionen
  const handleSelectActiveRuleSet = (rules: FeeRuleSet) => {
    setActiveRuleSet(rules);
    setStoredActiveRuleSetId(rules.id);
    if (rawMembers.length > 0) {
      recalculateData(rawMembers, rules);
    }
  };

  const handleSelectBaselineRuleSet = (rules: FeeRuleSet | null) => {
    setBaselineRuleSet(rules);
    setStoredBaselineRuleSetId(rules ? rules.id : null);
  };

  const handleSaveOrAddRuleSet = (newRules: FeeRuleSet): FeeRuleSet => {
    const saved = saveCustomRuleSet(newRules);
    const updated = loadAllRuleSets();
    setAvailableRuleSets(updated);
    return saved;
  };

  const handleDuplicateRuleSet = (source: FeeRuleSet) => {
    const duplicated = duplicateRuleSet(source);
    const updated = loadAllRuleSets();
    setAvailableRuleSets(updated);
    handleSelectActiveRuleSet(duplicated);
  };

  const handleDeleteRuleSet = (id: string) => {
    deleteCustomRuleSet(id);
    const updated = loadAllRuleSets();
    setAvailableRuleSets(updated);
    if (activeRuleSet.id === id) {
      handleSelectActiveRuleSet(DEFAULT_SZI_RULES);
    }
    if (baselineRuleSet?.id === id) {
      handleSelectBaselineRuleSet(null);
    }
  };

  const handleResetToDefaultRules = () => {
    handleSelectActiveRuleSet(DEFAULT_SZI_RULES);
    handleSelectBaselineRuleSet(null);
  };

  const handleOpenNewScenario = () => {
    setActiveRuleSet(DEFAULT_SZI_RULES);
    setIsEditorOpen(true);
  };

  // Parallele A/B-Differenzanalyse
  const comparison = useMemo(() => {
    if (!baselineRuleSet || rawMembers.length === 0) return null;
    const targetResult = processContributions(rawMembers, activeRuleSet);
    const baselineResult = processContributions(rawMembers, baselineRuleSet);
    return compareContributionResults(targetResult, baselineResult);
  }, [rawMembers, activeRuleSet, baselineRuleSet]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const buffer = event.target?.result;
      if (buffer instanceof ArrayBuffer) {
        const uint8Array = new Uint8Array(buffer);
        let text = '';
        if (uint8Array.length >= 3 && uint8Array[0] === 0xef && uint8Array[1] === 0xbb && uint8Array[2] === 0xbf) {
          text = new TextDecoder('utf-8').decode(uint8Array.subarray(3));
        } else {
          try {
            text = new TextDecoder('utf-8', { fatal: true }).decode(uint8Array);
          } catch {
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
    const issuesCount =
      payerGroupsState.filter(g => !g.isValid || g.warnings.length > 0).length +
      unassignedMembersState.length;
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

  const handleDownloadComparisonAudit = () => {
    if (!baselineRuleSet || rawMembers.length === 0) return;
    const targetResult = processContributions(rawMembers, activeRuleSet);
    const baselineResult = processContributions(rawMembers, baselineRuleSet);
    const csvStr = generateComparisonAuditCsv(
      targetResult,
      baselineResult,
      activeRuleSet.name,
      baselineRuleSet.name
    );
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SZI_Beitragsvergleich_${new Date().getFullYear()}.csv`);
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
          <>
            {/* Regelwerk-Steuerung auch vor dem CSV-Import zugänglich */}
            <RuleManager
              availableRuleSets={availableRuleSets}
              activeRuleSet={activeRuleSet}
              baselineRuleSet={baselineRuleSet}
              onSelectActiveRuleSet={handleSelectActiveRuleSet}
              onSelectBaselineRuleSet={handleSelectBaselineRuleSet}
              onAddRuleSet={handleSaveOrAddRuleSet}
              onDuplicateRuleSet={handleDuplicateRuleSet}
              onDeleteRuleSet={handleDeleteRuleSet}
              onResetToDefault={handleResetToDefaultRules}
              onOpenEditor={() => setIsEditorOpen(true)}
              onOpenNewScenario={handleOpenNewScenario}
              onOpenGitHubPublish={() => setIsGitHubPublishOpen(true)}
            />

            <UploadCard
              onFileUpload={handleFileUpload}
              onLoadSample={handleLoadSample}
              errorMsg={errorMsg}
            />
          </>
        ) : (
          <>
            {/* Regelwerk-Steuerung & Multi-Profil Pool */}
            <RuleManager
              availableRuleSets={availableRuleSets}
              activeRuleSet={activeRuleSet}
              baselineRuleSet={baselineRuleSet}
              onSelectActiveRuleSet={handleSelectActiveRuleSet}
              onSelectBaselineRuleSet={handleSelectBaselineRuleSet}
              onAddRuleSet={handleSaveOrAddRuleSet}
              onDuplicateRuleSet={handleDuplicateRuleSet}
              onDeleteRuleSet={handleDeleteRuleSet}
              onResetToDefault={handleResetToDefaultRules}
              onOpenEditor={() => setIsEditorOpen(true)}
              onOpenNewScenario={handleOpenNewScenario}
              onOpenGitHubPublish={() => setIsGitHubPublishOpen(true)}
            />

            {/* KPI Cards mit A/B-Delta-Vergleich */}
            <KpiCards
              stats={stats}
              statusFilter={statusFilter}
              validityFilter={validityFilter}
              onResetFilters={handleResetFilters}
              onStatusFilterChange={setStatusFilter}
              onValidityFilterChange={setValidityFilter}
              comparison={
                comparison && baselineRuleSet
                  ? { summary: comparison, baselineName: baselineRuleSet.name }
                  : null
              }
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

            {/* Zahler Tabelle mit Deltas */}
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
              payerDeltas={comparison ? comparison.payerDeltas : null}
            />

            {/* Bottom Export Bar mit Vergleichs-Option */}
            <ExportBar
              selectedDebitsCount={stats.selectedDebitsCount}
              totalEuro={stats.totalEuro}
              onDownloadAudit={handleDownloadAudit}
              onDownloadSepa={handleDownloadSepa}
              hasComparison={Boolean(comparison)}
              onDownloadComparisonAudit={handleDownloadComparisonAudit}
            />
          </>
        )}
      </main>

      {/* Erfassungshilfe / Regel-Editor Modal */}
      <RuleEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        activeRuleSet={activeRuleSet}
        onApplyRuleSet={newRules => {
          const isModified = !areRuleSetsEqual(newRules, DEFAULT_SZI_RULES);
          const savedRules = handleSaveOrAddRuleSet(newRules);
          handleSelectActiveRuleSet(savedRules);
          // Bei inhaltlicher Abweichung automatisch den unveränderten Standard als Vergleichsbasis setzen,
          // damit Vorher/Nachher-Differenzen (Deltas) direkt in den KPIs und der Tabelle sichtbar werden
          if (isModified && !baselineRuleSet) {
            handleSelectBaselineRuleSet(DEFAULT_SZI_RULES);
          } else if (!isModified && baselineRuleSet?.id === DEFAULT_SZI_RULES.id) {
            handleSelectBaselineRuleSet(null);
          }
        }}
        onSetAsBaseline={baselineRules => {
          const savedRules = handleSaveOrAddRuleSet(baselineRules);
          handleSelectBaselineRuleSet(savedRules);
        }}
      />

      {/* GitHub Standard Veröffentlichungs-Dialog */}
      <GitHubPublishModal
        isOpen={isGitHubPublishOpen}
        onClose={() => setIsGitHubPublishOpen(false)}
        ruleSet={activeRuleSet}
      />
    </div>
  );
}
