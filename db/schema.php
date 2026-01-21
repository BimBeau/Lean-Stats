<?php
/**
 * Database schema helpers for Lean Stats.
 */

defined('ABSPATH') || exit;

const LEAN_STATS_SCHEMA_VERSION = '2';

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
    $sessions_table = $wpdb->prefix . 'lean_stats_sessions';

    $daily_schema = "CREATE TABLE {$daily_table} (
        date_bucket DATE NOT NULL,
        page_path VARCHAR(2048) NOT NULL,
        referrer_domain VARCHAR(255) NOT NULL,
        device_class VARCHAR(50) NOT NULL,
        hits BIGINT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY  (date_bucket, page_path(255), referrer_domain, device_class),
        KEY date_bucket (date_bucket),
        KEY date_bucket_page (date_bucket, page_path(255)),
        KEY date_bucket_referrer (date_bucket, referrer_domain),
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
        KEY date_bucket_page (date_bucket, page_path(255)),
        KEY date_bucket_referrer (date_bucket, referrer_domain),
        KEY page_path (page_path(255)),
        KEY referrer_domain (referrer_domain)
    ) {$charset_collate};";

    $sessions_schema = "CREATE TABLE {$sessions_table} (
        date_bucket DATE NOT NULL,
        session_hash CHAR(64) NOT NULL,
        PRIMARY KEY  (date_bucket, session_hash),
        KEY date_bucket (date_bucket)
    ) {$charset_collate};";

    dbDelta($daily_schema);
    dbDelta($hourly_schema);
    dbDelta($sessions_schema);

    update_option('lean_stats_schema_version', LEAN_STATS_SCHEMA_VERSION, false);
}

/**
 * Ensure the schema is up to date.
 */
function lean_stats_maybe_install_schema(): void
{
    $installed = get_option('lean_stats_schema_version');
    if ($installed !== LEAN_STATS_SCHEMA_VERSION) {
        lean_stats_install_schema();
    }
}

add_action('plugins_loaded', 'lean_stats_maybe_install_schema');
