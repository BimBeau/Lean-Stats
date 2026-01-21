# Privacy configuration

Lean Stats focuses on **aggregated analytics** and minimizes personal data by design.
The configuration options below control how collection, anonymization, and storage behave.

---

## Core principles

- No cookies
- No persistent identifiers
- No user-level tracking
- No IP addresses stored in clear
- No fingerprinting

All metrics are designed to be **anonymous, aggregated, and non-identifying**.

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

These options help align Lean Stats with privacy-conscious site configurations.

---

## URL handling

- **Strip query strings (default)**  
  Removes all query parameters from tracked page paths.

- **Query allowlist**  
  Keeps only explicitly allowlisted query keys  
  (for example: `utm_source`, `utm_medium`, `utm_campaign`).

This prevents accidental storage of personal or sensitive data in URLs.

---

## Visit counting (session anonymization)

Lean Stats counts **visits as anonymous sessions**, not individuals.

- **Session hash**
  - Each visit is identified using an **irreversible hash**
  - The hash is derived from the IP address combined with a **secret salt**
  - The salt can be **rotated daily**

- **No IP storage**
  - IP addresses are **never stored in clear**
  - Only the hashed value is stored, scoped to a date bucket

This mechanism:
- prevents long-term tracking
- prevents re-identification
- ensures visits cannot be linked across days

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

---

## Rate limiting and deduplication

- **Soft rate limiting**
  - Uses a hashed IP stored **only in memory cache**
  - Prevents bursts or abuse
  - Raw IPs are never persisted

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
