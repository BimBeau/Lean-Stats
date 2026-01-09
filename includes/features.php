<?php
/**
 * Feature flags for Lean Stats.
 */

defined('ABSPATH') || exit;

/**
 * Get Lean Stats feature flags.
 */
function lean_stats_features(): array
{
    $defaults = [
        'admin_panels' => false,
        'rest_sources' => false,
    ];

    $features = apply_filters('lean_stats_features', $defaults);
    if (!is_array($features)) {
        return $defaults;
    }

    return wp_parse_args($features, $defaults);
}
