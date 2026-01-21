<?php
/**
 * Raw log retention helpers.
 */

defined('ABSPATH') || exit;

const LEAN_STATS_RAW_LOGS_CRON_HOOK = 'lean_stats_purge_raw_logs';
const LEAN_STATS_RAW_LOGS_CRON_SCHEDULE = 'lean_stats_raw_logs_schedule';

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
 * Get the cleanup schedule interval for raw logs.
 */
function lean_stats_get_raw_logs_cleanup_interval(): int
{
    $settings = lean_stats_get_settings();
    $retention_days = isset($settings['raw_logs_retention_days']) ? absint($settings['raw_logs_retention_days']) : 1;
    if ($retention_days < 1) {
        $retention_days = 1;
    }

    $interval = $retention_days * DAY_IN_SECONDS;
    $interval = max(HOUR_IN_SECONDS, $interval);

    return absint(apply_filters('lean_stats_raw_logs_cleanup_interval', $interval, $retention_days));
}

/**
 * Register the cron schedule for raw log cleanup.
 */
function lean_stats_register_raw_logs_cron_schedule(array $schedules): array
{
    $schedules[LEAN_STATS_RAW_LOGS_CRON_SCHEDULE] = [
        'interval' => lean_stats_get_raw_logs_cleanup_interval(),
        'display' => __('Lean Stats raw log cleanup', 'lean-stats'),
    ];

    return $schedules;
}

/**
 * Schedule raw log cleanup using the retention window.
 */
function lean_stats_schedule_raw_log_cleanup(bool $force = false): void
{
    $current_schedule = wp_get_schedule(LEAN_STATS_RAW_LOGS_CRON_HOOK);
    $next_run = wp_next_scheduled(LEAN_STATS_RAW_LOGS_CRON_HOOK);

    if ($force || $current_schedule !== LEAN_STATS_RAW_LOGS_CRON_SCHEDULE || !$next_run) {
        wp_clear_scheduled_hook(LEAN_STATS_RAW_LOGS_CRON_HOOK);
        wp_schedule_event(time(), LEAN_STATS_RAW_LOGS_CRON_SCHEDULE, LEAN_STATS_RAW_LOGS_CRON_HOOK);
    }
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

add_filter('cron_schedules', 'lean_stats_register_raw_logs_cron_schedule');
add_action(LEAN_STATS_RAW_LOGS_CRON_HOOK, 'lean_stats_purge_raw_logs');
