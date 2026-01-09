# Database Schema

## Tables

### `wp_lean_stats_daily`

Stocke les hits agrégés par jour, page, référent et type de device.

Colonnes :

- `date_bucket` (date)
- `page_path` (string, indexée partiellement)
- `referrer_domain` (string)
- `device_class` (string)
- `hits` (bigint)

Index :

- Clé primaire : `(date_bucket, page_path(255), referrer_domain, device_class)`
- Index : `date_bucket`
- Index : `(date_bucket, page_path(255))`
- Index : `(date_bucket, referrer_domain)`
- Index : `page_path(255)`
- Index : `referrer_domain`

### `wp_lean_stats_hourly`

Stocke les hits agrégés par heure, page, référent et type de device.

Colonnes :

- `date_bucket` (datetime)
- `page_path` (string, indexée partiellement)
- `referrer_domain` (string)
- `device_class` (string)
- `hits` (bigint)

Index :

- Clé primaire : `(date_bucket, page_path(255), referrer_domain, device_class)`
- Index : `date_bucket`
- Index : `(date_bucket, page_path(255))`
- Index : `(date_bucket, referrer_domain)`
- Index : `page_path(255)`
- Index : `referrer_domain`
