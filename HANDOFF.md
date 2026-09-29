# Übergabe an Claude Code

## Inhalt

- `SPEC.md`: verbindliche Spezifikation (v2)
- `design/index.html`: alle 19 Screens auf einer Seite (im Browser öffnen)
- `design/screens/*.html`: einzelne statische Mockups
- `design/tokens.css`: Farben (hell/dunkel), Schriften, Maße als CSS-Variablen

## So startest du

1. Leeres GitHub-Repo anlegen, z. B. `1in2out`.
2. Diesen Ordnerinhalt ins Repo legen (Root: `SPEC.md`, `HANDOFF.md`, `design/`) und pushen.
3. Claude Code auf dem Repo öffnen (Desktop-App, Bereich „Code", oder claude.ai/code).
4. Diesen Prompt verwenden:

```
Setze SPEC.md vollständig um. design/ ist die visuelle Vorlage:
design/tokens.css als Basis für die Styles übernehmen, die Screens in
design/screens/ als Referenz für Aufbau und Details nutzen, aber nicht
deren absolute Positionierung oder den Google-Fonts-Link kopieren.
Bei Widerspruch gilt SPEC.md.

Vorgehen:
1. Lies SPEC.md und öffne alle Screens, bevor du Code schreibst.
   Liste offene Fragen auf, bevor du anfängst.
2. Baue zuerst Datenmodell, Berechnungen und CSV mit Tests (Abschnitte 2, 3, 5, 7).
3. Dann Screens in dieser Reihenfolge: Saldo, Eingabe, Einträge, Backup/Import.
4. Dann PWA, GitHub-Actions-Deploy und README (Abschnitt 10).
5. Prüfe am Ende jedes Akzeptanzkriterium aus Abschnitt 9 und melde, was
   du nicht selbst verifizieren konntest (z. B. Verhalten auf dem iPhone).
```

## Was du selbst auf dem iPhone testen musst

Claude Code kann das nicht verifizieren:

- Installation über Safari, Start ohne Browser-UI, Flugmodus (Kriterium 4)
- Teilen-Menü → „In Dateien sichern" → iCloud Drive, Öffnen in Numbers (Kriterium 6)
- Swipe-Gesten und Tastaturverhalten im Eingabe-Sheet
- Daten nach iPhone-Neustart (Kriterium 5)
