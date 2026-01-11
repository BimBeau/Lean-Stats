# REST API

## Hit collection

**Namespace**: `lean-stats/v1`

### POST `/hits`

Records a page hit.

JSON parameters:

- `page_path` (string, required)
- `post_id` (integer, optional)
- `referrer_domain` (string, optional)
- `device_class` (string, required)
- `timestamp_bucket` (integer, required)

## Admin API

**Namespace**: `lean-stats/internal/v1`

Admin routes require:

- a user with the `manage_options` capability
- a REST nonce (`X-WP-Nonce` or `_wpnonce`)

### GET `/admin/kpis`

Returns aggregated KPIs (total hits, unique pages, unique referrers).

Parameters:

- `start` (YYYY-MM-DD, optional)
- `end` (YYYY-MM-DD, optional)

### GET `/admin/top-pages`

Returns the most viewed pages.

Parameters:

- `start` (YYYY-MM-DD, optional)
- `end` (YYYY-MM-DD, optional)
- `limit` (integer, optional, default 10, max 100)

### GET `/admin/referrers`

Returns the most frequent referrer domains.

Parameters:

- `start` (YYYY-MM-DD, optional)
- `end` (YYYY-MM-DD, optional)
- `limit` (integer, optional, default 10, max 100)

### GET `/admin/timeseries/day`

Returns a daily time series.

Parameters:

- `start` (YYYY-MM-DD, optional)
- `end` (YYYY-MM-DD, optional)

### GET `/admin/timeseries/hour`

Returns an hourly time series.

Parameters:

- `start` (YYYY-MM-DD HH:MM:SS, optional)
- `end` (YYYY-MM-DD HH:MM:SS, optional)

### GET `/admin/device-split`

Returns the hit breakdown by device type.

Parameters:

- `start` (YYYY-MM-DD, optional)
- `end` (YYYY-MM-DD, optional)

### GET `/admin/settings`

Returns Lean Stats settings.

Returned fields:

- `plugin_label` (string)
- `strict_mode` (boolean)
- `respect_dnt_gpc` (boolean)
- `url_strip_query` (boolean)
- `url_query_allowlist` (array)
- `raw_logs_enabled` (boolean)
- `raw_logs_retention_days` (integer)
- `excluded_roles` (array)
- `debug_enabled` (boolean)

### POST `/admin/settings`

Updates Lean Stats settings.

JSON payload:

- `plugin_label` (string, optional)
- `strict_mode` (boolean, optional)
- `respect_dnt_gpc` (boolean, optional)
- `url_strip_query` (boolean, optional)
- `url_query_allowlist` (array, optional)
- `raw_logs_enabled` (boolean, optional)
- `raw_logs_retention_days` (integer, optional)
- `excluded_roles` (array, optional)
- `debug_enabled` (boolean, optional)

### GET `/admin/raw-logs`

Returns the most recent raw logs when debug mode is enabled.

Parameters:

- `limit` (integer, optional, default 50, max 100)

Returned fields:

- `timestamp_bucket` (integer)
- `page_path` (string)
- `referrer_domain` (string)
- `device_class` (string)
- `post_id` (integer, nullable)
