<?php
/**
 * UTM aggregation helpers for Lean Stats.
 */

defined('ABSPATH') || exit;

const LEAN_STATS_MAX_UTM_VALUE_LENGTH = 255;

/**
 * Normalize a UTM value for storage.
 */
function lean_stats_normalize_utm_value($value): string
{
    if (!is_string($value)) {
        return '';
    }

    $value = sanitize_text_field($value);
    $value = trim($value);
    if ($value === '') {
        return '';
    }

    $value = lean_stats_lowercase($value);

    return lean_stats_trim_value($value, LEAN_STATS_MAX_UTM_VALUE_LENGTH);
}

/**
 * Extract allowlisted UTM params from a URL or query string.
 */
function lean_stats_extract_utm_params($input, array $allowlist): array
{
    if (!is_string($input) || $allowlist === []) {
        return [];
    }

    $allowlist = array_filter(array_map('sanitize_key', $allowlist));
    if ($allowlist === []) {
        return [];
    }

    $query = '';
    $parsed = wp_parse_url($input);
    if (is_array($parsed)) {
        $query = isset($parsed['query']) ? (string) $parsed['query'] : '';
    }

    if ($query === '' && !str_contains($input, '://') && str_contains($input, '=')) {
        $query = $input;
    }

    if ($query === '') {
        return [];
    }

    $query_args = [];
    wp_parse_str($query, $query_args);
    if (!is_array($query_args)) {
        return [];
    }

    $normalized = [];
    foreach ($allowlist as $key) {
        if (!array_key_exists($key, $query_args)) {
            continue;
        }

        $value = $query_args[$key];
        if (is_array($value)) {
            $value = reset($value);
        }

        $value = lean_stats_normalize_utm_value($value);
        if ($value === '') {
            continue;
        }

        $normalized[$key] = $value;
    }

    return $normalized;
}

/**
 * Store aggregated UTM data by day.
 */
function lean_stats_store_utm_daily(string $date_bucket, array $utm_params): void
{
    if ($utm_params === []) {
        return;
    }

    global $wpdb;

    $table = $wpdb->prefix . 'lean_stats_utm_daily';
    $placeholders = [];
    $values = [];

    foreach ($utm_params as $key => $value) {
        $key = sanitize_key($key);
        $value = lean_stats_normalize_utm_value($value);
        if ($key === '' || $value === '') {
            continue;
        }

        $placeholders[] = '(%s, %s, %s, %d)';
        $values[] = $date_bucket;
        $values[] = $key;
        $values[] = $value;
        $values[] = 1;
    }

    if ($placeholders === []) {
        return;
    }

    $sql = "INSERT INTO {$table} (date_bucket, utm_key, utm_value, hits) VALUES "
        . implode(', ', $placeholders)
        . ' ON DUPLICATE KEY UPDATE hits = hits + VALUES(hits)';

    $wpdb->query($wpdb->prepare($sql, $values));
}
