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
        $response = wp_remote_get(
            $url,
            [
                'headers' => [
                    'Authorization' => 'Basic ' . $auth,
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
}
