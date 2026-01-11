# Debug mode

Lean Stats exposes a debug mode for the admin screen (`/wp-admin/admin.php?page=lean-stats`). The mode is disabled by default and stored in the `lean_stats_settings` option under the `debug_enabled` key.

## Activation

Configuration:

- Réglages → **Mode debug** (toggle).
- Valeur stockée : `lean_stats_settings.debug_enabled`.

## Logging behavior

When debug mode is enabled:

- Console logs are prefixed with `[LeanStats]`.
- Logs include timing (`performance.now`), page context, action names, and a short trace id.
- Global guards capture `window.error` and `unhandledrejection` events.
- Runtime hints show user agent, presence of `chrome.runtime`, and a suggestion to reproduce in private browsing.
- The settings screen exposes a "Logs bruts" tab that lists recent raw hits.

When debug mode is disabled:

- Only critical errors are logged.
- No extra console noise is emitted.

## Reproduction guidance

To rule out browser extensions, reproduce issues in a private window and compare console output with debug mode enabled and disabled.

## Manual verification

Checklist:

1. Open `/wp-admin/admin.php?page=lean-stats`.
2. Toggle **Mode debug** on and reload the page.
3. Confirm the console shows `[LeanStats]` logs without deprecation warnings for `SelectControl`.
4. Toggle **Mode debug** off and reload the page.
5. Confirm only critical errors remain in the console.
