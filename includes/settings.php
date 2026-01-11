<?php
/**
 * Settings helpers for Lean Stats.
 */

defined('ABSPATH') || exit;

/**
 * Default settings values.
 */
function lean_stats_get_settings_defaults(): array
{
    return [
        'plugin_label' => '',
        'strict_mode' => false,
        'respect_dnt_gpc' => true,
        'url_strip_query' => true,
        'url_query_allowlist' => [],
        'raw_logs_retention_days' => 1,
        'excluded_roles' => [],
    ];
}

/**
 * Ensure the settings option exists with defaults.
 */
function lean_stats_register_settings_option(): void
{
    if (get_option('lean_stats_settings', null) === null) {
        add_option('lean_stats_settings', lean_stats_get_settings_defaults(), '', false);
    }
}

/**
 * Sanitize and normalize settings input.
 */
function lean_stats_sanitize_settings($settings): array
{
    $defaults = lean_stats_get_settings_defaults();

    if (!is_array($settings)) {
        $settings = [];
    }

    $settings = wp_parse_args($settings, $defaults);

    $settings['plugin_label'] = trim(sanitize_text_field($settings['plugin_label']));
    $settings['strict_mode'] = (bool) rest_sanitize_boolean($settings['strict_mode']);
    $settings['respect_dnt_gpc'] = (bool) rest_sanitize_boolean($settings['respect_dnt_gpc']);
    $settings['url_strip_query'] = (bool) rest_sanitize_boolean($settings['url_strip_query']);

    $allowlist = $settings['url_query_allowlist'];
    if (is_string($allowlist)) {
        $allowlist = preg_split('/[\s,]+/', $allowlist);
    }
    if (!is_array($allowlist)) {
        $allowlist = [];
    }
    $allowlist = array_filter(array_map('sanitize_key', $allowlist));
    $settings['url_query_allowlist'] = array_values(array_unique($allowlist));

    $retention_days = absint($settings['raw_logs_retention_days']);
    if ($retention_days < 1) {
        $retention_days = $defaults['raw_logs_retention_days'];
    }
    $settings['raw_logs_retention_days'] = min($retention_days, 365);

    $excluded_roles = $settings['excluded_roles'];
    if (is_string($excluded_roles)) {
        $excluded_roles = preg_split('/[\s,]+/', $excluded_roles);
    }
    if (!is_array($excluded_roles)) {
        $excluded_roles = [];
    }
    $excluded_roles = array_filter(array_map('sanitize_key', $excluded_roles));
    $roles = wp_roles();
    $valid_roles = $roles ? array_keys($roles->roles) : [];
    if ($valid_roles) {
        $excluded_roles = array_values(array_intersect($excluded_roles, $valid_roles));
    } else {
        $excluded_roles = [];
    }
    $settings['excluded_roles'] = $excluded_roles;

    return $settings;
}

/**
 * Get plugin label used for admin menu and dashboard heading.
 */
function lean_stats_get_plugin_label(): string
{
    $settings = lean_stats_get_settings();
    $label = isset($settings['plugin_label']) ? trim((string) $settings['plugin_label']) : '';

    if ($label === '') {
        return __('Lean Stats', 'lean-stats');
    }

    return $label;
}

/**
 * Get sanitized settings with defaults.
 */
function lean_stats_get_settings(): array
{
    $settings = get_option('lean_stats_settings', []);

    return lean_stats_sanitize_settings($settings);
}

/**
 * Update settings with sanitization.
 */
function lean_stats_update_settings($settings): array
{
    $sanitized = lean_stats_sanitize_settings($settings);
    update_option('lean_stats_settings', $sanitized, false);

    return $sanitized;
}
