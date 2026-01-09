<?php
/**
 * Tests for admin REST permissions.
 */

class Lean_Stats_Admin_Permissions_Test extends WP_UnitTestCase
{
    private Lean_Stats_Admin_Controller $controller;

    protected function setUp(): void
    {
        parent::setUp();
        $this->controller = new Lean_Stats_Admin_Controller();
    }

    public function test_permissions_require_manage_options(): void
    {
        $user_id = self::factory()->user->create(['role' => 'subscriber']);
        wp_set_current_user($user_id);

        $request = new WP_REST_Request('GET', '/');
        $result = $this->controller->check_permissions($request);

        $this->assertInstanceOf(WP_Error::class, $result);
        $this->assertSame('lean_stats_forbidden', $result->get_error_code());
    }

    public function test_permissions_require_nonce(): void
    {
        $user_id = self::factory()->user->create(['role' => 'administrator']);
        wp_set_current_user($user_id);

        $request = new WP_REST_Request('GET', '/');
        $result = $this->controller->check_permissions($request);

        $this->assertInstanceOf(WP_Error::class, $result);
        $this->assertSame('lean_stats_invalid_nonce', $result->get_error_code());
    }

    public function test_permissions_allow_valid_nonce(): void
    {
        $user_id = self::factory()->user->create(['role' => 'administrator']);
        wp_set_current_user($user_id);

        $request = new WP_REST_Request('GET', '/');
        $request->set_header('X-WP-Nonce', wp_create_nonce('wp_rest'));
        $result = $this->controller->check_permissions($request);

        $this->assertTrue($result);
    }
}
