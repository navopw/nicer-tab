# Open Source Readiness Plan for Nicer Tab

## Context

Nicer Tab is a browser extension (Chrome/Firefox) that replaces the new tab page with a visual bookmark manager. It includes:

- Bookmark grid with drag-and-drop reordering
- Folder sidebar with collapsible tree
- Search across bookmarks
- Themes (light/dark/OLED) + accent colors
- Import/Export JSON backup
- ~2,250 lines of TypeScript/React code across 40+ files

After discussion with the author, the AI chat sidebar (OpenRouter integration) will be **removed** before open-sourcing to keep the codebase focused and dependency-light.

## Current State — What Exists

| Item                    | Status | Notes                                                                                  |
| ----------------------- | ------ | -------------------------------------------------------------------------------------- |
| README.md               | ✅     | Basic dev instructions, tech stack, permissions                                        |
| Source code             | ✅     | Well-organised `src/` tree                                                             |
| `.gitignore`            | ✅     | Standard Node/Vite ignores                                                             |
| `package.json`          | ⚠️     | Has `"private": true` blocking npm publish                                             |
| `.prettierrc` + `husky` | ✅     | Code formatting pre-commit hooks                                                       |
| Icons (`public/icon/`)  | ✅     | 16/32/48/96/128 px PNGs needed by stores                                               |
| No hardcoded secrets    | ✅     | API keys (AI) stored in user's `chrome.storage.local`; AI feature being removed anyway |

## What's Missing — Must Fix Before Going Public

| Item                                   | Priority | Why It Matters                                                                                    |
| -------------------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| **LICENSE file (GPL-3.0)**             | P0       | Without a license the code is "all rights reserved" — no one can legally use, fork, or contribute |
| **`"private": false` in package.json** | P0       | Prevents accidental `npm publish`; also blocks tools from indexing it                             |
| **CONTRIBUTING.md**                    | P1       | Sets expectations for PRs, code style, issue format                                               |
| **Issue / PR templates**               | P1       | Reduces low-quality issues; GitHub auto-suggests them                                             |
| **CODE_OF_CONDUCT.md**                 | P1       | Standard for any project welcoming external contributors                                          |
| **SECURITY.md**                        | P1       | Tells researchers how to report vulns privately (bookmarks data access)                           |
| **Screenshots / GIFs in README**       | P1       | Extensions are visual; stores and GitHub need imagery                                             |
| **CHANGELOG.md**                       | P2       | Users and contributors need to know what changed                                                  |
| **GitHub Actions CI**                  | P2       | `npm run compile` + `npm run build` on every PR                                                   |
| **Version in package.json**            | P2       | Currently `0.0.0`; tag a `v0.1.0` for the open-source release                                     |

## Architecture Decision: Remove AI / OpenRouter Feature

The AI chat sidebar will be stripped out entirely. This:

- Removes 3 heavy npm dependencies (`ai`, `@openrouter/ai-sdk-provider`, `react-markdown`)
- Deletes ~600+ lines of AI-specific code
- Simplifies mental model for contributors (bookmarks only)
- Avoids support burden for API-key-related issues

### Files to delete

| File                                                | Reason                                |
| --------------------------------------------------- | ------------------------------------- |
| `src/components/ai-sidebar/AiSidebar.tsx`           | Main AI sidebar component             |
| `src/components/ai-sidebar/ChatHistoryPanel.tsx`    | Conversation list                     |
| `src/components/ai-sidebar/ChatMessage.tsx`         | Message bubble UI                     |
| `src/components/ai-sidebar/Citation.tsx`            | Web-search citation UI                |
| `src/components/ai-sidebar/Markdown.tsx`            | Markdown rendering for AI responses   |
| `src/components/ai-sidebar/ModelSelector.tsx`       | Model picker dropdown                 |
| `src/components/ai-sidebar/QueuedMessageItem.tsx`   | Queue indicator                       |
| `src/components/modals/settings/AIChatSettings.tsx` | Settings page for API key / model     |
| `src/hooks/useAiChat.ts`                            | Message streaming logic               |
| `src/hooks/useGenerateTitle.ts`                     | AI title generation for conversations |
| `src/stores/aiStore.ts`                             | Zustand store for AI state            |
| `src/lib/openrouter.ts`                             | OpenRouter API helpers                |
| `src/types/ai.ts`                                   | AI-related TypeScript types           |

### Files to modify (remove AI imports / references)

| File                                      | Change                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| `src/entrypoints/newtab/App.tsx`          | Remove `<AiSidebar />` import and usage                                   |
| `src/components/Toolbar.tsx`              | Remove AI sidebar toggle button                                           |
| `src/components/modals/SettingsModal.tsx` | Remove AI tab from settings modal                                         |
| `package.json`                            | Remove `@openrouter/ai-sdk-provider`, `ai`, `react-markdown` dependencies |
| `README.md`                               | Remove AI chat from feature list and tech stack                           |
| `wxt.config.ts`                           | No manifest changes needed (no extra permissions for AI)                  |

### Commands

```bash
npm uninstall @openrouter/ai-sdk-provider ai react-markdown
```

## Nice-to-Have (Post-Launch)

- `.github/FUNDING.yml` — GitHub Sponsors / Ko-fi / Buy Me a Coffee links
- `logo.svg` — replace `logo.psd` (vector is web-friendly, smaller)
- Descriptive `repository` field in `package.json` — enables npm/GitHub cross-linking
- Badges in README for CI status, license, version
- Chrome Web Store / Firefox Add-ons publishing docs — deferred until later

## Recommended Files to Create / Modify

### New files

- `LICENSE` — GPL-3.0 (author chose GPL-3.0)
- `CONTRIBUTING.md` — how to set up dev env, PR process, commit conventions
- `SECURITY.md` — vulnerability reporting process
- `CHANGELOG.md` — keepachangelog.com format, start with `## [0.1.0] - YYYY-MM-DD`
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `.github/pull_request_template.md`
- `.github/workflows/ci.yml` — run `npm ci`, `npm run compile`, `npm run build`

### Files to modify

- `package.json` — remove `"private": true`, add `repository`/`bugs`/`homepage` fields, bump version
- `README.md` — add screenshots, contributing section, license badge, table of contents; remove AI references
- `IDEAS.md` — optionally rename to `ROADMAP.md` or move to GitHub Issues/Projects for public visibility

## Step-by-Step Implementation Order

1. **Clean up code** — delete AI files, uninstall AI deps, fix remaining imports
2. **Verify build** — `npm run compile` + `npm run build` (Chrome + Firefox) pass cleanly
3. **Metadata** — add LICENSE (GPL-3.0), update package.json, bump version to 0.1.0
4. **Docs** — rewrite README without AI features, add CONTRIBUTING.md, SECURITY.md, CHANGELOG.md
5. **GitHub automation** — add issue/PR templates + CI workflow
6. **Final checks** — git status clean, no secrets, screenshots in README

## Verification Checklist

- [ ] Repo has a `LICENSE` file recognised by GitHub
- [ ] `package.json` is no longer private
- [ ] `npm run compile` passes (TypeScript check)
- [ ] `npm run build` passes (Chrome + Firefox)
- [ ] No AI-related code or dependencies remain in repo
- [ ] README renders correctly on GitHub with images
- [ ] No internal/temporary files are committed (e.g. check for stray `.env`, logs, `logo.psd` if unwanted)
- [ ] Git tag `v0.1.0` exists for the release commit
