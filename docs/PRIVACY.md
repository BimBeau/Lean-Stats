# Privacy configuration

Lean Stats focuses on **aggregated analytics** and minimizes personal data by design.
The configuration options below control how collection, anonymization, and storage behave.

---

## Core principles

- No cookies
- No persistent identifiers
- No user-level tracking
- No IP addresses stored
- No fingerprinting

All metrics are designed to be **anonymous, aggregated, and non-identifying**.

---

## Collected data (aggregated only)

Lean Stats stores **aggregated counts** with no person-level records.

- Page paths (cleaned by default)
- Daily or hourly hit totals per page
- Referrer domains (domain only)
- Device class (mobile / desktop / tablet)
- 404 paths with counts
- Internal search terms with counts
- Allowlisted UTM campaign values (aggregated)
- Time buckets (day or hour)

---

## Data never collected

- Stored full IP addresses or stored precise location data
- Cookies, localStorage, sessionStorage, or persistent identifiers
- User IDs, emails, usernames, or names
- Full referrer URLs or arbitrary query strings
- Fingerprints or probabilistic identifiers
- Session replay, heatmaps, or behavioral profiling

---

## Tracking controls

- **Strict mode**  
  Skips tracking for all logged-in users.

- **Excluded roles**  
  Skips tracking for logged-in users with specific WordPress roles.

- **Respect DNT / GPC**  
  Skips tracking when browsers send:
  - `DNT: 1`
  - `Sec-GPC: 1`

- **Excluded paths**  
  Skips tracking for listed URL paths.

These options help align Lean Stats with privacy-conscious site configurations.

---

## Geolocation lookup

- The geolocation panel resolves the current request IP to country, region, and city.
- The IP address is used only for the lookup and is not stored.
- MaxMind API credentials are optional; without them, the local GeoLite2 database is used.

---

## URL handling

- **Strip query strings (default)**  
  Removes all query parameters from tracked page paths.

- **Query allowlist**  
  Keeps only explicitly allowlisted query keys  
  (for example: `utm_source`, `utm_medium`, `utm_campaign`).

- **UTM allowlist**  
  Stores aggregated UTM values for the allowlisted campaign parameters.

This prevents accidental storage of personal or sensitive data in URLs.

---

## Aggregated visit counting

Lean Stats counts activity using **daily aggregated counters** only.

- **No session identifiers**
  - No IP addresses, cookies, or user IDs are stored
  - Daily counters update totals per path, referrer domain, 404 path, and search term

---

## Page views

- **Page views** represent the total number of pages displayed.
- Each page load increments the counter.
- Page views are stored only as **aggregated counts**.

No page view data is associated with a person or persistent identifier.

---

## Raw logs

- **Raw logs storage**
  - Disabled by default
  - Controlled by debug mode (`lean_stats_settings.debug_enabled`)
  - Intended only for short-term debugging

- **Retention**
  - Raw logs expire after the configured retention window
  - Purged automatically
  - Aggregated statistics remain available for reporting

## Privacy checklist panel

The admin settings screen includes a privacy checklist panel that lists collected data categories and highlights risky configuration choices such as storing query strings, disabling DNT/GPC, enabling raw logs, or retaining raw logs for extended periods.

---

## Deduplication

- **Deduplication window**
  - Identical hits within a short time window are ignored
  - Prevents accidental overcounting from rapid reloads or bots

---

## Summary

Lean Stats is engineered to provide useful analytics while minimizing privacy risk:

- No personal data storage
- No cross-session identification
- No behavioral profiling
- Transparent, configurable privacy controls

Site owners remain responsible for ensuring compliance with local regulations, but Lean Stats avoids common consent-triggering tracking patterns by design.
