<?php
/**
 * REST controller for collecting Lean Stats hits.
 */

defined('ABSPATH') || exit;

class Lean_Stats_Hit_Controller {
    /**
     * Register routes for hit collection.
     */
    public function register_routes(): void {
        register_rest_route(
            LEAN_STATS_REST_NAMESPACE,
            '/hits',
            [
                'methods' => 'POST',
                'callback' => [$this, 'create_item'],
                'permission_callback' => '__return_true',
                'args' => [
                    'page_path' => [
                        'required' => true,
                        'type' => 'string',
                    ],
                    'post_id' => [
                        'required' => false,
                        'type' => 'integer',
                    ],
                    'referrer_domain' => [
                        'required' => false,
                        'type' => 'string',
                    ],
                    'device_class' => [
                        'required' => true,
                        'type' => 'string',
                    ],
                    'timestamp_bucket' => [
                        'required' => true,
                        'type' => 'integer',
                    ],
                ],
            ]
        );
    }

    /**
     * Handle hit collection.
     */
    public function create_item(WP_REST_Request $request): WP_REST_Response {
        if ($this->should_skip_tracking($request)) {
            return new WP_REST_Response(['tracked' => false], 204);
        }

        $hit = $this->sanitize_hit_data($request);
        if (is_wp_error($hit)) {
            return new WP_REST_Response(
                [
                    'message' => $hit->get_error_message(),
                ],
                400
            );
        }

        $this->store_hit($hit);

        return new WP_REST_Response(['tracked' => true], 201);
    }

    /**
     * Respect DNT/GPC headers when present.
     */
    private function should_skip_tracking(WP_REST_Request $request): bool {
        $settings = lean_stats_get_settings();

        if (!empty($settings['strict_mode']) && is_user_logged_in()) {
            return true;
        }

        if (!empty($settings['excluded_roles']) && is_user_logged_in()) {
            $user = wp_get_current_user();
            if (!empty($user->roles)) {
                foreach ($user->roles as $role) {
                    if (in_array($role, $settings['excluded_roles'], true)) {
                        return true;
                    }
                }
            }
        }

        if (!empty($settings['respect_dnt_gpc'])) {
            $dnt = $request->get_header('DNT');
            if ($dnt !== null && (string) $dnt === '1') {
                return true;
            }

            $gpc = $request->get_header('Sec-GPC');
            if ($gpc !== null && (string) $gpc === '1') {
                return true;
            }
        }

        return false;
    }

    /**
     * Sanitize and validate hit payload.
     */
    private function sanitize_hit_data(WP_REST_Request $request) {
        $page_path = $this->clean_page_path($request->get_param('page_path'));
        if ($page_path === '') {
            return new WP_Error('lean_stats_invalid_page_path', __('Invalid page path.', 'lean-stats'));
        }

        $post_id = $request->get_param('post_id');
        $post_id = $post_id !== null ? absint($post_id) : null;

        $referrer_domain = $this->clean_referrer_domain($request->get_param('referrer_domain'));

        $device_class = $this->clean_device_class($request->get_param('device_class'));
        if ($device_class === '') {
            return new WP_Error('lean_stats_invalid_device_class', __('Invalid device class.', 'lean-stats'));
        }

        $timestamp_bucket = absint($request->get_param('timestamp_bucket'));
        if ($timestamp_bucket === 0) {
            return new WP_Error('lean_stats_invalid_timestamp_bucket', __('Invalid timestamp bucket.', 'lean-stats'));
        }

        return [
            'page_path' => $page_path,
            'post_id' => $post_id ?: null,
            'referrer_domain' => $referrer_domain,
            'device_class' => $device_class,
            'timestamp_bucket' => $timestamp_bucket,
        ];
    }

    /**
     * Normalize page paths and strip query/fragment.
     */
    private function clean_page_path($page_path): string {
        if (!is_string($page_path)) {
            return '';
        }

        $page_path = trim($page_path);
        if ($page_path === '') {
            return '';
        }

        $parsed = wp_parse_url($page_path);
        $path = $parsed['path'] ?? '';
        if ($path === '') {
            return '';
        }

        $path = '/' . ltrim($path, '/');
        $path = untrailingslashit($path);
        $path = $path === '' ? '/' : $path;

        $query = $parsed['query'] ?? '';
        if ($query === '') {
            return $path;
        }

        $settings = lean_stats_get_settings();
        $query_args = [];
        wp_parse_str($query, $query_args);
        if (!is_array($query_args)) {
            return $path;
        }

        $sanitized_args = [];
        foreach ($query_args as $key => $value) {
            $key = sanitize_key($key);
            if ($key === '') {
                continue;
            }

            if (is_array($value)) {
                $value = reset($value);
            }

            $sanitized_args[$key] = sanitize_text_field((string) $value);
        }

        $strip_query = !empty($settings['url_strip_query']);
        if ($strip_query) {
            $allowlist = $settings['url_query_allowlist'] ?? [];
            if ($allowlist) {
                $allowlist = array_fill_keys($allowlist, true);
                $sanitized_args = array_intersect_key($sanitized_args, $allowlist);
            } else {
                $sanitized_args = [];
            }
        }

        if ($sanitized_args === []) {
            return $path;
        }

        $query_string = http_build_query($sanitized_args, '', '&', PHP_QUERY_RFC3986);

        return $query_string !== '' ? $path . '?' . $query_string : $path;
    }

    /**
     * Extract and sanitize referrer domain.
     */
    private function clean_referrer_domain($referrer_domain): ?string {
        if (!is_string($referrer_domain)) {
            return null;
        }

        $referrer_domain = trim($referrer_domain);
        if ($referrer_domain === '') {
            return null;
        }

        $candidate = $referrer_domain;
        if (!str_contains($candidate, '://')) {
            $candidate = 'https://' . $candidate;
        }

        $parsed = wp_parse_url($candidate);
        if (empty($parsed['host'])) {
            return null;
        }

        return sanitize_text_field($parsed['host']);
    }

    /**
     * Sanitize device class with allow list.
     */
    private function clean_device_class($device_class): string {
        if (!is_string($device_class)) {
            return '';
        }

        $device_class = sanitize_key($device_class);
        $allowed = [
            'desktop',
            'tablet',
            'mobile',
            'bot',
        ];

        return in_array($device_class, $allowed, true) ? $device_class : '';
    }

    /**
     * Store hit data.
     */
    private function store_hit(array $hit): void {
        if (!lean_stats_raw_logs_enabled()) {
            return;
        }

        $hits = get_option('lean_stats_hits', []);
        if (!is_array($hits)) {
            $hits = [];
        }

        $hits[] = $hit;

        $max_hits = apply_filters('lean_stats_max_hits', 1000);
        if (count($hits) > $max_hits) {
            $hits = array_slice($hits, -$max_hits);
        }

        update_option('lean_stats_hits', $hits, false);
    }
}
