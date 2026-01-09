<?php
/**
 * Admin hooks for Lean Stats.
 */

defined('ABSPATH') || exit;

add_action('admin_menu', 'lean_stats_register_admin_menu');
add_action('admin_enqueue_scripts', 'lean_stats_enqueue_admin_assets');

/**
 * Register the Lean Stats admin menu page.
 */
function lean_stats_register_admin_menu(): void
{
    add_menu_page(
        __('Lean Stats', 'lean-stats'),
        __('Lean Stats', 'lean-stats'),
        'manage_options',
        LEAN_STATS_SLUG,
        'lean_stats_render_admin_page',
        'dashicons-chart-area',
        30
    );
}

/**
 * Render the admin root element.
 */
function lean_stats_render_admin_page(): void
{
    echo '<div class="wrap">';
    echo '<div id="lean-stats-admin"></div>';
    echo '</div>';
}

/**
 * Enqueue the admin bundle and pass initialization data.
 */
function lean_stats_enqueue_admin_assets(string $hook_suffix): void
{
    if ($hook_suffix !== 'toplevel_page_' . LEAN_STATS_SLUG) {
        return;
    }

    $asset_file = LEAN_STATS_PATH . 'build/admin.asset.php';
    $asset_data = [
        'dependencies' => ['wp-element', 'wp-components'],
        'version' => LEAN_STATS_VERSION,
    ];

    if (file_exists($asset_file)) {
        $asset_data = require $asset_file;
    }

    wp_enqueue_script(
        'lean-stats-admin',
        LEAN_STATS_URL . 'build/admin.js',
        $asset_data['dependencies'],
        $asset_data['version'],
        true
    );

    wp_localize_script(
        'lean-stats-admin',
        'LeanStatsAdmin',
        [
            'rootId' => 'lean-stats-admin',
            'restNonce' => wp_create_nonce('wp_rest'),
            'restUrl' => esc_url_raw(rest_url()),
            'settings' => [
                'restNamespace' => LEAN_STATS_REST_NAMESPACE,
                'restInternalNamespace' => LEAN_STATS_REST_INTERNAL_NAMESPACE,
                'pluginVersion' => LEAN_STATS_VERSION,
                'slug' => LEAN_STATS_SLUG,
            ],
        ]
    );
}
