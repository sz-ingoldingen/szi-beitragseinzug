# Offene Punkte & Architekturentscheidungen (TODO)

## 1. Offene Entscheidung: Behandlung von Kindern ab dem 25. Lebensjahr (§ 2 Beitragsordnung)

### Hintergrund
Gemäß § 2 der Beitragsordnung des Schalmeienzug Ingoldingen e.V.:
> *„Ab dem vollendeten 25. Lebensjahr fällt ein Kind aus der Regelung über den Familienbeitrag. Betroffene Personen werden über Änderung informiert.“*

### Aktueller technischer Stand (Status quo)
* **Hat das Kind eine eigene IBAN & SEPA-Mandat:**
  Das Kind wird automatisch als eigenständiger Zahler geführt und zahlt den regulären Einzelbeitrag (25 € aktiv / 12 € passiv) über das eigene Konto.
* **Hat das Kind KEINE eigene IBAN, aber Eltern/Zahler verknüpft:**
  Das Kind wird weiterhin der Zahlergruppe der Eltern zugeordnet. Da es das 25. Lebensjahr vollendet hat, greift die Familien-Kinderstaffel nicht mehr. Es wird als Erwachsener mit **25,00 € (aktiv)** bzw. **12,00 € (passiv)** berechnet. Diese Summe wird aktuell der Lastschrift der Eltern aufgeschlagen (z. B. 20 € Familienbasis + 10 € Partner + 25 € Kind $\ge$ 25 = 55,00 € Einzug vom Elternkonto).

### Zur Entscheidung stehende Optionen
* **Option A (Pragmatisch / Weiterhin über Elternkonto + Warn-Badge):**
  Der Erwachsenenbeitrag von 25 € bzw. 12 € wird wie bisher beim Familienzahler abgebucht, aber die Gruppe erhält im Dashboard eine deutliche gelbe Warnung:
  > ⚠️ *„Mitglied [Name] hat das 25. Lebensjahr vollendet (§ 2 Beitragsordnung) und wird als Erwachsener über das Elternkonto abgerechnet.“*
* **Option B (Strikte Trennung / Eigene Bankverbindung zwingend):**
  Kinder ab 25 Jahren dürfen nicht mehr über das Elternkonto abgebucht werden. Sie werden aus der Familie herausgelöst und erscheinen im Dashboard unter den *„Nicht zugeordneten Mitgliedern / Klärungsfällen“*:
  > ❌ *„Kind hat das 25. Lebensjahr vollendet – eigene IBAN & SEPA-Mandat erforderlich!“*
* **Option C (Kombination / Umschaltbar):**
  Standardmäßig Option A, aber mit einer Umschalt-Option / Checkbox in den Einstellungen für den Kassierer.

---

## 2. Abgeschlossene Punkte
- [x] **Ehrenamtsbefreiung (§ 1 Abs. 6):** Nur echte Ehrenämter (`Ehrenvorstand`, `Ehrenmitglied`, `Ehrendirigent`, `Ehrenamtsinhaber`) sind beitragsfrei (0 €). Reguläre Vorstandsämter (`1./2. Vorstand`, `Schriftführerin`, `Kassier`, `Beisitzer` etc.) zahlen regulären Beitrag.
- [x] **Datenschutz & Git-Historie:** Vollständige Bereinigung aller Echtdaten in den Beispieldatensätzen und Bereinigung der Git-Historie auf GitHub.
- [x] **Hosting:** Automatisierter GitHub Actions Workflow für GitHub Pages eingerichtet.
- [x] **Original-Wappen:** Vektorscharfe Extraktion aus offizieller Vorlage.
- [x] **Gekündigte & verstorbene Mitglieder:** Separate Info-Darstellung (ohne Warnung) und kein Beitragseinzug.
