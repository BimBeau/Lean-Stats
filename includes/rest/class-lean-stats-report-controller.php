<?php
/**
 * REST controller for report endpoints.
 */

defined('ABSPATH') || exit;

class Lean_Stats_Report_Controller {
    /**
     * Register routes for report data.
     */
    public function register_routes(): void {
        register_rest_route(
            LEAN_STATS_REST_NAMESPACE,
            '/overview',
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_overview'],
                'permission_callback' => [$this, 'check_permissions'],
                'args' => $this->get_date_range_args(),
            ]
        );

        $list_args = array_merge(
            $this->get_date_range_args(),
            $this->get_pagination_args()
        );

        register_rest_route(
            LEAN_STATS_REST_NAMESPACE,
            '/top-pages',
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_top_pages'],
                'permission_callback' => [$this, 'check_permissions'],
                'args' => $list_args,
            ]
        );

        register_rest_route(
            LEAN_STATS_REST_NAMESPACE,
            '/referrers',
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_referrers'],
                'permission_callback' => [$this, 'check_permissions'],
                'args' => $list_args,
            ]
        );

        register_rest_route(
            LEAN_STATS_REST_NAMESPACE,
            '/referrer-sources',
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_referrer_sources'],
                'permission_callback' => [$this, 'check_permissions'],
                'args' => $list_args,
            ]
        );

        register_rest_route(
            LEAN_STATS_REST_NAMESPACE,
            '/404s',
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_not_found'],
                'permission_callback' => [$this, 'check_permissions'],
                'args' => $list_args,
            ]
        );

        register_rest_route(
            LEAN_STATS_REST_NAMESPACE,
            '/search-terms',
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_search_terms'],
                'permission_callback' => [$this, 'check_permissions'],
                'args' => $list_args,
            ]
        );

        register_rest_route(
            LEAN_STATS_REST_NAMESPACE,
            '/entry-pages',
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_entry_pages'],
                'permission_callback' => [$this, 'check_permissions'],
                'args' => array_merge(
                    $this->get_date_range_args(),
                    $this->get_pagination_args('entries')
                ),
            ]
        );

        register_rest_route(
            LEAN_STATS_REST_NAMESPACE,
            '/exit-pages',
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_exit_pages'],
                'permission_callback' => [$this, 'check_permissions'],
                'args' => array_merge(
                    $this->get_date_range_args(),
                    $this->get_pagination_args('exits')
                ),
            ]
        );

        register_rest_route(
            LEAN_STATS_REST_NAMESPACE,
            '/purge',
            [
                'methods' => 'POST',
                'callback' => [$this, 'purge_cache'],
                'permission_callback' => [$this, 'check_permissions'],
            ]
        );
    }

    /**
     * Permission check for report endpoints.
     */
    public function check_permissions(WP_REST_Request $request) {
        if (!current_user_can($this->get_required_capability())) {
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
     * Overview aggregation.
     */
    public function get_overview(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $range = $this->get_day_range($request);
        $cache_key = $this->get_cache_key('overview', $range);
        $cached = $this->get_cached_payload($cache_key);
        if ($cached !== null) {
            return new WP_REST_Response($cached, 200);
        }

        $daily_table = $wpdb->prefix . 'lean_stats_daily';
        $not_found_table = $wpdb->prefix . 'lean_stats_404s_daily';
        $search_terms_table = $wpdb->prefix . 'lean_stats_search_terms_daily';

        $overview_query = $wpdb->prepare(
            "SELECT
                COALESCE(SUM(hits), 0) AS page_views,
                COUNT(DISTINCT page_path) AS unique_pages,
                COUNT(DISTINCT NULLIF(referrer_domain, '')) AS unique_referrers
            FROM {$daily_table}
            WHERE date_bucket BETWEEN %s AND %s",
            $range['start'],
            $range['end']
        );

        $overview_row = $wpdb->get_row($overview_query, ARRAY_A);

        $not_found_query = $wpdb->prepare(
            "SELECT COALESCE(SUM(hits), 0) AS not_found_hits
            FROM {$not_found_table}
            WHERE date_bucket BETWEEN %s AND %s",
            $range['start'],
            $range['end']
        );
        $not_found_row = $wpdb->get_row($not_found_query, ARRAY_A);

        $search_query = $wpdb->prepare(
            "SELECT
                COALESCE(SUM(hits), 0) AS search_hits,
                COUNT(DISTINCT search_term) AS unique_search_terms
            FROM {$search_terms_table}
            WHERE date_bucket BETWEEN %s AND %s",
            $range['start'],
            $range['end']
        );
        $search_row = $wpdb->get_row($search_query, ARRAY_A);

        $payload = [
            'range' => $range,
            'overview' => [
                'pageViews' => isset($overview_row['page_views']) ? (int) $overview_row['page_views'] : 0,
                'uniquePages' => isset($overview_row['unique_pages']) ? (int) $overview_row['unique_pages'] : 0,
                'uniqueReferrers' => isset($overview_row['unique_referrers'])
                    ? (int) $overview_row['unique_referrers']
                    : 0,
                'notFoundHits' => isset($not_found_row['not_found_hits'])
                    ? (int) $not_found_row['not_found_hits']
                    : 0,
                'searchHits' => isset($search_row['search_hits']) ? (int) $search_row['search_hits'] : 0,
                'uniqueSearchTerms' => isset($search_row['unique_search_terms'])
                    ? (int) $search_row['unique_search_terms']
                    : 0,
            ],
        ];

        $this->set_cached_payload($cache_key, $payload);

        return new WP_REST_Response($payload, 200);
    }

    /**
     * Top pages aggregation.
     */
    public function get_top_pages(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $table = $wpdb->prefix . 'lean_stats_daily';

        return $this->build_list_response($request, $table, 'page_path', 'top-pages');
    }

    /**
     * Top referrers aggregation.
     */
    public function get_referrers(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $table = $wpdb->prefix . 'lean_stats_daily';

        return $this->build_list_response($request, $table, 'referrer_domain', 'referrers');
    }

    /**
     * Referrer sources aggregation.
     */
    public function get_referrer_sources(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $table = $wpdb->prefix . 'lean_stats_hits_daily';

        return $this->build_referrer_sources_response($request, $table);
    }

    /**
     * 404s aggregation.
     */
    public function get_not_found(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $table = $wpdb->prefix . 'lean_stats_404s_daily';

        return $this->build_list_response($request, $table, 'page_path', 'not-found');
    }

    /**
     * Search terms aggregation.
     */
    public function get_search_terms(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $table = $wpdb->prefix . 'lean_stats_search_terms_daily';

        return $this->build_list_response($request, $table, 'search_term', 'search-terms');
    }

    /**
     * Entry pages aggregation.
     */
    public function get_entry_pages(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $table = $wpdb->prefix . 'lean_stats_entry_exit_daily';

        return $this->build_list_response(
            $request,
            $table,
            'page_path',
            'entry-pages',
            'entries',
            [
                'entries' => 'metric',
                'label' => 'page_path',
            ],
            'entries'
        );
    }

    /**
     * Exit pages aggregation.
     */
    public function get_exit_pages(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $table = $wpdb->prefix . 'lean_stats_entry_exit_daily';

        return $this->build_list_response(
            $request,
            $table,
            'page_path',
            'exit-pages',
            'exits',
            [
                'exits' => 'metric',
                'label' => 'page_path',
            ],
            'exits'
        );
    }

    /**
     * Purge cached analytics data.
     */
    public function purge_cache(): WP_REST_Response {
        lean_stats_flush_admin_cache();

        return new WP_REST_Response(
            [
                'purged' => true,
                'cacheVersion' => lean_stats_get_admin_cache_version(),
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
     * Pagination and sorting args.
     */
    private function get_pagination_args(string $default_orderby = 'hits'): array {
        return [
            'page' => [
                'required' => false,
                'type' => 'integer',
                'default' => 1,
            ],
            'per_page' => [
                'required' => false,
                'type' => 'integer',
                'default' => 10,
            ],
            'orderby' => [
                'required' => false,
                'type' => 'string',
                'default' => $default_orderby,
            ],
            'order' => [
                'required' => false,
                'type' => 'string',
                'default' => 'desc',
            ],
        ];
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
     * Normalize pagination values.
     */
    private function normalize_pagination(WP_REST_Request $request): array {
        $page = absint($request->get_param('page'));
        if ($page < 1) {
            $page = 1;
        }

        $per_page = absint($request->get_param('per_page'));
        if ($per_page < 1) {
            $per_page = 10;
        }

        $per_page = min($per_page, 100);

        return [
            'page' => $page,
            'per_page' => $per_page,
            'offset' => ($page - 1) * $per_page,
        ];
    }

    /**
     * Normalize orderby and order values.
     */
    private function normalize_sorting(WP_REST_Request $request, array $allowed_orderby, string $default): array {
        $orderby_key = sanitize_key((string) $request->get_param('orderby'));
        if (!isset($allowed_orderby[$orderby_key])) {
            $orderby_key = $default;
        }

        $order = strtoupper(sanitize_key((string) $request->get_param('order')));
        if (!in_array($order, ['ASC', 'DESC'], true)) {
            $order = 'DESC';
        }

        return [
            'orderby' => $allowed_orderby[$orderby_key],
            'order' => $order,
        ];
    }

    /**
     * Build paginated list response for a given table/label column.
     */
    private function build_list_response(
        WP_REST_Request $request,
        string $table,
        string $label_column,
        string $cache_id,
        string $metric_column = 'hits',
        array $allowed_orderby = [],
        string $default_orderby = 'hits'
    ): WP_REST_Response {
        global $wpdb;

        $range = $this->get_day_range($request);
        $pagination = $this->normalize_pagination($request);
        if ($allowed_orderby === []) {
            $allowed_orderby = [
                'hits' => 'metric',
                'label' => $label_column,
            ];
        }
        if ($default_orderby === '') {
            $default_orderby = array_key_first($allowed_orderby) ?: 'hits';
        }
        $sorting = $this->normalize_sorting(
            $request,
            $allowed_orderby,
            $default_orderby
        );
        $cache_key = $this->get_cache_key(
            $cache_id,
            [
                'range' => $range,
                'pagination' => $pagination,
                'sorting' => $sorting,
            ]
        );
        $cached = $this->get_cached_payload($cache_key);
        if ($cached !== null) {
            return new WP_REST_Response($cached, 200);
        }

        $count_query = $wpdb->prepare(
            "SELECT COUNT(*) FROM (SELECT 1
            FROM {$table}
            WHERE date_bucket BETWEEN %s AND %s
            GROUP BY {$label_column}) AS totals",
            $range['start'],
            $range['end']
        );
        $total_items = (int) $wpdb->get_var($count_query);

        $list_query = $wpdb->prepare(
            "SELECT {$label_column} AS label, SUM({$metric_column}) AS metric
            FROM {$table}
            WHERE date_bucket BETWEEN %s AND %s
            GROUP BY {$label_column}
            ORDER BY {$sorting['orderby']} {$sorting['order']}
            LIMIT %d OFFSET %d",
            $range['start'],
            $range['end'],
            $pagination['per_page'],
            $pagination['offset']
        );

        $rows = $wpdb->get_results($list_query, ARRAY_A);
        $items = array_map(
            static function (array $row) use ($metric_column): array {
                return [
                    'label' => isset($row['label']) ? sanitize_text_field((string) $row['label']) : '',
                    $metric_column => isset($row['metric']) ? (int) $row['metric'] : 0,
                ];
            },
            $rows ?: []
        );

        $payload = [
            'range' => $range,
            'pagination' => [
                'page' => $pagination['page'],
                'perPage' => $pagination['per_page'],
                'totalItems' => $total_items,
                'totalPages' => $pagination['per_page'] > 0
                    ? (int) ceil($total_items / $pagination['per_page'])
                    : 0,
            ],
            'items' => $items,
        ];

        $this->set_cached_payload($cache_key, $payload);

        return new WP_REST_Response($payload, 200);
    }

    /**
     * Build paginated list response for referrer source categories.
     */
    private function build_referrer_sources_response(WP_REST_Request $request, string $table): WP_REST_Response {
        global $wpdb;

        $range = $this->get_day_range($request);
        $pagination = $this->normalize_pagination($request);
        $sorting = $this->normalize_sorting(
            $request,
            [
                'hits' => 'hits',
                'referrer' => 'referrer_domain',
                'category' => 'source_category',
            ],
            'hits'
        );
        $cache_key = $this->get_cache_key(
            'referrer-sources',
            [
                'range' => $range,
                'pagination' => $pagination,
                'sorting' => $sorting,
            ]
        );
        $cached = $this->get_cached_payload($cache_key);
        if ($cached !== null) {
            return new WP_REST_Response($cached, 200);
        }

        $count_query = $wpdb->prepare(
            "SELECT COUNT(*) FROM (SELECT 1
            FROM {$table}
            WHERE date_bucket BETWEEN %s AND %s
            GROUP BY referrer_domain, source_category) AS totals",
            $range['start'],
            $range['end']
        );
        $total_items = (int) $wpdb->get_var($count_query);

        $list_query = $wpdb->prepare(
            "SELECT referrer_domain, source_category, SUM(hits) AS hits
            FROM {$table}
            WHERE date_bucket BETWEEN %s AND %s
            GROUP BY referrer_domain, source_category
            ORDER BY {$sorting['orderby']} {$sorting['order']}
            LIMIT %d OFFSET %d",
            $range['start'],
            $range['end'],
            $pagination['per_page'],
            $pagination['offset']
        );

        $rows = $wpdb->get_results($list_query, ARRAY_A);
        $items = array_map(
            static function (array $row): array {
                return [
                    'referrer_domain' => isset($row['referrer_domain'])
                        ? sanitize_text_field((string) $row['referrer_domain'])
                        : '',
                    'source_category' => isset($row['source_category'])
                        ? sanitize_text_field((string) $row['source_category'])
                        : '',
                    'hits' => isset($row['hits']) ? (int) $row['hits'] : 0,
                ];
            },
            $rows ?: []
        );

        $payload = [
            'range' => $range,
            'pagination' => [
                'page' => $pagination['page'],
                'perPage' => $pagination['per_page'],
                'totalItems' => $total_items,
                'totalPages' => $pagination['per_page'] > 0
                    ? (int) ceil($total_items / $pagination['per_page'])
                    : 0,
            ],
            'items' => $items,
        ];

        $this->set_cached_payload($cache_key, $payload);

        return new WP_REST_Response($payload, 200);
    }

    /**
     * Resolve required capability.
     */
    private function get_required_capability(): string {
        $capability = apply_filters('lean_stats_admin_capability', 'manage_options');

        return is_string($capability) && $capability !== '' ? $capability : 'manage_options';
    }

    /**
     * Resolve cache TTL for report analytics.
     */
    private function get_cache_ttl(): int {
        $ttl = (int) apply_filters('lean_stats_report_cache_ttl', 60);

        return max(30, min(120, $ttl));
    }

    /**
     * Build a cache key for report analytics responses.
     */
    private function get_cache_key(string $endpoint, array $params): string {
        $payload = [
            'endpoint' => $endpoint,
            'params' => $params,
        ];

        return lean_stats_get_admin_cache_key('report_' . md5(wp_json_encode($payload)));
    }

    /**
     * Fetch cached response payload.
     */
    private function get_cached_payload(string $cache_key): ?array {
        $cached = wp_cache_get($cache_key, 'lean_stats_report');
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

        wp_cache_set($cache_key, $payload, 'lean_stats_report', $ttl);
        set_transient($cache_key, $payload, $ttl);
    }
}
