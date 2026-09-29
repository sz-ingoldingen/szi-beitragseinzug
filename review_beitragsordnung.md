# 🔍 Code-Review: SZI SEPA-Beitragseinzug vs. Beitragsordnung (05.04.2025)

**Datum:** 29.09.2026  
**Reviewer:** Antigravity Code Review  
**Scope:** [sepaCalculator.ts](file:///home/jochen/dev/szi/src/utils/sepaCalculator.ts), [App.tsx](file:///home/jochen/dev/szi/src/App.tsx), [Tests](file:///home/jochen/dev/szi/src/utils/sepaCalculator.test.ts) vs. [Beitragsordnung](file:///home/jochen/dev/szi/SZI_Beitragsordnung.pdf)  
**Teststatus:** ✅ 50/50 Tests bestanden

---

## Zusammenfassung

Der Code bildet die Beitragsordnung (05.04.2025) sowie alle Vorstandsvorgaben präzise ab. Alle wesentlichen tariflichen und prozessualen Anforderungen (u. a. ClubDesk-Status-Codes, Ehrenamtsregelung, Stichtag 15.04., Rechnungszahler und IBAN-Prüfungen) wurden umgesetzt und mit 50 Unit-Tests abgesichert.

---

## ✅ Korrekt umgesetzt (Beitragsordnung §§ 1–4 & Vorstandsbeschlüsse)

| Regelung | § | Status |
|---|---|---|
| Erwachsene aktiv = 25 € | § 2 | ✅ |
| Erwachsene passiv = 12 € | § 2 | ✅ |
| Familienbeitrag Zahler = 20 € (Sockelbeitrag) | § 2 | ✅ |
| Aktiver Partner/Ehepartner = 10 € | § 2 | ✅ |
| Passiver Lebenspartner im Familienverbund (im 20 € Sockel abgedeckt) | § 2 | ✅ |
| 1\. aktives Kind < 25 = 10 € | § 2 | ✅ |
| Ab 2\. aktivem Kind < 25 = 0 € | § 2 | ✅ |
| Passives Kind < 25 im Familienverbund (im 20 € Sockel abgedeckt) | § 2 | ✅ |
| Kinder/Jugendliche < 18 = 0 € | § 2 | ✅ |
| Altersgrenze 25 Jahre (Kind fällt raus, Klärungsfall ohne IBAN) | § 2 Fußnote | ✅ |
| Alleinstehende Familienzahler (automatische Umstellung auf 25 € / 12 € / 0 € Einzelbeitrag ohne Warnung) | — | ✅ |
| Fester Stichtag 15.04. für Altersberechnungen (U18, U25) & Einzugsdatum | § 1.2 | ✅ |
| Ehrenmitglieder & Ehrenämter stets beitragsfrei (0 € gem. § 1 Abs. 6) | § 1.6 | ✅ |
| Ehrenmitglieder fallen aus Familienbeitrag heraus (Zahler & Angehörige) mit Klärungshinweis | § 1.6 | ✅ |
| Status `sponsor` als Ehrenmitglied (§ 1 Abs. 6) beitragsfrei (0 €) | § 1.6 | ✅ |
| Alle 26 ClubDesk-Status-Codes typisiert und zugeordnet (inkl. `pkid` als Passiv Kind) | — | ✅ |
| Rechnungszahler (IBAN *„Per Rechnung“* als Selbstzahler, kein IBAN-Fehler, Ausschluss aus SEPA) | § 1.4 | ✅ |
| Warnung bei Status `child` / `pkid` mit Alter $\ge 18$ zum Stichtag 15.04. | — | ✅ |
| Internationale IBANs (MOD 97) mit Warnung statt Fehler bei Nicht-DE-Konten | — | ✅ |
| Keine Aufnahmegebühr | § 1.1 / § 3 | ✅ (nicht relevant, da kein Code nötig) |
| SEPA-Einzugsverfahren | § 1.3 | ✅ |
| Gekündigte / Verstorbene = 0 € (ohne Warnung) | — | ✅ |

---

## 🔵 Grenzfälle / Edge Cases & Hinweise

### G1 & G6: Ehrenmitglieder im Familienverbund (Umgesetzt)

> **Regel:** Ehrenmitglieder fallen **immer** aus der Familie heraus und zahlen stets **0,00 €** (§ 1 Abs. 6).
> Ist ein Ehrenmitglied als Familienzahler hinterlegt, wird es herausgelöst. Für die restliche Familie wird ein Hinweis erzeugt, falls ein neuer Zahler benannt werden muss.

---

### G2: Reihenfolge der Kinder bei Mehrfach-Kindern (Geklärt)

> **Regel:** Es geht um die **Anzahl aktiver Kinder zum Stichtag**. Gibt es $\ge 1$ aktives Kind unter 25, fällt genau einmal der Zuschlag von 10 € an. Die Gesamtsumme der Familie ist somit stets identisch.

---

### G3: Lebenspartner ohne eigene IBAN (Historische Datenbasis)

> **Hinweis:** Verknüpfungen stammen teils aus Altdaten-Imports und können ungenau sein. Ein Prüfhinweis bei mitabgebuchten Partnern ohne eigenes Mandat bleibt als Kontrollhilfe sinnvoll.

---

### G4: Duplikat-Erkennung bei gleicher Mitgliedsnummer (Erledigt)

> **Status:** Serverseitig durch ClubDesk bereits ausgeschlossen; keine Duplikate in den Exportdaten möglich.

---

### G5: BOM-Zeichen (UTF-8 BOM) im CSV-Import

BOM-Zeichen (`\uFEFF`) beim Import automatisch am Zeilenanfang strippen, falls CSVs mit UTF-8 BOM exportiert werden.

---

### G7: SEPA-XML vs. SEPA-CSV (Geklärt)

> **Entscheidung:** Die 7-spaltige SEPA-CSV wird von der Hausbank/Software direkt verarbeitet. Ein SEPA-XML (`pain.008`) ist nicht erforderlich.

---

### G8: Stichtag 15.04. für Altersberechnung & Fälligkeit (Umgesetzt)

> **Regel:** Fester Stichtag für alle Altersgrenzen (U18, U25) ist der **15.04.** (analog zum Anmeldeformular). Wer nach dem 15.04. Geburtstag hat, bleibt für das laufende Jahr in der günstigeren Beitragsgruppe. Der 15.04. dient zudem als Standard-Einzugsdatum.

---

## 📝 TODO-Liste

### Abgeschlossen
- [x] **Stichtagslogik 15.04. (G8):** Altersberechnung (Kind < 18, Kind < 25) und Einzugsdatum fest auf den 15.04. des Beitragsjahres gelegt.
- [x] **Ehrenmitglieder aus Familie herauslösen (G1 / G6):** Ehrenmitglied zahlt immer 0 €, Familie erhält Hinweis wenn Zahler Ehrenmitglied ist.
- [x] **Rechnungszahler erkennen (L1):** IBAN *„Per Rechnung“* als Rechnungszahler geführt, kein Fehler, vom SEPA-Export ausgeschlossen und Filterbutton im Dashboard.
- [x] **Lebenspartner-Prüfhinweis (G3 / TODO-1):** Gelber Prüfhinweis beim Zahler für mitabgebuchte Partner ohne eigenes Mandat.
- [x] **BOM-Zeichen & Encoding (G5 / TODO-2):** BOM-Stripping (`\uFEFF`) und ArrayBuffer-Kodierungserkennung (UTF-8 / ISO-8859-1).
- [x] **Warnung Status `child` (L6):** Warnung erzeugen, wenn `status === 'child'` / `pkid`, aber Alter zum 15.04. bereits $\ge 18$ Jahre ist.
- [x] **Nicht-deutsche IBANs (F3):** Internationaler MOD 97-Check, Warnung statt Fehler bei Nicht-DE-IBANs.
- [x] **SEPA-Exportformat (G7 / TODO-3):** 7-spaltige SEPA-CSV als Standard festgelegt; kein SEPA-XML pain.008 notwendig.

### Offene Punkte
*Alle fachlichen TODOs aus dem Beitragsordnungs-Review sind erfolgreich abgeschlossen.*

---

## Architektur-Anmerkungen

1. **UI-Modularisierung:** ✅ Vollständig umgesetzt (`Header`, `UploadCard`, `KpiCards`, `FilterBar`, `UnassignedPanel`, `InactivePanel`, `PayerTable`, `ExportBar` unter `src/components/`).
2. **Keine Persistenz (DSGVO-Entscheidung):** ✅ Bestätigt: Keine Speicherung im Browser-LocalStorage; flüchtige RAM-Verarbeitung schützt sensible Bank- und Mitgliedsdaten.
3. **Datenschutz & IBAN-Maskierung im UI:** ✅ Umgesetzt (Datenschutzmodus mit Maskierung `DE23 •••• •••• 7890` und Einzelaufdeckung).
4. **Export-Auswahl:** Filterleiste bietet Status-, Gültigkeits- und Textfilter; automatische Selektion beschränkt sich korrekt auf valide Lastschriften > 0 € (ohne Rechnungszahler).
