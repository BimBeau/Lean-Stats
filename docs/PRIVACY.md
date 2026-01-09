# Privacy configuration

Lean Stats focuses on aggregated analytics and minimizes personal data by design. The configuration options below control how collection and storage behave.

## Tracking controls

- **Strict mode**: skips tracking for all logged-in users.
- **Excluded roles**: skips tracking for logged-in users with specific WordPress roles.
- **Respect DNT/GPC**: skips tracking when browsers send `DNT: 1` or `Sec-GPC: 1` headers.

## URL handling

- **Strip query strings**: removes all query parameters from tracked page paths by default.
- **Query allowlist**: keeps only specific query keys when stripping is enabled (for example `utm_source`).

## Raw logs

- **Raw logs storage**: disabled by default and controlled by the `lean_stats_raw_logs_enabled` option.
- **Retention**: raw logs expire after the configured retention window and are purged automatically.

## Rate limiting and deduplication

- **Soft rate limiting**: uses a hashed IP stored only in memory cache to prevent bursts.
- **Deduplication window**: ignores identical hits for a short, configurable time window.
