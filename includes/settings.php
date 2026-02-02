<?php
/**
 * Settings helpers for Lean Stats.
 */

defined('ABSPATH') || exit;

const LEAN_STATS_MAX_PATH_LENGTH = 2048;

/**
 * Default settings values.
 */
function lean_stats_get_settings_defaults(): array
{
    return [
        'plugin_label' => '',
        'respect_dnt_gpc' => true,
        'url_strip_query' => true,
        'url_query_allowlist' => [],
        'raw_logs_enabled' => false,
        'raw_logs_retention_days' => 1,
        'excluded_roles' => [],
        'excluded_paths' => [],
        'debug_enabled' => false,
        'maxmind_account_id' => '',
        'maxmind_license_key' => '',
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
    $settings['respect_dnt_gpc'] = (bool) rest_sanitize_boolean($settings['respect_dnt_gpc']);
    $settings['url_strip_query'] = (bool) rest_sanitize_boolean($settings['url_strip_query']);
    $settings['maxmind_account_id'] = trim(sanitize_text_field($settings['maxmind_account_id']));
    $settings['maxmind_license_key'] = trim(sanitize_text_field($settings['maxmind_license_key']));
    $raw_logs_enabled = (bool) rest_sanitize_boolean($settings['raw_logs_enabled']);
    $debug_enabled = (bool) rest_sanitize_boolean($settings['debug_enabled']);
    $settings['debug_enabled'] = $debug_enabled || $raw_logs_enabled;
    $settings['raw_logs_enabled'] = $settings['debug_enabled'];

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

    $strict_mode = !empty($settings['strict_mode']) && rest_sanitize_boolean($settings['strict_mode']);
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
    if ($strict_mode && $valid_roles) {
        $excluded_roles = $valid_roles;
    }
    $settings['excluded_roles'] = $excluded_roles;
    unset($settings['strict_mode']);

    $excluded_paths = $settings['excluded_paths'];
    if (is_string($excluded_paths)) {
        $excluded_paths = preg_split('/[\r\n,]+/', $excluded_paths);
    }
    if (!is_array($excluded_paths)) {
        $excluded_paths = [];
    }

    $normalized_paths = [];
    foreach ($excluded_paths as $path) {
        if (!is_string($path)) {
            continue;
        }
        $normalized = lean_stats_normalize_path_value($path);
        if ($normalized !== '') {
            $normalized_paths[] = $normalized;
        }
    }
    $settings['excluded_paths'] = array_values(array_unique($normalized_paths));

    if (isset($settings['maxmind_api_key'])) {
        unset($settings['maxmind_api_key']);
    }

    return $settings;
}

/**
 * Validate MaxMind credentials from settings.
 */
function lean_stats_validate_maxmind_settings(array $settings): array
{
    $errors = [];
    $account_id = trim((string) ($settings['maxmind_account_id'] ?? ''));
    $license_key = trim((string) ($settings['maxmind_license_key'] ?? ''));

    if ($account_id === '') {
        $errors['maxmind_account_id'] = __('MaxMind Account ID is required.', 'lean-stats');
    } elseif (!ctype_digit($account_id)) {
        $errors['maxmind_account_id'] = __('MaxMind Account ID must be numeric.', 'lean-stats');
    }

    if ($license_key === '') {
        $errors['maxmind_license_key'] = __('MaxMind License Key is required.', 'lean-stats');
    }

    return $errors;
}

/**
 * Format validation errors for MaxMind credentials.
 */
function lean_stats_format_maxmind_errors(array $errors): string
{
    $messages = array_values(array_filter($errors));
    if (!$messages) {
        return __('MaxMind credentials are required to enable IP geolocation.', 'lean-stats');
    }

    return implode(' ', $messages);
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
    $raw_logs_enabled = get_option('lean_stats_raw_logs_enabled', null);
    if ($raw_logs_enabled !== null) {
        $settings['raw_logs_enabled'] = (bool) $raw_logs_enabled;
    }
    $settings = lean_stats_sanitize_settings($settings);

    return $settings;
}

/**
 * Update settings with sanitization.
 */
function lean_stats_update_settings($settings): array
{
    $previous = lean_stats_get_settings();
    $sanitized = lean_stats_sanitize_settings($settings);
    $errors = lean_stats_validate_maxmind_settings($sanitized);
    if ($errors) {
        return new WP_Error(
            'lean_stats_invalid_maxmind_credentials',
            lean_stats_format_maxmind_errors($errors),
            [
                'status' => 400,
                'field_errors' => $errors,
            ]
        );
    }
    update_option('lean_stats_settings', $sanitized, false);
    update_option('lean_stats_raw_logs_enabled', (bool) $sanitized['raw_logs_enabled'], false);

    if (
        $sanitized['raw_logs_retention_days'] !== $previous['raw_logs_retention_days']
        && function_exists('lean_stats_schedule_raw_log_cleanup')
    ) {
        lean_stats_schedule_raw_log_cleanup(true);
    } elseif (function_exists('lean_stats_schedule_raw_log_cleanup')) {
        lean_stats_schedule_raw_log_cleanup(false);
    }

    return $sanitized;
}

/**
 * Normalize a path for settings storage.
 */
function lean_stats_normalize_path_value(string $path): string
{
    $path = trim($path);
    if ($path === '') {
        return '';
    }

    $path = lean_stats_lowercase($path);
    $path = '/' . ltrim($path, '/');
    $path = untrailingslashit($path);
    $path = $path === '' ? '/' : $path;

    return lean_stats_trim_value($path, LEAN_STATS_MAX_PATH_LENGTH);
}

/**
 * Lowercase helper with multibyte support.
 */
function lean_stats_lowercase(string $value): string
{
    if (function_exists('mb_strtolower')) {
        return mb_strtolower($value);
    }

    return strtolower($value);
}

/**
 * Trim a string to a maximum length.
 */
function lean_stats_trim_value(string $value, int $max): string
{
    if ($max <= 0) {
        return $value;
    }

    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max);
    }

    return substr($value, 0, $max);
}
