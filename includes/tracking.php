<?php
/**
 * Front-end tracking helpers for Lean Stats.
 */

defined('ABSPATH') || exit;

const LEAN_STATS_MAX_SEARCH_TERM_LENGTH = 255;
const LEAN_STATS_MAX_REFERRER_LENGTH = 255;

/**
 * Track front-end requests and store aggregated counts.
 */
function lean_stats_track_request(): void
{
    if (is_admin()) {
        return;
    }

    $settings = lean_stats_get_settings();
    if (lean_stats_should_skip_tracking($settings)) {
        return;
    }

    $path = lean_stats_get_request_path($settings);
    if ($path === '') {
        return;
    }

    if (lean_stats_is_excluded_path($path, $settings)) {
        return;
    }

    $timestamp = current_time('timestamp');
    $date_bucket = wp_date('Y-m-d', $timestamp);

    $referrer = lean_stats_get_referrer_info();
    lean_stats_increment_hits_daily(
        $date_bucket,
        $path,
        $referrer['domain'],
        $referrer['category']
    );

    $request_uri = isset($_SERVER['REQUEST_URI']) ? wp_unslash($_SERVER['REQUEST_URI']) : '';
    $utm_params = lean_stats_extract_utm_params($request_uri, $settings['utm_allowlist'] ?? []);
    if ($utm_params !== []) {
        lean_stats_store_utm_daily($date_bucket, $utm_params);
    }

    if (is_404()) {
        lean_stats_increment_404s_daily($date_bucket, $path);
    }

    if (is_search()) {
        $term = lean_stats_normalize_search_term(get_search_query(false));
        if ($term !== '') {
            lean_stats_increment_search_terms_daily($date_bucket, $term);
        }
    }
}

/**
 * Determine whether tracking should be skipped.
 */
function lean_stats_should_skip_tracking(array $settings): bool
{
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
        $dnt = $_SERVER['HTTP_DNT'] ?? null;
        if ($dnt !== null && (string) $dnt === '1') {
            return true;
        }

        $gpc = $_SERVER['HTTP_SEC_GPC'] ?? null;
        if ($gpc !== null && (string) $gpc === '1') {
            return true;
        }
    }

    return false;
}

/**
 * Normalize the current request path.
 */
function lean_stats_get_request_path(array $settings): string
{
    $request_uri = isset($_SERVER['REQUEST_URI']) ? wp_unslash($_SERVER['REQUEST_URI']) : '/';
    $request_uri = trim($request_uri);
    if ($request_uri === '') {
        return '';
    }

    $parsed = wp_parse_url($request_uri);
    $path = $parsed['path'] ?? '';
    if ($path === '') {
        return '';
    }

    $path = lean_stats_lowercase($path);
    $path = '/' . ltrim($path, '/');
    $path = untrailingslashit($path);
    $path = $path === '' ? '/' : $path;

    $query = $parsed['query'] ?? '';
    if ($query === '') {
        return lean_stats_trim_value($path, LEAN_STATS_MAX_PATH_LENGTH);
    }

    $query_args = [];
    wp_parse_str($query, $query_args);
    if (!is_array($query_args)) {
        return lean_stats_trim_value($path, LEAN_STATS_MAX_PATH_LENGTH);
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

    $allowlist = $settings['url_query_allowlist'] ?? [];
    if ($allowlist) {
        $allowlist = array_fill_keys($allowlist, true);
        $sanitized_args = array_intersect_key($sanitized_args, $allowlist);
    } else {
        $sanitized_args = [];
    }

    if ($sanitized_args === []) {
        return lean_stats_trim_value($path, LEAN_STATS_MAX_PATH_LENGTH);
    }

    $query_string = http_build_query($sanitized_args, '', '&', PHP_QUERY_RFC3986);
    $full_path = $query_string !== '' ? $path . '?' . $query_string : $path;

    return lean_stats_trim_value($full_path, LEAN_STATS_MAX_PATH_LENGTH);
}

/**
 * Check excluded paths list.
 */
function lean_stats_is_excluded_path(string $path, array $settings): bool
{
    if (empty($settings['excluded_paths'])) {
        return false;
    }

    if (in_array($path, $settings['excluded_paths'], true)) {
        return true;
    }

    $base_path = strtok($path, '?');
    if ($base_path === false || $base_path === '') {
        return false;
    }

    return in_array($base_path, $settings['excluded_paths'], true);
}

/**
 * Normalize a search term.
 */
function lean_stats_normalize_search_term($term): string
{
    if (!is_string($term)) {
        return '';
    }

    $term = sanitize_text_field($term);
    $term = trim($term);
    if ($term === '') {
        return '';
    }

    return lean_stats_trim_value($term, LEAN_STATS_MAX_SEARCH_TERM_LENGTH);
}

/**
 * Extract referrer domain and classify source category.
 */
function lean_stats_get_referrer_info(): array
{
    $referrer = $_SERVER['HTTP_REFERER'] ?? '';
    if (!is_string($referrer) || trim($referrer) === '') {
        return [
            'domain' => '',
            'category' => 'Direct',
        ];
    }

    $candidate = trim($referrer);
    if (!str_contains($candidate, '://')) {
        $candidate = 'https://' . $candidate;
    }
    $parsed = wp_parse_url($candidate);
    if (empty($parsed['host'])) {
        return [
            'domain' => '',
            'category' => 'Unknown',
        ];
    }

    $domain = sanitize_text_field(lean_stats_lowercase($parsed['host']));
    $domain = lean_stats_trim_value($domain, LEAN_STATS_MAX_REFERRER_LENGTH);

    return [
        'domain' => $domain,
        'category' => 'Referrer',
    ];
}

/**
 * Derive a source category for a referrer domain.
 */
function lean_stats_get_source_category_from_referrer(?string $referrer_domain): string
{
    return $referrer_domain ? 'Referrer' : 'Direct';
}

/**
 * Increment hits daily counter.
 */
function lean_stats_increment_hits_daily(
    string $date_bucket,
    string $page_path,
    string $referrer_domain,
    string $source_category
): void {
    global $wpdb;

    $table = $wpdb->prefix . 'lean_stats_hits_daily';

    $sql = "INSERT INTO {$table} (date_bucket, page_path, referrer_domain, source_category, hits)
        VALUES (%s, %s, %s, %s, %d)
        ON DUPLICATE KEY UPDATE hits = hits + VALUES(hits)";

    $wpdb->query(
        $wpdb->prepare(
            $sql,
            $date_bucket,
            $page_path,
            $referrer_domain,
            $source_category,
            1
        )
    );
}

/**
 * Increment 404 daily counter.
 */
function lean_stats_increment_404s_daily(string $date_bucket, string $page_path): void
{
    global $wpdb;

    $table = $wpdb->prefix . 'lean_stats_404s_daily';

    $sql = "INSERT INTO {$table} (date_bucket, page_path, hits)
        VALUES (%s, %s, %d)
        ON DUPLICATE KEY UPDATE hits = hits + VALUES(hits)";

    $wpdb->query(
        $wpdb->prepare(
            $sql,
            $date_bucket,
            $page_path,
            1
        )
    );
}

/**
 * Increment search term daily counter.
 */
function lean_stats_increment_search_terms_daily(string $date_bucket, string $search_term): void
{
    global $wpdb;

    $table = $wpdb->prefix . 'lean_stats_search_terms_daily';

    $sql = "INSERT INTO {$table} (date_bucket, search_term, hits)
        VALUES (%s, %s, %d)
        ON DUPLICATE KEY UPDATE hits = hits + VALUES(hits)";

    $wpdb->query(
        $wpdb->prepare(
            $sql,
            $date_bucket,
            $search_term,
            1
        )
    );
}

add_action('template_redirect', 'lean_stats_track_request', 1);
