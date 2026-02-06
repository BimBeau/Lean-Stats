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

### `wp_lean_stats_entry_exit_daily`

Stores aggregated entry and exit counts per day and page path.

Columns:

- `date_bucket` (date)
- `page_path` (string, partially indexed)
- `entries` (bigint)
- `exits` (bigint)

Indexes:

- Primary key: `(date_bucket, page_path(255))`
- Index: `date_bucket`
- Index: `page_path(255)`

### `wp_lean_stats_geo_daily`

Stores aggregated geolocation hits per day, country, region, and city.

Columns:

- `date_bucket` (date)
- `country_code` (string, ISO 3166-1 alpha-2)
- `region_code` (string)
- `city_name` (string)
- `hits` (bigint)

Indexes:

- Primary key: `(date_bucket, country_code, region_code, city_name(191))`
- Index: `date_bucket`
- Index: `country_code`
- Index: `region_code`
- Index: `city_name(191)`

### `wp_lean_stats_utm_daily`

Stores aggregated UTM parameters per day.

Columns:

- `date_bucket` (date)
- `utm_key` (string)
- `utm_value` (string)
- `hits` (bigint)

Indexes:

- Primary key: `(date_bucket, utm_key, utm_value(191))`
- Index: `date_bucket`
- Index: `utm_key`
- Index: `utm_value(191)`

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
