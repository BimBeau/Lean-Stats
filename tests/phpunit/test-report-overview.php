<?php
/**
 * Tests for report overview metrics.
 */

class Lean_Stats_Report_Overview_Test extends WP_UnitTestCase
{
    private Lean_Stats_Report_Controller $controller;

    protected function setUp(): void
    {
        parent::setUp();
        $this->controller = new Lean_Stats_Report_Controller();
        if (function_exists('lean_stats_flush_admin_cache')) {
            lean_stats_flush_admin_cache();
        }
    }

    public function test_overview_visits_use_entry_hits(): void
    {
        global $wpdb;

        $today = wp_date('Y-m-d', current_time('timestamp'));
        $daily_table = $wpdb->prefix . 'lean_stats_daily';
        $entry_exit_table = $wpdb->prefix . 'lean_stats_entry_exit_daily';

        $wpdb->insert(
            $daily_table,
            [
                'date_bucket' => $today,
                'page_path' => '/overview',
                'referrer_domain' => '',
                'device_class' => 'desktop',
                'hits' => 12,
            ],
            [
                '%s',
                '%s',
                '%s',
                '%s',
                '%d',
            ]
        );

        $wpdb->insert(
            $entry_exit_table,
            [
                'date_bucket' => $today,
                'page_path' => '/overview',
                'entries' => 4,
                'exits' => 2,
            ],
            [
                '%s',
                '%s',
                '%d',
                '%d',
            ]
        );

        $request = new WP_REST_Request('GET', '/lean-stats/v1/overview');
        $request->set_param('start', $today);
        $request->set_param('end', $today);

        $response = $this->controller->get_overview($request);
        $data = $response->get_data();

        $this->assertSame(4, $data['overview']['visits']);
        $this->assertSame(12, $data['overview']['pageViews']);
    }
}
