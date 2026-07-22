# Nicer Tab

**Your bookmarks, beautifully organized.**

Nicer Tab is a Chrome/Firefox new tab extension that turns your browser bookmarks into a fast, visual, card-based bookmark manager.

<img width="600" alt="logo" src="https://github.com/user-attachments/assets/14e3d84f-c214-4621-956e-b25df54ca602" />

<img width="1708" height="1289" alt="screencapture-chrome-newtab-2026-05-22-17_07_41 (1)" src="https://github.com/user-attachments/assets/e37bca8a-dfdf-4477-926d-252d80626d35" />

[![GPL-3.0 License](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![WXT](https://img.shields.io/badge/WXT-0.20-orange)

## Features

- **Visual bookmark grid** - Card-based bookmarks with favicons, fallback initials, and small/medium/large card sizes.
- **Folder navigation** - Collapsible, keyboard-navigable folder tree with optional bookmark counts and a resizable sidebar.
- **Bookmark management** - Create, edit, delete, duplicate, open, copy URLs, and create folders.
- **Drag and drop** - Reorder bookmarks and folders, or move items into folders with confirmation for cross-folder moves.
- **Search** - Real-time search across all bookmarks, grouped by folder path.
- **Appearance controls** - System/light/dark theme support plus preset or custom accent colors.
- **Custom favicon URLs** - Override a bookmark's icon with a direct image URL, cached in extension storage.
- **Import/export** - Export bookmarks to JSON and merge imported bookmark backups.
- **Browser sync friendly** - Uses the standard browser bookmarks API, so changes stay in your browser's bookmark store.

## Development

### Prerequisites

- Node.js 18 or newer
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
- **TypeScript 5.9** - Static typing
- **Zustand** - State management with browser storage persistence
- **Tailwind CSS 4** - Styling
- **@dnd-kit** - Drag and drop
- **lucide-react** - Icons
- **react-colorful** - Accent color picker

## Permissions

- `bookmarks` - Read, create, update, move, and delete browser bookmarks.
- `storage` - Persist settings and custom favicon data.
- `favicon` - Read Chrome favicon data for bookmark icons. Chrome only; Firefox builds omit this permission.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, pull request guidelines, and project conventions.

## License

[GPL-3.0](LICENSE) © navopw
