# Lean Stats

Lean Stats is a **privacy-friendly, self-hosted analytics plugin for WordPress**.  
It provides lightweight, consent-free statistics without cookies, identifiers, or third-party scripts.

The plugin is designed for site administrators who want reliable aggregate insights while minimizing data collection.

## Description

Lean Stats tracks **aggregate site activity**, not individual users.

It does not use cookies, localStorage, sessionStorage, fingerprinting, or persistent identifiers.  
All analytics are processed and stored locally within WordPress.

The admin interface is built using the native Gutenberg component system.

## Metrics

Lean Stats provides the following metrics:

- Page views (total page loads)
- Visits (anonymous sessions approximated from entry hits)
- Time series (daily, optionally hourly)
- Top pages by page views
- Referrer domains (domain only)
- Device class (mobile, desktop, tablet, bot)
- 404 errors (missing URLs with counts)
- Internal WordPress search terms (counts only)
- UTM campaign tracking (allowlist-based)

## Data collection

Lean Stats stores **aggregated counts only**.

Collected data includes:

- Cleaned page paths
- Daily or hourly hit totals
- Referrer domains
- Device classes
- 404 paths with counts
- Internal search terms with counts
- Allowlisted UTM campaign values

The plugin does **not** store IP addresses, user identifiers, full referrer URLs, or query strings outside of allowlists.

## What Lean Stats does not track

- Unique visitors (exact)
- Returning visitors or cohorts
- Individual user journeys or clickstreams
- Cookies or persistent identifiers
- Fingerprinting or probabilistic identifiers
- Session replay, heatmaps, or behavioral profiling
- Advertising or retargeting data

## Privacy

Lean Stats is designed to minimize compliance risk:

- No IP address storage
- Referrers stored as domain only
- URL query strings stripped by default
- Optional respect for DNT and GPC signals
- Optional short-lived raw logs available only in debug mode

Legal requirements vary by jurisdiction. Site owners remain responsible for compliance.

## Admin interface

- Native WordPress admin interface
- Built with `@wordpress/components`
- Dashboard with key metrics and charts that display visits and page views as dual lines with tooltips
- Settings for privacy options, exclusions, retention, and debug mode
- Optional geolocation via MaxMind (no IP storage)

## Requirements

- WordPress 6.4 or later
- PHP 8.0 or later

## Documentation

Additional documentation is available in the plugin repository:

- Privacy configuration
- Settings reference
- Hooks and filters
- REST API
- Database schema
- Architecture overview
