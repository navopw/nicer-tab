# Nicer Tab

**Your bookmarks, beautifully organized.**

Nicer Tab is a Chrome/Firefox new tab extension that turns your browser bookmarks into a fast, visual, card-based bookmark manager.

<img width="600" alt="logo" src="https://github.com/user-attachments/assets/14e3d84f-c214-4621-956e-b25df54ca602" />

<img width="1708" height="1289" alt="screencapture-chrome-newtab-2026-05-22-17_07_41 (1)" src="https://github.com/user-attachments/assets/e37bca8a-dfdf-4477-926d-252d80626d35" />

[![GPL-3.0 License](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript&logoColor=white)
![WXT](https://img.shields.io/badge/WXT-0.21-orange)

## Features

- **Visual bookmark grid** - Card-based bookmarks with favicons, coloured letter fallbacks, and small/medium/large card sizes that fill the available width.
- **Folder navigation** - Collapsible folder tree with optional bookmark counts and a resizable sidebar, plus subfolders and a clickable breadcrumb in the grid. The last opened folder is remembered.
- **Bookmark management** - Create, edit, move, delete, duplicate, open, copy URLs, and create folders. Deletes and moves can be undone, and duplicate addresses are pointed out as you type.
- **Drag and drop** - Reorder bookmarks in the grid, drop them onto folders in the grid or sidebar, and rearrange the sidebar tree: drop a folder between rows to reorder it, onto a row to nest it inside, or drag sideways to change its nesting depth. Collapsed folders spring open while you hover them.
- **Search** - Ranked search across bookmark titles, addresses and folder names. Enter opens the top result, the down arrow moves into the results.
- **Keyboard and screen reader friendly** - Arrow keys move through the folder tree and the grid, `/` or `Cmd/Ctrl+K` focuses search, `Delete` removes, `F2` renames folders, and every control is labelled.
- **Appearance controls** - System/light/dark theme support plus preset or custom accent colors, applied before the first paint.
- **Custom icons** - Override a bookmark's icon with an image URL or an uploaded image.
- **Import/export** - Back up bookmarks, settings and custom icons as JSON, or export and import the standard HTML bookmark file every browser uses. Imports merge into your existing bookmarks and skip what you already have.
- **Browser sync friendly** - Uses the standard browser bookmarks API, so changes stay in your browser's bookmark store.

## Development

### Prerequisites

- Node.js 22.22.1 or newer
- npm

### Commands

```bash
# Install dependencies and prepare WXT
npm install

# Run a live-reload development build
npm run dev          # Chrome
npm run dev:firefox  # Firefox

# Type-check
npm run compile

# Unit tests
npm test

# Format
npm run format

# Build production extensions
npm run build          # Chrome, outputs to dist/chrome-mv3
npm run build:firefox  # Firefox, outputs to dist/firefox-mv2

# Package ZIP files for distribution
npm run zip
npm run zip:firefox
```

## Build and Install Locally

### Chrome

```bash
npm install
npm run build
```

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the generated `dist/chrome-mv3` directory.
5. Open a new tab to use Nicer Tab.

After making changes, run `npm run build` again and click the extension's **Reload** button on `chrome://extensions`.

### Firefox

```bash
npm install
npm run build:firefox
```

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `dist/firefox-mv2/manifest.json`.
4. Open a new tab to use Nicer Tab.

Firefox temporary add-ons are removed when Firefox restarts. Rebuild with `npm run build:firefox` and load the manifest again after changes.

## Tech Stack

- **WXT** - Browser extension framework
- **React 19** - UI library
- **TypeScript 7** - Static typing
- **Zustand** - State management with browser storage persistence
- **Tailwind CSS 4** - Styling
- **@dnd-kit** - Drag and drop
- **lucide-react** - Icons
- **react-colorful** - Accent color picker
- **Vitest** - Unit tests

## Permissions

- `bookmarks` - Read, create, update, move, and delete browser bookmarks.
- `storage` - Persist settings and custom favicon data.
- `favicon` - Read Chrome favicon data for bookmark icons. Chrome only; Firefox builds omit this permission.

## Privacy

Nicer Tab has no server and collects nothing. Your bookmarks stay in the browser.

The one outside request it makes is for icons: when the browser has no icon for a bookmarked site (always the case in Firefox, which has no favicon API for extensions), the site's domain is sent to Google's favicon service. Turn off **Settings > General > Fetch missing icons from Google** to show a letter instead. Custom icon URLs you enter are loaded from wherever they point.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, pull request guidelines, and project conventions.

## License

[GPL-3.0](LICENSE) © navopw
