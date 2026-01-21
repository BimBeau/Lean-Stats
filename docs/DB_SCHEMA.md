# Database Schema

## Tables

### `wp_lean_stats_hits_daily`

Stores aggregated hits per day, page path, referrer domain, and source category.

Columns:

- `date_bucket` (date)
- `page_path` (string, partially indexed)
- `referrer_domain` (string)
- `source_category` (string)
- `hits` (bigint)

Indexes:

- Primary key: `(date_bucket, page_path(255), referrer_domain, source_category)`
- Index: `date_bucket`
- Index: `(date_bucket, page_path(255))`
- Index: `(date_bucket, referrer_domain)`
- Index: `(date_bucket, page_path(255), referrer_domain)`
- Index: `page_path(255)`
- Index: `referrer_domain`
- Index: `source_category`

### `wp_lean_stats_404s_daily`

Stores missing paths per day.

Columns:

- `date_bucket` (date)
- `page_path` (string, partially indexed)
- `hits` (bigint)

Indexes:

- Primary key: `(date_bucket, page_path(255))`
- Index: `date_bucket`
- Index: `page_path(255)`

### `wp_lean_stats_search_terms_daily`

Stores search terms per day.

Columns:

- `date_bucket` (date)
- `search_term` (string)
- `hits` (bigint)

Indexes:

- Primary key: `(date_bucket, search_term(191))`
- Index: `date_bucket`
- Index: `search_term(191)`

### `wp_lean_stats_daily`

Stores aggregated hits per day, page, referrer, and device type.

Columns:

- `date_bucket` (date)
- `page_path` (string, partially indexed)
- `referrer_domain` (string)
- `device_class` (string)
- `hits` (bigint)

Indexes:

- Primary key: `(date_bucket, page_path(255), referrer_domain, device_class)`
- Index: `date_bucket`
- Index: `(date_bucket, page_path(255))`
- Index: `(date_bucket, referrer_domain)`
- Index: `(date_bucket, page_path(255), referrer_domain)`
- Index: `page_path(255)`
- Index: `referrer_domain`

### `wp_lean_stats_hourly`

Stores aggregated hits per hour, page, referrer, and device type.

Columns:

- `date_bucket` (datetime)
- `page_path` (string, partially indexed)
- `referrer_domain` (string)
- `device_class` (string)
- `hits` (bigint)

Indexes:

- Primary key: `(date_bucket, page_path(255), referrer_domain, device_class)`
- Index: `date_bucket`
- Index: `(date_bucket, page_path(255))`
- Index: `(date_bucket, referrer_domain)`
- Index: `(date_bucket, page_path(255), referrer_domain)`
- Index: `page_path(255)`
- Index: `referrer_domain`
