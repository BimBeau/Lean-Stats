<?php
/**
 * Front-end hooks for Lean Stats.
 */

defined('ABSPATH') || exit;

add_action('wp_enqueue_scripts', 'lean_stats_enqueue_front_assets');

/**
 * Enqueue the tracker script and inject runtime settings.
 */
function lean_stats_enqueue_front_assets(): void
{
    $handle = 'lean-stats-tracker';

    wp_enqueue_script(
        $handle,
        LEAN_STATS_URL . 'assets/js/lean-stats-tracker.js',
        [],
        LEAN_STATS_VERSION,
        true
    );

    $settings = [
        'restUrl' => esc_url_raw(rest_url()),
        'restNamespace' => LEAN_STATS_REST_NAMESPACE,
        'postId' => is_singular() ? get_queried_object_id() : null,
    ];

    wp_add_inline_script(
        $handle,
        'window.LeanStatsTracker = ' . wp_json_encode($settings) . ';',
        'before'
    );
}
