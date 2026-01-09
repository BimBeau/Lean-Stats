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
        if (!current_user_can('manage_options')) {
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
        $table = $wpdb->prefix . 'lean_stats_daily';

        $query = $wpdb->prepare(
            "SELECT
                COALESCE(SUM(hits), 0) AS total_hits,
                COUNT(DISTINCT page_path) AS unique_pages,
                COUNT(DISTINCT referrer_domain) AS unique_referrers
            FROM {$table}
            WHERE date_bucket BETWEEN %s AND %s",
            $range['start'],
            $range['end']
        );

        $row = $wpdb->get_row($query, ARRAY_A);
        $data = [
            'totalHits' => isset($row['total_hits']) ? (int) $row['total_hits'] : 0,
            'uniquePages' => isset($row['unique_pages']) ? (int) $row['unique_pages'] : 0,
            'uniqueReferrers' => isset($row['unique_referrers']) ? (int) $row['unique_referrers'] : 0,
        ];

        return new WP_REST_Response(
            [
                'range' => $range,
                'kpis' => $data,
            ],
            200
        );
    }

    /**
     * Return current settings.
     */
    public function get_settings(WP_REST_Request $request): WP_REST_Response {
        return new WP_REST_Response(
            [
                'settings' => lean_stats_get_settings(),
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
     * Top pages aggregation.
     */
    public function get_top_pages(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $range = $this->get_day_range($request);
        $limit = $this->normalize_limit($request->get_param('limit'));
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

        return new WP_REST_Response(
            [
                'range' => $range,
                'items' => $items,
            ],
            200
        );
    }

    /**
     * Top referrers aggregation.
     */
    public function get_referrers(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $range = $this->get_day_range($request);
        $limit = $this->normalize_limit($request->get_param('limit'));
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

        return new WP_REST_Response(
            [
                'range' => $range,
                'items' => $items,
            ],
            200
        );
    }

    /**
     * Daily timeseries aggregation.
     */
    public function get_timeseries_day(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $range = $this->get_day_range($request);
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

        return new WP_REST_Response(
            [
                'range' => $range,
                'items' => $items,
            ],
            200
        );
    }

    /**
     * Hourly timeseries aggregation.
     */
    public function get_timeseries_hour(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $range = $this->get_hour_range($request);
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

        return new WP_REST_Response(
            [
                'range' => $range,
                'items' => $items,
            ],
            200
        );
    }

    /**
     * Device class split aggregation.
     */
    public function get_device_split(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $range = $this->get_day_range($request);
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

        return new WP_REST_Response(
            [
                'range' => $range,
                'items' => $items,
            ],
            200
        );
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
}
