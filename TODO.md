# Dokumentation & Architekturentscheidungen (TODO)

## 1. Getroffene Architekturentscheidungen

### Altersgrenze 25 Jahre (§ 2 Beitragsordnung) – Umgesetzt (Option B)
* **Entscheidung:**
  Mitglieder ab dem vollendeten 25. Lebensjahr (`alter >= 25`) ohne eigene IBAN dürfen **nicht** über das Elternkonto abgebucht werden.
  Sie werden automatisch aus dem Familienverbund herausgelöst und erscheinen im Dashboard als Fehler unter *„Nicht zugeordnete Mitglieder / Klärungsfälle“* mit dem Prüfhinweis:
  > ❌ *„Mitglied ist ≥ 25 Jahre alt ohne eigene IBAN (neue Mitgliedschaft erforderlich gem. § 2 Beitragsordnung).“*
* **Auswirkung:**
  * Kein unberechtigter Lastschrifteinzug von Elternkonten für erwachsene Kinder ab 25 Jahren.
  * Klare Nachvollziehbarkeit für den Kassierer im Prüfbericht (`Audit-CSV`) und Dashboard.
  * Besitzt das erwachsene Kind eine eigene IBAN und ein Mandat, wird es wie gewohnt als eigenständiger Zahler mit 25 € (aktiv) bzw. 12 € (passiv) veranlagt.

### Alleinstehende Familienzahler (keine Angehörigen mehr) – Umgesetzt (Automatische Umstellung)
* **Entscheidung:**
  Ist ein Mitglied als Familienzahler (`Familienbeitrag (Zahler) = 1`) erfasst, hat aber keine weiteren aktiven oder lebenden Angehörigen mehr (z. B. Partner/Kinder ausgetreten, verstorben oder Kind $\ge 25$), wird es **automatisch und ohne Fehlermeldung/Warnung** auf den regulären Einzelbeitrag umgestellt (25,00 € für Aktive, 12,00 € für Passive, 0,00 € für beitragsfreie Ehrenmitglieder).
* **Auswirkung:**
  * Kein manueller Eingriff durch den Kassierer erforderlich.
  * Keine unberechtigten oder störenden Warnungen im Dashboard.
  * Reibungsloser Einzug des korrekten Einzelbeitrags.

### Ehrenmitglieder im Familienverbund – Festlegung (G1 / G6)
* **Entscheidung:**
  Ehrenmitglieder und Träger von Ehrenämtern (§ 1 Abs. 6) fallen **immer** aus dem Familienbeitrag heraus und sind stets mit **0,00 €** beitragsfrei.
  War ein Ehrenmitglied als Familienzahler eingetragen, darf es nicht den 20 € Sockelbeitrag zahlen. Für die verbleibenden Familienangehörigen wird ein Prüfhinweis erzeugt, falls ein neuer Kontoinhaber/Zahler bestimmt werden muss.

### Fester Stichtag 15.04. für Altersberechnung & Einzugsdatum (G8)
* **Entscheidung:**
  Stichtag für sämtliche Altersberechnungen (Kind < 18 Jahre, Familienkind < 25 Jahre) ist der **15.04. des laufenden Beitragsjahres** (analog zum offiziellen Anmeldeformular).
  Wer erst nach dem 15.04. 18 bzw. 25 Jahre alt wird, zahlt im laufenden Beitragsjahr noch den günstigeren Satz. Der 15.04. fungiert zudem als Standard-Fälligkeits-/Einzugsdatum.

### Rechnungszahler via IBAN „Per Rechnung“ (L1)
* **Entscheidung:**
  Enthält das IBAN-Feld den Vermerk *„Per Rechnung“*, wird dies nicht als fehlerhafte IBAN gewertet, sondern das Mitglied wird als Rechnungszahler (Selbstzahler außerhalb SEPA) deklariert und aus dem SEPA-Lastschriftexport ausgeschlossen.

### Lebenspartner ohne eigene IBAN/Mandat (G3)
* **Entscheidung:**
  Für mitabgebuchte Lebenspartner ohne eigenes SEPA-Mandat bzw. eigene IBAN wird beim Zahler ein gelber Prüfhinweis (Warnung) erzeugt:
  > ⚠️ *„Lebenspartner [Name] wird über das Mandat von [Zahler] eingezogen – Stammdaten/Verknüpfung prüfen.“*
* **Auswirkung:**
  Der Kassierer behält bei Altdaten oder veränderten Lebensverhältnissen die volle Kontrolle und kann zweifelhafte Verknüpfungen gezielt verifizieren.

### Datenschutz & IBAN-Maskierung im UI (Schritt 4)
* **Entscheidung:**
  Umschaltbarer Datenschutz-Modus im UI (standardmäßig aktiviert):
  * IBANs werden maskiert dargestellt (z. B. `DE23 •••• •••• 7890`), um Bildschirmfreigaben, Vorstandspräsentationen und Screenshots zu schützen.
  * Per globalem Schalter („Datenschutz aktiv“) oder einzelnem Klick auf das Augensymbol kann jede IBAN im Bedarfsfall im Klartext aufgedeckt werden.
  * In den Bank- und Audit-CSV-Exporten verbleiben die IBANs selbstverständlich im Klartext.

### UI-Modularisierung (Schritt 6)
* **Entscheidung:**
  Aufteilung der ehemals monolithischen `App.tsx` (~1160 Zeilen) in spezialisierte, wartungsfreundliche Komponenten unter `src/components/`:
  * `Header.tsx`: Vereins-Header mit SZI-Wappen, 1985-Badge, SEPA-Badge und DSGVO-Hinweis.
  * `UploadCard.tsx`: Import-Kachel für CSV-Upload und Beispieldaten.
  * `KpiCards.tsx`: Interaktive Statistik-Kacheln für Einnahmen, Personen, Beitragsfreie und Prüfhinweise.
  * `FilterBar.tsx`: Suchfeld, Schnellfilter-Pills (Status/Tarif & Prüfung), Dateiname und SEPA-Verwendungszweck.
  * `UnassignedPanel.tsx`: Klärungsfälle (Mitglieder ohne Zahler/IBAN) mit interaktiver Tabelle & Suche.
  * `InactivePanel.tsx`: Inaktive Verbindungen (Gekündigte & Verstorbene) rein informativ mit Tabelle & Suche.
  * `PayerTable.tsx`: Zahlerliste mit Auswahl-Checkboxen, Datenschutz-IBAN-Maskierung und aufklappbaren Mitgliedsdetails.
  * `ExportBar.tsx`: Fixierte Fußleiste für Prüfbericht- und SEPA-CSV-Download.

---

## 2. Abgeschlossene Punkte
- [x] **Alleinstehende Familienzahler:** Automatische Umstellung auf regulären Einzelbeitrag (ohne Warnung).
- [x] **Altersgrenze 25 Jahre (§ 2 Beitragsordnung):** Kinder ab 25 Jahren ohne eigene IBAN werden als Klärungsfall (Fehler) ausgewiesen – keine Abbuchung über Eltern.
- [x] **Fester Stichtag 15.04. (G8):** Feste Stichtagslogik für Altersgrenzen (Kind < 18, Familie < 25) und Standard-Einzugsdatum implementiert.
- [x] **Ehrenmitglieder im Familienverbund (G1 / G6):** Ehrenmitglieder sind stets 0 € beitragsfrei und fallen aus dem Familienverbund heraus; Hinweis für verbleibende Familie erzeugt.
- [x] **Rechnungszahler (L1):** IBAN *„Per Rechnung“* als Selbstzahler erkannt, kein IBAN-Fehler, automatischer Ausschluss aus SEPA-Export & Filteroption im Dashboard.
- [x] **Lebenspartner-Prüfhinweis (G3):** Gelber Hinweis beim Zahler zur Verifikation von mitabgebuchten Partnern ohne eigenes Mandat.
- [x] **SEPA-Exportformat (G7):** 7-spaltige SEPA-CSV bestätigt; kein gesondertes SEPA-XML erforderlich.
- [x] **Datenschutz & IBAN-Maskierung:** Umschaltbarer Datenschutzmodus mit `maskIBAN()` und Einzelaufdeckung im UI.
- [x] **Keine Browser-Persistenz (DSGVO):** Bewusst rein flüchtige Verarbeitung im Arbeitsspeicher (kein LocalStorage).
- [x] **UI-Modularisierung:** Vollständige Aufteilung in 8 wiederverwendbare Komponenten unter `src/components/`.
- [x] **BOM-Zeichen & Encoding (G5):** UTF-8 BOM (`\uFEFF`) Stripping und automatische Kodierungserkennung (ArrayBuffer mit UTF-8 & ISO-8859-1 Fallback).
- [x] **Stammdaten-Warnung Status Kind (L6):** Prüfhinweis bei Mitgliedern mit Status `child`, die zum Stichtag 15.04. bereits $\ge 18$ Jahre alt sind.
- [x] **Internationale IBANs (F3):** Internationaler MOD 97-Check, Warnung statt Fehler bei Nicht-DE-IBANs.
- [x] **Ehrenamtsbefreiung (§ 1 Abs. 6):** Nur echte Ehrenämter (`Ehrenvorstand`, `Ehrenmitglied`, `Ehrendirigent`, `Ehrenamtsinhaber`) sind beitragsfrei (0 €). Reguläre Vorstandsämter (`1./2. Vorstand`, `Schriftführerin`, `Kassier`, `Beisitzer` etc.) zahlen regulären Beitrag.
- [x] **Gekündigte & verstorbene Mitglieder:** Separate Info-Darstellung (ohne Warnung) und kein Beitragseinzug (0,00 €).
- [x] **Datenschutz & Git-Historie:** Vollständige Bereinigung aller Echtdaten in den Beispieldatensätzen und Bereinigung der Git-Historie auf GitHub.
- [x] **Hosting:** Automatisierter GitHub Actions Workflow für GitHub Pages eingerichtet.
- [x] **Filterleisten-Optimierung:** Strukturierte Kategorisierung (Status, Tarif, Zahlweg „Per Rechnung“) und dedizierte Prüfungs-Zeile mit Treffer-Counter verhindert Zeilenumbrüche und Layout-Verschiebungen.
- [x] **Original-Wappen:** Vektorscharfe Extraktion aus offizieller Vorlage.




