# Architecture

## Data flow

Lean Stats stores analytics in **aggregated counters** and optional raw logs.

- Front-end requests are tracked on `template_redirect` and written as daily counters in:
  - `wp_lean_stats_hits_daily`
  - `wp_lean_stats_404s_daily`
  - `wp_lean_stats_search_terms_daily`
  - `wp_lean_stats_utm_daily`

- When raw logs are enabled, the plugin stores raw hits in the `lean_stats_hits` option.
  A scheduled job (`LEAN_STATS_AGGREGATION_CRON_HOOK`) aggregates these hits with
  `INSERT ... ON DUPLICATE KEY UPDATE` writes into the `wp_lean_stats_daily` and
  `wp_lean_stats_hourly` tables.

The admin dashboard reads KPIs and time series from the aggregated tables, including
referrer source categories from the daily hit counters.

## Admin frontend architecture

Lean Stats admin code lives in `src/admin` and uses a modular structure designed for extension.

### Target tree

```text
src/admin/
├── api/
├── hooks/
├── panels/
├── widgets/
├── lib/
├── constants/
└── components/
```

### Folder roles

- `api/`: REST request helpers and endpoint-specific data hooks for admin screens.
- `hooks/`: shared React hooks used across multiple panels and widgets.
- `panels/`: top-level admin views registered in the panel registry and mounted by the admin shell.
- `widgets/`: reusable dashboard and report UI blocks composed inside panels.
- `lib/`: generic utilities (dates, formatting, storage, and similar cross-cutting helpers).
- `constants/`: shared static keys and option values consumed across the admin frontend.
- `components/`: shared presentational primitives built with the Gutenberg design system.

### Single entry point

The admin frontend exposes one JavaScript entry point: `src/admin/index.js`. It bootstraps `AdminApp`, mounts the shared shell for every panel route, and loads the panel registry used by the extension API.
