# Settings

Lean Stats stores settings in the `lean_stats_settings` option and exposes them through the admin settings screen and the REST endpoint `GET /admin/settings`.

## Settings reference

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `plugin_label` | string | `""` | Overrides the plugin name used in the admin menu and dashboard heading when set. |
| `strict_mode` | boolean | `false` | Skips tracking for all logged-in users. |
| `respect_dnt_gpc` | boolean | `true` | Skips tracking when `DNT: 1` or `Sec-GPC: 1` headers are present. |
| `url_strip_query` | boolean | `true` | Removes query strings from tracked page paths. |
| `url_query_allowlist` | array | `[]` | Keeps only listed query keys when query stripping is enabled. |
| `raw_logs_retention_days` | integer | `1` | Retention window (1–365 days) for raw logs when raw logging is enabled. |
| `excluded_roles` | array | `[]` | Skips tracking for logged-in users in the listed WordPress roles. |
| `debug_enabled` | boolean | `false` | Enables verbose console logging for Lean Stats admin screens. |

## Raw logs option

Raw logs storage is controlled by the separate `lean_stats_raw_logs_enabled` option (default `false`).
