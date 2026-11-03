# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Subfolders show up as cards in the grid (drop bookmarks onto them), with a clickable breadcrumb above.
- The last opened folder is remembered across new tabs.
- Undo for deleting bookmarks and folders and for moving bookmarks, instead of confirmation dialogs.
- "Move to..." in the bookmark context menu and a folder picker in the add and edit dialogs.
- A hint when an address you type is already bookmarked.
- Search ranks results, matches folder names, opens the top result on Enter and moves into the results with the down arrow.
- `/` focuses search; `Delete` removes the focused bookmark or folder, `F2` renames a folder.
- HTML bookmark file import and export, compatible with every browser.
- JSON backups include settings and custom icons.
- Upload an image as a custom icon.
- Settings to open bookmarks in a new tab and to stop asking Google for missing icons.
- Unit tests for the tree, search and bookmark file logic, run in CI.

### Changed

- Bookmarks open in the current tab by default; Cmd/Ctrl-click and middle-click still open a new tab.
- The grid's columns follow the space available instead of the window width.
- Custom icon URLs are stored as links instead of being downloaded, so any image host works.
- Keyboard navigation moves real focus, and the sidebar, dialogs, menus and controls expose proper roles and labels.
- Imports merge into existing folders, skip bookmarks you already have, and map the permanent folders between Chrome and Firefox.
- Smaller sidebar logos.

### Fixed

- The whole grid no longer flickers on every bookmark change, and imports no longer reload the bookmark tree once per bookmark.
- Search results update when a bookmark changes or is deleted.
- Up and down arrow keys pick the right card in grouped search results.
- Dragging a bookmark to a new position in the grid saves the new order; before, only the screen changed.
- Letter avatars now appear in Chrome for sites without a cached icon, instead of a generic globe.
- No flash of the wrong theme or default layout while a new tab loads.

### Removed

- The empty background script.

## [0.1.0] - 2026-05-22

### Added

- Initial open-source release of Nicer Tab.
- Beautiful card-based visual bookmarks grid.
- Smooth drag-and-drop bookmark reordering with `@dnd-kit`.
- Sidebar with collapsible nested folders navigation.
- Real-time instant search across all bookmarks.
- Dark theme (including OLED dark mode), light theme, and system sync.
- Custom color accents and custom bookmark favicon options.
- Import and export bookmarks as JSON files.
- Full TypeScript check, Prettier formatting, and Husky pre-commit hooks.
