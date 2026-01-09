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
            'roles' => lean_stats_get_roles_for_admin(),
            'panels' => lean_stats_get_admin_panels(),
            'restSources' => lean_stats_get_rest_sources(),
            'features' => lean_stats_features(),
            'settings' => [
                'restNamespace' => LEAN_STATS_REST_NAMESPACE,
                'restInternalNamespace' => LEAN_STATS_REST_INTERNAL_NAMESPACE,
                'pluginVersion' => LEAN_STATS_VERSION,
                'slug' => LEAN_STATS_SLUG,
            ],
        ]
    );
}

/**
 * Get admin panels configuration.
 */
function lean_stats_get_admin_panels(): array
{
    $panels = [
        [
            'name' => 'dashboard',
            'title' => __('Tableau de bord', 'lean-stats'),
            'type' => 'core',
        ],
        [
            'name' => 'settings',
            'title' => __('Réglages', 'lean-stats'),
            'type' => 'core',
        ],
    ];

    $filtered = apply_filters('lean_stats_admin_panels', $panels);
    if (!is_array($filtered)) {
        $filtered = $panels;
    }

    $normalized = [];
    foreach ($filtered as $panel) {
        if (!is_array($panel)) {
            continue;
        }

        $name = isset($panel['name']) ? sanitize_key($panel['name']) : '';
        if ($name === '') {
            continue;
        }

        $normalized[] = [
            'name' => $name,
            'title' => isset($panel['title']) ? wp_strip_all_tags((string) $panel['title']) : $name,
            'type' => isset($panel['type']) ? sanitize_key($panel['type']) : 'custom',
        ];
    }

    return $normalized;
}

/**
 * Get REST data sources list for admin screens.
 */
function lean_stats_get_rest_sources(): array
{
    $sources = [
        [
            'key' => 'settings',
            'method' => 'GET',
            'namespace' => LEAN_STATS_REST_INTERNAL_NAMESPACE,
            'path' => '/admin/settings',
        ],
        [
            'key' => 'kpis',
            'method' => 'GET',
            'namespace' => LEAN_STATS_REST_INTERNAL_NAMESPACE,
            'path' => '/admin/kpis',
        ],
        [
            'key' => 'top-pages',
            'method' => 'GET',
            'namespace' => LEAN_STATS_REST_INTERNAL_NAMESPACE,
            'path' => '/admin/top-pages',
        ],
        [
            'key' => 'referrers',
            'method' => 'GET',
            'namespace' => LEAN_STATS_REST_INTERNAL_NAMESPACE,
            'path' => '/admin/referrers',
        ],
        [
            'key' => 'timeseries-day',
            'method' => 'GET',
            'namespace' => LEAN_STATS_REST_INTERNAL_NAMESPACE,
            'path' => '/admin/timeseries/day',
        ],
        [
            'key' => 'timeseries-hour',
            'method' => 'GET',
            'namespace' => LEAN_STATS_REST_INTERNAL_NAMESPACE,
            'path' => '/admin/timeseries/hour',
        ],
        [
            'key' => 'device-split',
            'method' => 'GET',
            'namespace' => LEAN_STATS_REST_INTERNAL_NAMESPACE,
            'path' => '/admin/device-split',
        ],
    ];

    $filtered = apply_filters('lean_stats_rest_sources', $sources);
    if (!is_array($filtered)) {
        $filtered = $sources;
    }

    $normalized = [];
    foreach ($filtered as $source) {
        if (!is_array($source)) {
            continue;
        }

        $key = isset($source['key']) ? sanitize_key($source['key']) : '';
        $method = isset($source['method']) ? strtoupper(sanitize_key($source['method'])) : 'GET';
        $namespace = isset($source['namespace']) ? sanitize_text_field((string) $source['namespace']) : '';
        $path = isset($source['path']) ? '/' . ltrim((string) $source['path'], '/') : '';

        if ($key === '' || $namespace === '' || $path === '/') {
            continue;
        }

        $normalized[] = [
            'key' => $key,
            'method' => $method,
            'namespace' => $namespace,
            'path' => $path,
        ];
    }

    return $normalized;
}

/**
 * Prepare roles list for admin settings.
 */
function lean_stats_get_roles_for_admin(): array
{
    $roles = wp_roles();
    if (!$roles) {
        return [];
    }

    $formatted = [];
    foreach ($roles->roles as $key => $role) {
        $formatted[] = [
            'key' => $key,
            'label' => translate_user_role($role['name']),
        ];
    }

    return $formatted;
}
