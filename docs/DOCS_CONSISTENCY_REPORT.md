# Documentation Consistency Report

## Checklist

- [x] README.md
- [x] CONTRIBUTING.md
- [x] docs/ARCHITECTURE.md
- [x] docs/DB_SCHEMA.md
- [x] docs/DEBUG.md
- [x] docs/EXTENSION_API.md
- [x] docs/HOOKS.md
- [x] docs/PRIVACY.md
- [x] docs/REST_API.md
- [x] docs/SETTINGS.md

## Mismatches and fixes

| Doc claim | Code truth | Fix applied |
| --- | --- | --- |
| README privacy copy references hashed IPs and soft rate limiting. | Tracking does not hash or rate-limit by IP, and no rate limiting filters exist. | Privacy copy removes hashed IP and rate limiting claims. |
| Settings and privacy docs mention strict mode. | Strict mode is not a stored setting and is not exposed in the admin UI. | Strict mode references are removed from docs. |
| HOOKS.md lists rate limit filters and incorrect cache TTL defaults. | Only cache TTL, dedupe, raw log retention/cleanup, and related filters exist; cache TTL defaults are 60 seconds with 30–120 bounds. | Hook list and defaults reflect implemented filters and ranges. |
| REST API docs omit MaxMind settings fields and validation errors. | Settings payloads include MaxMind credentials and requests without valid credentials return 400 errors. | REST API settings payloads and error responses include MaxMind fields and validation behavior. |
| REST API docs omit `page_title` sorting and `/hits` response behavior. | List endpoints support `page_title` sorting for page-path tables; hit collector returns 201/204 with tracked flags. | Sorting options and hit responses reflect implemented behavior. |
| REST API docs list `entries`/`exits` sorting for entry/exit endpoints. | Sorting allowlist does not include the default metric key for entry/exit endpoints. | Sorting allowlist includes the default metric key for entry/exit endpoints. |
| Architecture doc attributes all aggregates to `template_redirect`. | Server-side tracking writes referrer/404/search/UTM tables, while REST hits populate daily/hourly aggregates and optional raw logs. | Data flow description matches actual tracking and aggregation paths. |

## Open questions

None.
