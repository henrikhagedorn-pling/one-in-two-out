# 1-in-2-out

Private PWA fürs iPhone: Ausmisten nach der Regel „1 rein, 2 raus“. Keine Accounts, kein Backend – die Daten liegen in IndexedDB im Browser.
Spezifikation: [SPEC.md](SPEC.md), Design-Vorlage: [design/](design/).

## 1. Repo und GitHub Pages einrichten

Das Repo existiert bereits (`henrikhagedorn-pling/one-in-two-out`). Für ein neues Repo: auf GitHub ein leeres Repo anlegen, diesen Ordner pushen.

1. Code auf `main` bringen (Pull Request mergen oder direkt pushen). Der Workflow `.github/workflows/deploy.yml` läuft bei jedem Push auf `main`: Tests, Build, Deploy.
2. Auf GitHub: **Settings → Pages → Build and deployment → Source: „GitHub Actions“** wählen.
3. Unter **Actions** prüfen, dass „Deploy to GitHub Pages“ grün durchläuft (bei Bedarf über „Run workflow“ manuell starten).

Hinweis: GitHub Pages für private Repos braucht einen bezahlten GitHub-Plan. Die Seite selbst ist dann trotzdem öffentlich erreichbar (nur `noindex`, kein Zugriffsschutz).

## 2. URL

```
https://henrikhagedorn-pling.github.io/one-in-two-out/
```

Der Pfad folgt dem Repo-Namen. Der Workflow setzt Vites `base` automatisch auf `/<repo-name>/`.

## 3. Installation aufs iPhone

1. URL in **Safari** öffnen (nicht in Chrome o. Ä.).
2. **Teilen** → **„Zum Home-Bildschirm“** → Hinzufügen.
3. App einmal mit Netz starten, danach funktioniert sie auch im Flugmodus.

## 4. Wichtig: Die Daten hängen an dieser URL

Die Einträge liegen nur im Speicher dieser Web-App auf diesem Gerät, gebunden an genau diese Adresse. Vor einem Umzug (anderer Repo-Name, andere Domain, anderes Gerät) in der App unter **Backup → CSV exportieren** sichern und in der neuen Instanz unter **Backup → CSV importieren** einspielen. Die App erinnert nach 14 Tagen ohne Export an ein Backup.

## Entwicklung

```bash
npm install
npm run dev        # Dev-Server
npm test           # Unit-Tests (Vitest)
npm run build      # Typecheck + Produktions-Build nach dist/
npm run preview    # Build lokal ansehen (inkl. Service Worker)
```

Stack: Vite, TypeScript, React, `idb`, `vite-plugin-pwa`. Schriften (Newsreader, Hanken Grotesk, SIL OFL) werden über `@fontsource` mitgebündelt, zur Laufzeit gibt es keine externen Requests.
