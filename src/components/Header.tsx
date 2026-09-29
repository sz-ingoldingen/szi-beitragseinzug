import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function Header(): React.JSX.Element {
  return (
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
              Automatische Beitragsberechnung & Lastschriftenerstellung (Stichtag: 15.04. | Beitragsordnung 2025)
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
  );
}
