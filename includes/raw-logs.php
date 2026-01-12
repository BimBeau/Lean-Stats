<?php
/**
 * Raw log retention helpers.
 */

defined('ABSPATH') || exit;

const LEAN_STATS_RAW_LOGS_CRON_HOOK = 'lean_stats_purge_raw_logs';

/**
 * Check whether raw logs are enabled.
 */
function lean_stats_raw_logs_enabled(): bool
{
    $settings = lean_stats_get_settings();

    return !empty($settings['debug_enabled']);
}

/**
 * Ensure the raw logs option is set with a default.
 */
function lean_stats_register_raw_logs_option(): void
{
    if (get_option('lean_stats_raw_logs_enabled', null) === null) {
        add_option('lean_stats_raw_logs_enabled', false, '', false);
    }
}

/**
 * Get retention in seconds for raw logs.
 */
function lean_stats_get_raw_logs_retention_seconds(): int
{
    $settings = lean_stats_get_settings();
    $retention_days = isset($settings['raw_logs_retention_days']) ? absint($settings['raw_logs_retention_days']) : 1;
    if ($retention_days < 1) {
        $retention_days = 1;
    }

    $retention = $retention_days * DAY_IN_SECONDS;
    $retention = apply_filters('lean_stats_raw_logs_retention_seconds', $retention);
    $retention = absint($retention);

    return $retention > 0 ? $retention : DAY_IN_SECONDS;
}

/**
 * Purge raw logs older than the retention period.
 */
function lean_stats_purge_raw_logs(): void
{
    $hits = get_option('lean_stats_hits', []);
    if (!is_array($hits) || $hits === []) {
        return;
    }

    $cutoff = current_time('timestamp') - lean_stats_get_raw_logs_retention_seconds();

    $filtered = array_filter(
        $hits,
        static function ($hit) use ($cutoff): bool {
            if (!is_array($hit)) {
                return false;
            }

            $timestamp = isset($hit['timestamp_bucket']) ? absint($hit['timestamp_bucket']) : 0;
            if ($timestamp === 0) {
                return true;
            }

            return $timestamp >= $cutoff;
        }
    );

    if (count($filtered) === count($hits)) {
        return;
    }

    update_option('lean_stats_hits', array_values($filtered), false);
}

add_action(LEAN_STATS_RAW_LOGS_CRON_HOOK, 'lean_stats_purge_raw_logs');
