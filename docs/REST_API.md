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

- `strict_mode` (boolean)
- `respect_dnt_gpc` (boolean)
- `url_strip_query` (boolean)
- `url_query_allowlist` (array)
- `raw_logs_retention_days` (integer)
- `excluded_roles` (array)

### POST `/admin/settings`

Met à jour les réglages Lean Stats.

Payload JSON :

- `strict_mode` (boolean, optionnel)
- `respect_dnt_gpc` (boolean, optionnel)
- `url_strip_query` (boolean, optionnel)
- `url_query_allowlist` (array, optionnel)
- `raw_logs_retention_days` (integer, optionnel)
- `excluded_roles` (array, optionnel)
