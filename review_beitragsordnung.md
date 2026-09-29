# 🔍 Code-Review: SZI SEPA-Beitragseinzug vs. Beitragsordnung (05.04.2025)

**Datum:** 29.09.2026  
**Reviewer:** Antigravity Code Review  
**Scope:** [sepaCalculator.ts](file:///home/jochen/dev/szi/src/utils/sepaCalculator.ts), [App.tsx](file:///home/jochen/dev/szi/src/App.tsx), [Tests](file:///home/jochen/dev/szi/src/utils/sepaCalculator.test.ts) vs. [Beitragsordnung](file:///home/jochen/dev/szi/SZI_Beitragsordnung.pdf)  
**Teststatus:** ✅ 22/22 Tests bestanden

---

## Zusammenfassung

Der Code bildet die Kernfälle der Beitragsordnung weitgehend korrekt ab. Es gibt jedoch **6 echte Lücken**, **3 potenzielle Fehler** und **8 ungeklärte Grenzfälle**, die behoben oder bewusst entschieden werden müssen.

---

## ✅ Korrekt umgesetzt (Beitragsordnung §§ 1–4)

| Regelung | § | Status |
|---|---|---|
| Erwachsene aktiv = 25 € | § 2 | ✅ |
| Erwachsene passiv = 12 € | § 2 | ✅ |
| Familienbeitrag Zahler = 20 € | § 2 | ✅ |
| Aktiver Partner/Ehepartner = 10 € | § 2 | ✅ |
| 1\. aktives Kind < 25 = 10 € | § 2 | ✅ |
| Ab 2\. aktivem Kind < 25 = 0 € | § 2 | ✅ |
| Kinder/Jugendliche < 18 = 0 € | § 2 | ✅ |
| Altersgrenze 25 Jahre (Kind fällt raus) | § 2 Fußnote | ✅ |
| Keine Aufnahmegebühr | § 1.1 / § 3 | ✅ (nicht relevant, da kein Code nötig) |
| Ehrenmitglieder beitragsfrei | § 1.6 | ✅ |
| SEPA-Einzugsverfahren | § 1.3 | ✅ |
| Gekündigte / Verstorbene = 0 € | — | ✅ |
| Alleinstehende Familienzahler-Warnung | — | ✅ |

---

## 🔴 Fehler (Bugs / fehlerhafte Logik)

### F1: Familienbeitrag-Zahler zahlt immer 20 €, unabhängig von aktiv/passiv

> **§ 2 Beitragsordnung** definiert den Familienbeitrag als Zahler = **20 €**. Das ist korrekt implementiert. **ABER:** Die Beitragsordnung unterscheidet bei der *Basiskategorisierung* zwischen „Erwachsene aktiv" (25 €) und „Erwachsene passiv" (12 €). Ein passiver Familienzahler (z.B. Mustername Mann, passiv) zahlt im Code trotzdem 20 €.

**Bewertung:** Wahrscheinlich **gewollt** – die Beitragsordnung listet den Familienbeitrag explizit als 20 € auf ohne aktiv/passiv-Differenzierung. Aber das sollte **dokumentiert** werden, denn es ist ein höherer Betrag als der passive Einzelbeitrag.

> [!IMPORTANT]
> **Klärung nötig:** Ist es korrekt, dass ein passiver Familienzahler 20 € zahlt statt 12 €? Wenn ja, sollte das in der Planung/Doku explizit festgehalten werden (aktuell fehlt die explizite Begründung).

**Datei:** [sepaCalculator.ts#L499](file:///home/jochen/dev/szi/src/utils/sepaCalculator.ts#L499)

---

### F2: Passiver Lebenspartner im Familienverbund = 0 €, aber woher?

Im Code wird ein passiver Lebenspartner mit `0,00 €` und der Begründung *„Passiver Lebenspartner (im Familienbeitrag abgedeckt)"* berechnet:

```typescript
// sepaCalculator.ts, L533-535
} else {
  fee = 0.0;
  reason = 'Passiver Lebenspartner (im Familienbeitrag abgedeckt)';
}
```

**§ 2 Beitragsordnung** sagt:
- Aktive Partner / Ehepartner / 1. Kind = **je 10 €**

Es steht **nirgends**, dass ein passiver Partner beitragsfrei ist. Das Wort „Aktive" bezieht sich auf den Beitragssatz, aber es gibt keinen Eintrag „Passiver Partner = 0 €" in der Verordnung.

> [!WARNING]
> **Möglicher Fehler:** Müsste ein passiver Partner im Familienverbund nicht 12 € zahlen (regulärer passiver Beitrag) oder zumindest eine Entscheidung dokumentiert werden? Die Beitragsordnung schweigt dazu.

**Datei:** [sepaCalculator.ts#L533-L536](file:///home/jochen/dev/szi/src/utils/sepaCalculator.ts#L533-L536)

---

### F3: IBAN-Validierung nur für deutsche IBANs (DE)

```typescript
// sepaCalculator.ts, L76
if (!clean.startsWith('DE') || clean.length !== 22) return false;
```

Die Validierung lehnt alle nicht-deutschen IBANs ab. Falls ein Mitglied ein österreichisches oder Schweizer Konto hat (z.B. grenznahe Region), würde die IBAN als ungültig markiert, obwohl sie korrekt ist.

> [!NOTE]
> **Niedrige Priorität**, aber ein `errors.push('Ungültige IBAN')` bei einer korrekten AT/CH-IBAN wäre irreführend. Empfehlung: Warnung statt Fehler bei Nicht-DE-IBANs, oder internationales MOD97 unterstützen.

**Datei:** [sepaCalculator.ts#L72-L92](file:///home/jochen/dev/szi/src/utils/sepaCalculator.ts#L72-L92)

---

## 🟡 Lücken (fehlende Umsetzung laut Beitragsordnung)

### L1: § 1.4 – Rechnungsstellungsgebühr 5 € fehlt komplett

> **§ 1 Abs. 4:** *„Bei notwendiger Rechnungsstellung werden 5 € erhoben."*

Im gesamten Code gibt es keine Möglichkeit, einem Mitglied eine Rechnungsstellungsgebühr von 5 € aufzuschlagen. Es gibt kein Flag oder Feld dafür.

**TODO:** Entscheidung treffen:
- Option A: Neues Checkbox-Flag in der CSV oder im UI, um für einzelne Zahler +5 € Rechnungsgebühr aufzuschlagen.
- Option B: Bewusst ignorieren und dokumentieren, dass Rechnungsstellung manuell außerhalb der App erfolgt.

---

### L2: § 1.5 – Stundung / Erlass / Ermäßigung nicht abgebildet

> **§ 1 Abs. 5:** *„Gerät ein Mitglied in eine wirtschaftliche Notlage, kann der Vorstand von sich aus oder auf Antrag den Mitgliedsbeitrag stunden, erlassen oder ermäßigen."*

Es gibt keine Möglichkeit, individuelle Beitragsreduzierungen zu erfassen. Ein Mitglied mit gestundetem Beitrag würde trotzdem mit dem vollen Betrag in die SEPA-Datei wandern.

**TODO:** Entscheidung treffen:
- Option A: CSV-Feld „Beitragsbefreiung" / „Ermäßigung" einführen oder im Kommentarfeld parsen.
- Option B: Solche Mitglieder manuell per Checkbox vor Export ausschließen (bereits möglich!) und das dokumentieren.

---

### L3: § 4 – Kaution (100 €) nicht berücksichtigt

> **§ 4:** *„Die Kaution beläuft sich auf 100 € pauschal. Diese wird nicht verzinst."*

Die Kaution wird im gesamten Code ignoriert. Es ist unklar, ob die Kaution beim Eintritt per SEPA eingezogen werden soll oder separat.

**TODO:** Klären, ob die Kaution:
- beim Ersteinzug automatisch zum Beitrag addiert werden soll,
- als separater Einzug erfolgen soll,
- oder gar nicht über die App läuft (manuell / Barzahlung).

---

### L4: Status `pkid` und `sponsor` – keine Beitragsregel definiert

In [planung.md](file:///home/jochen/dev/szi/planung.md#L74-L75) stehen die Status `pkid` und `sponsor` als *„Noch zu klären"*:

```
| `pkid`    | Kind (Passiv / Partner?)  | *Noch zu klären* |
| `sponsor` | Förderer / Sponsor        | *Noch zu klären* |
```

**Im Code (L517-L519)** wird jeder unbekannte Status pauschal als **12 €** (passiv) behandelt:

```typescript
} else {
  fee = 12.0;
  reason = `Status ${m.status} als passiv veranlagt (12 €)`;
}
```

> [!WARNING]
> Das bedeutet: Ein `sponsor` zahlt 12 €, ein `pkid` zahlt 12 €. Ist das korrekt? Sponsoren/Förderer könnten einen anderen Beitrag haben (z.B. 0 € wenn über Förderverein separat, oder Mindestbeitrag).

**TODO:** Explizite Beitragslogik für `pkid` und `sponsor` definieren und implementieren.

**Datei:** [sepaCalculator.ts#L517-L519](file:///home/jochen/dev/szi/src/utils/sepaCalculator.ts#L517-L519)

---

### L5: Passives Kind ≥ 18 und < 25 im Familienverbund – Beitrag wirklich 0 €?

Im Code (L547-L549):
```typescript
} else {
  fee = 0.0;
  reason = 'Passives Kind unter 25 Jahren (im Familienbeitrag abgedeckt)';
}
```

Die Beitragsordnung sagt:
- **Kinder/Jugendliche unter 18** = beitragsfrei  
- **Ab dem 2. aktiven Kind** = beitragsfrei

Es gibt **keinen expliziten Eintrag** für „passive Kinder 18–24". Der Code nimmt an, diese seien im Familienbeitrag enthalten. Aber ein passives Mitglied zwischen 18 und 25 ist kein „Kind" im eigentlichen Sinne und auch kein „aktives Kind".

> [!IMPORTANT]
> **Klärung nötig:** Sollte ein passives Familienmitglied (18–24 Jahre) nicht den regulären passiven Beitrag von 12 € zahlen? Die Beitragsordnung regelt nur aktive Kinder im Familienbeitrag und Kinder < 18 als generell beitragsfrei.

**Datei:** [sepaCalculator.ts#L547-L549](file:///home/jochen/dev/szi/src/utils/sepaCalculator.ts#L547-L549)

---

### L6: Fehlende Altersvalidierung für Status `child`

Ein Mitglied mit Status `child`, aber tatsächlich ≥ 18 Jahre, wird zwar in [planung.md](file:///home/jochen/dev/szi/planung.md#L168) als Prüffall erwähnt:

> *„Diskrepanz: Status child, aber Person bereits ≥ 18 Jahre."*

Im Code wird dafür aber **keine Warnung erzeugt**. Das `child`-Status-Mitglied wird einfach als beitragsfrei behandelt (L526-L528 und L492-L493):

```typescript
const isUnder18 = m.age !== null ? m.age < 18 : isChildByStatus;
```

Ein 20-jähriges Mitglied mit Status `child` würde korrekt als Ü18 erkannt und den Alterscheck bestehen. **Aber:** Es gibt keine explizite Warnung *„Status ist child, Alter ist aber ≥ 18 – bitte prüfen"*.

**TODO:** Warnung erzeugen, wenn `status === 'child'` und `age >= 18`.

**Datei:** [sepaCalculator.ts#L492-L493](file:///home/jochen/dev/szi/src/utils/sepaCalculator.ts#L492-L493)

---

## 🔵 Ungeklärte Grenzfälle / Edge Cases

### G1: Ehrenamt im Familienverbund – Sockel-Beitrag trotzdem 20 €?

Wenn ein Ehrenmitglied (z.B. Ehrenvorstand) gleichzeitig Familienzahler ist, zahlt er aktuell **20 €** Familiensockel:

```typescript
// sepaCalculator.ts, L498-503
if (isFamily) {
  fee = 20.0;
  reason = '...Familienbeitrag (Zahler)';
}
```

Die Ehrenbefreiung (`isHonorary`) wird nur für Nicht-Familien-Zahler geprüft (L505-L507). Ein Ehrenvorstand als Familienzahler zahlt also 20 € statt 0 €.

> **Frage:** Soll ein Ehrenmitglied, das auch Familienzahler ist, vom Sockelbeitrag befreit sein? Falls ja, würde die Familie trotzdem nur die Partner- und Kinderbeiträge zahlen.

**TODO:** Vereinsvorstand fragen und Logik ggf. anpassen.

**Datei:** [sepaCalculator.ts#L498-L521](file:///home/jochen/dev/szi/src/utils/sepaCalculator.ts#L498-L521)

---

### G2: Reihenfolge der Kinder bei Mehrfach-Kindern (welches zahlt 10 €?)

Der Code iteriert die Kinder in der Reihenfolge, wie sie im `groupMembers`-Array stehen (die CSV-Importreihenfolge). Das erste aktive Kind < 25 zahlt 10 €, alle weiteren 0 €.

```typescript
activeChildrenCount++;
if (activeChildrenCount === 1) {
  fee = 10.0;
  reason = '1. aktives Kind unter 25 Jahren (+10 €)';
} else {
  fee = 0.0;
}
```

> **Problem:** Welches Kind das ältere oder „erste" ist, hängt von der CSV-Reihenfolge ab – nicht vom Geburtsdatum. Bei Import in anderer Reihenfolge ändert sich potenziell, welches Kind zahlt.

**TODO:** Definierte Sortierung nach Alter oder Geburtsdatum einführen, damit reproduzierbar ist, welches Kind den 10 €-Beitrag zahlt.

**Datei:** [sepaCalculator.ts#L537-L546](file:///home/jochen/dev/szi/src/utils/sepaCalculator.ts#L537-L546)

---

### G3: Lebenspartner ≥ 25 OHNE eigene IBAN – Zuordnung über Partner-Link

Im Code (L380-L383) wird ein Mitglied ≥ 25 ohne eigene IBAN trotzdem dem Zahler zugeordnet, **wenn** es ein Partner-Match gibt:

```typescript
if (isOver25ActiveOrPassive) {
  if (isPartnerMatch) {
    matchedPayerId = m.partner;
  }
  // Ansonsten: Herauslösung aus Familienbeitrag
}
```

Das ist logisch (Ehepartner teilen ein Konto), aber es gibt **keine Warnung**, dass dieser Partner keine eigene IBAN hat. Für SEPA-Mandate ist es wichtig, dass die Zustimmung des Kontoinhabers vorliegt.

**TODO:** Prüfhinweis erzeugen, wenn ein ≥ 25-jähriger Partner ohne eigene IBAN/Mandat über das Zahlerkonto abgebucht wird.

---

### G4: Doppelt erfasste Mitglieder / Duplikat-Erkennung

Es gibt keine Duplikat-Erkennung. Wenn ein Mitglied in der CSV doppelt vorkommt (gleiche Mitgliedsnummer), wird es von `memberMap` überschrieben (letzte Zeile gewinnt), aber in der `members`-Liste doppelt verarbeitet.

```typescript
const memberMap = new Map<string, Member>();
members.forEach(m => memberMap.set(m.id, m)); // überschreibt bei Duplikat
```

**TODO:** Duplikat-Erkennung bei gleicher Mitgliedsnummer mit Warnung implementieren.

**Datei:** [sepaCalculator.ts#L332-L333](file:///home/jochen/dev/szi/src/utils/sepaCalculator.ts#L332-L333)

---

### G5: BOM-Zeichen (UTF-8 BOM) im CSV-Import

Der CSV-Import liest mit `ISO-8859-1` Encoding (L81 in App.tsx):

```typescript
reader.readAsText(file, 'ISO-8859-1');
```

Falls eine Datei mit UTF-8 BOM exportiert wird (z.B. aus Excel), könnte die erste Spalte einen unsichtbaren BOM-Charakter (`\uFEFF`) enthalten, der den Header „Mitgliedsnummer" unlesbar macht.

**TODO:** BOM-Stripping in `parseMembersCSV` oder Encoding-Auto-Detection einbauen.

---

### G6: Ehrenmitglied als Nicht-Zahler im Familienverbund

Wenn ein Ehrenmitglied (z.B. Ehrendirigent) kein Zahler ist, aber dem Familienverbund eines anderen Zahlers zugeordnet wird, wird es korrekt mit 0 € berechnet. **Aber:** Reduziert das die Kinderzählung?

Beispiel: Familie mit Zahler + Ehrenpartner + 2 aktive Kinder  
- Ehrenpartner = 0 € (✅ korrekt)
- Kind 1 = 10 € (ist es wirklich das 1. Kind, oder wird es zum 2. Kind verschoben, weil der Partner „quasi zählt"?)

**Aktuell:** Der Code zählt `activeChildrenCount` nur bei Kindern (nicht beim Partner), daher korrekt. Aber es gibt **keinen Testfall** dafür.

**TODO:** Testfall schreiben für Ehrenmitglied-Partner + Kinder im Familienverbund.

---

### G7: SEPA-XML vs. SEPA-CSV

Die Beitragsordnung (§ 1.3) spricht von „Einzugsverfahren". Die App erzeugt nur eine **CSV-Datei** als Zwischenformat für die Bank. Manche Banken verlangen aber ein **SEPA-XML (pain.008)**-Format.

**TODO:** Klären, ob die Hausbank des Vereins CSV akzeptiert oder ob ein pain.008-XML-Export implementiert werden muss.

---

### G8: Kein Jahresbezug / Stichtagslogik

Die Beitragsordnung (§ 1.2) legt fest: *„Der Mitgliedsbeitrag ist als Jahresbeitrag (fällig im laufenden Kalenderjahr) festgesetzt."*

Der Code berechnet das Alter mit `new Date()` – also dem heutigen Datum. Das bedeutet:
- Ein Kind, das am 01.12. des Jahres 25 wird, würde im Januar noch als < 25 erkannt, aber im Dezember als ≥ 25.
- Je nachdem, wann der Einzugslauf erfolgt, ändert sich der Beitrag.

> [!NOTE]
> **Frage:** Sollte das Referenzdatum für die Altersberechnung auf den **31.12. des laufenden Jahres** gesetzt werden (= „Alter zum Jahresende")? So wäre sichergestellt, dass ein Kind, das im laufenden Jahr 25 wird, direkt herausgelöst wird – unabhängig davon, ob der SEPA-Lauf im Januar oder im November stattfindet.

**Datei:** [sepaCalculator.ts#L266](file:///home/jochen/dev/szi/src/utils/sepaCalculator.ts#L266) (`calculateAge(birthDate)` nutzt implizit `new Date()`)

---

## 📋 Fehlende Tests

| Testfall | Beschrieben? | Test vorhanden? |
|---|---|---|
| Passiver Lebenspartner im Familienverbund (0 € vs. 12 €) | planung.md | ❌ |
| Ehrenamt-Zahler im Familienverbund (20 € vs. 0 €) | — | ❌ |
| Status `pkid` – Beitrag? | planung.md | ❌ |
| Status `sponsor` – Beitrag? | planung.md | ❌ Nur indirekt über Sponsor-Test |
| Kind mit Status `child` aber Alter ≥ 18 – Warnung? | planung.md | ❌ |
| Passives Kind 18–24 im Familienverbund (0 € vs. 12 €) | — | ❌ |
| Nicht-deutsche IBAN (z.B. AT) | — | ❌ |
| Duplikat-Mitgliedsnummern | — | ❌ |
| Ehrenmitglied-Partner + mehrere Kinder | — | ❌ |
| Reihenfolge der Kinder (ältestes vs. jüngstes = 10 €) | — | ❌ |

---

## 📝 TODO-Liste (priorisiert)

### Priorität 🔴 Hoch (Korrektheit / Beitragsordnung)

- [ ] **TODO-1:** Klärung `passiver Lebenspartner = 0 €` – Vereinsvorstand fragen, ob passiver Partner wirklich beitragsfrei ist oder 12 € zahlen muss. Ergebnis in Code + Doku festhalten.
- [ ] **TODO-2:** Klärung `passiver Familienzahler = 20 €` – Dokumentieren, dass ein passiver Zahler den Familiensockel (20 €) statt des passiven Einzelbeitrags (12 €) zahlt, oder korrigieren.
- [ ] **TODO-3:** Status `pkid` und `sponsor` – explizite Beitragslogik definieren statt Fallback auf 12 €.
- [ ] **TODO-4:** Passives Kind (18–24) im Familienverbund – Klärung ob 0 € korrekt oder ob regulärer passiver Beitrag (12 €) gilt.
- [ ] **TODO-5:** Stichtagslogik / Referenzdatum – Entscheiden, ob Altersberechnung auf Jahresende (31.12.) umgestellt wird.

### Priorität 🟡 Mittel (Funktionalität / Robustheit)

- [ ] **TODO-6:** Warnung erzeugen bei `status === 'child'` und `age >= 18` (Stammdaten-Inkonsistenz).
- [ ] **TODO-7:** Ehrenamt-Zahler im Familienverbund – Klären und Testfall schreiben (zahlt er 20 € oder 0 €?).
- [ ] **TODO-8:** Kinder-Reihenfolge nach Geburtsdatum sortieren, damit reproduzierbar ist, welches Kind den 10 €-Beitrag trägt.
- [ ] **TODO-9:** Duplikat-Erkennung bei gleicher Mitgliedsnummer.
- [ ] **TODO-10:** Prüfhinweis für Partner ≥ 25 ohne eigene IBAN/Mandat.

### Priorität 🟢 Niedrig (Nice-to-have / Zukunftssicherheit)

- [ ] **TODO-11:** § 1.4 – Rechnungsstellungsgebühr (+5 €): Entweder im UI als Option anbieten oder dokumentieren, dass manuell.
- [ ] **TODO-12:** § 1.5 – Stundung/Erlass: Dokumentieren, dass über manuelle Checkbox-Abwahl gelöst wird.
- [ ] **TODO-13:** § 4 – Kaution (100 €): Klären, ob über App oder separat.
- [ ] **TODO-14:** Nicht-deutsche IBAN-Validierung oder zumindest Warnung statt Fehler.
- [ ] **TODO-15:** BOM-Zeichen beim CSV-Import strippen.
- [ ] **TODO-16:** SEPA-XML (pain.008) Export prüfen, ob die Bank ihn braucht.
- [ ] **TODO-17:** Fehlende Testfälle (siehe Tabelle oben) ergänzen.

---

## Architektur-Anmerkungen (keine Fehler, aber Hinweise)

1. **Monolithische App.tsx (946 Zeilen):** Die gesamte UI lebt in einer Datei. Bei wachsender Funktionalität sollte in Komponenten aufgeteilt werden (z.B. `PayerTable`, `FilterBar`, `KPICards`, `UnassignedPanel`).

2. **Keine Persistenz:** Die App hat keinen Local Storage oder Session Storage. Bei versehentlichem Browser-Reload geht alles verloren. Ein `localStorage.setItem()` für die letzte CSV wäre ein Quick-Win.

3. **IBAN im Klartext im UI:** Die IBAN wird in der Zahler-Tabelle vollständig angezeigt ([App.tsx#L787](file:///home/jochen/dev/szi/src/App.tsx#L787)). Die Planung spricht von *„maskiert z.B. DE14...8888 mit Tooltip"* – das ist nicht umgesetzt.

4. **`handleSelectAll` setzt nur valide Zahler:** Die „Alle auswählen"-Checkbox selektiert nur `g.isValid && g.totalAmount > 0`. Das ist korrekt, aber nirgends dokumentiert, warum z.B. Ehrenmitglieder-Zahler (0 €) nicht selektierbar sind.
