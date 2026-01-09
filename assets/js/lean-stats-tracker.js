(function () {
    if (!window.LeanStatsTracker) {
        return;
    }

    var settings = window.LeanStatsTracker;

    function normalizePath(pathname) {
        if (typeof pathname !== 'string') {
            return '/';
        }

        var path = pathname.trim();
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

    function extractReferrerDomain() {
        if (!document.referrer) {
            return null;
        }

        try {
            var referrerUrl = new URL(document.referrer);
            return referrerUrl.hostname || null;
        } catch (error) {
            return null;
        }
    }

    function getDeviceClass() {
        var userAgent = navigator.userAgent || '';
        if (/bot|crawler|spider|crawling/i.test(userAgent)) {
            return 'bot';
        }

        var width = window.innerWidth || screen.width || 1024;
        if (width <= 640) {
            return 'mobile';
        }

        if (width <= 1024) {
            return 'tablet';
        }

        return 'desktop';
    }

    function getTimestampBucket() {
        var bucketSizeSeconds = 300;
        return Math.floor(Date.now() / 1000 / bucketSizeSeconds) * bucketSizeSeconds;
    }

    function buildPayload() {
        var currentUrl = new URL(window.location.href);

        return {
            page_path: normalizePath(currentUrl.pathname),
            post_id: settings.postId || null,
            referrer_domain: extractReferrerDomain(),
            device_class: getDeviceClass(),
            timestamp_bucket: getTimestampBucket(),
        };
    }

    function getEndpointUrl() {
        if (!settings.restUrl || !settings.restNamespace) {
            return null;
        }

        return new URL(
            settings.restNamespace.replace(/^\/+/, '') + '/hits',
            settings.restUrl
        ).toString();
    }

    function sendPayload() {
        var endpoint = getEndpointUrl();
        if (!endpoint) {
            return;
        }

        var payload = buildPayload();
        var body = JSON.stringify(payload);

        if (navigator.sendBeacon) {
            var sent = navigator.sendBeacon(
                endpoint,
                new Blob([body], { type: 'application/json' })
            );
            if (sent) {
                return;
            }
        }

        fetch(endpoint, {
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', sendPayload, { once: true });
    } else {
        sendPayload();
    }
})();
