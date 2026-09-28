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

---

## 2. Abgeschlossene Punkte
- [x] **Altersgrenze 25 Jahre (§ 2 Beitragsordnung):** Kinder ab 25 Jahren ohne eigene IBAN werden als Klärungsfall (Fehler) ausgewiesen – keine Abbuchung über Eltern.
- [x] **Ehrenamtsbefreiung (§ 1 Abs. 6):** Nur echte Ehrenämter (`Ehrenvorstand`, `Ehrenmitglied`, `Ehrendirigent`, `Ehrenamtsinhaber`) sind beitragsfrei (0 €). Reguläre Vorstandsämter (`1./2. Vorstand`, `Schriftführerin`, `Kassier`, `Beisitzer` etc.) zahlen regulären Beitrag.
- [x] **Gekündigte & verstorbene Mitglieder:** Separate Info-Darstellung (ohne Warnung) und kein Beitragseinzug (0,00 €).
- [x] **Datenschutz & Git-Historie:** Vollständige Bereinigung aller Echtdaten in den Beispieldatensätzen und Bereinigung der Git-Historie auf GitHub.
- [x] **Hosting:** Automatisierter GitHub Actions Workflow für GitHub Pages eingerichtet.
- [x] **Original-Wappen:** Vektorscharfe Extraktion aus offizieller Vorlage.

