<?php
/**
 * Aggregation helpers for Lean Stats.
 */

defined('ABSPATH') || exit;

const LEAN_STATS_AGGREGATION_CRON_HOOK = 'lean_stats_aggregate_hits';

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
    if ($aggregates['updated_hits'] === $hits && $aggregates['daily'] === [] && $aggregates['hourly'] === []) {
        return;
    }

    if ($aggregates['daily'] !== []) {
        lean_stats_upsert_aggregate_rows('daily', $aggregates['daily']);
    }

    if ($aggregates['hourly'] !== []) {
        lean_stats_upsert_aggregate_rows('hourly', $aggregates['hourly']);
    }

    update_option('lean_stats_hits', $aggregates['updated_hits'], false);

    if ($aggregates['daily'] !== [] || $aggregates['hourly'] !== []) {
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
        $hour_bucket = wp_date('Y-m-d H:00:00', $timestamp);

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

        $hit['aggregated'] = true;
        $hit['aggregated_at'] = current_time('timestamp');
        $updated_hits[] = $hit;
    }

    return [
        'daily' => array_values($daily),
        'hourly' => array_values($hourly),
        'updated_hits' => $updated_hits,
    ];
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
