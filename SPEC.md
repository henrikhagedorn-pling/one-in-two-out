# 1-in-2-out – Spezifikation für Claude Code (v2)

Private Web-App (PWA) fürs iPhone, mit der ich das Ausmisten meiner Wohnung nach der Regel „1 rein, 2 raus" tracke. Nutzer: nur ich. Keine Accounts, kein Backend.

Visuelle Vorlage: Ordner `design/` (siehe Abschnitt 6 und Anhang A). Bei Widerspruch zwischen Spec und Design gilt die **Spec**.

### Änderungen gegenüber v1

- Navigation: **Saldo · + · Einträge** statt Saldo · Eingänge · Ausgänge (4.0)
- Neuer View **Einträge** mit Tabs **Alle · Rein · Raus**, startet immer mit „Alle" (4.3)
- „+" übernimmt den Typ aus dem aktiven Einträge-Tab (4.2)
- Bearbeiten: Sheet schließt nach dem Speichern (4.2)
- Neu im Eingabe-Sheet: Live-Anzeige „Saldo nach Speichern", Platzhalter je Typ, Vorschläge als Chips (4.2)
- Import-Vorschau: Link „Erst aktuellen Stand exportieren" (4.6)
- Backup-Hinweis: Bezugszeitpunkt präzisiert, wenn noch nie exportiert wurde (4.1)
- Neuer Abschnitt 6 „Design" mit Tokens, Typografie, Komponenten
- Schriften werden mitgebündelt, keine externen Requests (6.2, 7)

---

## 1. Mechanismus

- Für jeden **neuen** Gegenstand, der in die Wohnung kommt, müssen **zwei** Gegenstände gehen.
- Keine Kategorie-Bindung: Was rausgeht, ist beliebig.
- **Ersatz** für einen defekten Gegenstand ist 1:1 und saldo-neutral. Der defekte Gegenstand wird nicht separat erfasst.
- Verbrauchsmaterial wird nicht geloggt. Das ist eine Nutzerkonvention, die App muss dafür nichts tun.
- Mengen zählen voll: „Kabel × 20" raus = 20 Ausgänge.
- Das Saldo darf positiv (Guthaben) und negativ (Rückstand) sein. Die App blockiert nichts und zeigt nur den Stand an.
- Start: Saldo 0, kein Nachtragen von Altbeständen. Rückdatieren einzelner Einträge ist trotzdem möglich (Datumsfeld).

## 2. Datenmodell

```ts
type EntryType = 'in' | 'out' | 'replacement';

interface Entry {
  id: string;          // crypto.randomUUID()
  type: EntryType;
  name: string;        // getrimmt, nicht leer
  quantity: number;    // Integer ≥ 1
  date: string;        // YYYY-MM-DD, Default: heute (lokale Zeit)
  createdAt: string;   // ISO-Timestamp, für stabile Sortierung
}
```

Metadaten, getrennt gespeichert:
- `lastExportAt: string | null`
- `lastUsedType: EntryType` (Default beim ersten Start: `'out'`)

## 3. Berechnungen

| Kennzahl | Formel |
|---|---|
| **Saldo** | `Σ out.quantity − 2 × Σ in.quantity` (replacement zählt nicht) |
| **Netto-Reduktion seit Start** | `Σ out.quantity − Σ in.quantity` (replacement zählt nicht) |
| **Summe rein** | `Σ in.quantity` |
| **Summe Ersatz** | `Σ replacement.quantity` (separat ausweisen) |
| **Summe raus** | `Σ out.quantity` |

Alle Summen zählen Mengen, nicht Zeilen.

## 4. Navigation und Screens

### 4.0 Navigation

- Tab-Leiste unten, drei gleich breite Spalten: **Saldo** | **+** | **Einträge**.
- „+" sitzt exakt mittig als dunkle Pille (64 × 44 px) und öffnet das Eingabe-Sheet. Es ist kein Tab, der einen View anzeigt.
- Backup erreicht man über ein Icon rechts oben im Header des Saldo-Screens. Der Backup-Screen öffnet als Unterseite mit Zurück-Button „‹ Saldo". Die Tab-Leiste bleibt sichtbar, „Saldo" ist aktiv.
- Icons: Waage (Saldo), Plus, Doppelpfeil hoch/runter (Einträge), Archivbox (Backup). Pfade: siehe `design/screens/`.

### 4.1 Saldo (Startscreen)

**Header:** Wortmarke „1-in-2-out" (Serif kursiv) links, Backup-Icon-Button rechts (`aria-label="Backup und Einstellungen"`).

**Große Saldo-Zahl** mit Überzeile „SALDO", darunter Status und Unterzeile:

| Zustand | Zahl | Farbe | Status | Unterzeile |
|---|---|---|---|---|
| Saldo > 0 | `+29` | positiv | „Budget: 29" | „Reicht für 14 Neuanschaffungen" (`floor(N/2)`). Bei N = 1: „Reicht noch nicht für eine Neuanschaffung". Bei `floor(N/2)` = 1: „Reicht für 1 Neuanschaffung" |
| Saldo = 0, Einträge vorhanden | `0` | Text | „Ausgeglichen" | „Nächste Anschaffung braucht zwei Ausgänge" |
| Saldo = 0, keine Einträge | `0` | Text | „Ausgeglichen" | „Noch keine Einträge", dazu Hinweisblock (siehe unten) |
| Saldo < 0 | `−6` | negativ | „Rückstand: 6" | „6 weitere Dinge müssen raus". Bei 1: „1 weiteres Ding muss raus" |

- Minuszeichen ist das typografische `−` (U+2212), kein Bindestrich. Positiv immer mit `+`.

**Kennzahlen** (unten, über der Tab-Leiste):
- Zeile „Netto-Reduktion seit Start": Wert + „Dinge weniger". Bei negativem Wert: Betrag + „Dinge mehr".
- Darunter drei Spalten: **Raus | Rein | Ersatz** (Summen aus 3.).

**Erster Start (keine Einträge):** Statt der Kennzahlen ein Hinweisblock: „Für jedes Neue gehen zwei Dinge." (Serif) und „Tippe auf Plus und logge den ersten Gegenstand, der die Wohnung verlässt. Ersatz für Kaputtes zählt nicht." Ein dezenter gezeichneter Pfeil zeigt auf das „+".

**Backup-Hinweis** als Banner über der Saldo-Zahl:
- Erscheint, wenn Einträge existieren **und** der Bezugszeitpunkt ≥ 14 Tage zurückliegt.
- Bezugszeitpunkt = `lastExportAt`. Ist das `null`, gilt der `createdAt` des ältesten Eintrags. So erscheint der Hinweis nicht schon nach dem ersten Eintrag.
- Text: „Letztes Backup vor X Tagen – **jetzt sichern**". Wurde noch nie exportiert: „Noch kein Backup – **jetzt sichern**".
- Tap startet direkt den Export (wie 4.5). Nach erfolgreichem Export verschwindet das Banner.

### 4.2 Eingabe (Sheet über „+")

Aufbau von oben nach unten. Alles Relevante liegt in der oberen Hälfte, weil unten die Tastatur sitzt:

1. Griff, Kopfzeile: links „Schließen", Mitte „Neuer Eintrag", rechts „Speichern" (fett, positiv-Farbe). „Speichern" ist deaktiviert, solange der Name leer ist.
2. **Segmented Control** Rein | Raus | Ersatz.
3. **Namensfeld** (Serif, groß, nur Unterstrich-Linie). Fokus automatisch beim Öffnen. Platzhalter je Typ: Rein „Was kommt rein?", Raus „Was geht raus?", Ersatz „Was wird ersetzt?".
4. **Vorschläge** als Chips unter dem Feld, horizontal scrollbar, ab dem ersten Zeichen:
   - Quelle: bisher geloggte Namen, case-insensitive dedupliziert.
   - Reihenfolge: Präfix-Treffer vor Teiltreffern, innerhalb davon nach Häufigkeit absteigend.
   - Chip zeigt den Namen (Treffer fett) und die Häufigkeit („7×"). Maximal 5 Chips.
   - Tap übernimmt den Namen ins Feld, speichert aber nicht.
5. **Menge**: Stepper − / Zahl / +, Default 1. „−" ist bei 1 deaktiviert. Zahl direkt editierbar (`inputmode="numeric"`). Ungültige Eingabe (leer, < 1, keine Ganzzahl) wird beim Verlassen auf 1 gesetzt.
6. **Datum**: Zeile mit Kalender-Icon, öffnet den nativen Date-Picker. Anzeige: „Heute, 29. Sep.", „Gestern, 28. Sep.", sonst „Fr, 25. Sep. 2026".
7. **Saldo nach Speichern**, live: „+9 → +29". Bei Typ Ersatz: „+29 · Ersatz ist neutral". Das schützt davor, versehentlich den falschen Typ zu speichern.

**Vorausgewählter Typ beim Öffnen:**

| Geöffnet aus | Typ |
|---|---|
| Einträge, Tab „Rein" | Rein |
| Einträge, Tab „Raus" | Raus |
| Einträge, Tab „Alle" | `lastUsedType` |
| Saldo, Backup | `lastUsedType` |

`lastUsedType` wird bei jedem Speichern auf den gespeicherten Typ gesetzt.

**Speichern (neuer Eintrag):** Enter/„Fertig" auf der Tastatur oder „Speichern".
- Das Sheet bleibt offen. Name wird geleert, Menge auf 1 gesetzt, Typ und Datum bleiben.
- Fokus zurück ins Namensfeld.
- Toast im Sheet unter dem Formular, ca. 3 s: „✓ **Kabel × 20** raus · Saldo jetzt **+29**". Ein neuer Toast ersetzt den alten. Bei Menge 1 ohne „× 1".
- Schließen per Button oder Swipe-down.

**Bearbeiten:** Wird aus der Swipe-Aktion geöffnet (4.4).
- Kopfzeile: „Abbrechen" | „Bearbeiten" | „Speichern". Alle Felder vorbefüllt, Typ-Wechsel erlaubt.
- Keine Vorschläge-Chips.
- **Speichern schließt das Sheet.** Danach Toast auf dem darunterliegenden Screen, ca. 3 s: „Gespeichert · Saldo jetzt +29". Dieser Toast ist nicht gezeichnet. Stil wie der Rückgängig-Toast, ohne Button.
- Speichern mit geändertem Typ ändert `lastUsedType` nicht.

### 4.3 Einträge

**Kopf** (bleibt beim Scrollen oben stehen):
- Überzeile „EINTRÄGE".
- Tabs **Alle · Rein · Raus** als Serif-Überschriften nebeneinander. Aktiver Tab: Textfarbe + 2 px Unterstrich. Inaktive Tabs: gedämpfte Farbe. Umsetzung als `role="tablist"` mit `role="tab"` und `aria-selected`.
- Darunter die Summe für den aktiven Tab:
  - Alle: „63 raus · 17 rein · 4 Ersatz"
  - Rein: „17 rein · 4 Ersatz"
  - Raus: „63 raus"

**Tab-Zustand:** Der View startet **immer mit „Alle"**: beim App-Start und jedes Mal, wenn man über die Tab-Leiste zu „Einträge" wechselt. Öffnen und Schließen des Eingabe-Sheets verlässt den View nicht, der Tab bleibt dann erhalten.

**Listen:** neueste zuerst (`date` absteigend, bei gleichem Datum `createdAt` absteigend). Gruppiert nach Datum mit Überschrift „HEUTE", „GESTERN", sonst „FREITAG, 25. SEPTEMBER" (Jahr nur, wenn nicht das laufende Jahr).

- **Alle:** alle drei Typen. Zeile (56 px): Typ-Icon links (Pfeil raus in positiv-Farbe, Pfeil rein in negativ-Farbe, Tausch-Pfeile für Ersatz in gedämpfter Farbe, jeweils mit `aria-label`), daneben Name und in kleiner zweiter Zeile der Typ: „Raus", „Rein" oder „Ersatz · saldo-neutral". Rechts „× Menge".
- **Rein:** `in` und `replacement`. Zeile (52 px): Name, rechts „× Menge". Ersatz-Einträge tragen das Badge „Ersatz".
- **Raus:** `out`. Aufbau wie Rein, ohne Badge.
- „× Menge" wird bei Menge 1 weggelassen.
- Leere Tabs (nicht gezeichnet): zentrierter Text in gedämpfter Farbe: „Noch keine Einträge." / „Noch keine Eingänge." / „Noch keine Ausgänge."

### 4.4 Bearbeiten / Löschen (in allen drei Tabs)

- Swipe nach links auf einer Zeile legt zwei Aktionen frei: **Bearbeiten** (gedämpft) und **Löschen** (negativ-Farbe), je 88 px breit, Icon über Label.
- Bearbeiten öffnet das Eingabe-Sheet im Bearbeiten-Modus (4.2).
- Löschen ohne Rückfrage. Die Zeile verschwindet sofort, Summen und Saldo aktualisieren sich sofort.
- Toast über der Tab-Leiste: „**Kaffeetasse × 3** gelöscht" + Button „Rückgängig", mit Fortschrittsbalken am unteren Rand, der in 5 s abläuft. Rückgängig stellt den Eintrag unverändert wieder her (gleiche `id`, gleiche `createdAt`).
- Gesten: Richtung nach ca. 10 px Bewegung festlegen. Horizontal öffnet den Swipe, vertikal scrollt. Nur eine Zeile ist gleichzeitig offen. Tap außerhalb schließt sie.

### 4.5 Backup

Unterseite mit Titel „Backup":
- Status-Zeilen: „Letztes Backup" mit relativer Angabe („vor 23 Tagen", negativ-Farbe ab 14 Tagen) und Datum darunter. Noch nie exportiert: „noch nie". Dazu „Einträge auf diesem Gerät": Anzahl Zeilen.
- **CSV exportieren** (primärer Button): erzeugt die Datei und öffnet das iOS-Teilen-Menü über `navigator.share({ files })`. Hinweis darunter: „Öffnet das Teilen-Menü. Dort „In Dateien sichern" und iCloud Drive wählen." Fallback, wenn Share nicht verfügbar: Download. `lastExportAt` erst setzen, wenn `share()` erfolgreich zurückkommt oder der Download ausgelöst wurde. Bei Abbruch (`AbortError`) nicht setzen.
- **CSV importieren** (sekundärer Button, Umriss): `<input type="file" accept=".csv">`. Hinweis: „Ersetzt den kompletten Bestand. Vorher siehst du eine Prüfung der Datei."
- Fußnote (Serif kursiv): „Deine Daten liegen nur in diesem Browser, gebunden an diese Adresse. Vor einem Umzug exportieren und in der neuen Instanz importieren."

### 4.6 Import-Prüfung (Sheet)

Nach Dateiauswahl: validieren, dann Sheet „Import prüfen" mit Dateiname und Größe.

**Ohne Fehler:**
- „142 Einträge gefunden" (Serif), darunter „✓ 0 fehlerhaft" (positiv-Farbe).
- Aufschlüsselung Raus | Rein | Ersatz (Zeilenanzahl je Typ) und Zeitraum („14. Juli – 6. Sep. 2026").
- Warnbox (negativ-Farbton): „Ersetzt deinen aktuellen Bestand von **151 Einträgen** vollständig. Das lässt sich nicht rückgängig machen." Darin der Link **„Erst aktuellen Stand exportieren"**: startet den Export wie 4.5, das Sheet bleibt offen.
- Button unten: **„Bestand ersetzen"** (negativ-Farbe). Erst dieser Tap ersetzt den Bestand. Danach Sheet schließen, Toast „142 Einträge importiert".
- Ist der aktuelle Bestand leer, entfällt die Warnbox. Der Button heißt dann „Importieren".

**Mit Fehlern:**
- „142 Einträge gefunden", darunter „⚠ 3 fehlerhaft · Import abgebrochen" (negativ-Farbe).
- Liste: „Zeile 18" + Meldung, z. B.:
  - `menge „zwei" ist keine ganze Zahl ≥ 1`
  - `typ „weg" unbekannt – erlaubt: rein, raus, ersatz`
  - `datum „2026-13-02" ist kein gültiges Datum`
  - außerdem: leerer Name, doppelte `id`, falsche Spaltenzahl, falsche Kopfzeile
- Hinweis: „Zeilennummern wie in Numbers, Kopfzeile ist Zeile 1." und „Dein aktueller Bestand bleibt unverändert."
- Button: „Andere Datei wählen". Kopfzeile links „Schließen".

## 5. CSV-Format

- Dateiname: `1in2out-backup-YYYY-MM-DD.csv`
- UTF-8 mit BOM, Trennzeichen `;` (öffnet sauber in Numbers/Excel DE), Felder mit Sonderzeichen in `"…"`, `"` escaped als `""`
- Kopfzeile: `id;typ;name;menge;datum;erstellt_am`
- `typ`: `rein` | `raus` | `ersatz`
- Export und Import müssen verlustfrei round-trippen (Test!).

## 6. Design

Referenz: `design/screens/*.html` (statische Mockups, 390 × 844) und `design/tokens.css`. Mit dem Browser öffnen: `design/index.html`.

**Wichtig zu den Mockups:**
- Sie sind absolut positioniert und haben Safe Areas hart eingetragen (59 px oben, 34 px unten). In der App stattdessen Flex-Layout und `env(safe-area-inset-*)` verwenden.
- Sie laden Schriften von Google Fonts, nur für die Vorschau. In der App **nicht** übernehmen (siehe 6.2).
- Die Beispieldaten sind nicht über alle Screens konsistent.

### 6.1 Farben

Als CSS-Variablen in `design/tokens.css`. Dunkelmodus über `prefers-color-scheme: dark`.

| Token | Hell | Dunkel | Verwendung |
|---|---|---|---|
| `--bg` | `#F3EFE6` | `#161512` | Seitenhintergrund |
| `--surface` | `#FBF9F4` | `#201E1A` | Tab-Leiste, Sheets, Banner |
| `--ink` | `#1D1B17` | `#EEE9DF` | Text, primäre Buttons, „+" |
| `--on-ink` | `#FBF9F4` | `#161512` | Text auf `--ink` |
| `--muted` | `#625D53` | `#A39C8F` | Sekundärtext, inaktive Tab-Leiste |
| `--tab-inactive` | `#857F73` | `#7D776C` | inaktive Einträge-Tabs (nur ≥ 24 px Schrift) |
| `--disabled` | `#A39C8F` | `#5E594F` | deaktivierte Buttons |
| `--placeholder` | `#8A8478` | `#7D776C` | Platzhalter im Namensfeld |
| `--hairline` | `#DCD5C6` | `#36332D` | Trennlinien, Chip-Rahmen |
| `--segment` | `#ECE6D9` | `#2A2823` | Hintergrund Segmented Control |
| `--segment-selected` | `#FBF9F4` | `#45413A` | aktives Segment |
| `--positive` | `#2C5C66` | `#8CBEC7` | Guthaben, „Speichern", Raus-Icon, Ersatz-Badge |
| `--negative` | `#A94F27` | `#E48B5E` | Rückstand, Löschen, Rein-Icon, Warnungen |
| `--on-negative` | `#FFFFFF` | `#161512` | Text auf `--negative` |
| `--negative-soft` | `#F6E6DC` | `#3A2419` | Hintergrund Warnbox |
| `--negative-link` | `#8A3F1E` | `#F0A983` | Link in Warnbox |
| `--scrim` | `#2A2823` | `#000000` | Hintergrund hinter Sheets |
| `--toast-bg` | `#1D1B17` | `#34312B` | Toasts |
| `--toast-text` | `#FBF9F4` | `#EEE9DF` | Toast-Text |
| `--toast-positive` | `#8CBEC7` | `#8CBEC7` | Häkchen und Saldo im Toast |
| `--toast-action` | `#E9A27C` | `#F0A983` | „Rückgängig" |

Positiv und negativ unterscheiden sich auch in der Helligkeit, nicht nur im Farbton. Kontraste sind auf ≥ 4,5 : 1 (Text) bzw. ≥ 3 : 1 (≥ 24 px) ausgelegt. Toast-Farben im Dunkelmodus sind nicht gezeichnet (Vorschlag).

### 6.2 Typografie

- **Display:** Newsreader (Serif), Gewicht 500, Kursiv 400 für Wortmarke und Fußnote. Zahlen immer mit `font-variant-numeric: lining-nums tabular-nums`.
- **Text:** Hanken Grotesk, Gewichte 400 / 500 / 600.
- Beide Schriften stehen unter der SIL Open Font License. Einbinden über `@fontsource/newsreader` und `@fontsource/hanken-grotesk` (nur die benötigten Schnitte), damit Vite sie bündelt und der Service Worker sie cacht.

| Element | Schrift | Größe | Details |
|---|---|---|---|
| Saldo-Zahl | Newsreader 500 | 176 px | line-height 0.86, letter-spacing −0.045em |
| Titel (Backup), Import-Ergebnis | Newsreader 500 | 38–40 px | letter-spacing −0.02em |
| Einträge-Tabs | Newsreader 500 | 30 px | letter-spacing −0.02em |
| Kennzahlen | Newsreader | 26–34 px | |
| Namensfeld | Newsreader | 28 px | |
| Stepper-Zahl | Newsreader | 30 px | |
| Menge in Listen | Newsreader | 20 px | gedämpft |
| Listenzeile | Hanken 400 | 17 px | |
| Sheet-Kopfzeile | Hanken 400/600 | 17 px | |
| Sekundärtext | Hanken | 15 px | |
| Captions, Typ-Zeile | Hanken | 12–13 px | |
| Überzeilen / Datumsgruppen | Hanken 600 | 12 px | uppercase, letter-spacing 0.12–0.14em |
| Tab-Leiste | Hanken 500/600 | 11 px | |

Alle Inputs haben ≥ 16 px Schrift (kein Safari-Zoom).

### 6.3 Layout und Komponenten

- Seitenränder 24 px, im Sheet 20 px. Touch-Ziele ≥ 44 px.
- **Tab-Leiste:** Höhe 49 px + Safe Area, Hintergrund `--surface`, oben 1 px `--hairline`. Aktiv: `--ink` 600, inaktiv: `--muted` 500.
- **Sheet:** Radius oben 14 px, Griff 36 × 5 px, hinter dem Sheet `--scrim`.
- **Segmented Control:** Höhe 44, Radius 10, Innenabstand 3, aktives Segment mit leichtem Schatten.
- **Chips:** Höhe 44, Radius 22, 1 px `--hairline`, Hintergrund `--bg`.
- **Stepper-Buttons:** 44 × 44, rund, 1 px `--hairline`.
- **Buttons:** Höhe 54, Radius 14. Primär: `--ink` / `--on-ink`. Sekundär: 1,5 px Rahmen `--ink`. Destruktiv: `--negative` / `--on-negative`.
- **Listen:** Zeilen 52 px (Rein/Raus) bzw. 56 px (Alle), Trennlinie 1 px `--hairline`. Kennzahlen-Blöcke oben mit 1,5 px `--ink`-Linie („Kassenbuch").
- **Toasts:** Radius 12–14, Höhe 48–56, Hintergrund `--toast-bg`.
- Keine Emoji, keine Verläufe. Icons als Inline-SVG mit Strich (1,6–1,8 px, `currentColor`).

## 7. Technik

- **Stack:** Vite + TypeScript + React (oder Preact), keine UI-Library nötig.
- **Speicher:** IndexedDB (z. B. über `idb`), nicht localStorage. Beim ersten Start `navigator.storage.persist()` anfragen.
- **PWA:** `vite-plugin-pwa`
  - Web-App-Manifest mit `display: standalone`, Name „1-in-2-out", Icons inkl. `apple-touch-icon` (180×180)
  - Service Worker cacht alle Assets inklusive Schriftdateien (`woff2` in den Precache-Patterns), die App startet vollständig offline
- **Hosting:** GitHub Pages über ein GitHub-Actions-Workflow (Build + Deploy bei Push auf `main`). Vite-`base` auf den Repo-Pfad setzen. `<meta name="robots" content="noindex">`.
- **iOS-Details:**
  - `viewport-fit=cover`, Safe-Area-Insets respektieren (Notch, Home-Indicator)
  - Input-Schriftgröße ≥ 16 px, damit Safari nicht zoomt
  - Touch-Targets ≥ 44 px
  - Hell- und Dunkelmodus nach Systemeinstellung (Tokens aus 6.1)
- **Sprache:** UI komplett Deutsch. Datumsformate über `Intl.DateTimeFormat('de-DE')`.
- **Keine** externen Requests zur Laufzeit (keine Fonts von CDNs, kein Tracking).
- **Tests:** Unit-Tests (Vitest) für Saldo-Berechnung, Statustexte aus 4.1 (inkl. Singular/Plural und N = 1), Vorausgewählter Typ aus 4.2, Sortierung der Vorschläge und CSV-Export/-Import inkl. Round-Trip und Escaping.

## 8. Nicht im Scope

- Backend, Sync, Accounts, mehrere Nutzer
- Kategorien, Verbleib (verkauft/gespendet), Notizen, Fotos, Preise
- Charts / Verlauf
- Sprach- oder Siri-Eingabe
- Batch-Formular mit mehreren Zeilen (stattdessen: offenes Formular, siehe 4.2)
- Suche und Filter über die drei Tabs hinaus

## 9. Akzeptanzkriterien

1. Ich kann „Kabel × 20, raus" in unter 10 Sekunden loggen und direkt den nächsten Gegenstand eingeben, ohne das Formular neu zu öffnen.
2. Das Saldo stimmt mit der Formel aus Abschnitt 3 überein, auch nach Bearbeiten, Löschen und Rückgängig.
3. Ein Ersatz-Eintrag verändert das Saldo nicht und erscheint markiert unter „Rein" und „Alle".
4. Die App lässt sich über Safari → „Zum Home-Bildschirm" installieren, startet ohne Browser-UI und funktioniert im Flugmodus, inklusive der richtigen Schriften.
5. Die Daten überstehen App-Neustart und iPhone-Neustart.
6. Exportierte CSV lässt sich in iCloud Drive sichern, in Numbers korrekt öffnen (Umlaute, Semikolons im Namen) und wieder importieren, mit identischem Datenbestand.
7. Der Backup-Hinweis erscheint nach 14 Tagen ohne Export (bzw. 14 Tage nach dem ersten Eintrag, wenn nie exportiert wurde) und verschwindet nach einem Export.
8. Tippe ich im Tab „Raus" auf „+", ist „Raus" vorausgewählt; im Tab „Rein" ist es „Rein".
9. Wechsle ich über die Tab-Leiste zu „Einträge", ist immer „Alle" aktiv.
10. Nach dem Speichern im Bearbeiten-Modus schließt das Sheet, und die Änderung ist in der Liste und im Saldo sichtbar.
11. Hell- und Dunkelmodus entsprechen den Tokens aus 6.1.

## 10. Übergabe an mich (README)

Claude Code legt eine kurze README an mit:
1. Wie ich das Repo auf GitHub anlege und GitHub Pages aktiviere (Source: GitHub Actions)
2. Die resultierende URL
3. Installation aufs iPhone: URL in Safari öffnen → Teilen → „Zum Home-Bildschirm"
4. Hinweis: Die Daten hängen an dieser URL. Vor einem Umzug (anderer Repo-Name, andere Domain) CSV exportieren und in der neuen Instanz importieren.

---

## Anhang A: Screen-Referenz

| Datei in `design/screens/` | Zeigt | Spec |
|---|---|---|
| `01-saldo-guthaben.html` | Saldo > 0 | 4.1 |
| `02-saldo-rueckstand.html` | Saldo < 0 mit Backup-Hinweis | 4.1 |
| `03-saldo-ausgeglichen.html` | Saldo = 0 | 4.1 |
| `04-saldo-erster-start.html` | Keine Einträge | 4.1 |
| `05-eingabe-vorschlaege.html` | Sheet beim Tippen, Vorschläge, Saldo-Vorschau | 4.2 |
| `06-eingabe-nach-speichern.html` | Sheet zurückgesetzt, Toast | 4.2 |
| `07-eingabe-bearbeiten.html` | Bearbeiten-Modus, Typ Ersatz, rückdatiert | 4.2 |
| `08-eintraege-alle.html` | Tab „Alle" | 4.3 |
| `09-eintraege-rein.html` | Tab „Rein" mit Ersatz-Badges | 4.3 |
| `10-eintraege-raus.html` | Tab „Raus" | 4.3 |
| `11-eintraege-raus-swipe.html` | Swipe-Aktionen | 4.4 |
| `12-eintraege-raus-rueckgaengig.html` | Gelöscht + Rückgängig | 4.4 |
| `13-backup.html` | Backup-Screen | 4.5 |
| `14-import-vorschau.html` | Import ohne Fehler | 4.6 |
| `15-import-fehler.html` | Import mit Fehlern | 4.6 |
| `16-dunkel-saldo.html` | Dunkelmodus: Saldo | 6.1 |
| `17-dunkel-eingabe.html` | Dunkelmodus: Eingabe | 6.1 |
| `18-dunkel-eintraege-rein.html` | Dunkelmodus: Einträge | 6.1 |
| `19-dunkel-import-vorschau.html` | Dunkelmodus: Import | 6.1 |
