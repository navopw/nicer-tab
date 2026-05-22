# Nicer Tab

**Your bookmarks, beautifully organized.**

A Chrome/Firefox extension that transforms your new tab page into a visual bookmark manager with a modern card-based interface.

[![GPL-3.0 License](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![WXT](https://img.shields.io/badge/WXT-0.20-orange)

## Table of Contents

- [Features](#features)
- [Development](#development)
- [Tech Stack](#tech-stack)
- [Permissions](#permissions)
- [License](#license)

## Features

- **Visual Grid** - Card-based bookmarks with favicons
- **Folder Navigation** - Collapsible sidebar with folder tree
- **Drag & Drop** - Reorder bookmarks within folders
- **Search** - Real-time search across all bookmarks
- **Themes** - System/Light/Dark modes (OLED-black dark theme)
- **Import/Export** - JSON backup and restore

## Development

```bash
# Install
npm install

# Dev server (Chrome)
npm run dev

# Dev server (Firefox)
npm run dev:firefox

# Build
npm run build          # Chrome
npm run build:firefox  # Firefox

# Package for distribution
npm run zip
npm run zip:firefox
```

## Tech Stack

- **WXT** - Browser extension framework
- **React 19** - UI library
- **Zustand** - State management with Chrome storage persistence
- **Tailwind CSS 4** - Styling
- **@dnd-kit** - Drag and drop

## Permissions

- `bookmarks` - Read and modify bookmarks
- `storage` - Persist settings and favicon cache

## License

[GPL-3.0](LICENSE) © navopw
