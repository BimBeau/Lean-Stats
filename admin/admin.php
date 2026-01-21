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
    $panels = lean_stats_get_admin_panels();
    if (empty($panels)) {
        return;
    }

    $menu_slug = LEAN_STATS_SLUG;
    $menu_label = lean_stats_get_plugin_label();

    $top_panel = $panels[0];

    $menu_hook = add_menu_page(
        $menu_label,
        $menu_label,
        'manage_options',
        $menu_slug,
        'lean_stats_render_admin_page',
        'dashicons-chart-area',
        30
    );

    $panel_pages = [];
    $panel_pages[$menu_slug] = $top_panel['name'] ?? 'dashboard';

    $submenu_hooks = [];
    foreach ($panels as $panel) {
        $panel_name = $panel['name'] ?? '';
        $panel_title = $panel['title'] ?? $panel_name;
        if ($panel_name === '') {
            continue;
        }

        $panel_slug = $panel_name === $panel_pages[$menu_slug] ? $menu_slug : $menu_slug . '-' . $panel_name;
        $panel_pages[$panel_slug] = $panel_name;

        $submenu_hooks[] = add_submenu_page(
            $menu_slug,
            $panel_title,
            $panel_title,
            'manage_options',
            $panel_slug,
            'lean_stats_render_admin_page'
        );
    }

    $lean_stats_admin_pages = array_merge([$menu_hook], $submenu_hooks);
    $lean_stats_admin_panel_map = $panel_pages;

    $GLOBALS['lean_stats_admin_pages'] = $lean_stats_admin_pages;
    $GLOBALS['lean_stats_admin_panel_map'] = $lean_stats_admin_panel_map;
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
    $registered_pages = $GLOBALS['lean_stats_admin_pages'] ?? [];
    if (!in_array($hook_suffix, $registered_pages, true)) {
        return;
    }

    $menu_label = lean_stats_get_plugin_label();
    $current_page = isset($_GET['page']) ? sanitize_key(wp_unslash($_GET['page'])) : LEAN_STATS_SLUG;
    $panel_map = $GLOBALS['lean_stats_admin_panel_map'] ?? [];
    $current_panel = $panel_map[$current_page] ?? 'dashboard';
    $settings = lean_stats_get_settings();
    $debug_enabled = !empty($settings['debug_enabled']);

    $asset_file = LEAN_STATS_PATH . 'build/admin.asset.php';
    $asset_data = [
        'dependencies' => ['wp-element', 'wp-components', 'wp-i18n'],
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

    if (function_exists('wp_set_script_translations')) {
        wp_set_script_translations(
            'lean-stats-admin',
            'lean-stats',
            LEAN_STATS_PATH . 'languages/'
        );
    }

    $admin_css_path = LEAN_STATS_PATH . 'build/style-admin.css';
    if (file_exists($admin_css_path)) {
        wp_enqueue_style(
            'lean-stats-admin',
            LEAN_STATS_URL . 'build/style-admin.css',
            [],
            $asset_data['version']
        );
        wp_style_add_data('lean-stats-admin', 'rtl', 'replace');
    }

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
            'currentPanel' => $current_panel,
            'settings' => [
                'restNamespace' => LEAN_STATS_REST_NAMESPACE,
                'restInternalNamespace' => LEAN_STATS_REST_INTERNAL_NAMESPACE,
                'pluginVersion' => LEAN_STATS_VERSION,
                'slug' => LEAN_STATS_SLUG,
                'pluginLabel' => $menu_label,
                'debugEnabled' => $debug_enabled,
            ],
        ]
    );

    wp_add_inline_script(
        'lean-stats-admin',
        'window.LEAN_STATS_DEBUG = ' . ($debug_enabled ? 'true' : 'false') . ';',
        'before'
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
            'title' => __('Dashboard', 'lean-stats'),
            'type' => 'core',
        ],
        [
            'name' => 'settings',
            'title' => __('Settings', 'lean-stats'),
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
        [
            'key' => 'overview',
            'method' => 'GET',
            'namespace' => LEAN_STATS_REST_NAMESPACE,
            'path' => '/overview',
        ],
        [
            'key' => 'report-top-pages',
            'method' => 'GET',
            'namespace' => LEAN_STATS_REST_NAMESPACE,
            'path' => '/top-pages',
        ],
        [
            'key' => 'report-referrers',
            'method' => 'GET',
            'namespace' => LEAN_STATS_REST_NAMESPACE,
            'path' => '/referrers',
        ],
        [
            'key' => 'report-404s',
            'method' => 'GET',
            'namespace' => LEAN_STATS_REST_NAMESPACE,
            'path' => '/404s',
        ],
        [
            'key' => 'report-search-terms',
            'method' => 'GET',
            'namespace' => LEAN_STATS_REST_NAMESPACE,
            'path' => '/search-terms',
        ],
        [
            'key' => 'report-purge',
            'method' => 'POST',
            'namespace' => LEAN_STATS_REST_NAMESPACE,
            'path' => '/purge',
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
