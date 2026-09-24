# Fynn New Tab

**English** · [Tiếng Việt](README.vi.md)

A customizable, cinematic new tab page for Brave and other Chromium browsers. Put an image or an MP4 video behind a clean clock, a search bar and a few optional widgets.

Built with plain HTML, CSS and JavaScript (ES modules) on Chrome Extension **Manifest V3**. No framework, no bundler, no build step.

## Screenshots

| New tab | Dashboard |
| :---: | :---: |
| ![New tab](docs/screenshots/newtab.png) | ![Dashboard](docs/screenshots/dashboard.png) |

## Features

- **Wallpapers** — JPEG, PNG, WebP or MP4 video (up to 50 MB each), stored locally. Pin one, or let Day/Night wallpapers switch automatically. See [Wallpaper modes](#wallpaper-modes).
- **Search** — Brave, Google, DuckDuckGo or your own engine. Typing a URL or domain opens it directly, and your last 8 searches are one keystroke away. See [Search](#search).
- **Widgets** — Clock (12h/24h), Date, Greeting, Search and Notes. Each one can be switched on or off.
- **Greeting** — a random phrase for the time of day, re-picked only when the period changes.
- **Notes** — create, edit, pin, mark as done and delete short notes.
- **Dashboard** — a slide-out panel with *Wallpapers*, *Widgets* and *Settings* tabs.
- **Readability controls** — an overlay-strength slider (50–180%) and an optional dim/blur effect while you search.
- **Accessibility** — focus-trapped dialogs, keyboard-navigable menus, and video that pauses in background tabs or when the OS asks for reduced motion.
- **Private and offline** — no analytics, no accounts, no background script. The only outgoing request is the search you submit. Fonts are bundled, so nothing is loaded from a CDN.

## Requirements

A Chromium-based browser with Manifest V3 support (Brave, Chrome, and similar). Chromium 102 or newer is recommended.

## Install (unpacked)

The extension isn't on the Chrome Web Store, so you load it as an unpacked extension.

1. Get the code:
   ```bash
   git clone https://github.com/FynnML/Fynn-NewTab.git
   ```
   or download the ZIP from GitHub and extract it.
2. Open the extensions page:
   - Brave: `brave://extensions`
   - Chrome: `chrome://extensions`
3. Turn on **Developer mode** (top-right corner).
4. Click **Load unpacked** and select the folder that contains `manifest.json` (the repository root, **not** the `newtab/` folder).
5. Open a new tab.

**Updating:** run `git pull`, then click the reload icon on the extension's card in the extensions page.

### Troubleshooting

- **"Manifest file is missing or unreadable"** — the wrong folder was selected. Pick the one that directly contains `manifest.json`.
- **Changes don't show up after editing files** — reload the extension from the extensions page, then open a fresh tab.
- **A wallpaper never switches with the time of day** — check that no wallpaper is set to **Primary**; it overrides the Day/Night schedule.

## Using it

Open the dashboard with the gear button at the bottom of the right edge. Click outside the panel, click the button again, or press `Esc` to close it.

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| Any character | Jump into the search box (when nothing else is focused, the dashboard is closed and no dialog is open) |
| `Enter` | Search, or open the URL you typed |
| `↑` / `↓` | Move through recent searches |
| `Esc` | Close the recent-searches list, the engine menu or the dashboard (the engine menu goes first). Dialogs also close with `Esc` |

### Search

- **Engines:** Brave (default), Google, DuckDuckGo, or **Custom**. Change it from the icon in the search bar, or under *Settings → Default search engine*.
- **Custom engine:** enter a URL template and put `%s` where the query goes, for example `https://www.bing.com/search?q=%s`. Without `%s`, the query is appended to the end of the URL.
- **Direct navigation:** input that looks like a URL (`https://…`, `www.…`, `localhost:3000`, an IPv4 address, or a domain with a common TLD such as `github.com`) is opened directly instead of searched. Phrases such as `node.js` are still treated as searches.
- **Recent searches:** the last 8 entries appear when you focus an empty search box. Remove one with the × button.

### Widgets

| Widget | Default | Notes |
| --- | :---: | --- |
| Clock | On | 12-hour by default, switchable to 24-hour in *Settings* |
| Date | On | Weekday, month and day |
| Greeting | On | Six periods: 00:00, 05:00, 11:00, 13:00, 18:00, 22:00 |
| Search | On | See [Search](#search) |
| Notes | **Off** | Title up to 80 characters, body up to 2000. Pinned notes first, then most recently updated |

### Settings

| Setting | Default | What it does |
| --- | :---: | --- |
| Default search engine | Brave | Engine used when a new tab opens |
| Custom engine URL | Bing | Only shown when *Custom* is selected |
| Time format | 12-hour | Clock display |
| Search focus effect | On | Dims and blurs the wallpaper while the search box is hovered or focused |
| Overlay strength | 100% | Darkens the wallpaper so text stays readable (50–180%) |
| Reset settings | — | Restores every setting and widget toggle above to its default |

## Wallpaper modes

Open the dashboard, go to **Wallpapers**, and use the dropdown on each wallpaper card. Every wallpaper has exactly one mode:

| Mode | What it does |
| --- | --- |
| **Primary** | Pinned. Always shown, at any time of day. Only one wallpaper can be Primary; choosing a new one turns the previous one back into Default. |
| **Day** | Shown from **06:00 to 17:59**. |
| **Night** | Shown from **18:00 to 05:59**. |
| **Default** | The fallback. Newly uploaded wallpapers start here. |

### Which wallpaper is shown?

The first rule that matches wins:

1. **Primary**, if one is set.
2. The **Day** or **Night** wallpaper that matches the current time.
3. A **Default** wallpaper.
4. The **built-in wallpaper** that ships with the extension (`assets/wallpapers/default.mp4`).

So *Primary* means "always this one", while *Day/Night* means "follow the clock".

### Typical setups

- **One wallpaper, always:** set it to **Primary**.
- **Automatic day/night cycle:** set one wallpaper to **Day** and another to **Night**, and make sure **no wallpaper is Primary**.
- **Just try things out:** leave new uploads on **Default**.

### Good to know

- Times use your computer's local clock and are fixed at 06:00 and 18:00, not tied to sunrise or sunset.
- The wallpaper is re-checked every minute and whenever you return to the tab, so it changes on its own without reloading.
- If several wallpapers share the same mode, the **most recently uploaded** one is used. Keeping one wallpaper per mode avoids surprises.
- The built-in wallpaper isn't listed in the dashboard and can't be deleted. It only appears when no custom wallpaper applies, for example on first run or after you delete all of yours.
- Video wallpapers are muted and looped. They pause while the tab is hidden and when your system prefers reduced motion.
- Videos get an automatically generated preview thumbnail in the dashboard.

## Your data

| What | Where |
| --- | --- |
| Wallpapers and notes | IndexedDB database `FynnNewTabDB` (wallpapers are saved as Blobs) |
| Settings, widget visibility, recent searches, last greeting | `localStorage` (keys starting with `fynn-` / `fynn:`) |

The `unlimitedStorage` permission, the only one the extension requests, lets you keep large video wallpapers. There are no host permissions, content scripts or background scripts.

**Reset settings** restores preferences only. Your wallpapers, notes and recent searches are kept; remove recent searches one by one with the × button. Uninstalling the extension removes all of its data.

## Project structure

```text
Fynn-NewTab/
├─ manifest.json
├─ LICENSE
├─ newtab/
│  ├─ index.html
│  ├─ style.css          # only @imports the CSS modules below
│  ├─ app.js             # entry point: imports and starts every feature module
│  ├─ CSS/
│  │  ├─ variables.css   # design tokens
│  │  ├─ fonts.css       # @font-face for the bundled Inter and Great Vibes fonts
│  │  ├─ layout.css      # reset, hero layout, responsive rules
│  │  ├─ components.css  # search bar, engine menu, dialogs, shared UI
│  │  ├─ dashboard.css
│  │  ├─ greeting.css
│  │  ├─ notes.css
│  │  └─ wallpaper.css
│  └─ JS/
│     ├─ clock.js        # clock, date, 12h/24h setting
│     ├─ dashboard.js    # panel, tabs, widget toggles, settings
│     ├─ db.js           # IndexedDB connection + small promise helpers
│     ├─ dialog.js       # accessible confirm/alert dialogs
│     ├─ greeting.js     # time-of-day greeting
│     ├─ notes.js        # notes widget
│     ├─ search.js       # engines, URL detection, recent searches
│     └─ wallpaper.js    # upload, modes, scheduler, overlay strength
├─ assets/
│  ├─ fonts/             # Inter and Great Vibes (self-hosted) + their OFL licenses
│  ├─ icons/             # search engine icons
│  ├─ images/            # Fynn logo and extension icons
│  └─ wallpapers/        # built-in default wallpaper (default.mp4)
└─ docs/
   └─ screenshots/
```

`app.js` starts the localStorage-only features first (greeting, clock, search, overlay, dashboard), then opens IndexedDB and starts the wallpaper and notes modules. A failure in one module doesn't stop the others.

## Customizing

There is no build step. Edit the files, then reload the extension from the extensions page.

- **Built-in wallpaper:** replace `assets/wallpapers/default.mp4` with your own. A reasonably sized MP4 keeps the extension small and startup fast. To use a different file name or format, update `DEFAULT_WALLPAPER_SRC` near the top of `newtab/JS/wallpaper.js`. If the file is missing, the page falls back to a plain dark background.
- **Greeting phrases:** edit the `GREETINGS` lists in `newtab/JS/greeting.js`, or change the period boundaries in `PERIODS`.
- **Add a search engine:** add an entry to `ENGINES` in `newtab/JS/search.js`, a matching `.engine-option` button and a `#searchEngineSetting` option in `newtab/index.html`, and an icon in `assets/icons/`.
- **Day/Night hours:** change `getScheduledWallpaperMode()` in `newtab/JS/wallpaper.js`.

## License

The code is released under the [MIT License](LICENSE).

Bundled fonts are licensed under the [SIL Open Font License 1.1](assets/fonts/OFL.txt):

- [Inter](https://rsms.me/inter/) © The Inter Project Authors
- [Great Vibes](https://github.com/googlefonts/great-vibes) © The Great Vibes Pro Project Authors ([license](assets/fonts/OFL-GreatVibes.txt))