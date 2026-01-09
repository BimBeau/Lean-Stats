# Lean Stats

A privacy-friendly, self-hosted WordPress analytics plugin. Lightweight, cookie-free statistics designed for administrators: no banners, no third-party scripts, native Gutenberg UI, and reliable data without consent friction.

---

## Goals

Lean Stats is built to provide **useful site insights** while staying **minimal, fast, and privacy-friendly**:

- **No cookies** (no `document.cookie`, no localStorage/sessionStorage)
- **No persistent identifiers** (no user IDs, no fingerprinting)
- **No third-party scripts** (everything runs self-hosted)
- **Admin-first UX** with a **native Gutenberg-style UI**
- **Aggregate-first data model** (focus on trends, not people)

---

## What Lean Stats tracks (Free)

Lean Stats focuses on **aggregated metrics** (not user journeys):

### Core metrics
- **Hits / pageviews** (aggregated)
- **Time series** (per day, optionally per hour)
- **Top pages** (by pageviews)
- **Referrers by domain** (e.g. `google.com`, `instagram.com`)
- **Device class** (mobile / desktop / tablet)

### Optional modules (privacy-safe)
- **404 tracking** (top missing URLs + counts)
- **Internal WordPress search terms** (counts only, no user info)
- **UTM “safe mode” (basic)** *(optional / can be enabled later)*  
  - allowlist only (e.g. `utm_source`, `utm_medium`, `utm_campaign`)
  - normalization to prevent storing arbitrary PII in URLs

---

## What Lean Stats deliberately does NOT do

To keep Lean Stats “lean” and avoid consent-driven tracking patterns, the plugin does **not** provide:

- “Visitors” or “sessions” as exact metrics  
  *(no cookies → no true session tracking)*
- **Unique visitors** (exact), returning visitors, cohorts
- Individual user journeys / clickstreams
- Fingerprinting or probabilistic identification
- Heatmaps, session replay, or behavioral profiling
- Ad / retargeting integrations
- Any tracking that requires third-party scripts

---

## Privacy by design

Lean Stats is designed to minimize data collection:

- **No IP stored in clear**. Ideally, no IP stored at all.
- **Referrer stored as domain only** (no full referrer URLs)
- **URL cleaning** by default (strip query strings unless allowlisted)
- **Data retention**: aggregated data kept for reporting; optional short-lived raw logs (if enabled) are limited and purged automatically
- Optional support for **GPC/DNT** signals (configurable)

> Note: Legal requirements vary by jurisdiction and by how a site is configured. Lean Stats is engineered to minimize risk by avoiding common consent-triggering tracking patterns.

---

## Admin UI

Lean Stats integrates directly inside WordPress Admin:

- Gutenberg-style UI using `@wordpress/components`
- Fast dashboard: KPIs, time series charts, and top lists
- Minimal interactions: tooltips, skeleton loading, and clear empty states
- Settings screen for strict mode, DNT/GPC compliance, URL allowlists, retention, and role exclusions

---

## Requirements

- WordPress **6.4+**
- PHP **8.0+**

---

## Roadmap

- Expanded “Content” view (pages, 404, internal search)
- Acquisition view (referrers, safe campaign tracking)
- Improved export options *(available in Pro)*
- Annotations & comparisons *(available in Pro)*

---

## Lean Stats Pro

Lean Stats Pro is a premium add-on that unlocks advanced admin tools while keeping the same privacy-first philosophy.

➡️ See **Lean Stats Pro** README for details.
