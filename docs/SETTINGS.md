# Settings

Lean Stats stores settings in the `lean_stats_settings` option and exposes them through the admin settings screen and the REST endpoint `GET /admin/settings`.

## Settings overview

### URL cleaning

Lean Stats strips query strings from tracked page paths by default and keeps only allowlisted query keys. The same allowlist controls which UTM parameters are aggregated.

### Exclusions

Lean Stats skips tracking for excluded WordPress roles and excluded URL paths. To ignore all logged-in users, exclude every available role.

### DNT/GPC

Lean Stats respects `DNT: 1` and `Sec-GPC: 1` when the privacy toggle is enabled.

### Retention

Raw logs are stored only when debug mode is enabled and expire based on the configured retention window.

### Geolocation

Lean Stats resolves the current request IP on demand to display the visitor country, region, and city. MaxMind is the only supported lookup method. Configuration requires both the MaxMind Account ID and License Key to enable IP geolocation.

### Purge

The purge action deletes aggregated analytics tables and raw logs while leaving settings untouched.

## Settings reference

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `plugin_label` | string | `""` | Overrides the plugin name used in the admin menu and dashboard heading when set. |
| `respect_dnt_gpc` | boolean | `true` | Skips tracking when `DNT: 1` or `Sec-GPC: 1` headers are present. |
| `url_strip_query` | boolean | `true` | Removes query strings from tracked page paths. |
| `url_query_allowlist` | array | `[]` | Keeps only listed query keys when query stripping is enabled and aggregates matching UTM values. |
| `raw_logs_enabled` | boolean | `false` | Mirrors the debug mode state to control raw log storage. |
| `raw_logs_retention_days` | integer | `1` | Retention window (1–365 days) for raw logs when debug mode is enabled. |
| `excluded_roles` | array | `[]` | Skips tracking for logged-in users in the listed WordPress roles. |
| `excluded_paths` | array | `[]` | Skips tracking for requests that match the listed URL paths. |
| `debug_enabled` | boolean | `false` | Enables verbose console logging for Lean Stats admin screens. |
| `maxmind_account_id` | string | `""` | MaxMind Account ID used for IP geolocation. |
| `maxmind_license_key` | string | `""` | MaxMind License Key used for IP geolocation. |

## Debug mode and raw logs

Configuration: set `debug_enabled` to `true` in `lean_stats_settings` or via `POST /admin/settings` to store raw hits in `lean_stats_hits`.
Behavior: the cleanup hook (`LEAN_STATS_RAW_LOGS_CRON_HOOK`) uses the retention window schedule and deletes raw hits older than `raw_logs_retention_days`, regardless of the current storage state.

## Admin logs tab

The settings screen exposes a "Logs" tab when debug mode is enabled. The tab lists the most recent raw hits stored in `lean_stats_hits` (timestamp, page path, referrer, device).

## Data management

The "Purge analytics data" action deletes aggregated analytics tables and raw logs while leaving settings unchanged.
