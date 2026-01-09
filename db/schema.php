<?php
/**
 * Database schema helpers for Lean Stats.
 */

defined('ABSPATH') || exit;

/**
 * Create or update the analytics tables.
 */
function lean_stats_install_schema(): void
{
    global $wpdb;

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    $charset_collate = $wpdb->get_charset_collate();
    $daily_table = $wpdb->prefix . 'lean_stats_daily';
    $hourly_table = $wpdb->prefix . 'lean_stats_hourly';

    $daily_schema = "CREATE TABLE {$daily_table} (
        date_bucket DATE NOT NULL,
        page_path VARCHAR(2048) NOT NULL,
        referrer_domain VARCHAR(255) NOT NULL,
        device_class VARCHAR(50) NOT NULL,
        hits BIGINT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY  (date_bucket, page_path(255), referrer_domain, device_class),
        KEY date_bucket (date_bucket),
        KEY page_path (page_path(255)),
        KEY referrer_domain (referrer_domain)
    ) {$charset_collate};";

    $hourly_schema = "CREATE TABLE {$hourly_table} (
        date_bucket DATETIME NOT NULL,
        page_path VARCHAR(2048) NOT NULL,
        referrer_domain VARCHAR(255) NOT NULL,
        device_class VARCHAR(50) NOT NULL,
        hits BIGINT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY  (date_bucket, page_path(255), referrer_domain, device_class),
        KEY date_bucket (date_bucket),
        KEY page_path (page_path(255)),
        KEY referrer_domain (referrer_domain)
    ) {$charset_collate};";

    dbDelta($daily_schema);
    dbDelta($hourly_schema);
}
