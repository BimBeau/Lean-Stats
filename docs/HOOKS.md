# Hooks

## Filters

### `lean_stats_features`

Filter the Lean Stats feature flags. The callback receives an associative array of flags and returns the updated array.

Default flags:

- `admin_panels` (`false`)
- `rest_sources` (`false`)

```php
add_filter('lean_stats_features', function (array $features): array {
    $features['admin_panels'] = true;

    return $features;
});
```

### `lean_stats_admin_panels`

Filter the admin panels configuration. Each panel entry contains a `name`, a `title`, and an optional `type`.

Custom panels use a React component registered on `window.LeanStatsAdminPanels` with the same key as the panel `name`.

```php
add_filter('lean_stats_admin_panels', function (array $panels): array {
    $panels[] = [
        'name' => 'custom-report',
        'title' => __('Rapport personnalisé', 'lean-stats'),
        'type' => 'custom',
    ];

    return $panels;
});
```

```js
window.LeanStatsAdminPanels = {
    'custom-report': function CustomReportPanel() {
        return <div>Custom panel</div>;
    },
};
```

### `lean_stats_rest_sources`

Filter the list of REST data sources exposed to the admin UI. Each source includes `key`, `method`, `namespace`, and `path`.

```php
add_filter('lean_stats_rest_sources', function (array $sources): array {
    $sources[] = [
        'key' => 'custom-report',
        'method' => 'GET',
        'namespace' => LEAN_STATS_REST_INTERNAL_NAMESPACE,
        'path' => '/admin/custom-report',
    ];

    return $sources;
});
```

## Actions

### `lean_stats_register_rest_sources`

Register additional REST routes for Lean Stats. The action receives the internal and public namespaces.

```php
add_action('lean_stats_register_rest_sources', function (string $internal_namespace, string $public_namespace): void {
    register_rest_route(
        $internal_namespace,
        '/admin/custom-report',
        [
            'methods' => 'GET',
            'callback' => 'my_custom_report_callback',
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ]
    );
});
```
