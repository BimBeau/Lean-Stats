# Lean Stats

A **privacy-friendly, self-hosted WordPress analytics plugin**.  
Lightweight, cookie-free statistics designed for administrators: no banners, no third-party scripts, native Gutenberg UI, and reliable data without consent friction.

## 🎯 Goals

Lean Stats provides **useful site insights** while staying **minimal, fast, and privacy-safe**:

- No cookies or persistent identifiers
- No fingerprinting or user-level tracking
- No third-party scripts (fully self-hosted)
- Admin-first UX with a native Gutenberg-style interface
- Aggregate-first data model (trends, not people)

## 📊 Metric definitions

Lean Stats uses **explicit, privacy-safe metrics**.

### Visits

- A **visit** represents an anonymous **session**, not a unique person.
- Sessions are approximated from **entry hits** (non-internal referrers).
- No IP addresses, cookies, or persistent identifiers are used.

Visits cannot be used to identify individuals.

### Page views

- **Page views** represent the **total number of pages displayed**.
- Each page load increments the counter.
- Page views are not deduplicated across visits.

## 📈 What Lean Stats tracks (Free)

Lean Stats focuses on **aggregated metrics**, not user journeys.

- Page views
- Visits (anonymous sessions)
- Time series (daily, optionally hourly)
- Pages ranked by page views
- Referrer domains (e.g. `google.com`, `instagram.com`)
- Device class (mobile / desktop / tablet / bot)
- 404 errors (top missing URLs with counts)
- Internal WordPress search terms (counts only)
- UTM tracking (safe mode)
  - Allowlist-based (`utm_source`, `utm_medium`, `utm_campaign`)
  - Normalization to prevent storing arbitrary or sensitive data

## ✅ Collected data (aggregated only)

Lean Stats stores **counts only**, never person-level records.

- Cleaned page paths
- Daily or hourly hit totals
- Referrer domains (domain only)
- Device classes
- 404 paths with counts
- Internal search terms with counts
- Allowlisted UTM campaign values
- Time buckets (day or hour)

## ❌ Data never collected

- Full IP addresses or precise location data
- Cookies, localStorage, sessionStorage, or identifiers
- User IDs, emails, usernames, or names
- Full referrer URLs or arbitrary query strings
- Fingerprinting or probabilistic identifiers
- Session replay, heatmaps, or behavioral profiling

## 🚫 What Lean Stats deliberately does NOT do

To remain lean and consent-free, Lean Stats does **not** provide:

- Exact unique visitors or returning visitor metrics
- Individual user journeys or clickstreams
- Fingerprinting or behavioral profiling
- Heatmaps or session replay
- Advertising or retargeting integrations
- Any tracking that depends on third-party scripts

## 🔐 Privacy by design

Lean Stats minimizes data collection by default:

- No IP storage
- Referrers stored as domains only
- URL cleaning enabled by default (query strings stripped unless allowlisted)
- Aggregated data retained for reporting
- Optional short-lived raw logs (debug mode only), automatically purged
- Short deduplication window to prevent repeated identical hits
- Optional support for DNT (`DNT: 1`) and GPC (`Sec-GPC: 1`)

> Legal requirements vary by jurisdiction and configuration. Lean Stats is engineered to reduce compliance risk by avoiding common consent-triggering tracking patterns.

## ⚙️ Settings overview

- **URL cleaning**: strips query strings by default; allowlists supported
- **Exclusions**: skip tracking for specific roles and URL paths
- **DNT / GPC**: optional respect for browser privacy signals
- **Retention**: configurable retention for debug raw logs
- **Geolocation**: optional MaxMind API integration (no IP storage)
- **Purge**: deletes analytics data while preserving settings

## 🧩 Admin UI

Lean Stats integrates directly into WordPress Admin:

- Native Gutenberg-style UI using `@wordpress/components`
- Fast dashboard with KPIs, charts, and top lists
- Minimal interactions (tooltips, skeleton loading, empty states)
- Settings screens for privacy, retention, exclusions, debug mode, and MaxMind credentials
- Geolocation view showing current request location without storing IPs

## 🌍 Translation

Lean Stats uses the `lean-stats` text domain for PHP and JavaScript.  
The admin UI follows the effective WordPress locale (user profile locale overrides site locale).

Available translations:
French, English, Spanish, German, Italian, Portuguese, Swedish, Danish, Dutch, Turkish.

## 🛠 Requirements

- WordPress **6.4+**
- PHP **8.0+**

## 🗺 Roadmap

- UI and reporting improvements
- Expanded content views (pages, 404, internal search)
- Acquisition views (referrers and safe campaign tracking)
- Improved export options

## 📚 Documentation

- Privacy configuration: `docs/PRIVACY.md`
- Settings reference: `docs/SETTINGS.md`
- Hooks & filters: `docs/HOOKS.md`
- Extension API: `docs/EXTENSION_API.md`
- REST API: `docs/REST_API.md`
- Database schema: `docs/DB_SCHEMA.md`
- Architecture: `docs/ARCHITECTURE.md`
- Debug mode: `docs/DEBUG.md`
- Docs consistency report: `docs/DOCS_CONSISTENCY_REPORT.md`