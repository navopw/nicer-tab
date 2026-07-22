# Contributing to Nicer Tab

Thank you for your interest in contributing to Nicer Tab! We welcome contributions from everyone. Following these guidelines helps ensure a smooth and productive experience for both contributors and maintainers.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to the project maintainers.

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please check the existing issues to see if the problem has already been reported.

When creating a bug report, please include:

- A clear, descriptive title.
- Steps to reproduce the issue.
- Your browser name and version (e.g., Chrome 124, Firefox 125).
- Nicer Tab extension version.
- Screenshots or screen recordings (if applicable).
- Error logs from the extension's background page or new tab console.

### Suggesting Enhancements

We welcome feature requests! Please check the existing issues to see if the feature has already been proposed.

When proposing a new feature, please:

- Explain the problem this feature solves.
- Describe how the feature should work.
- Provide mockups or screenshots if possible.

### Submitting Pull Requests

1. **Fork the repository** and clone it locally.
2. **Create a branch** for your changes:
    ```bash
    git checkout -b feature/your-feature-name
    # or
    git checkout -b fix/bug-description
    ```
3. **Install dependencies**:
    ```bash
    npm install
    ```
4. **Make your changes**. Ensure your code is clean, well-commented, and adheres to the existing codebase style.
5. **Format and compile**:
   Before submitting, format your code and verify there are no TypeScript or build compilation errors:

    ```bash
    # Format code
    npm run format

    # Type-check code
    npm run compile

    # Build for Chrome & Firefox to verify everything compiles
    npm run build
    npm run build:firefox
    ```

6. **Commit your changes**. We follow simple, descriptive commit messages:
    ```bash
    git commit -m "feat: add support for custom card border radius"
    ```
7. **Push to your fork** and open a Pull Request against the `main` branch.
8. Provide a clear description of your changes in the PR template.

## Development Setup

Nicer Tab is built using [WXT](https://wxt.dev/) with React 19, Tailwind CSS 4, and Zustand.

### Prerequisites

- Node.js (v18 or higher recommended)
- npm (comes with Node.js)

### Commands

- `npm install` - Install development dependencies.
- `npm run dev` - Start a live-reload development server for Chrome.
- `npm run dev:firefox` - Start a live-reload development server for Firefox.
- `npm run build` - Build the production extension for Chrome (output to `dist/chrome-mv3`).
- `npm run build:firefox` - Build the production extension for Firefox (output to `dist/firefox-mv3`).
- `npm run zip` - Package the production Chrome extension into a ZIP file for submission.
- `npm run zip:firefox` - Package the production Firefox extension into a ZIP file for submission.
- `npm run compile` - Check TypeScript files for type-safety without emitting files.
- `npm run format` - Format files using Prettier.

Thank you again for contributing!
