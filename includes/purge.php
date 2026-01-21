<?php
/**
 * Purge helpers for Lean Stats data.
 */

defined('ABSPATH') || exit;

/**
 * Purge aggregated analytics tables and raw logs.
 */
function lean_stats_purge_analytics_data(): array
{
    global $wpdb;

    $tables = [
        'lean_stats_daily',
        'lean_stats_hourly',
        'lean_stats_hits_daily',
        'lean_stats_404s_daily',
        'lean_stats_search_terms_daily',
    ];

    $results = [];
    foreach ($tables as $table) {
        $table_name = $wpdb->prefix . $table;
        $results[$table] = (int) $wpdb->query("TRUNCATE TABLE {$table_name}");
    }

    update_option('lean_stats_hits', [], false);
    lean_stats_flush_admin_cache();

    return [
        'tables' => $results,
        'rawLogsPurged' => true,
    ];
}
