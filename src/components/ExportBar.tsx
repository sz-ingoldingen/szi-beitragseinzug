import React from 'react';
import { FileSpreadsheet, Download, GitCompare } from 'lucide-react';

interface ExportBarProps {
  selectedDebitsCount: number;
  totalEuro: number;
  onDownloadAudit: () => void;
  onDownloadSepa: () => void;
  onDownloadComparisonAudit?: () => void;
  hasComparison?: boolean;
}

export function ExportBar({
  selectedDebitsCount,
  totalEuro,
  onDownloadAudit,
  onDownloadSepa,
  onDownloadComparisonAudit,
  hasComparison,
}: ExportBarProps): React.JSX.Element {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#261420]/95 backdrop-blur-md text-white border-t-2 border-[#AC8AD7] shadow-2xl p-4 z-40">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <span className="font-bold text-white">
              {selectedDebitsCount} Lastschriften
            </span>{' '}
            ausgewählt • Summe:{' '}
            <span className="text-[#EFC415] font-mono font-bold text-lg whitespace-nowrap">
              {totalEuro.toFixed(2).replace('.', ',')}&nbsp;€
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasComparison && onDownloadComparisonAudit && (
            <button
              type="button"
              onClick={onDownloadComparisonAudit}
              className="border border-[#EFC415]/60 hover:bg-[#361B2E] text-[#FEFCE8] font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center gap-2 shadow-sm cursor-pointer"
              title="Detaillierte CSV mit Vorher-Nachher-Vergleich pro Mitglied herunterladen"
            >
              <GitCompare className="w-4 h-4 text-[#EFC415]" />
              <span>Vergleichsbericht (CSV)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onDownloadAudit}
            className="border border-[#572986] hover:bg-[#361B2E] text-[#E4D5F7] font-medium px-4 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#AC8AD7]" />
            <span>Prüfbericht (CSV)</span>
          </button>

          <button
            type="button"
            onClick={onDownloadSepa}
            disabled={selectedDebitsCount === 0}
            className="bg-[#9565C8] hover:bg-[#824EBB] active:bg-[#572986] disabled:opacity-40 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg transition-all flex items-center gap-2 transform hover:-translate-y-0.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 text-[#FEFCE8]" />
            <span>SEPA-CSV herunterladen</span>
          </button>
        </div>
      </div>
    </div>
  );
}
