# Extension API

Lean Stats exposes extension points for adding admin panels, REST sources, and analytics behavior overrides.

## Admin panel extensions

Custom admin panels register a React component on `window.LeanStatsAdminPanels` and declare the panel via the `lean_stats_admin_panels` filter. Panels render as submenu pages under Lean Stats and reuse the shared admin shell.

Code integration points:

- Panel registry: `src/admin/panels/registry.js` stores built-in panel definitions and external panel declarations consumed by the admin frontend.
- Admin shell entry: `src/admin/AdminApp.js` mounts the shared shell and resolves panel routes from the registry.

Custom panel code plugs into these two points: register panel metadata in the registry flow, then render inside the shared admin shell route lifecycle.

## REST source extensions

Custom REST data sources register on `lean_stats_rest_sources` and are implemented via the `lean_stats_register_rest_sources` action. The admin UI consumes the declared sources automatically.

## Analytics behavior filters

Lean Stats applies filters for cache TTL, deduplication, rate limiting, raw log retention, and maximum raw log size. See `docs/HOOKS.md` for the full list and examples.

## Reference documentation

- Hooks & filters: `docs/HOOKS.md`
- REST API: `docs/REST_API.md`
- Database schema: `docs/DB_SCHEMA.md`
