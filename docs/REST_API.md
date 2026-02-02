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

- `overview.visits` (integer)
- `overview.pageViews` (integer)
- `overview.uniquePages` (integer)
- `overview.uniqueReferrers` (integer)
- `overview.notFoundHits` (integer)
- `overview.searchHits` (integer)
- `overview.uniqueSearchTerms` (integer)
- `comparison.range.start` (YYYY-MM-DD)
- `comparison.range.end` (YYYY-MM-DD)
- `comparison.overview.visits` (integer)
- `comparison.overview.pageViews` (integer)
- `comparison.overview.uniquePages` (integer)
- `comparison.overview.uniqueReferrers` (integer)
- `comparison.overview.notFoundHits` (integer)
- `comparison.overview.searchHits` (integer)
- `comparison.overview.uniqueSearchTerms` (integer)
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

### GET `/admin/geolocation`

Returns geolocation data for the current request IP using the MaxMind API.

Response (200):

```json
{
  "location": {
    "ip": "203.0.113.10",
    "country": "France",
    "region": "Île-de-France",
    "city": "Paris",
    "source": "maxmind-api"
  }
}
```

### GET `/admin/kpis`

Returns aggregated KPIs (visits, page views, unique referrers). Visits are aggregated from entry hits (anonymous sessions).

Parameters:

- `start` (YYYY-MM-DD, optional)
- `end` (YYYY-MM-DD, optional)

Response (200):

```json
{
  "range": {
    "start": "2024-01-01",
    "end": "2024-01-30"
  },
  "kpis": {
    "visits": 320,
    "pageViews": 1200,
    "uniqueReferrers": 48
  }
}
```

### GET `/admin/top-pages`

Returns the most viewed pages.

Parameters:

- `start` (YYYY-MM-DD, optional)
- `end` (YYYY-MM-DD, optional)
- `limit` (integer, optional, default 10, max 100)

Response (200):

```json
{
  "range": {
    "start": "2024-01-01",
    "end": "2024-01-30"
  },
  "items": [
    {
      "label": "/",
      "hits": 240
    }
  ]
}
```

### GET `/admin/referrers`

Returns the most frequent referrer domains.

Parameters:

- `start` (YYYY-MM-DD, optional)
- `end` (YYYY-MM-DD, optional)
- `limit` (integer, optional, default 10, max 100)

Response (200):

```json
{
  "range": {
    "start": "2024-01-01",
    "end": "2024-01-30"
  },
  "items": [
    {
      "label": "google.com",
      "hits": 120
    }
  ]
}
```

### GET `/admin/timeseries/day`

Returns a daily time series.

Parameters:

- `start` (YYYY-MM-DD, optional)
- `end` (YYYY-MM-DD, optional)

Response (200):

```json
{
  "range": {
    "start": "2024-01-01",
    "end": "2024-01-30"
  },
  "items": [
    {
      "bucket": "2024-01-01",
      "hits": 42
    }
  ]
}
```

### GET `/admin/timeseries/hour`

Returns an hourly time series.

Parameters:

- `start` (YYYY-MM-DD HH:MM:SS, optional)
- `end` (YYYY-MM-DD HH:MM:SS, optional)

Response (200):

```json
{
  "range": {
    "start": "2024-01-01 00:00:00",
    "end": "2024-01-01 23:00:00"
  },
  "items": [
    {
      "bucket": "2024-01-01 08:00:00",
      "hits": 7
    }
  ]
}
```

### GET `/admin/device-split`

Returns the hit breakdown by device type.

Parameters:

- `start` (YYYY-MM-DD, optional)
- `end` (YYYY-MM-DD, optional)

Response (200):

```json
{
  "range": {
    "start": "2024-01-01",
    "end": "2024-01-30"
  },
  "items": [
    {
      "label": "desktop",
      "hits": 300
    }
  ]
}
```

### GET `/admin/settings`

Returns Lean Stats settings.

Returned fields:

- `plugin_label` (string)
- `respect_dnt_gpc` (boolean)
- `url_strip_query` (boolean)
- `url_query_allowlist` (array)
- `raw_logs_enabled` (boolean)
- `raw_logs_retention_days` (integer)
- `excluded_roles` (array)
- `excluded_paths` (array)
- `debug_enabled` (boolean)

`raw_logs_enabled` mirrors `debug_enabled` and reflects whether raw log storage is active.

Response (200):

```json
{
  "settings": {
    "plugin_label": "",
    "respect_dnt_gpc": true,
    "url_strip_query": true,
    "url_query_allowlist": [],
    "raw_logs_enabled": false,
    "raw_logs_retention_days": 1,
    "excluded_roles": [],
    "excluded_paths": [],
    "debug_enabled": false
  }
}
```

### POST `/admin/settings`

Updates Lean Stats settings.

JSON payload:

- `plugin_label` (string, optional)
- `respect_dnt_gpc` (boolean, optional)
- `url_strip_query` (boolean, optional)
- `url_query_allowlist` (array, optional)
- `raw_logs_enabled` (boolean, optional)
- `raw_logs_retention_days` (integer, optional)
- `excluded_roles` (array, optional)
- `excluded_paths` (array, optional)
- `debug_enabled` (boolean, optional)

Response (200):

```json
{
  "settings": {
    "plugin_label": "Lean Stats",
    "respect_dnt_gpc": true,
    "url_strip_query": true,
    "url_query_allowlist": [],
    "raw_logs_enabled": false,
    "raw_logs_retention_days": 1,
    "excluded_roles": [],
    "excluded_paths": [],
    "debug_enabled": false
  }
}
```

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

Response (200):

```json
{
  "items": [
    {
      "timestamp_bucket": 1716729600,
      "page_path": "/",
      "referrer_domain": "google.com",
      "device_class": "desktop",
      "post_id": 123
    }
  ]
}
```

Response (403 when debug mode is disabled):

```json
{
  "message": "Debug mode is disabled."
}
```

### POST `/admin/purge-data`

Purges aggregated analytics tables and raw logs.

Response (200):

```json
{
  "purged": true,
  "details": {
    "tables": {
      "lean_stats_daily": 0,
      "lean_stats_hourly": 0,
      "lean_stats_hits_daily": 0,
      "lean_stats_entry_exit_daily": 0,
      "lean_stats_404s_daily": 0,
      "lean_stats_search_terms_daily": 0,
      "lean_stats_utm_daily": 0
    },
    "rawLogsPurged": true
  }
}
```
