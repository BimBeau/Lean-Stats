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

### Protected report endpoints

These endpoints require an authenticated user with the required capability (filterable via `lean_stats_admin_capability`) and a REST nonce (`X-WP-Nonce` or `_wpnonce`).

#### GET `/overview`

Returns aggregated overview metrics.

Parameters:

- `start` (YYYY-MM-DD, optional)
- `end` (YYYY-MM-DD, optional)

Returned fields:

- `overview.pageViews` (integer)
- `overview.uniquePages` (integer)
- `overview.uniqueReferrers` (integer)
- `overview.notFoundHits` (integer)
- `overview.searchHits` (integer)
- `overview.uniqueSearchTerms` (integer)
- `series.interval` (`day` or `hour`)
- `series.items` (array of `{ bucket, hits }` objects)

Series behavior:

- Hourly series returns when the date range is short and hourly aggregation is available.
- Daily series returns when hourly aggregation is unavailable or the range exceeds the hourly threshold.

#### GET `/top-pages`

Returns paginated page view totals by page path.

Parameters:

- `start` (YYYY-MM-DD, optional)
- `end` (YYYY-MM-DD, optional)
- `page` (integer, optional, default 1)
- `per_page` (integer, optional, default 10, max 100)
- `orderby` (`hits` or `label`, optional, default `hits`)
- `order` (`asc` or `desc`, optional, default `desc`)

#### GET `/referrers`

Returns paginated hit totals by referrer domain.

Parameters: same as `/top-pages`.

#### GET `/referrer-sources`

Returns paginated hit totals by referrer domain and source category.

Parameters: same as `/top-pages`, with `orderby` values `hits`, `referrer`, or `category`.

#### GET `/404s`

Returns paginated hit totals for 404 paths.

Parameters: same as `/top-pages`.

#### GET `/search-terms`

Returns paginated hit totals for search terms.

Parameters: same as `/top-pages`.

#### GET `/entry-pages`

Returns paginated entry totals by page path.

Entry counts are aggregated approximations based on referrer presence. An entry is counted when the referrer domain is empty or external to the site.

Parameters:

- `start` (YYYY-MM-DD, optional)
- `end` (YYYY-MM-DD, optional)
- `page` (integer, optional, default 1)
- `per_page` (integer, optional, default 10, max 100)
- `orderby` (`entries` or `label`, optional, default `entries`)
- `order` (`asc` or `desc`, optional, default `desc`)

#### GET `/exit-pages`

Returns paginated exit totals by page path.

Exit counts are aggregated approximations based on referrer presence. An exit is counted when the referrer domain is empty or external to the site.

Parameters:

- `start` (YYYY-MM-DD, optional)
- `end` (YYYY-MM-DD, optional)
- `page` (integer, optional, default 1)
- `per_page` (integer, optional, default 10, max 100)
- `orderby` (`exits` or `label`, optional, default `exits`)
- `order` (`asc` or `desc`, optional, default `desc`)

#### POST `/purge`

Purges cached analytics responses.

## Admin API

**Namespace**: `lean-stats/internal/v1`

Admin routes require:

- a user with the required capability (filterable via `lean_stats_admin_capability`)
- a REST nonce (`X-WP-Nonce` or `_wpnonce`)

### GET `/admin/kpis`

Returns aggregated KPIs (visits, page views, unique referrers).

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
- `utm_allowlist` (array)
- `raw_logs_enabled` (boolean)
- `raw_logs_retention_days` (integer)
- `excluded_roles` (array)
- `excluded_paths` (array)
- `debug_enabled` (boolean)

`raw_logs_enabled` mirrors `debug_enabled` and reflects whether raw log storage is active.

### POST `/admin/settings`

Updates Lean Stats settings.

JSON payload:

- `plugin_label` (string, optional)
- `strict_mode` (boolean, optional)
- `respect_dnt_gpc` (boolean, optional)
- `url_strip_query` (boolean, optional)
- `url_query_allowlist` (array, optional)
- `utm_allowlist` (array, optional)
- `raw_logs_enabled` (boolean, optional)
- `raw_logs_retention_days` (integer, optional)
- `excluded_roles` (array, optional)
- `excluded_paths` (array, optional)
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

### POST `/admin/purge-data`

Purges aggregated analytics tables and raw logs.
