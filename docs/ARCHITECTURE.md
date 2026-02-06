# Architecture

## Data flow

Lean Stats stores analytics in **aggregated counters** and optional raw logs.

- Server-side tracking runs on `template_redirect` and records:
  - Referrer source categories in `wp_lean_stats_hits_daily`
  - Entry/exit counts in `wp_lean_stats_entry_exit_daily`
  - 404 counts in `wp_lean_stats_404s_daily`
  - Internal search terms in `wp_lean_stats_search_terms_daily`
  - Allowlisted UTM values in `wp_lean_stats_utm_daily`

- The front-end tracker posts to the REST hit endpoint (`POST /hits`), which stores:
  - Aggregated page-view rows in `wp_lean_stats_daily`
  - Optional hourly aggregates in `wp_lean_stats_hourly`
  - Entry/exit totals in `wp_lean_stats_entry_exit_daily`
  - Referrer source categories in `wp_lean_stats_hits_daily`

- When raw logs are enabled, the REST hit endpoint also stores raw hits in the
  `lean_stats_hits` option. A scheduled job (`LEAN_STATS_AGGREGATION_CRON_HOOK`)
  aggregates any unprocessed raw hits into the daily/hourly tables.

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
