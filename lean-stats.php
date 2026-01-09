<?php
/**
 * Plugin Name: Lean Stats
 * Description: Privacy-friendly, self-hosted analytics for WordPress.
 * Version: 0.1.1
 * Author: Lean Stats
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

require_once LEAN_STATS_PATH . 'admin/admin.php';
require_once LEAN_STATS_PATH . 'front/front.php';
require_once LEAN_STATS_PATH . 'rest/routes.php';
require_once LEAN_STATS_PATH . 'db/schema.php';
