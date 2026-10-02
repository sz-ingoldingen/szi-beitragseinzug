import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rulesDir = path.resolve(__dirname, '../public/rules');
const catalogFile = path.resolve(rulesDir, 'catalog.json');

export function buildCatalog() {
  if (!fs.existsSync(rulesDir)) {
    console.warn(`[buildCatalog] Verzeichnis ${rulesDir} existiert nicht.`);
    return [];
  }

  const files = fs.readdirSync(rulesDir).filter(f => f.endsWith('.json') && f !== 'catalog.json');
  const ruleSetsById = new Map();
  const duplicateFiles = [];

  for (const filename of files) {
    const fullPath = path.join(rulesDir, filename);
    try {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const data = JSON.parse(raw);

      if (!data.id || !data.name || !data.rates) {
        throw new Error(`Fehlende Pflichtfelder (id, name, rates) in ${filename}`);
      }

      data.filename = filename;
      data.isOfficial = true;

      // Falls mehrere Dateien dieselbe ID haben (z.B. szi_standard.json und szi_beitragsordnung_2025.json),
      // behalten wir bevorzugt die spezifische Jahresdatei.
      if (ruleSetsById.has(data.id)) {
        duplicateFiles.push({ filename, id: data.id });
        const existing = ruleSetsById.get(data.id);
        if (filename.includes('20') && !existing.filename.includes('20')) {
          ruleSetsById.set(data.id, data);
        }
      } else {
        ruleSetsById.set(data.id, data);
      }
    } catch (err) {
      console.error(`[buildCatalog] FEHLER beim Lesen von ${filename}:`, err);
      throw err;
    }
  }

  const catalog = Array.from(ruleSetsById.values());

  // Sortierung:
  // 1. Primärer Standard (isDefault: true) ganz oben
  // 2. Danach chronologisch absteigend nach Gültigkeitsdatum (effectiveFrom)
  catalog.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    const dateA = a.effectiveFrom || '1970-01-01';
    const dateB = b.effectiveFrom || '1970-01-01';
    return dateB.localeCompare(dateA);
  });

  // Falls kein Eintrag explizit als isDefault markiert ist, wird der neueste Standard als Default gesetzt
  if (catalog.length > 0 && !catalog.some(r => r.isDefault)) {
    catalog[0].isDefault = true;
  }

  fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2), 'utf-8');
  console.log(`[buildCatalog] Katalog erfolgreich generiert (${catalog.length} Beitragsordnungen in public/rules/catalog.json)`);
  return catalog;
}

// Direkte Ausführung im Node-CLI
if (process.argv[1] === __filename) {
  buildCatalog();
}
