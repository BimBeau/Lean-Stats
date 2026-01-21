<?php
/**
 * Server-side geolocation helpers.
 */

defined('ABSPATH') || exit;

/**
 * Load the MaxMind database reader classes when needed.
 */
function lean_stats_load_maxmind_reader(): void
{
    if (class_exists('MaxMind\\Db\\Reader')) {
        return;
    }

    $base = LEAN_STATS_PATH . 'includes/maxmind-db/MaxMind/Db/';
    $files = [
        'Reader.php',
        'Reader/Decoder.php',
        'Reader/InvalidDatabaseException.php',
        'Reader/Metadata.php',
        'Reader/Util.php',
    ];

    foreach ($files as $file) {
        $path = $base . $file;
        if (file_exists($path)) {
            require_once $path;
        }
    }
}

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
 * Resolve the GeoLite2 database path.
 */
function lean_stats_get_geolite2_database_path(): string
{
    $default = LEAN_STATS_PATH . 'data/GeoLite2-City.mmdb';

    $path = apply_filters('lean_stats_geolite2_database_path', $default);
    if (!is_string($path)) {
        return '';
    }

    return $path;
}

/**
 * Parse the MaxMind API key into credentials.
 */
function lean_stats_parse_maxmind_api_key(string $api_key): array
{
    $api_key = trim($api_key);
    if ($api_key === '') {
        return [null, null];
    }

    if (strpos($api_key, ':') === false) {
        return [null, null];
    }

    [$account_id, $license_key] = array_map('trim', explode(':', $api_key, 2));

    if ($account_id === '' || $license_key === '') {
        return [null, null];
    }

    return [$account_id, $license_key];
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
 * Look up geolocation data using the MaxMind API.
 */
function lean_stats_lookup_maxmind_api(string $ip, string $account_id, string $license_key): array
{
    $url = sprintf('https://geoip.maxmind.com/geoip/v2.1/city/%s', rawurlencode($ip));
    $response = wp_remote_get(
        $url,
        [
            'headers' => [
                'Authorization' => 'Basic ' . base64_encode($account_id . ':' . $license_key),
                'Accept' => 'application/json',
            ],
            'timeout' => 5,
        ]
    );

    if (is_wp_error($response)) {
        return [
            'error' => $response->get_error_message(),
        ];
    }

    $code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);

    if ($code !== 200) {
        return [
            'error' => sprintf(__('MaxMind API error (%s).', 'lean-stats'), $code),
        ];
    }

    $payload = json_decode($body, true);
    if (!is_array($payload)) {
        return [
            'error' => __('Invalid MaxMind API response.', 'lean-stats'),
        ];
    }

    return [
        'country' => lean_stats_pick_maxmind_name($payload['country']['names'] ?? []),
        'region' => lean_stats_pick_maxmind_name($payload['subdivisions'][0]['names'] ?? []),
        'city' => lean_stats_pick_maxmind_name($payload['city']['names'] ?? []),
        'source' => 'maxmind-api',
    ];
}

/**
 * Look up geolocation data using the local GeoLite2 database.
 */
function lean_stats_lookup_geolite2(string $ip): array
{
    $path = lean_stats_get_geolite2_database_path();
    if ($path === '' || !is_readable($path)) {
        return [
            'error' => __('GeoLite2 database is missing or unreadable.', 'lean-stats'),
        ];
    }

    lean_stats_load_maxmind_reader();

    if (!class_exists('MaxMind\\Db\\Reader')) {
        return [
            'error' => __('MaxMind reader library is unavailable.', 'lean-stats'),
        ];
    }

    try {
        $reader = new MaxMind\Db\Reader($path);
        $record = $reader->get($ip);
        $reader->close();
    } catch (Exception $exception) {
        return [
            'error' => $exception->getMessage(),
        ];
    }

    if (!is_array($record)) {
        return [
            'error' => __('No geolocation data found for this IP.', 'lean-stats'),
        ];
    }

    return [
        'country' => lean_stats_pick_maxmind_name($record['country']['names'] ?? []),
        'region' => lean_stats_pick_maxmind_name($record['subdivisions'][0]['names'] ?? []),
        'city' => lean_stats_pick_maxmind_name($record['city']['names'] ?? []),
        'source' => 'geolite2',
    ];
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
    $api_key = trim((string) ($settings['maxmind_api_key'] ?? ''));

    if ($api_key !== '') {
        [$account_id, $license_key] = lean_stats_parse_maxmind_api_key($api_key);
        if (!$account_id || !$license_key) {
            return [
                'error' => __('MaxMind API key must use the format AccountID:LicenseKey.', 'lean-stats'),
            ];
        }

        $location = lean_stats_lookup_maxmind_api($ip, $account_id, $license_key);
    } else {
        $location = lean_stats_lookup_geolite2($ip);
    }

    if (!empty($location['error'])) {
        return [
            'error' => $location['error'],
            'ip' => $ip,
            'source' => $location['source'] ?? 'geolite2',
        ];
    }

    return [
        'ip' => $ip,
        'country' => $location['country'],
        'region' => $location['region'],
        'city' => $location['city'],
        'source' => $location['source'],
    ];
}
