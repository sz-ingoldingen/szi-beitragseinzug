import React from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface UploadCardProps {
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadSample: () => void;
  errorMsg: string;
}

export function UploadCard({
  onFileUpload,
  onLoadSample,
  errorMsg,
}: UploadCardProps): React.JSX.Element {
  return (
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
            onChange={onFileUpload}
            className="hidden"
          />
        </label>

        <button
          type="button"
          onClick={onLoadSample}
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
  );
}
