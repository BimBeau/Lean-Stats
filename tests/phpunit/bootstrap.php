<?php
/**
 * PHPUnit bootstrap file for Lean Stats.
 */

$_tests_dir = getenv('WP_TESTS_DIR');
if (!$_tests_dir) {
    $_tests_dir = '/tmp/wordpress-tests-lib';
}

if (!file_exists($_tests_dir . '/includes/functions.php')) {
    echo "WP tests not found in {$_tests_dir}\n";
    exit(1);
}

require_once $_tests_dir . '/includes/functions.php';

function _lean_stats_load_plugin(): void
{
    require dirname(__DIR__, 2) . '/lean-stats.php';
}

tests_add_filter('muplugins_loaded', '_lean_stats_load_plugin');

require $_tests_dir . '/includes/bootstrap.php';
