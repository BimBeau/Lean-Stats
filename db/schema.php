<?php
/**
 * Database schema helpers for Lean Stats.
 */

defined('ABSPATH') || exit;

const LEAN_STATS_SCHEMA_VERSION = '4';

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
    $hits_daily_table = $wpdb->prefix . 'lean_stats_hits_daily';
    $not_found_table = $wpdb->prefix . 'lean_stats_404s_daily';
    $search_terms_table = $wpdb->prefix . 'lean_stats_search_terms_daily';

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
        KEY date_bucket_path_referrer (date_bucket, page_path(255), referrer_domain),
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
        KEY date_bucket_path_referrer (date_bucket, page_path(255), referrer_domain),
        KEY page_path (page_path(255)),
        KEY referrer_domain (referrer_domain)
    ) {$charset_collate};";

    $hits_daily_schema = "CREATE TABLE {$hits_daily_table} (
        date_bucket DATE NOT NULL,
        page_path VARCHAR(2048) NOT NULL,
        referrer_domain VARCHAR(255) NOT NULL,
        source_category VARCHAR(20) NOT NULL,
        hits BIGINT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY  (date_bucket, page_path(255), referrer_domain, source_category),
        KEY date_bucket (date_bucket),
        KEY date_bucket_page (date_bucket, page_path(255)),
        KEY date_bucket_referrer (date_bucket, referrer_domain),
        KEY date_bucket_path_referrer (date_bucket, page_path(255), referrer_domain),
        KEY page_path (page_path(255)),
        KEY referrer_domain (referrer_domain),
        KEY source_category (source_category)
    ) {$charset_collate};";

    $not_found_schema = "CREATE TABLE {$not_found_table} (
        date_bucket DATE NOT NULL,
        page_path VARCHAR(2048) NOT NULL,
        hits BIGINT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY  (date_bucket, page_path(255)),
        KEY date_bucket (date_bucket),
        KEY page_path (page_path(255))
    ) {$charset_collate};";

    $search_terms_schema = "CREATE TABLE {$search_terms_table} (
        date_bucket DATE NOT NULL,
        search_term VARCHAR(255) NOT NULL,
        hits BIGINT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY  (date_bucket, search_term(191)),
        KEY date_bucket (date_bucket),
        KEY search_term (search_term(191))
    ) {$charset_collate};";

    dbDelta($daily_schema);
    dbDelta($hourly_schema);
    dbDelta($hits_daily_schema);
    dbDelta($not_found_schema);
    dbDelta($search_terms_schema);

    $wpdb->query("DROP TABLE IF EXISTS {$sessions_table}");

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
