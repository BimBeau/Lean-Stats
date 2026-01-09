const helpers = require('../lean-stats-tracker');

describe('Lean Stats tracker helpers', () => {
    test('normalizePath trims and normalizes paths', () => {
        expect(helpers.normalizePath('about/')).toBe('/about');
        expect(helpers.normalizePath('/blog/')).toBe('/blog');
        expect(helpers.normalizePath('')).toBe('/');
        expect(helpers.normalizePath(null)).toBe('/');
    });

    test('buildPayload cleans URL and builds payload', () => {
        const payload = helpers.buildPayload({
            currentUrl: 'https://example.com/blog/?utm_source=test#section',
            postId: 42,
            referrer: 'https://referrer.example/path?x=1',
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0) AppleWebKit',
            width: 500,
            now: 1_700_000_000_000,
        });

        expect(payload).toEqual({
            page_path: '/blog',
            post_id: 42,
            referrer_domain: 'referrer.example',
            device_class: 'mobile',
            timestamp_bucket: 1_699_999_800,
        });
    });
});
