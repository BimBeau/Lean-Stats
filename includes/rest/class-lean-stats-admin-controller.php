<?php
/**
 * REST controller for admin analytics queries.
 */

defined('ABSPATH') || exit;

class Lean_Stats_Admin_Controller {
    /**
     * Register routes for admin analytics.
     */
    public function register_routes(): void {
        register_rest_route(
            LEAN_STATS_REST_INTERNAL_NAMESPACE,
            '/admin/settings',
            [
                [
                    'methods' => 'GET',
                    'callback' => [$this, 'get_settings'],
                    'permission_callback' => [$this, 'check_permissions'],
                ],
                [
                    'methods' => 'POST',
                    'callback' => [$this, 'update_settings'],
                    'permission_callback' => [$this, 'check_permissions'],
                ],
            ]
        );

        register_rest_route(
            LEAN_STATS_REST_INTERNAL_NAMESPACE,
            '/admin/geolocation',
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_geolocation'],
                'permission_callback' => [$this, 'check_permissions'],
            ]
        );

        register_rest_route(
            LEAN_STATS_REST_INTERNAL_NAMESPACE,
            '/admin/raw-logs',
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_raw_logs'],
                'permission_callback' => [$this, 'check_permissions'],
                'args' => [
                    'limit' => [
                        'required' => false,
                        'type' => 'integer',
                        'default' => 50,
                    ],
                ],
            ]
        );

        register_rest_route(
            LEAN_STATS_REST_INTERNAL_NAMESPACE,
            '/admin/purge-data',
            [
                'methods' => 'POST',
                'callback' => [$this, 'purge_data'],
                'permission_callback' => [$this, 'check_permissions'],
            ]
        );

        register_rest_route(
            LEAN_STATS_REST_INTERNAL_NAMESPACE,
            '/admin/kpis',
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_kpis'],
                'permission_callback' => [$this, 'check_permissions'],
                'args' => $this->get_date_range_args(),
            ]
        );

        register_rest_route(
            LEAN_STATS_REST_INTERNAL_NAMESPACE,
            '/admin/top-pages',
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_top_pages'],
                'permission_callback' => [$this, 'check_permissions'],
                'args' => array_merge(
                    $this->get_date_range_args(),
                    [
                        'limit' => [
                            'required' => false,
                            'type' => 'integer',
                            'default' => 10,
                        ],
                    ]
                ),
            ]
        );

        register_rest_route(
            LEAN_STATS_REST_INTERNAL_NAMESPACE,
            '/admin/referrers',
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_referrers'],
                'permission_callback' => [$this, 'check_permissions'],
                'args' => array_merge(
                    $this->get_date_range_args(),
                    [
                        'limit' => [
                            'required' => false,
                            'type' => 'integer',
                            'default' => 10,
                        ],
                    ]
                ),
            ]
        );

        register_rest_route(
            LEAN_STATS_REST_INTERNAL_NAMESPACE,
            '/admin/timeseries/day',
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_timeseries_day'],
                'permission_callback' => [$this, 'check_permissions'],
                'args' => $this->get_date_range_args(),
            ]
        );

        register_rest_route(
            LEAN_STATS_REST_INTERNAL_NAMESPACE,
            '/admin/timeseries/hour',
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_timeseries_hour'],
                'permission_callback' => [$this, 'check_permissions'],
                'args' => $this->get_datetime_range_args(),
            ]
        );

        register_rest_route(
            LEAN_STATS_REST_INTERNAL_NAMESPACE,
            '/admin/device-split',
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_device_split'],
                'permission_callback' => [$this, 'check_permissions'],
                'args' => $this->get_date_range_args(),
            ]
        );
    }

    /**
     * Permission check for admin analytics endpoints.
     */
    public function check_permissions(WP_REST_Request $request) {
        $capability = $this->get_required_capability();
        if (!current_user_can($capability)) {
            return new WP_Error(
                'lean_stats_forbidden',
                __('You are not allowed to access analytics data.', 'lean-stats'),
                ['status' => 403]
            );
        }

        $nonce = $request->get_header('X-WP-Nonce');
        if (!$nonce) {
            $nonce = $request->get_param('_wpnonce');
        }

        if (!$nonce || !wp_verify_nonce($nonce, 'wp_rest')) {
            return new WP_Error(
                'lean_stats_invalid_nonce',
                __('Invalid REST API nonce.', 'lean-stats'),
                ['status' => 403]
            );
        }

        return true;
    }

    /**
     * KPIs aggregation.
     */
    public function get_kpis(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $range = $this->get_day_range($request);
        $cache_key = $this->get_cache_key('kpis', $range);
        $cached = $this->get_cached_payload($cache_key);
        if ($cached !== null) {
            return new WP_REST_Response($cached, 200);
        }

        $table = $wpdb->prefix . 'lean_stats_daily';

        $query = $wpdb->prepare(
            "SELECT
                COALESCE(SUM(hits), 0) AS page_views,
                COUNT(DISTINCT NULLIF(referrer_domain, '')) AS unique_referrers
            FROM {$table}
            WHERE date_bucket BETWEEN %s AND %s",
            $range['start'],
            $range['end']
        );

        $row = $wpdb->get_row($query, ARRAY_A);
        $page_views = isset($row['page_views']) ? (int) $row['page_views'] : 0;
        $data = [
            'visits' => $page_views,
            'pageViews' => $page_views,
            'uniqueReferrers' => isset($row['unique_referrers']) ? (int) $row['unique_referrers'] : 0,
        ];

        $payload = [
            'range' => $range,
            'kpis' => $data,
        ];

        $this->set_cached_payload($cache_key, $payload);

        return new WP_REST_Response($payload, 200);
    }

    /**
     * Return current settings.
     */
    public function get_settings(WP_REST_Request $request): WP_REST_Response {
        $settings = lean_stats_get_settings();

        return new WP_REST_Response(
            [
                'settings' => $settings,
            ],
            200
        );
    }

    /**
     * Update settings.
     */
    public function update_settings(WP_REST_Request $request): WP_REST_Response {
        $payload = $request->get_json_params();
        if (!is_array($payload)) {
            $payload = [];
        }

        $settings = lean_stats_update_settings($payload);

        return new WP_REST_Response(
            [
                'settings' => $settings,
            ],
            200
        );
    }

    /**
     * Return server-side geolocation for the current visitor IP.
     */
    public function get_geolocation(WP_REST_Request $request): WP_REST_Response {
        $payload = lean_stats_get_geolocation_payload();

        return new WP_REST_Response(
            [
                'location' => $payload,
            ],
            200
        );
    }

    /**
     * Return latest raw logs when debug mode is enabled.
     */
    public function get_raw_logs(WP_REST_Request $request): WP_REST_Response {
        $settings = lean_stats_get_settings();
        if (empty($settings['debug_enabled'])) {
            return new WP_REST_Response(
                [
                    'message' => __('Debug mode is disabled.', 'lean-stats'),
                ],
                403
            );
        }

        $limit = $this->normalize_limit($request->get_param('limit'));
        $hits = get_option('lean_stats_hits', []);
        if (!is_array($hits)) {
            $hits = [];
        }

        $hits = array_values(
            array_filter(
                $hits,
                static function ($hit): bool {
                    return is_array($hit);
                }
            )
        );
        $hits = array_reverse($hits);
        $hits = array_slice($hits, 0, $limit);

        $items = array_map(
            static function (array $hit): array {
                $timestamp = isset($hit['timestamp_bucket']) ? absint($hit['timestamp_bucket']) : 0;
                $post_id = isset($hit['post_id']) ? absint($hit['post_id']) : 0;

                return [
                    'timestamp_bucket' => $timestamp,
                    'page_path' => isset($hit['page_path']) ? sanitize_text_field((string) $hit['page_path']) : '',
                    'referrer_domain' => isset($hit['referrer_domain'])
                        ? sanitize_text_field((string) $hit['referrer_domain'])
                        : '',
                    'device_class' => isset($hit['device_class'])
                        ? sanitize_key((string) $hit['device_class'])
                        : '',
                    'post_id' => $post_id > 0 ? $post_id : null,
                ];
            },
            $hits
        );

        return new WP_REST_Response(
            [
                'items' => $items,
            ],
            200
        );
    }

    /**
     * Purge analytics data.
     */
    public function purge_data(WP_REST_Request $request): WP_REST_Response {
        $results = lean_stats_purge_analytics_data();

        return new WP_REST_Response(
            [
                'purged' => true,
                'details' => $results,
            ],
            200
        );
    }

    /**
     * Top pages aggregation.
     */
    public function get_top_pages(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $range = $this->get_day_range($request);
        $limit = $this->normalize_limit($request->get_param('limit'));
        $cache_key = $this->get_cache_key(
            'top-pages',
            [
                'range' => $range,
                'limit' => $limit,
            ]
        );
        $cached = $this->get_cached_payload($cache_key);
        if ($cached !== null) {
            return new WP_REST_Response($cached, 200);
        }

        $table = $wpdb->prefix . 'lean_stats_daily';

        $query = $wpdb->prepare(
            "SELECT page_path AS label, SUM(hits) AS hits
            FROM {$table}
            WHERE date_bucket BETWEEN %s AND %s
            GROUP BY page_path
            ORDER BY hits DESC
            LIMIT %d",
            $range['start'],
            $range['end'],
            $limit
        );

        $rows = $wpdb->get_results($query, ARRAY_A);
        $items = array_map(
            static function (array $row): array {
                return [
                    'label' => $row['label'],
                    'hits' => (int) $row['hits'],
                ];
            },
            $rows ?: []
        );

        $payload = [
            'range' => $range,
            'items' => $items,
        ];

        $this->set_cached_payload($cache_key, $payload);

        return new WP_REST_Response($payload, 200);
    }

    /**
     * Top referrers aggregation.
     */
    public function get_referrers(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $range = $this->get_day_range($request);
        $limit = $this->normalize_limit($request->get_param('limit'));
        $cache_key = $this->get_cache_key(
            'referrers',
            [
                'range' => $range,
                'limit' => $limit,
            ]
        );
        $cached = $this->get_cached_payload($cache_key);
        if ($cached !== null) {
            return new WP_REST_Response($cached, 200);
        }

        $table = $wpdb->prefix . 'lean_stats_daily';

        $query = $wpdb->prepare(
            "SELECT referrer_domain AS label, SUM(hits) AS hits
            FROM {$table}
            WHERE date_bucket BETWEEN %s AND %s
            GROUP BY referrer_domain
            ORDER BY hits DESC
            LIMIT %d",
            $range['start'],
            $range['end'],
            $limit
        );

        $rows = $wpdb->get_results($query, ARRAY_A);
        $items = array_map(
            static function (array $row): array {
                return [
                    'label' => $row['label'],
                    'hits' => (int) $row['hits'],
                ];
            },
            $rows ?: []
        );

        $payload = [
            'range' => $range,
            'items' => $items,
        ];

        $this->set_cached_payload($cache_key, $payload);

        return new WP_REST_Response($payload, 200);
    }

    /**
     * Daily timeseries aggregation.
     */
    public function get_timeseries_day(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $range = $this->get_day_range($request);
        $cache_key = $this->get_cache_key('timeseries-day', $range);
        $cached = $this->get_cached_payload($cache_key);
        if ($cached !== null) {
            return new WP_REST_Response($cached, 200);
        }

        $table = $wpdb->prefix . 'lean_stats_daily';

        $query = $wpdb->prepare(
            "SELECT date_bucket AS bucket, SUM(hits) AS hits
            FROM {$table}
            WHERE date_bucket BETWEEN %s AND %s
            GROUP BY date_bucket
            ORDER BY date_bucket ASC",
            $range['start'],
            $range['end']
        );

        $rows = $wpdb->get_results($query, ARRAY_A);
        $items = array_map(
            static function (array $row): array {
                return [
                    'bucket' => $row['bucket'],
                    'hits' => (int) $row['hits'],
                ];
            },
            $rows ?: []
        );

        $payload = [
            'range' => $range,
            'items' => $items,
        ];

        $this->set_cached_payload($cache_key, $payload);

        return new WP_REST_Response($payload, 200);
    }

    /**
     * Hourly timeseries aggregation.
     */
    public function get_timeseries_hour(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $range = $this->get_hour_range($request);
        $cache_key = $this->get_cache_key('timeseries-hour', $range);
        $cached = $this->get_cached_payload($cache_key);
        if ($cached !== null) {
            return new WP_REST_Response($cached, 200);
        }

        $table = $wpdb->prefix . 'lean_stats_hourly';

        $query = $wpdb->prepare(
            "SELECT date_bucket AS bucket, SUM(hits) AS hits
            FROM {$table}
            WHERE date_bucket BETWEEN %s AND %s
            GROUP BY date_bucket
            ORDER BY date_bucket ASC",
            $range['start'],
            $range['end']
        );

        $rows = $wpdb->get_results($query, ARRAY_A);
        $items = array_map(
            static function (array $row): array {
                return [
                    'bucket' => $row['bucket'],
                    'hits' => (int) $row['hits'],
                ];
            },
            $rows ?: []
        );

        $payload = [
            'range' => $range,
            'items' => $items,
        ];

        $this->set_cached_payload($cache_key, $payload);

        return new WP_REST_Response($payload, 200);
    }

    /**
     * Device class split aggregation.
     */
    public function get_device_split(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $range = $this->get_day_range($request);
        $cache_key = $this->get_cache_key('device-split', $range);
        $cached = $this->get_cached_payload($cache_key);
        if ($cached !== null) {
            return new WP_REST_Response($cached, 200);
        }

        $table = $wpdb->prefix . 'lean_stats_daily';

        $query = $wpdb->prepare(
            "SELECT device_class AS label, SUM(hits) AS hits
            FROM {$table}
            WHERE date_bucket BETWEEN %s AND %s
            GROUP BY device_class
            ORDER BY hits DESC",
            $range['start'],
            $range['end']
        );

        $rows = $wpdb->get_results($query, ARRAY_A);
        $items = array_map(
            static function (array $row): array {
                return [
                    'label' => $row['label'],
                    'hits' => (int) $row['hits'],
                ];
            },
            $rows ?: []
        );

        $payload = [
            'range' => $range,
            'items' => $items,
        ];

        $this->set_cached_payload($cache_key, $payload);

        return new WP_REST_Response($payload, 200);
    }

    /**
     * Common date range args for day aggregation.
     */
    private function get_date_range_args(): array {
        return [
            'start' => [
                'required' => false,
                'type' => 'string',
            ],
            'end' => [
                'required' => false,
                'type' => 'string',
            ],
        ];
    }

    /**
     * Common datetime range args for hour aggregation.
     */
    private function get_datetime_range_args(): array {
        return [
            'start' => [
                'required' => false,
                'type' => 'string',
            ],
            'end' => [
                'required' => false,
                'type' => 'string',
            ],
        ];
    }

    /**
     * Normalize a requested limit.
     */
    private function normalize_limit($limit): int {
        $limit = absint($limit);
        if ($limit === 0) {
            $limit = 10;
        }

        return min($limit, 100);
    }

    /**
     * Resolve day range with defaults.
     */
    private function get_day_range(WP_REST_Request $request): array {
        $now = current_time('timestamp');
        $default_end = wp_date('Y-m-d', $now);
        $default_start = wp_date('Y-m-d', $now - (29 * DAY_IN_SECONDS));

        $start = sanitize_text_field((string) $request->get_param('start'));
        $end = sanitize_text_field((string) $request->get_param('end'));

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $start)) {
            $start = $default_start;
        }

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $end)) {
            $end = $default_end;
        }

        if (strtotime($start) > strtotime($end)) {
            $start = $default_start;
            $end = $default_end;
        }

        return [
            'start' => $start,
            'end' => $end,
        ];
    }

    /**
     * Resolve hour range with defaults.
     */
    private function get_hour_range(WP_REST_Request $request): array {
        $now = current_time('timestamp');
        $default_end = wp_date('Y-m-d H:00:00', $now);
        $default_start = wp_date('Y-m-d H:00:00', $now - (23 * HOUR_IN_SECONDS));

        $start = sanitize_text_field((string) $request->get_param('start'));
        $end = sanitize_text_field((string) $request->get_param('end'));

        if (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $start)) {
            $start = $default_start;
        }

        if (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $end)) {
            $end = $default_end;
        }

        if (strtotime($start) > strtotime($end)) {
            $start = $default_start;
            $end = $default_end;
        }

        return [
            'start' => $start,
            'end' => $end,
        ];
    }

    /**
     * Resolve cache TTL for admin analytics.
     */
    private function get_cache_ttl(): int {
        $ttl = (int) apply_filters('lean_stats_admin_cache_ttl', 60);

        return max(30, min(120, $ttl));
    }

    /**
     * Build a cache key for admin analytics responses.
     */
    private function get_cache_key(string $endpoint, array $params): string {
        $payload = [
            'endpoint' => $endpoint,
            'params' => $params,
        ];

        return lean_stats_get_admin_cache_key(md5(wp_json_encode($payload)));
    }

    /**
     * Fetch cached response payload.
     */
    private function get_cached_payload(string $cache_key): ?array {
        $cached = wp_cache_get($cache_key, 'lean_stats_admin');
        if (is_array($cached)) {
            return $cached;
        }

        $cached = get_transient($cache_key);

        return is_array($cached) ? $cached : null;
    }

    /**
     * Store cached response payload.
     */
    private function set_cached_payload(string $cache_key, array $payload): void {
        $ttl = $this->get_cache_ttl();
        if ($ttl <= 0) {
            return;
        }

        wp_cache_set($cache_key, $payload, 'lean_stats_admin', $ttl);
        set_transient($cache_key, $payload, $ttl);
    }

    /**
     * Resolve required capability.
     */
    private function get_required_capability(): string {
        $capability = apply_filters('lean_stats_admin_capability', 'manage_options');

        return is_string($capability) && $capability !== '' ? $capability : 'manage_options';
    }
}
