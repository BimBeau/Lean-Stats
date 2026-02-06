<?php
/**
 * Aggregation helpers for Lean Stats.
 */

defined('ABSPATH') || exit;

const LEAN_STATS_AGGREGATION_CRON_HOOK = 'lean_stats_aggregate_hits';

/**
 * Determine whether hourly aggregation is enabled and available.
 */
function lean_stats_hourly_aggregation_enabled(): bool
{
    static $enabled = null;

    if ($enabled !== null) {
        return $enabled;
    }

    $enabled = (bool) apply_filters('lean_stats_hourly_aggregation_enabled', true);
    if (!$enabled) {
        return false;
    }

    global $wpdb;

    $table = $wpdb->prefix . 'lean_stats_hourly';
    $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
    $enabled = ($exists === $table);

    return $enabled;
}

/**
 * Run aggregation for stored raw hits.
 */
function lean_stats_aggregate_hits(): void
{
    if (!lean_stats_raw_logs_enabled()) {
        return;
    }

    $hits = get_option('lean_stats_hits', []);
    if (!is_array($hits) || $hits === []) {
        return;
    }

    $aggregates = lean_stats_build_aggregates_from_hits($hits);
    if (
        $aggregates['updated_hits'] === $hits
        && $aggregates['daily'] === []
        && $aggregates['hourly'] === []
        && $aggregates['entry_exit'] === []
    ) {
        return;
    }

    if ($aggregates['daily'] !== []) {
        lean_stats_upsert_aggregate_rows('daily', $aggregates['daily']);
    }

    if ($aggregates['hourly'] !== []) {
        lean_stats_upsert_aggregate_rows('hourly', $aggregates['hourly']);
    }

    if ($aggregates['entry_exit'] !== []) {
        lean_stats_upsert_entry_exit_rows($aggregates['entry_exit']);
    }

    update_option('lean_stats_hits', $aggregates['updated_hits'], false);

    if ($aggregates['daily'] !== [] || $aggregates['hourly'] !== [] || $aggregates['entry_exit'] !== []) {
        lean_stats_flush_admin_cache();
    }
}

/**
 * Build aggregate rows and update raw hits with aggregation markers.
 */
function lean_stats_build_aggregates_from_hits(array $hits): array
{
    $daily = [];
    $hourly = [];
    $updated_hits = [];
    $entry_exit = [];
    $collect_hourly = lean_stats_hourly_aggregation_enabled();

    foreach ($hits as $hit) {
        if (!is_array($hit)) {
            continue;
        }

        if (!empty($hit['aggregated'])) {
            $updated_hits[] = $hit;
            continue;
        }

        $timestamp = isset($hit['timestamp_bucket']) ? absint($hit['timestamp_bucket']) : 0;
        $page_path = isset($hit['page_path']) ? (string) $hit['page_path'] : '';
        $device_class = isset($hit['device_class']) ? (string) $hit['device_class'] : '';
        $referrer_domain = isset($hit['referrer_domain']) && $hit['referrer_domain'] !== null
            ? (string) $hit['referrer_domain']
            : '';

        if ($timestamp === 0 || $page_path === '' || $device_class === '') {
            $updated_hits[] = $hit;
            continue;
        }

        $date_bucket = wp_date('Y-m-d', $timestamp);

        $daily_key = implode('|', [$date_bucket, $page_path, $referrer_domain, $device_class]);
        if (!isset($daily[$daily_key])) {
            $daily[$daily_key] = [
                'date_bucket' => $date_bucket,
                'page_path' => $page_path,
                'referrer_domain' => $referrer_domain,
                'device_class' => $device_class,
                'hits' => 0,
            ];
        }
        $daily[$daily_key]['hits']++;

        if ($collect_hourly) {
            $hour_bucket = wp_date('Y-m-d H:00:00', $timestamp);
            $hourly_key = implode('|', [$hour_bucket, $page_path, $referrer_domain, $device_class]);
            if (!isset($hourly[$hourly_key])) {
                $hourly[$hourly_key] = [
                    'date_bucket' => $hour_bucket,
                    'page_path' => $page_path,
                    'referrer_domain' => $referrer_domain,
                    'device_class' => $device_class,
                    'hits' => 0,
                ];
            }
            $hourly[$hourly_key]['hits']++;
        }

        $is_entry = lean_stats_is_entry_hit($page_path, $referrer_domain);
        $is_exit = lean_stats_is_exit_hit($page_path, $referrer_domain);
        if ($is_entry || $is_exit) {
            $entry_exit_key = implode('|', [$date_bucket, $page_path]);
            if (!isset($entry_exit[$entry_exit_key])) {
                $entry_exit[$entry_exit_key] = [
                    'date_bucket' => $date_bucket,
                    'page_path' => $page_path,
                    'entries' => 0,
                    'exits' => 0,
                ];
            }
            if ($is_entry) {
                $entry_exit[$entry_exit_key]['entries']++;
            }
            if ($is_exit) {
                $entry_exit[$entry_exit_key]['exits']++;
            }
        }

        $hit['aggregated'] = true;
        $hit['aggregated_at'] = current_time('timestamp');
        $updated_hits[] = $hit;
    }

    return [
        'daily' => array_values($daily),
        'hourly' => array_values($hourly),
        'entry_exit' => array_values($entry_exit),
        'updated_hits' => $updated_hits,
    ];
}

/**
 * Store a single hit directly into aggregation tables.
 */
function lean_stats_store_aggregate_hit(array $hit, array $utm_params = []): void
{
    $timestamp = isset($hit['timestamp_bucket']) ? absint($hit['timestamp_bucket']) : 0;
    $page_path = isset($hit['page_path']) ? (string) $hit['page_path'] : '';
    $device_class = isset($hit['device_class']) ? (string) $hit['device_class'] : '';
    $referrer_domain = isset($hit['referrer_domain']) && $hit['referrer_domain'] !== null
        ? (string) $hit['referrer_domain']
        : '';

    if ($timestamp === 0 || $page_path === '' || $device_class === '') {
        return;
    }

    $date_bucket = wp_date('Y-m-d', $timestamp);
    $collect_hourly = lean_stats_hourly_aggregation_enabled();
    if ($collect_hourly) {
        $hour_bucket = wp_date('Y-m-d H:00:00', $timestamp);
    }

    $source_category = lean_stats_get_source_category_from_referrer($referrer_domain);
    lean_stats_increment_hits_daily($date_bucket, $page_path, $referrer_domain, $source_category);
    lean_stats_increment_entry_exit_daily(
        $date_bucket,
        $page_path,
        lean_stats_is_entry_hit($page_path, $referrer_domain) ? 1 : 0,
        lean_stats_is_exit_hit($page_path, $referrer_domain) ? 1 : 0
    );

    if ($utm_params !== []) {
        lean_stats_store_utm_daily($date_bucket, $utm_params);
    }

    lean_stats_upsert_aggregate_rows(
        'daily',
        [
            [
                'date_bucket' => $date_bucket,
                'page_path' => $page_path,
                'referrer_domain' => $referrer_domain,
                'device_class' => $device_class,
                'hits' => 1,
            ],
        ]
    );

    if ($collect_hourly) {
        lean_stats_upsert_aggregate_rows(
            'hourly',
            [
                [
                    'date_bucket' => $hour_bucket,
                    'page_path' => $page_path,
                    'referrer_domain' => $referrer_domain,
                    'device_class' => $device_class,
                    'hits' => 1,
                ],
            ]
        );
    }
}

/**
 * Store a single hit directly into the geolocation aggregation table.
 */
function lean_stats_store_geo_aggregate_hit(array $hit): void
{
    $timestamp = isset($hit['timestamp_bucket']) ? absint($hit['timestamp_bucket']) : 0;
    if ($timestamp === 0) {
        return;
    }

    $geo = lean_stats_get_geo_aggregate_payload();
    if ($geo === []) {
        return;
    }

    $date_bucket = wp_date('Y-m-d', $timestamp);

    lean_stats_upsert_geo_rows(
        [
            [
                'date_bucket' => $date_bucket,
                'country_code' => $geo['country_code'],
                'region_code' => $geo['region_code'],
                'city_name' => $geo['city_name'],
                'hits' => 1,
            ],
        ]
    );
}

/**
 * Upsert entry/exit aggregate rows.
 */
function lean_stats_upsert_entry_exit_rows(array $rows): void
{
    if ($rows === []) {
        return;
    }

    global $wpdb;

    $table = $wpdb->prefix . 'lean_stats_entry_exit_daily';
    $placeholders = [];
    $values = [];

    foreach ($rows as $row) {
        $placeholders[] = '(%s, %s, %d, %d)';
        $values[] = $row['date_bucket'];
        $values[] = $row['page_path'];
        $values[] = (int) $row['entries'];
        $values[] = (int) $row['exits'];
    }

    $sql = "INSERT INTO {$table} (date_bucket, page_path, entries, exits) VALUES "
        . implode(', ', $placeholders)
        . ' ON DUPLICATE KEY UPDATE entries = entries + VALUES(entries), exits = exits + VALUES(exits)';

    $wpdb->query($wpdb->prepare($sql, $values));
}

/**
 * Upsert geolocation aggregate rows.
 */
function lean_stats_upsert_geo_rows(array $rows): void
{
    if ($rows === []) {
        return;
    }

    global $wpdb;

    $table = $wpdb->prefix . 'lean_stats_geo_daily';
    $placeholders = [];
    $values = [];

    foreach ($rows as $row) {
        $placeholders[] = '(%s, %s, %s, %s, %d)';
        $values[] = $row['date_bucket'];
        $values[] = $row['country_code'];
        $values[] = $row['region_code'];
        $values[] = $row['city_name'];
        $values[] = (int) $row['hits'];
    }

    $sql = "INSERT INTO {$table} (date_bucket, country_code, region_code, city_name, hits) VALUES "
        . implode(', ', $placeholders)
        . ' ON DUPLICATE KEY UPDATE hits = hits + VALUES(hits)';

    $wpdb->query($wpdb->prepare($sql, $values));
}

/**
 * Upsert aggregate rows into the daily or hourly table.
 */
function lean_stats_upsert_aggregate_rows(string $bucket, array $rows): void
{
    if ($rows === []) {
        return;
    }

    global $wpdb;

    $table = $bucket === 'hourly'
        ? $wpdb->prefix . 'lean_stats_hourly'
        : $wpdb->prefix . 'lean_stats_daily';

    $placeholders = [];
    $values = [];

    foreach ($rows as $row) {
        $placeholders[] = '(%s, %s, %s, %s, %d)';
        $values[] = $row['date_bucket'];
        $values[] = $row['page_path'];
        $values[] = $row['referrer_domain'];
        $values[] = $row['device_class'];
        $values[] = (int) $row['hits'];
    }

    $sql = "INSERT INTO {$table} (date_bucket, page_path, referrer_domain, device_class, hits) VALUES "
        . implode(', ', $placeholders)
        . ' ON DUPLICATE KEY UPDATE hits = hits + VALUES(hits)';

    $wpdb->query($wpdb->prepare($sql, $values));
}

add_action(LEAN_STATS_AGGREGATION_CRON_HOOK, 'lean_stats_aggregate_hits');
