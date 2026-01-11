# Architecture

## Data flow

The plugin stores raw hits in the `lean_stats_hits` option when raw log storage is enabled. A scheduled job (`LEAN_STATS_AGGREGATION_CRON_HOOK`) aggregates these hits with `INSERT ... ON DUPLICATE KEY UPDATE` writes into the `wp_lean_stats_daily` and `wp_lean_stats_hourly` tables. The admin dashboard reads KPIs and time series from these aggregated tables.
