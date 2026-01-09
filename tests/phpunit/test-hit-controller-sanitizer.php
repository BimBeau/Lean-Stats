<?php
/**
 * Tests for hit controller sanitization.
 */

class Lean_Stats_Hit_Controller_Sanitizer_Test extends WP_UnitTestCase
{
    private Lean_Stats_Hit_Controller $controller;

    protected function setUp(): void
    {
        parent::setUp();
        $this->controller = new Lean_Stats_Hit_Controller();
    }

    public function test_clean_page_path_strips_query_by_default(): void
    {
        update_option('lean_stats_settings', [
            'url_strip_query' => true,
            'url_query_allowlist' => [],
        ]);

        $method = new ReflectionMethod($this->controller, 'clean_page_path');
        $method->setAccessible(true);

        $cleaned = $method->invoke($this->controller, '/blog/?utm_source=test&ref=keep');

        $this->assertSame('/blog', $cleaned);
    }

    public function test_clean_page_path_keeps_allowlisted_query_args(): void
    {
        update_option('lean_stats_settings', [
            'url_strip_query' => true,
            'url_query_allowlist' => ['utm_source'],
        ]);

        $method = new ReflectionMethod($this->controller, 'clean_page_path');
        $method->setAccessible(true);

        $cleaned = $method->invoke($this->controller, '/blog/?utm_source=test&ref=keep');

        $this->assertSame('/blog?utm_source=test', $cleaned);
    }
}
