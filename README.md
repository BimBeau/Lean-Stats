# Lean Stats

A **privacy-friendly, self-hosted WordPress analytics plugin**.  
Lightweight, cookie-free statistics designed for administrators: no banners, no third-party scripts, native Gutenberg UI, and reliable data without consent friction.

## 🎯 Goals

Lean Stats is built to provide **useful site insights** while staying **minimal, fast, and privacy-friendly**:

- No cookies (no `document.cookie`, no localStorage/sessionStorage)
- No persistent identifiers (no user IDs, no fingerprinting)
- No third-party scripts (everything runs self-hosted)
- Admin-first UX with a native Gutenberg-style UI
- Aggregate-first data model (focus on trends, not people)

## 📊 Metric definitions (important)

Lean Stats uses **clear, privacy-safe metrics** to avoid ambiguity.

### Visits
- A **visit** represents an anonymous **session** (not a unique person).
- Sessions are approximated from **entry hits** (non-internal referrers), not unique people.
- No IP addresses are stored in clear.
- No cookies or persistent identifiers are used.

Visits cannot be used to identify individuals.

### Page views
- **Page views** represent the **total number of pages displayed**.
- Each page load increments the counter.
- Page views are counted across all visits (not unique).

## 📊 What Lean Stats tracks (Free)

Lean Stats focuses on **aggregated metrics**, not user journeys.

### Core metrics
- Page views (total pages displayed)
- Visits (anonymous sessions)
- Time series (per day, optionally per hour)
- Top pages (by page views)
- Referrers by domain (e.g. `google.com`, `instagram.com`)
- Device class (mobile / desktop / tablet)

### Optional modules (privacy-safe)
- 404 tracking (top missing URLs + counts)
- Internal WordPress search terms (counts only, no user info)
- UTM “safe mode” (basic)
  - allowlist only (e.g. `utm_source`, `utm_medium`, `utm_campaign`)
  - normalization to prevent storing arbitrary PII in URLs

## ✅ Collected data (aggregated only)

Lean Stats stores **aggregated counts**, never person-level records.

- Page paths (cleaned by default)
- Daily or hourly hit totals per page
- Referrer domains (domain only)
- Device class (mobile / desktop / tablet)
- 404 paths with counts
- Internal search terms with counts
- Allowlisted UTM campaign values (aggregated)
- Time buckets (day or hour)

## ❌ Data never collected

- Stored full IP addresses or stored precise location data
- Cookies, localStorage, sessionStorage, or persistent identifiers
- User IDs, emails, usernames, or names
- Full referrer URLs or arbitrary query strings
- Fingerprints or probabilistic identifiers
- Session replay, heatmaps, or behavioral profiling

## 🚫 What Lean Stats deliberately does NOT do

To keep Lean Stats lean and avoid consent-driven tracking patterns, the plugin does **not** provide:

- Unique visitors (exact), returning visitors, cohorts
- Individual user journeys or clickstreams
- Fingerprinting or probabilistic identification
- Heatmaps, session replay, or behavioral profiling
- Ad / retargeting integrations
- Any tracking that requires third-party scripts

## 🔐 Privacy by design

Lean Stats is designed to minimize data collection:

- No IP stored in clear (ideally no IP stored at all)
- Visits use a daily salted, irreversible hash of the IP address (hash only, no IP storage)
- Referrer stored as domain only (no full referrer URLs)
- URL cleaning by default (strip query strings unless allowlisted)
- Data retention: aggregated data kept for reporting; optional short-lived raw logs (if enabled) are limited and purged automatically
- Soft rate limiting uses ephemeral, hashed IPs held in memory cache only; raw IPs are never persisted
- Short deduplication window prevents repeated identical hits within seconds
- Optional support for GPC / DNT signals (configurable)

> Note: Legal requirements vary by jurisdiction and by how a site is configured. Lean Stats is engineered to minimize risk by avoiding common consent-triggering tracking patterns.

## ⚙️ Settings overview

- **URL cleaning**: strips query strings by default; allowlists keep only specified parameters.
- **Exclusions**: skips tracking for specified roles and URL paths.
- **DNT/GPC**: respects `DNT: 1` and `Sec-GPC: 1` when enabled.
- **Retention**: raw logs keep a short, configurable retention window when debug mode is enabled.
- **Geolocation**: MaxMind API credentials enable hosted lookups; otherwise the local GeoLite2 database is used.
- **Purge**: a purge action deletes aggregated analytics tables and raw logs while keeping settings.

## 🧩 Admin UI

Lean Stats integrates directly inside WordPress Admin:

- Gutenberg-style UI using `@wordpress/components`
- Admin UI uses the Gutenberg design system exclusively with official `@wordpress/components` UI elements.
- Fast dashboard: KPIs, time series charts, and top lists
- Minimal interactions: tooltips, skeleton loading, and clear empty states
- Settings screen for strict mode, DNT / GPC compliance, URL allowlists, retention, and role exclusions
- Geolocation screen that shows the current request country, region, and city without storing IP addresses

## 🌍 Localization

Lean Stats uses the `lean-stats` text domain for PHP and JavaScript strings, and the admin UI follows the effective WordPress locale (user profile locale overrides the site locale). The `languages/` directory stores translation sources for French, English, Spanish, German, Italian, Portuguese, Swedish, Danish, Dutch, and Turkish.

## 🛠 Requirements

- WordPress **6.4+**
- PHP **8.0+**

## 📦 Build plugin zip

Use the script to generate a distributable plugin archive in `dist/`.  
Build command: npm run build:zip  
The build process generates `.mo` files and JavaScript translation JSON files in `languages/` when WP-CLI is available.

## 🗺 Roadmap

- UI improvements & reporting enhancements
- Expanded Content view (pages, 404, internal search)
- Acquisition view (referrers, safe campaign tracking)
- Improved export options

## 📚 Documentation

Lean Stats includes product documentation for implementation and extension:

- Privacy configuration: `docs/PRIVACY.md`
- Settings reference: `docs/SETTINGS.md`
- Hooks & filters: `docs/HOOKS.md`
- Extension API: `docs/EXTENSION_API.md`
- REST API: `docs/REST_API.md`
- Database schema: `docs/DB_SCHEMA.md`
- Architecture: `docs/ARCHITECTURE.md`
