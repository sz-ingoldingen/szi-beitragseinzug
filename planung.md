# Fach- und Umsetzungskonzept: SEPA-Beitragseinzug (SZI)

Dieses Dokument beschreibt die Anforderungen, Geschäftslogik und technische Umsetzung der Webanwendung zur Beitragsberechnung und SEPA-Dateierstellung für den Schalmeienzug Ingoldingen e.V.

---

## 1. Übersicht & Zielsetzung
- **Ziel**: Ein webbasiertes Werkzeug zur automatisierten Beitragsberechnung auf Basis eines Mitglieder-CSV-Exports und Erzeugung von SEPA-Einzugsdaten (CSV / XML).
- **Zentrale Herausforderungen**:
  - Korrekte Zuordnung von Zahlern und Mitbezahlten (Mehrfachzahler, Familienverbünde).
  - Berechnung der Beträge gemäß Beitragsordnung 2025.
  - Plausibilitätsprüfung (fehlende IBAN, Mandatsdaten, Volljährigkeit/Altersgrenzen).
  - Flexible Filter- und Kontrollmöglichkeiten vor dem Export.

---

## 2. Eingangsdaten (CSV-Schnittstelle)
Folgende Spalten sind im Mitglieder-Export vorhanden:
1. `Mitgliedsnummer`
2. `Reihenfolge`
3. `Eintrittsjahr (Import)`
4. `Aktiv seit (Import)`
5. `Passiv seit (Import)`
6. `Ausgetreten seit (Import)`
7. `Status`
8. `Nachname`
9. `Vorname`
10. `Straße & Nr`
11. `PLZ & Ort`
12. `Geburtsdatum`
13. `Telefonnummer`
14. `Handynummer`
15. `Email`
16. `Email (offiziell)`
17. `Eintrittsdatum`
18. `Laufnummer(n)`
19. `Funktion Vorstandschaft`
20. `Funktion im Verein`
21. `Sonstige Funktion`
22. `Kontoinhaber`
23. `IBAN`
24. `BIC`
25. `SEPA-Mandat`
26. `Unterschriftsdatum`
27. `Elternteil` (1)
28. `Elternteil` (2)
29. `Lebenspartner`
30. `Mitglied ist Senior`
31. `Vom Arbeitsdienst befreit`
32. `Maskengruppe`
33. `Maskengruppe (Schlüssel)`
34. `Tanzgruppe`
35. `Tanzgruppe (Schlüssel)`
36. `Familienbeitrag (Zahler)`
37. `Familienbeitrag`
38. `Mitglied im Förderverein`
39. `Custom Badge 4`
40. `Custom Badge 5`
41. `Scan-ID`
42. `Kommentar`
43. `Kommentar (App)`
44. `Kommentar (Häs)`

---

## 3. Beitragslogik & Status-Definitionen

### Mögliche Werte im Feld `Status`:
| Status | Bedeutung | Vorläufige Beitragsregel |
| :--- | :--- | :--- |
| `active` | Aktives Mitglied | 25 € (bzw. 10 € im Familienverbund) |
| `passive` | Passives Mitglied | 12 € |
| `child` | Kind | 0 € (unter 18 Jahren beitragsfrei) |
| `pkid` | Kind (Passiv / Partner?) | *Noch zu klären* |
| `sponsor` | Förderer / Sponsor | *Noch zu klären* (z.B. Beitrag Förderverein?) |
| `resigned` | Ausgetreten | Kein Einzug (0 €) |
| `deceased` | Verstorben | Kein Einzug (0 €) |

### Beitragsordnung (SZI 05.04.2025):
- **Erwachsene aktiv**: 25 €
- **Erwachsene passiv**: 12 €
- **Kinder / Jugendliche (< 18 J.)**: 0 €
- **Familienbeitrag**:
  - Zahler: 20 €
  - Aktiver Partner / Ehepartner: 10 €
  - 1. aktives Kind (< 25 J.): 10 €
  - Ab 2. aktivem Kind (< 25 J.): beitragsfrei (0 €)
- **Ehrenmitglieder / Träger Ehrenamt**: beitragsfrei (§ 1 Abs. 6)

---

## 4. Zahler-Gruppierung & Beziehungslogik

### Erkenntnisse aus den Echtdaten:
1. **Zahler-Identifikation:**
   - Der tatsächliche Zahler besitzt eine gültige **`IBAN`** und ein echtes **`SEPA-Mandat`** (nicht leer und nicht `"n.a."`).
   - Bei mitbezahlten Mitgliedern ist die `IBAN` leer und das `SEPA-Mandat` oft leer oder `"n.a."`.
   - Bei allen Mitgliedern einer Zahlungsgemeinschaft ist das Feld **`Kontoinhaber`** identisch mit dem Namen des Zahlers (z.B. `"Mustermann, Max"` bzw. `"Mustername, Mann"`).
2. **Beziehungs-Graphen:**
   - `Lebenspartner` verweist auf die `Mitgliedsnummer` des Partners (gegenseitig).
   - `Elternteil` (1 & 2) verweist auf die `Mitgliedsnummer` der Eltern.
   - Die Kennzeichen `Familienbeitrag (Zahler)` und `Familienbeitrag` sind nicht in allen Datensätzen gepflegt (teils `0`, teils `1`).
3. **Gruppenbildungs-Algorithmus:**
   - **Schritt 1 (Zahler finden):** Alle Mitglieder mit befüllter `IBAN` und gültigem `SEPA-Mandat` (≠ `"n.a."`) werden als Zahler identifiziert.
   - **Schritt 2 (Mitglieder zuordnen):** Mitglieder ohne eigene IBAN werden dem Zahler zugeordnet über:
     - Übereinstimmung im Feld `Kontoinhaber` **UND / ODER**
     - Verknüpfung über `Lebenspartner` bzw. `Elternteil`.
   - **Schritt 3 (Prüfung & Warnung):** Mitglieder ohne IBAN, die keinem Zahler zugeordnet werden können, werden im Prüfprotokoll als Fehler ("Kein Zahler gefunden / fehlende Bankdaten") gemeldet.

---

## 5. Beitragsberechnung im Detail

### Bestätigte Referenz-Fälle:
- **Gruppe 1 (Mustermann) $\rightarrow$ 30,00 €:**
  - Max (Zahler, aktiv): **20,00 €** (Familienbeitrag als Zahler)
  - Musterfrau (Partnerin, aktiv): **10,00 €** (Aktive Partnerin)
  - Kind 1 (aktiv, 24 J., Vorstand/Schriftführerin): **0,00 €** (beitragsfrei gem. § 1 Abs. 6 Beitragsordnung)
  - Kind 2 (Status `child`, 16 J.): **0,00 €** (unter 18 Jahren beitragsfrei)
  - *Summe:* **30,00 €**

- **Gruppe 2 (Mustername) $\rightarrow$ 30,00 €:**
  - Mann (Zahler, passiv): **20,00 €** (Familienbeitrag als Zahler)
  - Frau (Partnerin, aktiv, Beisitzerin): **10,00 €** (Aktive Partnerin)
  - Kind 2 (passiv, 21 J., Kind < 25 J.): **0,00 €** (im Familienbeitrag enthalten)
  - Kind 1 (Status `resigned`): **0,00 €** (Ausgetreten, kein Einzug)
  - *Summe:* **30,00 €**

### Berechnungsregeln zusammengefasst:
1. **Einzelzahler (keine Familie/Gruppe):**
   - Erwachsener aktiv: **25,00 €**
   - Erwachsener passiv: **12,00 €**
   - Kind / Jugendlicher (< 18 J. oder Status `child`): **0,00 €**
   - Status `resigned` oder `deceased`: **0,00 €**
2. **Familienverband (mehrere Personen):**
   - Sockelbeitrag Hauptzahler: **20,00 €** (unabhängig ob Zahler aktiv oder passiv ist)
   - Aktiver Partner: **+10,00 €**
   - 1. aktives Kind (< 25 Jahre): **+10,00 €** (sofern nicht durch Ehrenamt beitragsfrei)
   - Ab 2. aktivem Kind (< 25 Jahre): **0,00 €**
   - Passive Kinder (< 25 Jahre) & alle Kinder < 18 Jahre: **0,00 €**
3. **Ehrenamt / Vorstandsamt (§ 1 Abs. 6):**
   - Personen mit Vorstandstätigkeit (z.B. Schriftführerin, Beisitzer etc.) sind für ihren individuellen Beitrag beitragsfrei (**0,00 €**).
4. **Mindesteinzug:**
   - Beträge von **0,00 €** werden nicht in die finale SEPA-CSV exportiert.



---

## 6. Validierung & Plausibilitätsprüfungen
Die Webanwendung führt beim Import automatisch folgende Prüfungen durch und markiert Datensätze mit entsprechenden Status-Badges (Grün / Gelb / Rot):

1. **Bankdaten-Validierung:**
   - **IBAN-Prüfziffer:** Syntax- und Prüfziffernvalidierung nach ISO 7064 (MOD 97-10) für alle Zahler-IBANs.
   - **SEPA-Mandat:** Prüfung, ob beim Zahler eine Mandatsreferenz hinterlegt ist (nicht leer, nicht `"n.a."`).
   - **Unterschriftsdatum:** Warnung, falls das Datum der Mandatserteilung fehlt.
2. **Zuordnungs-Prüfung:**
   - **Fehlender Zahler:** Beitragspflichtige Mitglieder (Status `active`, `passive`), die weder eine eigene IBAN haben noch einem Zahler zugeordnet werden konnten.
   - **Mehrdeutigkeiten:** Mehrere Personen mit identischem Namen als `Kontoinhaber`.
3. **Alters- & Stammdatenprüfung:**
   - Fehlendes oder unlesbares Geburtsdatum.
   - Diskrepanz: Status `child`, aber Person bereits $\ge$ 18 Jahre.

---

## 7. Filter-, Vorschau- & Kontrollfunktionen vor Export
Bevor die finale Datei erzeugt wird, bietet die Oberfläche eine übersichtliche Kontrollansicht:

1. **Filteroptionen:**
   - **Status-Filter:**
     - Alle
     - Nur Aktive (Zahler mit mindestens einem aktiven Mitglied)
     - Nur Passive (Zahler ausschließlich passiver Mitglieder)
   - **Prüfstatus-Filter:**
     - Nur fehlerfreie Datensätze (bereit für SEPA-Export)
     - Nur fehlerhafte / unvollständige Datensätze (zur Klärung)
   - **Sparten-Filter:** Nach `Maskengruppe` bzw. `Tanzgruppe`.
2. **Interaktive Vorschau-Tabelle:**
   - Liste aller Zahler mit:
     - Name des Kontoinhabers
     - IBAN (maskiert z.B. `DE14...8888` mit Tooltip)
     - Berechneter Gesamtbetrag (€)
     - Aufklappbare Detailansicht ("Accordion"): Zeigt alle dem Zahler zugeordneten Personen inkl. Alter, Status, Einzelfunktion und Einzelbeitrag.
   - **Individuelle Checkbox je Zahler:** Möglichkeit, einzelne Zahler per Häkchen vom aktuellen Einzugslauf auszuschließen.
   - **Kompakter Hinweisblock für nicht zugeordnete Mitglieder:** Standardmäßig eingeklappt, mit Klick aufklappbar, enthaltener Volltextsuche und scrollbarer Kompakttabelle (bleibt auch bei Hunderten Datensätzen schlank).
   - **KPI-Zusammenfassung:** Gesamteinzugssumme (€), Anzahl Lastschriften, Anzahl beitragsfreier Mitglieder, Anzahl offener Fehler.

---

## 8. Export-Spezifikation (SEPA CSV & Prüfbericht)

### A. SEPA-CSV (für die Bank)
Semikolon-separiert, genau 7 Spalten:
1. `Kontoinhaber`
2. `IBAN`
3. `BIC`
4. `Mandatsreferenz-Nummer`
5. `Unterschriftsdatum`
6. `Verwendungszweck` (`Mitgliedsbeitrag Schalmeienzug Ingoldingen e.V`)
7. `Betrag` (Dezimalformat `XX,XX`)

### B. Prüf- & Kontrollbericht (CSV / Excel)
Ein detaillierter Nachweis für den Vereinskassierer:
- Enthält jedes Mitglied mit Mitgliedsnummer, Name, Status, zugeordnetem Zahler, errechnetem Einzelbeitrag und Begründung (z.B. "Familienbeitrag Zahler", "Kind < 18 frei", "Vorstand beitragsfrei").

---

## 9. Technische Architektur & Stack
- **Datenschutz & Sicherheit (Privacy by Design):**
  - **100% Client-Side im Browser:** Bankdaten (IBAN, Mandate) und sensible Mitgliederdaten verlassen zu keinem Zeitpunkt den Rechner des Benutzers. Es werden keine Daten an externe Server übertragen (vollständige DSGVO-Konformität).
- **Technologie:**
  - **React 19 + TypeScript + Vite** (strikte Typisierung aller Mitglieder-, Zahler- und Beitragsstrukturen, maximale Zuverlässigkeit, blitzschnelles Bundling).
  - **Corporate Design (Schalmeienzug Ingoldingen e.V. - Original-Wappen):**
    - Vektorscharfes Original-Wappen (`szi_wappen.svg` / `szi_wappen.png`, oberer Teil aus `schalmei_wappen25.pdf`) integriert.
    - Primärfarbe: `#9565C8` / `#AC8AD7` (SZI-Violett / Flieder aus Wappen-Banner und Rand).
    - Gold-Akzent: `#EFC415` / `#CCA512` (Glänzender Goldton aus dem "SZI"-Schriftzug und den Sternen/Kreuzen).
    - Basisfarbe: `#261420` (Tiefes Nacht-Schwarz/Aubergine aus dem Wappengrund).
    - Helle Hintergründe & Rahmen: `#F7F3FB` / `#DFD0F2` (Dezente Violett-Nuancen für Badges und Kontraste).
  - **Tailwind CSS** mit SZI-Wappen-Palette für ein modernes, harmonisches Vereins-Dashboard.
  - **Lucide React** für aussagekräftige Icons (Upload, Download, Status-Badges, Filter, Accordion).
  - **PapaParse** für robustes CSV-Parsing und -Generierung (Trennzeichen-Erkennung, Quoting).
  - Client-seitige IBAN-Prüfung nach MOD 97-10.
- **Verteilung / Betrieb:**
  - Kann lokal gestartet werden oder über ein einfaches Web-Hosting / GitHub Pages bereitgestellt werden. Keine Datenbank oder Backend-Infrastruktur erforderlich.
