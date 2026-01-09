<?php
/**
 * Cache helpers for Lean Stats admin analytics.
 */

defined('ABSPATH') || exit;

/**
 * Return the current admin cache version.
 */
function lean_stats_get_admin_cache_version(): int
{
    $version = (int) get_option('lean_stats_admin_cache_version', 1);

    return $version > 0 ? $version : 1;
}

/**
 * Bump the admin cache version to invalidate transients.
 */
function lean_stats_bump_admin_cache_version(): void
{
    $version = lean_stats_get_admin_cache_version();
    update_option('lean_stats_admin_cache_version', $version + 1, false);
}

/**
 * Build a transient key for admin analytics.
 */
function lean_stats_get_admin_cache_key(string $suffix): string
{
    return 'lean_stats_admin_' . lean_stats_get_admin_cache_version() . '_' . $suffix;
}

/**
 * Flush cached admin analytics.
 */
function lean_stats_flush_admin_cache(): void
{
    lean_stats_bump_admin_cache_version();
}
