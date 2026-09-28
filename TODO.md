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

### Alleinstehende Familienzahler (keine Angehörigen mehr) – Umgesetzt
* **Entscheidung:**
  Ist ein Mitglied als Familienzahler (`Familienbeitrag (Zahler) = 1`) erfasst, hat aber keine weiteren aktiven Angehörigen mehr (z. B. Partner/Kinder ausgetreten, verstorben oder Kind $\ge 25$), wird vorerst weiterhin der bestehende Familienbeitrag (20,00 €) eingezogen, aber es wird ein deutlicher **Prüfhinweis (Warnung)** erzeugt:
  > ⚠️ *„Alleinstehender Familienzahler: Keine weiteren Familienangehörigen zugeordnet. Umstellung auf regulären Einzelbeitrag (25,00 € (aktiv) / 12,00 € (passiv)) und neue Mitgliedschaft erforderlich.“*
* **Auswirkung:**
  * Der Kassierer wird im Dashboard und Prüfbericht sofort gewarnt, dass der Status bereinigt und ein neuer Mitgliedsantrag für den Einzelbeitrag eingeholt werden muss.

---

## 2. Abgeschlossene Punkte
- [x] **Alleinstehende Familienzahler:** Erkennung und Prüfhinweis (Warnung) zur Umstellung auf Einzelbeitrag.
- [x] **Altersgrenze 25 Jahre (§ 2 Beitragsordnung):** Kinder ab 25 Jahren ohne eigene IBAN werden als Klärungsfall (Fehler) ausgewiesen – keine Abbuchung über Eltern.
- [x] **Ehrenamtsbefreiung (§ 1 Abs. 6):** Nur echte Ehrenämter (`Ehrenvorstand`, `Ehrenmitglied`, `Ehrendirigent`, `Ehrenamtsinhaber`) sind beitragsfrei (0 €). Reguläre Vorstandsämter (`1./2. Vorstand`, `Schriftführerin`, `Kassier`, `Beisitzer` etc.) zahlen regulären Beitrag.
- [x] **Gekündigte & verstorbene Mitglieder:** Separate Info-Darstellung (ohne Warnung) und kein Beitragseinzug (0,00 €).
- [x] **Datenschutz & Git-Historie:** Vollständige Bereinigung aller Echtdaten in den Beispieldatensätzen und Bereinigung der Git-Historie auf GitHub.
- [x] **Hosting:** Automatisierter GitHub Actions Workflow für GitHub Pages eingerichtet.
- [x] **Original-Wappen:** Vektorscharfe Extraktion aus offizieller Vorlage.


