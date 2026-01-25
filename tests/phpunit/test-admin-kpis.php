<?php
/**
 * Tests for admin KPI aggregation.
 */

class Lean_Stats_Admin_Kpis_Test extends WP_UnitTestCase
{
    private Lean_Stats_Admin_Controller $controller;

    protected function setUp(): void
    {
        parent::setUp();
        $this->controller = new Lean_Stats_Admin_Controller();
        if (function_exists('lean_stats_flush_admin_cache')) {
            lean_stats_flush_admin_cache();
        }
    }

    public function test_kpis_use_entry_hits_for_visits(): void
    {
        global $wpdb;

        $today = wp_date('Y-m-d', current_time('timestamp'));
        $daily_table = $wpdb->prefix . 'lean_stats_daily';
        $entry_exit_table = $wpdb->prefix . 'lean_stats_entry_exit_daily';

        $wpdb->insert(
            $daily_table,
            [
                'date_bucket' => $today,
                'page_path' => '/test',
                'referrer_domain' => '',
                'device_class' => 'desktop',
                'hits' => 10,
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
                'page_path' => '/test',
                'entries' => 3,
                'exits' => 1,
            ],
            [
                '%s',
                '%s',
                '%d',
                '%d',
            ]
        );

        $request = new WP_REST_Request('GET', '/lean-stats/internal/v1/admin/kpis');
        $request->set_param('start', $today);
        $request->set_param('end', $today);

        $response = $this->controller->get_kpis($request);
        $data = $response->get_data();

        $this->assertSame(3, $data['kpis']['visits']);
        $this->assertSame(10, $data['kpis']['pageViews']);
    }
}
