# Database Schema

## Tables

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
- Index: `page_path(255)`
- Index: `referrer_domain`

### `wp_lean_stats_sessions`

Stores anonymized visit sessions per day.

Columns:

- `date_bucket` (date)
- `session_hash` (char(64))

Indexes:

- Primary key: `(date_bucket, session_hash)`
- Index: `date_bucket`
