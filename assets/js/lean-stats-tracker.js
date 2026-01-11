(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(root);
    } else {
        root.LeanStatsTrackerHelpers = factory(root);
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    function normalizePath(pathname) {
        if (typeof pathname !== 'string') {
            return '/';
        }

        let path = pathname.trim();
        if (path === '') {
            return '/';
        }

        if (path.charAt(0) !== '/') {
            path = '/' + path;
        }

        if (path.length > 1 && path.endsWith('/')) {
            path = path.slice(0, -1);
        }

        return path;
    }

    function extractReferrerDomain(referrer) {
        if (typeof referrer !== 'string' || referrer === '') {
            return null;
        }

        try {
            const referrerUrl = new URL(referrer, 'https://example.com');
            return referrerUrl.hostname || null;
        } catch (error) {
            return null;
        }
    }

    function getDeviceClass(userAgent, width) {
        const agent = typeof userAgent === 'string' ? userAgent : '';
        if (/bot|crawler|spider|crawling/i.test(agent)) {
            return 'bot';
        }

        const viewportWidth = typeof width === 'number' && Number.isFinite(width)
            ? width
            : (root.innerWidth || (root.screen ? root.screen.width : 1024));

        if (viewportWidth <= 640) {
            return 'mobile';
        }

        if (viewportWidth <= 1024) {
            return 'tablet';
        }

        return 'desktop';
    }

    function getTimestampBucket(now, bucketSizeSeconds) {
        const size = typeof bucketSizeSeconds === 'number' && bucketSizeSeconds > 0
            ? bucketSizeSeconds
            : 300;
        const timestamp = typeof now === 'number' && Number.isFinite(now) ? now : Date.now();
        return Math.floor(timestamp / 1000 / size) * size;
    }

    function buildPayload(options) {
        const opts = options || {};
        const baseUrl = root.location && root.location.href ? root.location.href : 'https://example.com';
        const currentUrl = opts.currentUrl
            ? new URL(opts.currentUrl, baseUrl)
            : new URL(baseUrl);

        const settings = opts.settings || {};
        const postId = Object.prototype.hasOwnProperty.call(opts, 'postId')
            ? opts.postId
            : (settings.postId || null);

        const referrer = Object.prototype.hasOwnProperty.call(opts, 'referrer')
            ? opts.referrer
            : (root.document ? root.document.referrer : '');

        const userAgent = Object.prototype.hasOwnProperty.call(opts, 'userAgent')
            ? opts.userAgent
            : (root.navigator ? root.navigator.userAgent : '');

        const width = Object.prototype.hasOwnProperty.call(opts, 'width')
            ? opts.width
            : undefined;

        const now = Object.prototype.hasOwnProperty.call(opts, 'now') ? opts.now : undefined;

        return {
            page_path: normalizePath(currentUrl.pathname),
            post_id: postId || null,
            referrer_domain: extractReferrerDomain(referrer),
            device_class: getDeviceClass(userAgent, width),
            timestamp_bucket: getTimestampBucket(now),
        };
    }

    function getEndpointUrl(settings) {
        const data = settings || root.LeanStatsTracker || {};
        if (!data.restUrl || !data.restNamespace) {
            return null;
        }

        return new URL(
            data.restNamespace.replace(/^\/+/, '') + '/hits',
            data.restUrl
        ).toString();
    }

    function sendPayload(settings) {
        const endpoint = getEndpointUrl(settings);
        if (!endpoint) {
            return;
        }

        const payload = buildPayload({ settings: settings });
        const body = JSON.stringify(payload);

        if (root.navigator && root.navigator.sendBeacon) {
            const sent = root.navigator.sendBeacon(
                endpoint,
                new Blob([body], { type: 'application/json' })
            );
            if (sent) {
                return;
            }
        }

        if (!root.fetch) {
            return;
        }

        root.fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: body,
            keepalive: true,
            credentials: 'omit',
        }).catch(function () {
            return null;
        });
    }

    function initTracker() {
        if (!root.LeanStatsTracker || !root.document) {
            return;
        }

        const settings = root.LeanStatsTracker;

        if (root.document.readyState === 'loading') {
            root.document.addEventListener('DOMContentLoaded', function () {
                sendPayload(settings);
            }, { once: true });
        } else {
            sendPayload(settings);
        }
    }

    initTracker();

    return {
        normalizePath: normalizePath,
        extractReferrerDomain: extractReferrerDomain,
        getDeviceClass: getDeviceClass,
        getTimestampBucket: getTimestampBucket,
        buildPayload: buildPayload,
        getEndpointUrl: getEndpointUrl,
    };
});
