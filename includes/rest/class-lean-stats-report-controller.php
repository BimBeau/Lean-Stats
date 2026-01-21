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

        return new WP_REST_Response($payload, 200);
    }

    /**
     * Top pages aggregation.
     */
    public function get_top_pages(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $table = $wpdb->prefix . 'lean_stats_daily';

        return $this->build_list_response($request, $table, 'page_path');
    }

    /**
     * Top referrers aggregation.
     */
    public function get_referrers(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $table = $wpdb->prefix . 'lean_stats_daily';

        return $this->build_list_response($request, $table, 'referrer_domain');
    }

    /**
     * 404s aggregation.
     */
    public function get_not_found(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $table = $wpdb->prefix . 'lean_stats_404s_daily';

        return $this->build_list_response($request, $table, 'page_path');
    }

    /**
     * Search terms aggregation.
     */
    public function get_search_terms(WP_REST_Request $request): WP_REST_Response {
        global $wpdb;

        $table = $wpdb->prefix . 'lean_stats_search_terms_daily';

        return $this->build_list_response($request, $table, 'search_term');
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
    private function get_pagination_args(): array {
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
                'default' => 'hits',
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
    private function build_list_response(WP_REST_Request $request, string $table, string $label_column): WP_REST_Response {
        global $wpdb;

        $range = $this->get_day_range($request);
        $pagination = $this->normalize_pagination($request);
        $sorting = $this->normalize_sorting(
            $request,
            [
                'hits' => 'hits',
                'label' => $label_column,
            ],
            'hits'
        );

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
            "SELECT {$label_column} AS label, SUM(hits) AS hits
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
            static function (array $row): array {
                return [
                    'label' => isset($row['label']) ? sanitize_text_field((string) $row['label']) : '',
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

        return new WP_REST_Response($payload, 200);
    }

    /**
     * Resolve required capability.
     */
    private function get_required_capability(): string {
        $capability = apply_filters('lean_stats_admin_capability', 'manage_options');

        return is_string($capability) && $capability !== '' ? $capability : 'manage_options';
    }
}
