import React from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';

interface ExportBarProps {
  selectedDebitsCount: number;
  totalEuro: number;
  onDownloadAudit: () => void;
  onDownloadSepa: () => void;
}

export function ExportBar({
  selectedDebitsCount,
  totalEuro,
  onDownloadAudit,
  onDownloadSepa,
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
            <span className="text-[#EFC415] font-mono font-bold text-lg">
              {totalEuro.toFixed(2).replace('.', ',')} €
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
