<?php
/**
 * Tests for settings sanitization.
 */

class Lean_Stats_Settings_Sanitizer_Test extends WP_UnitTestCase
{
    public function test_sanitize_settings_normalizes_values(): void
    {
        $settings = lean_stats_sanitize_settings([
            'strict_mode' => '1',
            'respect_dnt_gpc' => '',
            'url_strip_query' => '0',
            'url_query_allowlist' => 'utm_source, utm_medium,utm_source',
            'raw_logs_retention_days' => -5,
            'excluded_roles' => ['administrator', 'not-a-role'],
        ]);
        $roles = wp_roles();
        $all_roles = $roles ? array_keys($roles->roles) : [];

        $this->assertArrayNotHasKey('strict_mode', $settings);
        $this->assertFalse($settings['respect_dnt_gpc']);
        $this->assertFalse($settings['url_strip_query']);
        $this->assertSame(['utm_source', 'utm_medium'], $settings['url_query_allowlist']);
        $this->assertSame(1, $settings['raw_logs_retention_days']);
        $this->assertSame($all_roles, $settings['excluded_roles']);
    }

    public function test_sanitize_settings_caps_retention_days(): void
    {
        $settings = lean_stats_sanitize_settings([
            'raw_logs_retention_days' => 400,
        ]);

        $this->assertSame(365, $settings['raw_logs_retention_days']);
    }
}
