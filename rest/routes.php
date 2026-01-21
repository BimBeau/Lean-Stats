<?php
/**
 * REST API routes for Lean Stats.
 */

defined('ABSPATH') || exit;

require_once LEAN_STATS_PATH . 'includes/rest/class-lean-stats-hit-controller.php';
require_once LEAN_STATS_PATH . 'includes/rest/class-lean-stats-admin-controller.php';
require_once LEAN_STATS_PATH . 'includes/rest/class-lean-stats-report-controller.php';

add_action('rest_api_init', static function (): void {
    $controller = new Lean_Stats_Hit_Controller();
    $controller->register_routes();

    $admin_controller = new Lean_Stats_Admin_Controller();
    $admin_controller->register_routes();

    $report_controller = new Lean_Stats_Report_Controller();
    $report_controller->register_routes();

    do_action('lean_stats_register_rest_sources', LEAN_STATS_REST_INTERNAL_NAMESPACE, LEAN_STATS_REST_NAMESPACE);
});
