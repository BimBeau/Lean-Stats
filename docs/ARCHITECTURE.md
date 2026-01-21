# Architecture

## Data flow

Lean Stats stores analytics in **aggregated counters** and optional raw logs.

- Front-end requests are tracked on `template_redirect` and written as daily counters in:
  - `wp_lean_stats_hits_daily`
  - `wp_lean_stats_404s_daily`
  - `wp_lean_stats_search_terms_daily`

- When raw logs are enabled, the plugin stores raw hits in the `lean_stats_hits` option.
  A scheduled job (`LEAN_STATS_AGGREGATION_CRON_HOOK`) aggregates these hits with
  `INSERT ... ON DUPLICATE KEY UPDATE` writes into the `wp_lean_stats_daily` and
  `wp_lean_stats_hourly` tables.

The admin dashboard reads KPIs and time series from the aggregated tables.
