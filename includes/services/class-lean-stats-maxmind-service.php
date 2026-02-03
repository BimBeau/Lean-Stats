<?php
/**
 * MaxMind API service for geolocation lookups.
 */

defined('ABSPATH') || exit;

class Lean_Stats_MaxMind_Service {
    /**
     * Look up geolocation data using the MaxMind API.
     */
    public function lookup(string $ip, string $account_id, string $license_key): array {
        $url = sprintf('https://geoip.maxmind.com/geoip/v2.1/city/%s', rawurlencode($ip));
        $auth = base64_encode($account_id . ':' . $license_key);
        $version = defined('LEAN_STATS_VERSION') ? LEAN_STATS_VERSION : 'unknown';
        $user_agent = sprintf('Lean Stats/%s; %s', $version, home_url('/'));
        $response = wp_remote_get(
            $url,
            [
                'headers' => [
                    'Authorization' => 'Basic ' . $auth,
                    'Accept' => 'application/json',
                    'User-Agent' => $user_agent,
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
            $detail = '';
            $decoded = json_decode($body, true);
            if (is_array($decoded)) {
                $error_message = (string) ($decoded['error'] ?? '');
                $error_code = (string) ($decoded['code'] ?? '');
                if ($error_message || $error_code) {
                    $detail = trim($error_message . ($error_code ? ' (' . $error_code . ')' : ''));
                }
            }

            return [
                'error' => $detail
                    ? sprintf(__('MaxMind API error (%1$s): %2$s.', 'lean-stats'), $code, $detail)
                    : sprintf(__('MaxMind API error (%s).', 'lean-stats'), $code),
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
}
