# Contributing to Lean Stats

Thank you for your interest in contributing to **Lean Stats**, a privacy-friendly, self-hosted WordPress analytics plugin.

Lean Stats is built around a strong **privacy-by-design** philosophy and a **lean, maintainable codebase**. All contributions should respect these principles.

---

## 🧭 Project philosophy (important)

Before contributing, please make sure your proposal aligns with the core goals of Lean Stats:

- Privacy-first, consent-free analytics
- No cookies, no persistent identifiers, no fingerprinting
- Aggregated metrics only (no person-level data)
- Minimal, fast, and self-hosted
- Admin-first UX using native WordPress / Gutenberg components

Features that introduce user tracking, profiling, fingerprinting, or third-party dependencies will not be accepted.

---

## 🤝 How to contribute

You can contribute in several ways:

- Reporting bugs
- Suggesting enhancements or improvements
- Submitting pull requests
- Improving documentation
- Adding or updating translations

For significant changes, please open an issue first to discuss your proposal before starting work.

---

## 🐞 Reporting bugs

When reporting a bug, please include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- WordPress version
- PHP version
- Lean Stats version
- Screenshots or logs if relevant

Bug reports should be opened using GitHub Issues.

---

## 💡 Feature requests

Feature requests are welcome, provided they respect Lean Stats’ scope and philosophy.

Please explain:

- The problem you are trying to solve
- Why this feature is useful
- How it fits into a privacy-friendly analytics model
- Possible implementation ideas (optional)

---

## 🔀 Pull request process

1. Fork the repository and create a branch from `main`
2. Use clear, descriptive branch names  
   Example: `fix/404-count-duplication`  
   Example: `feature/internal-search-metrics`
3. Keep pull requests focused and minimal
4. Make sure existing tests pass
5. Add tests for new functionality when applicable
6. Update documentation if behavior or APIs change
7. Open a Pull Request with a clear description of the change

Draft pull requests are welcome for early feedback.

---

## 🧪 Development setup

Requirements:

- WordPress 6.4+
- PHP 8.0+
- Node.js 20
- npm

Common commands:

- Install dependencies: npm install
- Build assets: npm run build
- Start development mode: npm run start

---

## 🧹 Coding standards

### PHP

- Follows PSR-12
- Run linting before submitting: npm run lint:php

### JavaScript / React

- Uses WordPress’ official ESLint configuration
- Run linting with: npm run lint:js

### Tests

- PHP tests use PHPUnit
- JavaScript tests use @wordpress/scripts
- Run tests with:  
  npm run test:php  
  npm run test:js

---

## 🌍 Internationalization (i18n)

Lean Stats is fully translatable.

When modifying or adding user-facing strings:

- Always use WordPress i18n functions
- Use the `lean-stats` text domain
- Regenerate translation files when needed: bash scripts/build-i18n.sh

Do not commit generated `.mo` or `.json` files unless explicitly requested.

---

## 🧠 Privacy rules for contributions (critical)

Any contribution must respect these rules:

- Do not introduce cookies, localStorage, or persistent identifiers
- Do not store raw IP addresses
- Do not add fingerprinting or probabilistic tracking
- Do not log full URLs or arbitrary query strings
- Do not add third-party tracking scripts

If a contribution raises privacy concerns, it will be rejected.

---

## 📝 Commit messages

Use clear, conventional commit messages:

- fix: correct 404 counter logic
- feat: add internal search metrics
- docs: update privacy documentation
- refactor: simplify visit aggregation

Avoid vague messages like “update” or “changes”.

---

## 📄 License

By contributing to Lean Stats, you agree that your contributions will be licensed under the same license as the project.

---

## 🙏 Thank you

Your contributions help keep Lean Stats lean, ethical, and sustainable.

Thank you for helping build a better, privacy-respecting web.
