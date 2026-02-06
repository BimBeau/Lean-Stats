<?php
/**
 * Server-side geolocation helpers.
 */

defined('ABSPATH') || exit;

/**
 * Determine the client IP address from the request.
 */
function lean_stats_get_client_ip(): string
{
    $candidates = [
        'HTTP_CF_CONNECTING_IP',
        'HTTP_X_FORWARDED_FOR',
        'HTTP_X_REAL_IP',
        'HTTP_CLIENT_IP',
        'REMOTE_ADDR',
    ];

    foreach ($candidates as $key) {
        if (empty($_SERVER[$key])) {
            continue;
        }

        $value = sanitize_text_field(wp_unslash($_SERVER[$key]));
        $parts = $key === 'HTTP_X_FORWARDED_FOR' ? array_map('trim', explode(',', $value)) : [$value];
        foreach ($parts as $part) {
            if (filter_var($part, FILTER_VALIDATE_IP)) {
                return $part;
            }
        }
    }

    return '';
}

/**
 * Pick a localized name from a MaxMind names map.
 */
function lean_stats_pick_maxmind_name($names): string
{
    if (!is_array($names)) {
        return '';
    }

    $locale = get_locale();
    $lang = strtolower(substr($locale, 0, 2));

    if ($lang && isset($names[$lang])) {
        return (string) $names[$lang];
    }

    if (isset($names['en'])) {
        return (string) $names['en'];
    }

    $first = reset($names);
    return $first ? (string) $first : '';
}

/**
 * Normalize a country ISO code from MaxMind payloads.
 */
function lean_stats_normalize_country_code($code): string
{
    if (!is_string($code)) {
        return '';
    }

    $code = strtoupper(trim(sanitize_text_field($code)));
    $code = preg_replace('/[^A-Z]/', '', $code);

    return strlen($code) === 2 ? $code : '';
}

/**
 * Normalize a region code for aggregation.
 */
function lean_stats_normalize_region_code($code): string
{
    if (!is_string($code)) {
        return 'unknown';
    }

    $code = strtoupper(trim(sanitize_text_field($code)));
    $code = preg_replace('/[^A-Z0-9_-]/', '', $code);

    return $code !== '' ? $code : 'unknown';
}

/**
 * Normalize a city name for aggregation.
 */
function lean_stats_normalize_city_name($city): string
{
    if (!is_string($city)) {
        return 'unknown';
    }

    $city = trim(sanitize_text_field($city));
    if ($city === '') {
        return 'unknown';
    }

    $city = preg_replace('/\s+/', ' ', $city);
    $city = mb_strtolower($city);

    return $city !== '' ? $city : 'unknown';
}

/**
 * Resolve the MaxMind API service.
 */
function lean_stats_get_maxmind_service(): Lean_Stats_MaxMind_Service
{
    static $service = null;

    if ($service === null) {
        $service = new Lean_Stats_MaxMind_Service();
    }

    return $service;
}

/**
 * Resolve geolocation data for the current request without storing the IP.
 */
function lean_stats_get_geolocation_payload(): array
{
    $ip = lean_stats_get_client_ip();
    if ($ip === '') {
        return [
            'error' => __('Unable to determine the visitor IP.', 'lean-stats'),
        ];
    }

    $settings = lean_stats_get_settings();
    $errors = lean_stats_validate_maxmind_settings($settings);
    if ($errors) {
        return [
            'error' => lean_stats_format_maxmind_errors($errors),
        ];
    }

    $account_id = trim((string) ($settings['maxmind_account_id'] ?? ''));
    $license_key = trim((string) ($settings['maxmind_license_key'] ?? ''));
    $service = lean_stats_get_maxmind_service();
    $location = $service->lookup($ip, $account_id, $license_key);

    if (!empty($location['error'])) {
        return [
            'error' => $location['error'],
            'ip' => $ip,
            'details' => $location['details'] ?? null,
            'source' => $location['source'] ?? 'maxmind-api',
        ];
    }

    return [
        'ip' => $ip,
        'country' => $location['country'],
        'country_code' => $location['country_code'] ?? '',
        'region' => $location['region'],
        'region_code' => $location['region_code'] ?? '',
        'city' => $location['city'],
        'source' => $location['source'],
    ];
}

/**
 * Resolve normalized geolocation data for aggregation.
 */
function lean_stats_get_geo_aggregate_payload(): array
{
    $ip = lean_stats_get_client_ip();
    if ($ip === '') {
        return [];
    }

    $settings = lean_stats_get_settings();
    if (lean_stats_validate_maxmind_settings($settings)) {
        return [];
    }

    $account_id = trim((string) ($settings['maxmind_account_id'] ?? ''));
    $license_key = trim((string) ($settings['maxmind_license_key'] ?? ''));
    $service = lean_stats_get_maxmind_service();
    $location = $service->lookup($ip, $account_id, $license_key);

    if (!empty($location['error'])) {
        return [];
    }

    $country_code = lean_stats_normalize_country_code($location['country_code'] ?? '');
    if ($country_code === '') {
        return [];
    }

    return [
        'country_code' => $country_code,
        'region_code' => lean_stats_normalize_region_code($location['region_code'] ?? ''),
        'city_name' => lean_stats_normalize_city_name($location['city'] ?? ''),
    ];
}
