# Architecture

## Flux de données

Le plugin enregistre les hits bruts dans l’option `lean_stats_hits` quand le stockage des logs bruts est activé. Un job planifié (`LEAN_STATS_AGGREGATION_CRON_HOOK`) agrège ces hits en écriture `INSERT ... ON DUPLICATE KEY UPDATE` dans les tables `wp_lean_stats_daily` et `wp_lean_stats_hourly`. Le dashboard admin lit les KPIs et les séries temporelles depuis ces tables agrégées.
