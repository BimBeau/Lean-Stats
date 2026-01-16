<?php
/**
 * Plugin Name: Lean Stats
 * Description: Privacy-friendly, self-hosted analytics for WordPress.
 * Version: 0.24.12
 * Author: BimBeau
 * Author: Lean Stats
 * Text Domain: lean-stats
 * Domain Path: /languages
 * Requires at least: 6.4
 * Requires PHP: 8.0
 */

defined('ABSPATH') || exit;

$lean_stats_config = require __DIR__ . '/includes/config.php';

define('LEAN_STATS_VERSION', $lean_stats_config['version']);
define('LEAN_STATS_SLUG', $lean_stats_config['slug']);
define('LEAN_STATS_REST_NAMESPACE', $lean_stats_config['rest_namespace']);
define('LEAN_STATS_REST_INTERNAL_NAMESPACE', $lean_stats_config['rest_namespace_internal']);

define('LEAN_STATS_PATH', plugin_dir_path(__FILE__));
define('LEAN_STATS_URL', plugin_dir_url(__FILE__));

/**
 * Load plugin translations.
 */
function lean_stats_load_textdomain(): void
{
    load_plugin_textdomain('lean-stats', false, dirname(plugin_basename(__FILE__)) . '/languages');
}

add_action('init', 'lean_stats_load_textdomain');

require_once LEAN_STATS_PATH . 'includes/features.php';
require_once LEAN_STATS_PATH . 'includes/settings.php';
require_once LEAN_STATS_PATH . 'admin/admin.php';
require_once LEAN_STATS_PATH . 'front/front.php';
require_once LEAN_STATS_PATH . 'rest/routes.php';
require_once LEAN_STATS_PATH . 'db/schema.php';
require_once LEAN_STATS_PATH . 'includes/cache.php';
require_once LEAN_STATS_PATH . 'includes/raw-logs.php';
require_once LEAN_STATS_PATH . 'includes/aggregation.php';

/**
 * Plugin activation tasks.
 */
function lean_stats_activate(): void
{
    lean_stats_install_schema();
    lean_stats_register_raw_logs_option();
    lean_stats_register_settings_option();

    if (!wp_next_scheduled(LEAN_STATS_RAW_LOGS_CRON_HOOK)) {
        wp_schedule_event(time(), 'daily', LEAN_STATS_RAW_LOGS_CRON_HOOK);
    }

    if (!wp_next_scheduled(LEAN_STATS_AGGREGATION_CRON_HOOK)) {
        wp_schedule_event(time(), 'hourly', LEAN_STATS_AGGREGATION_CRON_HOOK);
    }
}

/**
 * Plugin deactivation tasks.
 */
function lean_stats_deactivate(): void
{
    wp_clear_scheduled_hook(LEAN_STATS_RAW_LOGS_CRON_HOOK);
    wp_clear_scheduled_hook(LEAN_STATS_AGGREGATION_CRON_HOOK);
}

register_activation_hook(__FILE__, 'lean_stats_activate');
register_deactivation_hook(__FILE__, 'lean_stats_deactivate');
