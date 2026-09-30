# Konzept & Umsetzungsplan: Konfigurierbare Beitrags-Rules-Engine für den SZI e.V.

> **Status:** Konzept & Architektur-Entwurf  
> **Ziel:** Vollständige Flexibilisierung der Beitragsberechnung, Upload-Fähigkeit für Regelwerke, 100 % Abwärtskompatibilität und nahtlose Absicherung über automatisierte Tests.

---

## 1. Executive Summary (Management-Zusammenfassung)

Aktuell sind die Beitragsbeträge (z. B. 25 € aktiv, 12 € passiv, 20 € Familiensockel, 10 € Partner/1. Kind) sowie die Altersgrenzen (18 Jahre für Volljährigkeit, 25 Jahre für Familienzugehörigkeit) und der Stichtag (15. April) fest im Quellcode (`src/utils/sepaCalculator.ts`) verankert.

Eine **Beitrags-Rules-Engine** ermöglicht es,:
1. **Beträge und Schwellenwerte frei anzupassen** (z. B. bei Beschlüssen zukünftiger Generalversammlungen), ohne den Programmcode anfassen oder neu deployen zu müssen.
2. **Regelwerke als Datei hochzuladen** (z. B. `szi_beitragsordnung_2026.json`), herunterzuladen, zu archivieren oder zwischen Jahren zu wechseln.
3. **Neue Tarifkategorien oder Sonderregeln zu definieren** (z. B. ermäßigte Rentnerbeiträge, Rechnungsgebühren gem. § 1 Abs. 4, Ehrenamtsfreistellungen).
4. **Vollständige Datensouveränität zu wahren**: Die Berechnung und der Regel-Upload erfolgen rein **client-seitig im Browser** – keine sensiblen Vereinsdaten verlassen den Rechner des Kassiers.
5. **100 % Stabilität und Null Datenverlust** zu garantieren: Die bestehende Logik der aktuellen `SZI_Beitragsordnung.pdf` bleibt als fest verankertes Standard-Regelwerk (*Default*) erhalten; alle 71 bestehenden Vitest-Tests bleiben ohne Abstriche grün.

### Aufwands-Einschätzung im Überblick

| Ansatz | Flexibilität | Aufwand (Personentage) | Risiko / Komplexität | Empfehlung |
| :--- | :--- | :--- | :--- | :--- |
| **Modell A: Konfigurierbares Tarif- & Profil-Schema (JSON)** | Sehr hoch für Beträge, Staffeln, Grenzen & Mappings | **2 – 3 Tage** | Sehr gering; absolut sicher | **Dringend empfohlen (Sweet Spot)** |
| **Modell B: Deklarative Conditions-Engine (JsonLogic / AST)** | Extrem hoch; beliebige Wenn-Dann-Formeln | **5 – 7 Tage** | Mittel; relationale Familienregeln werden schnell unübersichtlich | Optional als Ausbaustufe |
| **Modell C: Script- / Plugin-Upload (.js / eval)** | Grenzenlos (vollwertiger Code) | **4 – 5 Tage** | **Sehr hoch (Sicherheitsrisiko XSS)**, fehleranfällig für Laien | **Nicht empfohlen** |

---

## 2. Ist-Analyse: Warum die SZI-Beitragslogik zweistufig ist

Eine Beitragsberechnung für einen Verein wie den Schalmeienzug Ingoldingen e.V. unterscheidet sich grundlegend von einfachen "Wenn-Dann"-Rechnungen in Online-Shops. Die Beitragsordnung (§ 1 & § 2) erfordert **zwei hierarchische Berechnungsebenen**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Ebene 1: Individuum                           │
│  - Alter am Stichtag 15.04. (< 18, 18-24, >= 25)                       │
│  - Mitglieds-Status (26 zunft.app Status-Codes: aktiv, passiv, gast...) │
│  - Ehrenamt / Ehrenmitglied gem. § 1 Abs. 6 (0 €)                      │
│  - Inaktivitätsprüfung (Kündigung, Austritt, Verstorben -> 0 €)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Ebene 2: Verbund / Zahlergruppe                      │
│  - Ist der Zahler ein Einzelzahler oder Familienzahler?               │
│  - Wer übernimmt den Familiensockel (20 €)?                           │
│    (Sonderfall: Zahler ist beitragsfreies Ehrenmitglied)               │
│  - Partner-Zuschlag (+10 € aktiv / 0 € passiv)                         │
│  - Kinder-Kaskade unter 25:                                           │
│    * 1. aktives Kind = +10 €                                           │
│    * ab 2. aktivem Kind = beitragsfrei (0 €)                          │
│  - Vollendetes 25. Lebensjahr (§ 2):                                   │
│    * Herauslösung aus dem Familienbeitrag -> Klärungsfall (Unassigned) │
│  - IBAN / Mandats-Integritätsprüfung (Rechnung, Dauerauftrag, Lastschrift)
└────────────────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> Eine praxistaugliche Rules Engine darf daher **nicht nur isolierte Zeilen berechnen**, sondern muss den **Kontext der Zahlergruppe (Familie, Rangfolge aktiver Kinder, Lebenspartner)** sauber abbilden können.

---

## 3. Die 3 Lösungsansätze im Detailvergleich

### Modell A: Das typisierte Tarif- und Regelprofil (JSON/YAML Schema)
- **Funktionsweise:** Die Engine erhält ein strukturiertes Objekt (`FeeRuleSet`). Darin sind Tarife, Zuschläge, Schwellenwerte, Stichtage und Ausnahmelisten parametrisiert.
- **Upload:** Der Nutzer lädt eine `.json`-Datei hoch. Ein Schema-Parser (z. B. [Zod](https://zod.dev/)) validiert die Struktur blitzschnell im Browser vor der Anwendung.
- **Vorteile:**
  - 100 % typesicher und frei von Code-Injection-Risiken.
  - Fehlertolerant: Ungültige Uploads werden sofort mit aussagekräftiger Fehlermeldung abgefangen; die App fällt im Zweifel auf das Standard-Regelwerk zurück.
  - Ermöglicht sowohl **Datei-Upload** als auch **visuelle Editierbarkeit im UI** (z. B. Eingabefelder für Beträge im Einstellungsmenü).
- **Grenzen:** Komplett neuartige Beitragsmodelle (z. B. "Rabatt ab dem 3. Instrument") erfordern eine Erweiterung des Schemas im Code.

### Modell B: Deklarative Conditions-Engine (z. B. JsonLogic)
- **Funktionsweise:** Regeln werden als logischer Syntaxbaum formuliert:
  `{"if": [{">=": [{"var": "age"}, 18]}, 25, 0]}`.
- **Upload:** JSON-Dateien mit Formel-Bedingungen.
- **Vorteile:** Hohe Flexibilität bei mathematischen Bedingungen auf Einzelpersonen-Ebene.
- **Grenzen:** Sehr unhandlich und fehlerträchtig für die relationale Gruppenkaskade (Familienverbund, Zählung von Kindern). Kassierer können solche JSON-Bäume im Fehlerfall kaum selbst debuggen.

### Modell C: Dynamischer Script-Upload (JavaScript Plugin)
- **Funktionsweise:** Der Nutzer lädt eine `customCalculator.js` hoch, die zur Laufzeit ausgeführt wird.
- **Vorteile:** Uneingeschränkte algorithmische Freiheit.
- **Risiken:** **Kritisches Sicherheitsrisiko (XSS).** Bösartiger oder fehlerhafter Code könnte IBANs, Mandatsdaten und Adressen abgreifen oder die Web-App zum Absturz bringen. **Daher für Finanz- und Vereinsdaten ausdrücklich abzulehnen.**

---

## 4. Die empfohlene Architektur: "SZI Modular Rule Engine"

Wir empfehlen **Modell A** in einer **modularen, zukunftssicheren 3-Schichten-Architektur**:

```
                       ┌───────────────────────────────┐
                       │   Benutzeroberfläche (UI)     │
                       │ - Upload "Beitragsregeln.json"│
                       │ - Preset-Auswahl (2025, 2026) │
                       │ - Optional: Schnelleditor     │
                       └───────────────┬───────────────┘
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │     Validierung (Zod-Schema)  │
                       │ - Syntaxprüfung               │
                       │ - Plausibilitätsprüfungen     │
                       │   (z. B. MinAge < MaxAge)     │
                       └───────────────┬───────────────┘
                                       │
                 ┌─────────────────────┴─────────────────────┐
                 │ Übergabe: FeeRuleSet                      │
                 ▼                                           ▼
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     Standard-Regelwerk          │       │     Berechnungs-Engine          │
│     (DEFAULT_SZI_RULES)         │       │  processContributions(          │
│  - Exakte Logik Stand 2025      │──────▶│    members,                     │
│  - Feste Fallback-Garantie      │       │    rules = DEFAULT_SZI_RULES    │
│  - 100 % abwärtskompatibel      │       │  )                              │
└─────────────────────────────────┘       └────────────────┬────────────────┘
                                                           │
                                                           ▼
                                          ┌─────────────────────────────────┐
                                          │      Ergebnis & SEPA / Audit    │
                                          │ - PayerGroups & Beträge         │
                                          │ - Unassigned / Inactive Members │
                                          └─────────────────────────────────┘
```

### Der non-breaking Funktionsaufruf
Durch TypeScript-Default-Parameter bleibt der bestehende Code zu 100 % unverändert lauffähig:

```typescript
// Bisher:
export function processContributions(members: Member[]): ContributionResult

// Neu (vollständig abwärtskompatibel!):
export function processContributions(
  members: Member[],
  ruleSet: FeeRuleSet = DEFAULT_SZI_RULES
): ContributionResult
```
Alle existierenden Tests, Komponenten und Aufrufe funktionieren ohne Anpassung weiter wie bisher.

---

## 5. Konkretes Regel-Schema (JSON-Spezifikation)

Nachfolgend das vollständige JSON-Schema, das die aktuelle `SZI_Beitragsordnung.pdf` 1:1 abbildet und gleichzeitig beliebig konfigurierbar macht:

```json
{
  "$schema": "https://szi-ingoldingen.de/schemas/fee-rules-v1.json",
  "id": "szi-standard-2025",
  "name": "SZI Beitragsordnung (Stand 05.04.2025)",
  "version": "1.0.0",
  "effectiveFrom": "2025-04-05",
  "currency": "EUR",
  "description": "Offizielle Beitragsordnung gem. Generalversammlungsbeschluss vom 05.04.2025",

  "timing": {
    "cutoffDay": 15,
    "cutoffMonth": 4,
    "comment": "Stichtag für Altersberechnungen ist der 15. April des laufenden Jahres"
  },

  "ageThresholds": {
    "youthExemptMaxAge": 18,
    "familyChildMaxAge": 25
  },

  "rates": {
    "single": {
      "adultActive": 25.0,
      "adultPassive": 12.0,
      "youthUnder18": 0.0,
      "defaultFallback": 12.0
    },
    "family": {
      "basePayer": 20.0,
      "activePartner": 10.0,
      "passivePartner": 0.0,
      "firstActiveChild": 10.0,
      "subsequentActiveChild": 0.0,
      "passiveChild": 0.0,
      "youthUnder18": 0.0
    },
    "specialFees": {
      "invoiceExtraCharge": 5.0,
      "instrumentDeposit": 100.0
    }
  },

  "statusClassifications": {
    "activeCodes": ["active", "premium", "limited", "twen", "teen", "child", "infant"],
    "passiveCodes": ["passive", "pprem", "plimit", "pinfant", "pkid", "pteen", "ptwen", "senior"],
    "guestCodes": ["guest", "gprem", "glimit", "ginfant", "gkid", "gteen", "gtwen"],
    "honoraryCodes": ["sponsor", "ehrenmitglied", "honorary"]
  },

  "exemptions": {
    "honoraryKeywords": [
      "ehren",
      "honorary",
      "ehrenvorstand",
      "ehrendirigent",
      "ehrenmitglied",
      "ehrenamtsinhaber",
      "ehrenvorsitz"
    ],
    "regularBoardIsPayable": true
  }
}
```

### Wie eine Beitragsanpassung für 2027 aussehen würde
Möchte der Verein beispielsweise:
- den Erwachsenen-Aktivbeitrag von **25 € auf 30 €** anheben,
- den Familiensockel von **20 € auf 25 €** anpassen,
- und die Familien-Kindergrenze von **25 auf 27 Jahre** verlängern,

muss lediglich der Wert in der JSON-Datei geändert und hochgeladen werden:
```json
{
  "id": "szi-haushalt-2027",
  "name": "SZI Beitragsanpassung 2027 (Entwurf)",
  "ageThresholds": {
    "familyChildMaxAge": 27
  },
  "rates": {
    "single": {
      "adultActive": 30.0
    },
    "family": {
      "basePayer": 25.0
    }
  }
}
```
Die Anwendung berechnet alle Summen, Berichte und SEPA-Dateien sekundenschnell neu – **ohne Neukompilierung des Codes**.

---

## 6. UI/UX-Konzept: Dynamische Differenzansicht & A/B-Szenarien-Vergleich

Ein starrer Vergleich ausschließlich gegen den fest verdrahteten Standard (2025) greift in der Praxis zu kurz:
- **Folge-Anpassungen (z. B. 2026 ➔ 2027):** Wenn bereits eine Beitragsanpassung für 2026 aktiv ist und nun 2027 geplant wird, interessiert der Vorjahresstand 2026 – nicht der alte 2025er Stand.
- **Szenarien-Diskussion im Vorstand:** Oft stehen zwei Alternativen zur Wahl (z. B. *„Entwurf A: Erhöhung Aktivbeitrag um 5 €“* vs. *„Entwurf B: Erhöhung Familiensockel um 5 €“*). Der Kassier muss Entwurf A direkt gegen Entwurf B vergleichen können.

### Die Lösung: Frei wählbare Baseline (A/B-Vergleich)

Die Anwendung verwaltet einen Pool geladener Regelwerke (im Session-Speicher oder `localStorage`) und stellt zwei Selektoren bereit:

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                 SZI Beitragsverwaltung                                    │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│  [1. Mitglieder-CSV]         [2. Aktive Berechnung (Ziel)]     [3. Vergleichs-Basis]      │
│  Mitglieder_2027.csv         ● Entwurf 2027 (Variante B) [▾]   ● Beschluss 2026 [▾]       │
│                                                                                           │
│  [ 📤 Regelwerk hochladen ]   [ 📥 Aktives Regelwerk (.json) ]   [ ↺ Zurücksetzen ]       │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

### Deltas auf drei Ebenen sichtbar machen

1. **Makro-Ebene (KPI-Dashboard):**
   - **Gesamtergebnis:** `4.230,00 €`  
   - **Delta zur gewählten Basis:** `▲ +210,00 € (+5,2 %)`
   - **Betroffenheitsanalyse:** `14 Zahler zahlen mehr | 2 Zahler zahlen weniger | 42 Zahler unverändert`

2. **Mikro-Ebene (Zahler-Tabelle):**
   Jeder Zahler zeigt neben dem neuen Betrag direkt das Delta zur Referenz:
   - *Mustermann, Max:* `40,00 €` <span style="color:#16a34a; font-weight:600;">(+10,00 €)</span>
   - *Schmidt, Anna:* `25,00 €` <span style="color:#6b7280;">(±0,00 €)</span>
   - Aufklappbar: Im Detail ist sofort ersichtlich, welche Regel das Delta verursacht hat (z. B. *„Familiensockel von 20 € auf 25 € erhöht“*).

3. **Prüfbericht & GV-Präsentations-Export (Audit-CSV mit Differenzspalte):**
   Der Kassier kann einen vergleichenden Prüfbericht als Excel/CSV exportieren, der dem Vorstand oder der Generalversammlung vorgelegt werden kann:
   - Spalte: `Betrag (Neu: Entwurf 2027 B)`
   - Spalte: `Betrag (Referenz: Stand 2026)`
   - Spalte: `Differenz (€)`
   - Spalte: `Begründung der Abweichung`

### Performance-Garantie
Da die Berechnung im Browser für 500–1000 Mitglieder in **unter 20 Millisekunden** erfolgt, werden beide Regelwerke parallel im Speicher berechnet:
```typescript
const resultTarget = useMemo(() => processContributions(members, targetRuleSet), [members, targetRuleSet]);
const resultBaseline = useMemo(() => processContributions(members, baselineRuleSet), [members, baselineRuleSet]);
const delta = resultTarget.totalAmount - resultBaseline.totalAmount;
```
Es entsteht keinerlei spürbare Ladezeit oder UI-Verzögerung.

---

## 7. Ausgeklügelte Test- und Absicherungsstrategie

Um absolute Zuverlässigkeit ohne Regressionen zu gewährleisten, setzen wir auf ein **4-stufiges Testkonzept** in Vitest:

### Stufe 1: Parity- / Golden-Master-Tests (100 % Identität)
- **Prinzip:** Wir führen die Beitragsberechnung mit der bestehenden Logik und der neuen Rules Engine mit `DEFAULT_SZI_RULES` über dieselben Beispieldaten (`SAMPLE_CSV`) aus.
- **Assertion:** Beide Ergebnisse müssen bis auf den letzten Cent, das letzte Fehler-Array und die Begründungstexte **strikt identisch** sein.
- **Bestehende 71 Vitest-Tests:** Laufen parallel unverändert weiter und müssen alle zu 100 % grün bleiben.

### Stufe 2: Schema- und Validierungstests
- Test fehlerhafter JSON-Dateien:
  - Fehlende Pflichtfelder (z. B. `basePayer`).
  - Ungültige Werte (z. B. negativer Beitrag `-10 €`).
  - Unlogische Schwellenwerte (z. B. `familyChildMaxAge = 16` kleiner als `youthExemptMaxAge = 18`).
- Test robuster Fallbacks: Bei ungültigem JSON wird eine Exception abgefangen und die Standardregel beibehalten.

### Stufe 3: Parametrische Verhaltens- und Grenzfall-Tests (Edge Cases)
- **Tarifänderungstest:** Wenn `adultActive` auf `30 €` gesetzt wird, muss ein einzelner aktiver Vorstand exakt 30 € zahlen (vorher 25 €).
- **Altersgrenzentest:** Wenn `familyChildMaxAge` von 25 auf 27 Jahre angehoben wird, darf ein 26-jähriges Kind nicht mehr in `unassignedMembers` landen, sondern muss regulär in der Familie bleiben.
- **Statusmapping-Test:** Definition eines neuen Status `"senior_discount"` mit zugewiesenem Beitrag von 8 € -> korrekte Abrechnung und Ausweisung.
- **Rechnungsgebühren-Test:** Einbindung der in § 1 Abs. 4 genannten 5 € Rechnungsgebühr bei Rechnungszahlern.

### Stufe 4: Export-Konsistenztests
- Sicherstellen, dass geänderte Beträge auch in `generateSepaCsv` und `generateAuditCsv` exakt mit deutscher Kommasetzung formatiert werden (z. B. `"30,00"` statt `"25,00"`).

---

## 8. Schritt-für-Schritt-Fahrplan mit To-Do-Checkliste

### Phase 1: Datenmodell & Standard-Regelwerk (Tag 1)
- [ ] **Typdefinitionen erstellen:** Neues Interface `FeeRuleSet` und Sub-Interfaces (`FeeRates`, `AgeThresholds`, `StatusClassifications`, etc.) in `src/types/rules.ts` anlegen.
- [ ] **Standard-Regelwerk kapseln:** `DEFAULT_SZI_RULES` als typisierte Konstante definieren, die exakt die heutigen Werte aus `sepaCalculator.ts` abbildet.
- [ ] **Zod-Schema definieren:** `feeRuleSetSchema` zur Validierung externer JSON-Uploads erstellen.
- [ ] **Exportfähige JSON-Referenz:** Eine Datei `public/rules/szi_beitragsordnung_2025.json` als Vorlage und Download bereitstellen.

### Phase 2: Refactoring der Berechnungs-Engine (Tag 1 – 2)
- [ ] **Signatur erweitern:** `processContributions(members: Member[], ruleSet: FeeRuleSet = DEFAULT_SZI_RULES)` umsetzen.
- [ ] **Hardcodierte Beträge ersetzen:**
  - `25.0` -> `ruleSet.rates.single.adultActive`
  - `12.0` -> `ruleSet.rates.single.adultPassive`
  - `20.0` -> `ruleSet.rates.family.basePayer`
  - `10.0` (Partner) -> `ruleSet.rates.family.activePartner`
  - `10.0` (1. Kind) -> `ruleSet.rates.family.firstActiveChild`
- [ ] **Dynamische Schwellenwerte einbinden:**
  - `m.age < 18` -> `m.age < ruleSet.ageThresholds.youthExemptMaxAge`
  - `m.age >= 25` -> `m.age >= ruleSet.ageThresholds.familyChildMaxAge`
  - Stichtag konfigurierbar über `ruleSet.timing.cutoffMonth` und `ruleSet.timing.cutoffDay`.
- [ ] **Dynamische Ehrenamts-Erkennung:** Ehrenamts-Keywords aus `ruleSet.exemptions.honoraryKeywords` auslesen.

### Phase 3: Absicherung & Test-Suite (Tag 2)
- [ ] **Parity-Test erstellen:** Testdatei `src/utils/rulesParity.test.ts` schreiben, die alte vs. neue Berechnungslogik vergleicht.
- [ ] **Schema-Tests implementieren:** `src/utils/ruleValidation.test.ts` mit fehlerhaften/korrupten JSON-Payloads.
- [ ] **Szenario-Tests implementieren:** Tests für Beitragserhöhungen, veränderte Altersgrenzen und Sonderregeln schreiben.
- [ ] **Vollständigen Testdurchlauf durchführen:** Sicherstellen, dass alle bestehenden 71 Tests + alle neuen Tests fehlerfrei passieren (`npm test`).

### Phase 4: UI-Integration für Regel-Upload & A/B-Szenarien-Vergleich (Tag 3)
- [ ] **Multi-Profil-State in `App.tsx` anlegen:** Verwaltung eines Pools geladener Regelwerke (`availableRuleSets`), mit aktivem Berechnungsstand (`activeRuleSet`) und frei wählbarer Referenz (`baselineRuleSet`).
- [ ] **Parallele Berechnung im UI:** Gleichzeitige Ermittlung von `resultActive` und `resultBaseline` für Delta-Werte in Realzeit.
- [ ] **UI-Komponente `RuleManager` bauen:** Einbindung in den Header oder die FilterBar.
  - Selektor 1: *„Aktive Beitragsordnung (Ziel)“* (Dropdown aller geladenen Profile).
  - Selektor 2: *„Vergleichen mit (Referenz)“* (Dropdown zur freien Auswahl der Baseline).
  - Dateiupload (`.json`) für eigene Regeln mit Drag & Drop (fügt das Profil dem Pool hinzu).
  - Download-Button: *„Aktives Regelwerk herunterladen (.json)“*.
  - Reset-Button: *„Auf Vereinsstandard zurücksetzen“*.
- [ ] **Delta-Anzeige in den KPI-Karten & Tabelle:**
  - Gesamtsummen-Delta mit Farbmarkierung (z. B. `▲ +210,00 €`).
  - Spalte in der Zahler-Tabelle mit Einzeldeltas pro Zahlergruppe (z. B. `+10,00 €`).
- [ ] **Erweiterter Audit-Export:** Optionaler Download einer Vergleichs-CSV mit Delta-Spalten für Vorstandssitzungen und die Generalversammlung.
- [ ] **Benutzer-Feedback einbauen:** Sofortige Toast-Validierung bei Fehlern in hochgeladenen Dateien.

### Phase 5: Dokumentation & Abnahme (Tag 3 – 4)
- [ ] **Anleitung für Kassierer erstellen:** Kurzanleitung, wie man eine JSON-Datei im Editor anpasst.
- [ ] **Code-Review & Build-Prüfung:** `npm run build` und `npm test` zur finalen Verifikation.

---

## 9. Fazit & konkrete Empfehlung

Eine flexible Rules Engine für den Schalmeienzug Ingoldingen ist mit **überschaubarem Aufwand (ca. 2 bis 3 Entwicklertage)** hochgradig sauber und sicher realisierbar. 

### Die wichtigsten Kernpunkte auf einen Blick:
1. **Kein Risiko für den laufenden Betrieb:** Durch die Kapselung als optionaler Parameter (`ruleSet = DEFAULT_SZI_RULES`) bleibt die bestehende, erprobte Logik unangetastet.
2. **Volle Zukunftsfähigkeit:** Künftige Beitragsänderungen der Generalversammlung erfordern keine Softwareanpassung mehr, sondern nur den Upload einer kleinen JSON-Datei.
3. **Datenschutzkonform (DSGVO):** Alles verbleibt lokal im Browser des Kassiers.
4. **Ausgeklügelte Qualitätssicherung:** Parity-Tests stellen mathematisch sicher, dass heute berechnete Beiträge Cent für Cent identisch bleiben.
