# REST API

## Collecte des hits

**Namespace** : `lean-stats/v1`

### POST `/hits`

Enregistre un hit de page.

Paramètres JSON :

- `page_path` (string, requis)
- `post_id` (integer, optionnel)
- `referrer_domain` (string, optionnel)
- `device_class` (string, requis)
- `timestamp_bucket` (integer, requis)

## API admin

**Namespace** : `lean-stats/internal/v1`

Les routes admin requièrent :

- un utilisateur avec la capacité `manage_options`
- un nonce REST (`X-WP-Nonce` ou `_wpnonce`)

### GET `/admin/kpis`

Retourne les indicateurs agrégés (hits totaux, pages uniques, referrers uniques).

Paramètres :

- `start` (YYYY-MM-DD, optionnel)
- `end` (YYYY-MM-DD, optionnel)

### GET `/admin/top-pages`

Retourne les pages les plus vues.

Paramètres :

- `start` (YYYY-MM-DD, optionnel)
- `end` (YYYY-MM-DD, optionnel)
- `limit` (integer, optionnel, défaut 10, max 100)

### GET `/admin/referrers`

Retourne les domaines référents les plus fréquents.

Paramètres :

- `start` (YYYY-MM-DD, optionnel)
- `end` (YYYY-MM-DD, optionnel)
- `limit` (integer, optionnel, défaut 10, max 100)

### GET `/admin/timeseries/day`

Retourne une série temporelle par jour.

Paramètres :

- `start` (YYYY-MM-DD, optionnel)
- `end` (YYYY-MM-DD, optionnel)

### GET `/admin/timeseries/hour`

Retourne une série temporelle par heure.

Paramètres :

- `start` (YYYY-MM-DD HH:MM:SS, optionnel)
- `end` (YYYY-MM-DD HH:MM:SS, optionnel)

### GET `/admin/device-split`

Retourne la répartition des hits par type de device.

Paramètres :

- `start` (YYYY-MM-DD, optionnel)
- `end` (YYYY-MM-DD, optionnel)

### GET `/admin/settings`

Retourne les réglages Lean Stats.

Champs renvoyés :

- `plugin_label` (string)
- `strict_mode` (boolean)
- `respect_dnt_gpc` (boolean)
- `url_strip_query` (boolean)
- `url_query_allowlist` (array)
- `raw_logs_enabled` (boolean)
- `raw_logs_retention_days` (integer)
- `excluded_roles` (array)
- `debug_enabled` (boolean)

### POST `/admin/settings`

Met à jour les réglages Lean Stats.

Payload JSON :

- `plugin_label` (string, optionnel)
- `strict_mode` (boolean, optionnel)
- `respect_dnt_gpc` (boolean, optionnel)
- `url_strip_query` (boolean, optionnel)
- `url_query_allowlist` (array, optionnel)
- `raw_logs_enabled` (boolean, optionnel)
- `raw_logs_retention_days` (integer, optionnel)
- `excluded_roles` (array, optionnel)
- `debug_enabled` (boolean, optionnel)

### GET `/admin/raw-logs`

Retourne les derniers logs bruts lorsque le mode debug est activé.

Paramètres :

- `limit` (integer, optionnel, défaut 50, max 100)

Champs renvoyés :

- `timestamp_bucket` (integer)
- `page_path` (string)
- `referrer_domain` (string)
- `device_class` (string)
- `post_id` (integer, nullable)
