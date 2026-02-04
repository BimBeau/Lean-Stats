/**
 * Admin entry point for Lean Stats.
 */

import { render, useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
    Button,
    ButtonGroup,
    Card,
    CardBody,
    CheckboxControl,
    Flex,
    FlexItem,
    Badge,
    __experimentalBadge as ExperimentalBadge,
    Modal,
    Notice,
    SelectControl,
    TabPanel,
    TextControl,
    TextareaControl,
    ToggleControl,
    Tooltip,
} from '@wordpress/components';

import { createLogger, createTraceId, getRuntimeDiagnostics, setupGlobalErrorHandlers } from './logger';
import AdminErrorBoundary from './components/AdminErrorBoundary';
import ChartFrame from './components/ChartFrame';
import DataState from './components/DataState';
import LsCard from './components/LsCard';

const KpiBadge = ({ children, ...props }) => {
    const BadgeComponent = Badge || ExperimentalBadge || 'span';

    return (
        <BadgeComponent className="ls-kpi-card__badge" {...props}>
            {children}
        </BadgeComponent>
    );
};

const ADMIN_CONFIG = window.LeanStatsAdmin || null;
const DEBUG_FLAG = () => Boolean(window.LEAN_STATS_DEBUG ?? ADMIN_CONFIG?.settings?.debugEnabled);
const DEFAULT_PANELS = [
    { name: 'dashboard', title: __('Dashboard', 'lean-stats') },
    { name: 'top-pages', title: __('Top pages', 'lean-stats') },
    { name: 'referrers', title: __('Referring sites', 'lean-stats') },
    { name: 'search-terms', title: __('Internal searches', 'lean-stats') },
    { name: 'geolocation', title: __('Geolocation', 'lean-stats') },
    { name: 'settings', title: __('Settings', 'lean-stats') },
];
const DEFAULT_SETTINGS = {
    plugin_label: '',
    respect_dnt_gpc: true,
    url_strip_query: true,
    url_query_allowlist: [],
    raw_logs_enabled: false,
    raw_logs_retention_days: 1,
    excluded_roles: [],
    excluded_paths: [],
    debug_enabled: false,
    maxmind_account_id: '',
    maxmind_license_key: '',
};
const DEFAULT_RANGE_PRESET = '30d';
const RANGE_PRESET_OPTIONS = ['7d', '30d', '90d'];
const RANGE_PRESET_STORAGE_PREFIX = 'lean_stats_range_preset';
const getRangePresetStorageKey = () => {
    const userId = ADMIN_CONFIG?.currentUserId ? String(ADMIN_CONFIG.currentUserId) : 'default';
    return `${RANGE_PRESET_STORAGE_PREFIX}:${userId}`;
};

const normalizeRangePreset = (preset) =>
    RANGE_PRESET_OPTIONS.includes(preset) ? preset : null;

const getRangePresetFromUrl = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    const params = new URLSearchParams(window.location.search);
    return normalizeRangePreset(params.get('period') || params.get('range'));
};

const getStoredRangePreset = () => {
    if (typeof window === 'undefined' || !window.localStorage) {
        return null;
    }

    try {
        return normalizeRangePreset(window.localStorage.getItem(getRangePresetStorageKey()));
    } catch (error) {
        return null;
    }
};

const storeRangePreset = (preset) => {
    if (typeof window === 'undefined' || !window.localStorage) {
        return;
    }

    try {
        window.localStorage.setItem(getRangePresetStorageKey(), preset);
    } catch (error) {
        // Ignore storage failures (e.g. privacy mode).
    }
};

const useSharedRangePreset = () => {
    const urlPreset = getRangePresetFromUrl();
    const [rangePreset, setRangePresetState] = useState(
        () => urlPreset || getStoredRangePreset() || DEFAULT_RANGE_PRESET
    );
    const [hasUserOverride, setHasUserOverride] = useState(false);

    const setRangePreset = (preset) => {
        setRangePresetState(preset);
        setHasUserOverride(true);
    };

    useEffect(() => {
        if (urlPreset && !hasUserOverride) {
            return;
        }

        if (normalizeRangePreset(rangePreset)) {
            storeRangePreset(rangePreset);
        }
    }, [rangePreset, urlPreset, hasUserOverride]);

    return [rangePreset, setRangePreset];
};
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatLogTimestamp = (timestamp) => {
    if (!timestamp) {
        return '';
    }

    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
};

const getRangeFromPreset = (preset) => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(end);

    switch (preset) {
        case '7d':
            start.setDate(start.getDate() - 6);
            break;
        case '30d':
            start.setDate(start.getDate() - 29);
            break;
        case '90d':
            start.setDate(start.getDate() - 89);
            break;
        default:
            start.setDate(start.getDate() - 29);
    }

    return {
        start: formatDate(start),
        end: formatDate(end),
    };
};

const buildRestUrl = (path, params, namespace) => {
    const base = ADMIN_CONFIG?.restUrl ? `${ADMIN_CONFIG.restUrl}` : '';
    const resolvedNamespace = namespace ?? (ADMIN_CONFIG?.settings?.restInternalNamespace || '');
    const url = new URL(`${resolvedNamespace}${path}`, base);

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, value);
            }
        });
    }

    return url.toString();
};

const useAdminEndpoint = (path, params, options = {}) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const paramsKey = useMemo(() => JSON.stringify(params ?? {}), [params]);
    const logger = useMemo(() => createLogger({ debugEnabled: DEBUG_FLAG }), []);
    const {
        enabled = true,
        namespace = ADMIN_CONFIG?.settings?.restInternalNamespace,
    } = options;

    useEffect(() => {
        if (!enabled || !path) {
            setIsLoading(false);
            setError(null);
            setData(null);
            return undefined;
        }

        let isMounted = true;
        const controller = new AbortController();
        const traceId = createTraceId();

        const fetchData = async () => {
            if (!ADMIN_CONFIG?.restNonce || !ADMIN_CONFIG?.restUrl) {
                setError(__('Missing REST configuration.', 'lean-stats'));
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);
            logger.debug('Loading admin data', {
                action: 'admin.fetch',
                traceId,
                path,
                params,
            });

            try {
                const response = await fetch(buildRestUrl(path, params, namespace), {
                    signal: controller.signal,
                    headers: {
                        'X-WP-Nonce': ADMIN_CONFIG.restNonce,
                    },
                });

                if (!response.ok) {
                    throw new Error(
                        sprintf(__('API error (%s)', 'lean-stats'), response.status)
                    );
                }

                const payload = await response.json();
                if (isMounted) {
                    setData(payload);
                }
                logger.debug('Admin data received', {
                    action: 'admin.fetch.success',
                    traceId,
                    path,
                });
            } catch (fetchError) {
                if (isMounted && fetchError.name !== 'AbortError') {
                    setError(fetchError.message || __('Loading error.', 'lean-stats'));
                    logger.error('Admin load error', {
                        action: 'admin.fetch.error',
                        traceId,
                        path,
                        error: fetchError?.message,
                    });
                } else if (fetchError.name === 'AbortError') {
                    logger.debug('Admin load cancelled', {
                        action: 'admin.fetch.abort',
                        traceId,
                        path,
                    });
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [path, paramsKey, enabled]);

    return { data, isLoading, error };
};

const normalizeSettings = (settings) => {
    const normalized = {
        ...DEFAULT_SETTINGS,
        ...(settings || {}),
    };
    const debugEnabled = Boolean(normalized.debug_enabled || normalized.raw_logs_enabled);

    return {
        ...normalized,
        debug_enabled: debugEnabled,
        raw_logs_enabled: debugEnabled,
    };
};

const normalizePanels = (panels) => {
    if (!Array.isArray(panels)) {
        return DEFAULT_PANELS;
    }

    const normalized = panels
        .map((panel) => ({
            name: panel?.name || '',
            title: panel?.title || panel?.name || '',
        }))
        .filter((panel) => panel.name);

    return normalized.length > 0 ? normalized : DEFAULT_PANELS;
};

const getCurrentPanelTitle = (panelName, panels) => {
    const match = panels.find((panel) => panel.name === panelName);
    return match?.title || __('Lean Stats', 'lean-stats');
};

const getPanelComponent = (name) => {
    const corePanels = {
        dashboard: OverviewPanel,
        'top-pages': PagesPanel,
        referrers: ReferrerSourcesPanel,
        'search-terms': SearchTermsPanel,
        geolocation: GeolocationPanel,
        settings: SettingsPanel,
    };

    if (corePanels[name]) {
        return corePanels[name];
    }

    const registry = window.LeanStatsAdminPanels || {};
    return registry[name] || null;
};

const SettingsLogsTab = ({ debugEnabled }) => {
    const { data, isLoading, error } = useAdminEndpoint(
        '/admin/raw-logs',
        { limit: 50 },
        { enabled: debugEnabled }
    );
    const logs = data?.items || [];

    if (!debugEnabled) {
        return (
            <Notice status="warning" isDismissible={false}>
                {__('Enable debug mode to display raw logs.', 'lean-stats')}
            </Notice>
        );
    }

    return (
        <div className="ls-settings-logs">
            <DataState
                isLoading={isLoading}
                error={error}
                isEmpty={!isLoading && !error && logs.length === 0}
                emptyLabel={__('No raw logs available.', 'lean-stats')}
                loadingLabel={__('Loading raw logs…', 'lean-stats')}
                skeletonRows={4}
            />
            {!isLoading && !error && logs.length > 0 && (
                <table className="widefat striped ls-settings-logs__table">
                    <thead>
                        <tr>
                            <th>{__('Date', 'lean-stats')}</th>
                            <th>{__('Page', 'lean-stats')}</th>
                            <th>{__('Referrer', 'lean-stats')}</th>
                            <th>{__('Device', 'lean-stats')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log, index) => (
                            <tr key={`${log.timestamp_bucket}-${index}`}>
                                <td>{formatLogTimestamp(log.timestamp_bucket)}</td>
                                <td>{log.page_path}</td>
                                <td>{log.referrer_domain || __('Direct', 'lean-stats')}</td>
                                <td>{log.device_class || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

const GeolocationPanel = () => {
    const { data, isLoading, error } = useAdminEndpoint('/admin/geolocation');
    const location = data?.location || null;
    const hasLocation = location && !location.error;
    const sourceLabel = __('MaxMind API', 'lean-stats');

    return (
        <LsCard title={__('Geolocation', 'lean-stats')}>
            <DataState
                isLoading={isLoading}
                error={error}
                isEmpty={!isLoading && !error && !hasLocation}
                emptyLabel={__('No geolocation data available.', 'lean-stats')}
                loadingLabel={__('Looking up location…', 'lean-stats')}
                skeletonRows={4}
            />
            {!isLoading && !error && location?.error && (
                <Notice status="warning" isDismissible={false}>
                    {location.error}
                </Notice>
            )}
            {!isLoading && !error && hasLocation && (
                <>
                    <p>{__('Location is derived from the current request IP and is not stored.', 'lean-stats')}</p>
                    <table className="widefat striped">
                        <tbody>
                            <tr>
                                <th>{__('IP address', 'lean-stats')}</th>
                                <td>{location.ip}</td>
                            </tr>
                            <tr>
                                <th>{__('Country', 'lean-stats')}</th>
                                <td>{location.country || __('Unavailable', 'lean-stats')}</td>
                            </tr>
                            <tr>
                                <th>{__('Region', 'lean-stats')}</th>
                                <td>{location.region || __('Unavailable', 'lean-stats')}</td>
                            </tr>
                            <tr>
                                <th>{__('City', 'lean-stats')}</th>
                                <td>{location.city || __('Unavailable', 'lean-stats')}</td>
                            </tr>
                            <tr>
                                <th>{__('Source', 'lean-stats')}</th>
                                <td>{sourceLabel}</td>
                            </tr>
                        </tbody>
                    </table>
                </>
            )}
        </LsCard>
    );
};

const PeriodFilter = ({ value, onChange }) => (
    <Card className="ls-overview__summary-card ls-overview__summary-card--filter">
        <CardBody>
            <SelectControl
                label={__('Period', 'lean-stats')}
                value={value}
                options={[
                    { label: __('7 days', 'lean-stats'), value: '7d' },
                    { label: __('30 days', 'lean-stats'), value: '30d' },
                    { label: __('90 days', 'lean-stats'), value: '90d' },
                ]}
                onChange={onChange}
                __next40pxDefaultSize
                __nextHasNoMarginBottom
            />
        </CardBody>
    </Card>
);

const SettingsPanel = () => {
    const { data, isLoading, error } = useAdminEndpoint('/admin/settings');
    const [formState, setFormState] = useState(DEFAULT_SETTINGS);
    const [allowlistInput, setAllowlistInput] = useState('');
    const [excludedPathsInput, setExcludedPathsInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveNotice, setSaveNotice] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [isPurgeOpen, setIsPurgeOpen] = useState(false);
    const [isPurging, setIsPurging] = useState(false);
    const [purgeNotice, setPurgeNotice] = useState(null);
    const logger = useMemo(() => createLogger({ debugEnabled: DEBUG_FLAG }), []);
    const debugEnabled = Boolean(formState.debug_enabled);
    const validateMaxMindFields = (nextState) => {
        const errors = {};
        const accountId = String(nextState.maxmind_account_id || '').trim();
        const licenseKey = String(nextState.maxmind_license_key || '').trim();

        if (!accountId) {
            errors.maxmind_account_id = __('MaxMind Account ID is required.', 'lean-stats');
        } else if (!/^\d+$/.test(accountId)) {
            errors.maxmind_account_id = __('MaxMind Account ID must be numeric.', 'lean-stats');
        }

        if (!licenseKey) {
            errors.maxmind_license_key = __('MaxMind License Key is required.', 'lean-stats');
        }

        return errors;
    };

    useEffect(() => {
        if (data?.settings) {
            const normalized = normalizeSettings(data.settings);
            setFormState(normalized);
            setAllowlistInput(normalized.url_query_allowlist.join(', '));
            setExcludedPathsInput(normalized.excluded_paths.join('\n'));
            window.LEAN_STATS_DEBUG = Boolean(normalized.debug_enabled);
            setValidationErrors({});
        }
    }, [data]);

    const onSave = async () => {
        if (!ADMIN_CONFIG?.restNonce || !ADMIN_CONFIG?.restUrl) {
            setSaveNotice({ status: 'error', message: __('Missing REST configuration.', 'lean-stats') });
            return;
        }

        const errors = validateMaxMindFields(formState);
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            setSaveNotice({
                status: 'error',
                message: Object.values(errors).join(' '),
            });
            return;
        }

        setIsSaving(true);
        setSaveNotice(null);
        const traceId = createTraceId();
        logger.info('Saving settings', {
            action: 'settings.save',
            traceId,
        });

        try {
            const response = await fetch(buildRestUrl('/admin/settings'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': ADMIN_CONFIG.restNonce,
                },
                body: JSON.stringify(formState),
            });

            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                if (payload?.data?.field_errors) {
                    setValidationErrors(payload.data.field_errors);
                }
                throw new Error(
                    payload?.message || sprintf(__('API error (%s)', 'lean-stats'), response.status)
                );
            }

            if (payload?.settings) {
                const normalized = normalizeSettings(payload.settings);
                setFormState(normalized);
                setAllowlistInput(normalized.url_query_allowlist.join(', '));
                setExcludedPathsInput(normalized.excluded_paths.join('\n'));
                window.LEAN_STATS_DEBUG = Boolean(normalized.debug_enabled);
                setValidationErrors({});
            }

            setSaveNotice({ status: 'success', message: __('Settings saved.', 'lean-stats') });
            logger.info('Settings saved', {
                action: 'settings.save.success',
                traceId,
            });
        } catch (saveError) {
            setSaveNotice({
                status: 'error',
                message: saveError.message || __('Error while saving.', 'lean-stats'),
            });
            logger.error('Settings save error', {
                action: 'settings.save.error',
                traceId,
                error: saveError?.message,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const onPurge = async () => {
        if (!ADMIN_CONFIG?.restNonce || !ADMIN_CONFIG?.restUrl) {
            setPurgeNotice({ status: 'error', message: __('Missing REST configuration.', 'lean-stats') });
            return;
        }

        setIsPurging(true);
        setPurgeNotice(null);
        const traceId = createTraceId();
        logger.info('Purging analytics data', {
            action: 'settings.purge',
            traceId,
        });

        try {
            const response = await fetch(buildRestUrl('/admin/purge-data'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': ADMIN_CONFIG.restNonce,
                },
            });

            if (!response.ok) {
                throw new Error(
                    sprintf(__('API error (%s)', 'lean-stats'), response.status)
                );
            }

            await response.json();
            setPurgeNotice({ status: 'success', message: __('Analytics data purged.', 'lean-stats') });
            logger.info('Analytics data purged', {
                action: 'settings.purge.success',
                traceId,
            });
        } catch (purgeError) {
            setPurgeNotice({
                status: 'error',
                message: purgeError.message || __('Error while purging.', 'lean-stats'),
            });
            logger.error('Purge error', {
                action: 'settings.purge.error',
                traceId,
                error: purgeError?.message,
            });
        } finally {
            setIsPurging(false);
            setIsPurgeOpen(false);
        }
    };

    const roles = ADMIN_CONFIG?.roles || [];
    const settingsTabs = [
        { name: 'general', title: __('General', 'lean-stats') },
        ...(debugEnabled ? [{ name: 'logs', title: __('Logs', 'lean-stats') }] : []),
    ];

    return (
        <LsCard title={__('Settings', 'lean-stats')}>
            <DataState
                isLoading={isLoading}
                error={error}
                isEmpty={false}
                emptyLabel=""
                loadingLabel={__('Loading settings…', 'lean-stats')}
                skeletonRows={6}
            />
            {!isLoading && !error && (
                <TabPanel tabs={settingsTabs}>
                    {(tab) => {
                        if (tab.name === 'logs') {
                            return (
                                <SettingsLogsTab
                                    debugEnabled={debugEnabled}
                                />
                            );
                        }

                        return (
                            <div className="ls-settings-form">
                                {saveNotice && (
                                    <Notice status={saveNotice.status} isDismissible={false}>
                                        {saveNotice.message}
                                    </Notice>
                                )}
                                {purgeNotice && (
                                    <Notice status={purgeNotice.status} isDismissible={false}>
                                        {purgeNotice.message}
                                    </Notice>
                                )}
                                <Card className="ls-settings-section">
                                    <CardBody>
                                        <h3 className="ls-settings-section__title">{__('General', 'lean-stats')}</h3>
                                        <TextControl
                                            label={__('Plugin name (menu and dashboard)', 'lean-stats')}
                                            help={__('Leave blank to use "Lean Stats".', 'lean-stats')}
                                            value={formState.plugin_label}
                                            onChange={(value) => setFormState((prev) => ({ ...prev, plugin_label: value }))}
                                        />
                                    </CardBody>
                                </Card>
                                <Card className="ls-settings-section">
                                    <CardBody>
                                        <h3 className="ls-settings-section__title">{__('Geolocation', 'lean-stats')}</h3>
                                        <p>
                                            {__(
                                                'MaxMind Account ID and License Key are required to enable IP geolocation.',
                                                'lean-stats'
                                            )}
                                        </p>
                                        <TextControl
                                            label={__('MaxMind Account ID', 'lean-stats')}
                                            type="text"
                                            help={
                                                validationErrors.maxmind_account_id ||
                                                __(
                                                    'Numeric Account ID for MaxMind IP geolocation.',
                                                    'lean-stats'
                                                )
                                            }
                                            value={formState.maxmind_account_id}
                                            onChange={(value) => {
                                                setFormState((prev) => ({ ...prev, maxmind_account_id: value }));
                                                if (validationErrors.maxmind_account_id) {
                                                    setValidationErrors((prev) => ({
                                                        ...prev,
                                                        maxmind_account_id: null,
                                                    }));
                                                }
                                            }}
                                            isInvalid={Boolean(validationErrors.maxmind_account_id)}
                                        />
                                        <TextControl
                                            label={__('MaxMind License Key', 'lean-stats')}
                                            type="password"
                                            help={
                                                validationErrors.maxmind_license_key ||
                                                __(
                                                    'License Key for MaxMind IP geolocation.',
                                                    'lean-stats'
                                                )
                                            }
                                            value={formState.maxmind_license_key}
                                            onChange={(value) => {
                                                setFormState((prev) => ({ ...prev, maxmind_license_key: value }));
                                                if (validationErrors.maxmind_license_key) {
                                                    setValidationErrors((prev) => ({
                                                        ...prev,
                                                        maxmind_license_key: null,
                                                    }));
                                                }
                                            }}
                                            isInvalid={Boolean(validationErrors.maxmind_license_key)}
                                        />
                                    </CardBody>
                                </Card>
                                <Card className="ls-settings-section">
                                    <CardBody>
                                        <h3 className="ls-settings-section__title">
                                            {__('Privacy & consent', 'lean-stats')}
                                        </h3>
                                        <ToggleControl
                                            label={__('Respect DNT / GPC', 'lean-stats')}
                                            help={__('Ignore tracking if the browser sends DNT or GPC.', 'lean-stats')}
                                            checked={formState.respect_dnt_gpc}
                                            onChange={(value) => setFormState((prev) => ({ ...prev, respect_dnt_gpc: value }))}
                                        />
                                        <ToggleControl
                                            label={__('Debug mode', 'lean-stats')}
                                            help={__('Enables detailed console logs and raw log capture.', 'lean-stats')}
                                            checked={formState.debug_enabled}
                                            onChange={(value) =>
                                                setFormState((prev) => ({
                                                    ...prev,
                                                    debug_enabled: value,
                                                    raw_logs_enabled: value,
                                                }))
                                            }
                                        />
                                        <TextControl
                                            label={__('Retention window (days)', 'lean-stats')}
                                            type="number"
                                            min={1}
                                            max={365}
                                            value={String(formState.raw_logs_retention_days)}
                                            help={__('Raw logs purge automatically after the configured window.', 'lean-stats')}
                                            onChange={(value) => {
                                                const next = Number.parseInt(value, 10);
                                                setFormState((prev) => ({
                                                    ...prev,
                                                    raw_logs_retention_days: Number.isNaN(next) ? prev.raw_logs_retention_days : next,
                                                }));
                                            }}
                                        />
                                    </CardBody>
                                </Card>
                                <Card className="ls-settings-section">
                                    <CardBody>
                                        <h3 className="ls-settings-section__title">{__('URL cleaning', 'lean-stats')}</h3>
                                        <ToggleControl
                                            label={__('Strip query parameters', 'lean-stats')}
                                            help={__('Remove query parameters from tracked URLs.', 'lean-stats')}
                                            checked={formState.url_strip_query}
                                            onChange={(value) => setFormState((prev) => ({ ...prev, url_strip_query: value }))}
                                        />
                                        <TextControl
                                            label={__('Query parameter allowlist', 'lean-stats')}
                                            help={__(
                                                'Comma-separated list of allowed query keys (used for URL tracking and UTM aggregation).',
                                                'lean-stats'
                                            )}
                                            value={allowlistInput}
                                            onChange={(value) => {
                                                setAllowlistInput(value);
                                                const parsed = value
                                                    .split(',')
                                                    .map((item) => item.trim())
                                                    .filter(Boolean);
                                                setFormState((prev) => ({ ...prev, url_query_allowlist: parsed }));
                                            }}
                                        />
                                    </CardBody>
                                </Card>
                                <Card className="ls-settings-section">
                                    <CardBody>
                                        <h3 className="ls-settings-section__title">{__('Exclusions', 'lean-stats')}</h3>
                                        <TextareaControl
                                            label={__('Excluded paths', 'lean-stats')}
                                            help={__('One per line or comma-separated (e.g., /privacy, /account).', 'lean-stats')}
                                            value={excludedPathsInput}
                                            onChange={(value) => {
                                                setExcludedPathsInput(value);
                                                const parsed = value
                                                    .split(/[\n,]+/)
                                                    .map((item) => item.trim())
                                                    .filter(Boolean);
                                                setFormState((prev) => ({ ...prev, excluded_paths: parsed }));
                                            }}
                                        />
                                        <div>
                                            <p className="ls-settings-roles__title">{__('Role exclusions', 'lean-stats')}</p>
                                            <p>
                                                {__(
                                                    'Select roles to exclude from tracking. Select all roles to ignore all logged-in users.',
                                                    'lean-stats'
                                                )}
                                            </p>
                                            <div className="ls-settings-roles__list">
                                                {roles.length === 0 && <p>{__('No roles available.', 'lean-stats')}</p>}
                                                {roles.map((role) => (
                                                    <CheckboxControl
                                                        key={role.key}
                                                        label={role.label}
                                                        checked={formState.excluded_roles.includes(role.key)}
                                                        onChange={(isChecked) => {
                                                            setFormState((prev) => {
                                                                const nextRoles = new Set(prev.excluded_roles);
                                                                if (isChecked) {
                                                                    nextRoles.add(role.key);
                                                                } else {
                                                                    nextRoles.delete(role.key);
                                                                }
                                                                return { ...prev, excluded_roles: Array.from(nextRoles) };
                                                            });
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>
                                <Card className="ls-settings-section">
                                    <CardBody>
                                        <h3 className="ls-settings-section__title">{__('Data management', 'lean-stats')}</h3>
                                        <p>{__('Remove all aggregated analytics and raw log entries.', 'lean-stats')}</p>
                                        <Button
                                            variant="secondary"
                                            isDestructive
                                            onClick={() => setIsPurgeOpen(true)}
                                        >
                                            {__('Purge analytics data', 'lean-stats')}
                                        </Button>
                                    </CardBody>
                                </Card>
                                <Button
                                    variant="primary"
                                    isBusy={isSaving}
                                    onClick={onSave}
                                    aria-label={__('Save settings', 'lean-stats')}
                                >
                                    {__('Save', 'lean-stats')}
                                </Button>
                                {isPurgeOpen && (
                                    <Modal
                                        title={__('Confirm data purge', 'lean-stats')}
                                        onRequestClose={() => setIsPurgeOpen(false)}
                                    >
                                        <p>
                                            {__(
                                                'This action permanently removes all stored analytics and raw logs. Settings remain unchanged.',
                                                'lean-stats'
                                            )}
                                        </p>
                                        <div className="ls-settings-modal__actions">
                                            <Button variant="secondary" onClick={() => setIsPurgeOpen(false)}>
                                                {__('Cancel', 'lean-stats')}
                                            </Button>
                                            <Button
                                                variant="primary"
                                                isDestructive
                                                isBusy={isPurging}
                                                onClick={onPurge}
                                            >
                                                {__('Purge now', 'lean-stats')}
                                            </Button>
                                        </div>
                                    </Modal>
                                )}
                            </div>
                        );
                    }}
                </TabPanel>
            )}
        </LsCard>
    );
};

const LINE_CHART_WIDTH = 640;
const LINE_CHART_HEIGHT = 240;
const LINE_CHART_PADDING = 32;
const LINE_CHART_LABEL_COUNT = 5;
const LINE_CHART_Y_TICK_COUNT = 4;

const buildSmoothPath = (points, smoothing = 0.2) => {
    if (points.length === 0) {
        return '';
    }

    const controlPoint = (current, previous, next, reverse = false) => {
        const previousPoint = previous || current;
        const nextPoint = next || current;
        const length = Math.hypot(nextPoint.x - previousPoint.x, nextPoint.y - previousPoint.y);
        const angle =
            Math.atan2(nextPoint.y - previousPoint.y, nextPoint.x - previousPoint.x) +
            (reverse ? Math.PI : 0);
        const controlLength = length * smoothing;

        return {
            x: current.x + Math.cos(angle) * controlLength,
            y: current.y + Math.sin(angle) * controlLength,
        };
    };

    return points.reduce((path, point, index, allPoints) => {
        if (index === 0) {
            return `M ${point.x} ${point.y}`;
        }

        const previousPoint = allPoints[index - 1];
        const nextPoint = allPoints[index + 1];
        const controlPointStart = controlPoint(previousPoint, allPoints[index - 2], point);
        const controlPointEnd = controlPoint(point, previousPoint, nextPoint, true);

        return `${path} C ${controlPointStart.x} ${controlPointStart.y} ${controlPointEnd.x} ${controlPointEnd.y} ${point.x} ${point.y}`;
    }, '');
};

const buildLineChartData = (items, chartWidth = LINE_CHART_WIDTH) => {
    const maxHits = items.reduce((max, item) => Math.max(max, item.hits), 0);
    const width = Math.max(Math.round(chartWidth), LINE_CHART_PADDING * 2 + 1);
    const height = LINE_CHART_HEIGHT;
    const padding = LINE_CHART_PADDING;
    const innerWidth = Math.max(width - padding * 2, 1);
    const innerHeight = Math.max(height - padding * 2, 1);
    const totalPoints = Math.max(items.length - 1, 1);

    const points = items.map((item, index) => {
        const x = padding + (innerWidth * index) / totalPoints;
        const y = height - padding - (maxHits ? (item.hits / maxHits) * innerHeight : 0);
        return {
            x,
            y,
            label: item.bucket,
            hits: item.hits,
        };
    });

    const linePath = buildSmoothPath(points);
    const baselineY = height - padding;
    const areaPath =
        points.length > 0
            ? `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`
            : '';

    const labelCount = Math.min(LINE_CHART_LABEL_COUNT, items.length);
    const labelIndices = new Set();
    if (labelCount <= 1) {
        labelIndices.add(0);
    } else {
        const step = (items.length - 1) / (labelCount - 1);
        for (let i = 0; i < labelCount; i += 1) {
            labelIndices.add(Math.round(i * step));
        }
    }

    const xLabels = items
        .map((item, index) => {
            if (!labelIndices.has(index)) {
                return null;
            }
            return {
                x: padding + (innerWidth * index) / totalPoints,
                label: item.bucket,
            };
        })
        .filter(Boolean);

    const yTicks = Array.from({ length: LINE_CHART_Y_TICK_COUNT }, (_, index) => {
        if (LINE_CHART_Y_TICK_COUNT <= 1) {
            return {
                y: padding,
                value: maxHits,
            };
        }
        const ratio = index / (LINE_CHART_Y_TICK_COUNT - 1);
        return {
            y: padding + innerHeight * ratio,
            value: Math.round(maxHits * (1 - ratio)),
        };
    });

    return {
        points,
        linePath,
        areaPath,
        maxHits,
        width,
        height,
        padding,
        baselineY,
        xLabels,
        yTicks,
    };
};

const calculateChangePercent = (current, previous) => {
    if (previous === null || previous === undefined) {
        return null;
    }

    if (previous === 0) {
        return current === 0 ? 0 : 100;
    }

    return ((current - previous) / previous) * 100;
};

const formatChangePercent = (value) => {
    if (value === null || value === undefined) {
        return null;
    }

    const formatter = new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
        signDisplay: 'exceptZero',
    });

    return `${formatter.format(value)}%`;
};

const OverviewKpis = ({ range }) => {
    const { data, isLoading, error } = useAdminEndpoint('/overview', range, {
        namespace: ADMIN_CONFIG?.settings?.restNamespace,
    });
    const overview = data?.overview || null;
    const comparisonOverview = data?.comparison?.overview || null;
    const isEmpty = !isLoading && !error && !overview;

    if (isLoading || error || isEmpty) {
        return (
            <Card className="ls-overview__summary-card ls-overview__summary-card--status">
                <CardBody>
                    <DataState
                        isLoading={isLoading}
                        error={error}
                        isEmpty={isEmpty}
                        emptyLabel={__('No overview data available.', 'lean-stats')}
                        loadingLabel={__('Loading overview…', 'lean-stats')}
                        skeletonRows={3}
                    />
                </CardBody>
            </Card>
        );
    }

    const visitsTooltipLong = __(
        'Number of anonymous sessions over the selected period. The same person can generate multiple visits.',
        'lean-stats'
    );
    const visitsTooltipShort = __('Anonymous sessions aggregated over the selected period.', 'lean-stats');
    const visitsTooltip =
        typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 600px)').matches
            ? visitsTooltipShort
            : visitsTooltipLong;
    const cards = [
        {
            label: __('Visits', 'lean-stats'),
            value: overview.visits ?? 0,
            icon: 'visibility',
            tooltip: visitsTooltip,
            comparisonValue: comparisonOverview?.visits,
        },
        {
            label: __('Page views', 'lean-stats'),
            value: overview.pageViews,
            icon: 'chart-bar',
            comparisonValue: comparisonOverview?.pageViews,
        },
        {
            label: __('Referring sites', 'lean-stats'),
            value: overview.uniqueReferrers,
            icon: 'admin-links',
            comparisonValue: comparisonOverview?.uniqueReferrers,
        },
        {
            label: __('Pages not found (404)', 'lean-stats'),
            value: overview.notFoundHits,
            icon: 'warning',
            comparisonValue: comparisonOverview?.notFoundHits,
        },
        {
            label: __('Internal searches', 'lean-stats'),
            value: overview.searchHits,
            icon: 'search',
            comparisonValue: comparisonOverview?.searchHits,
        },
    ];

    return (
        <>
            {cards.map((card) => (
                <Card key={card.label} className="ls-overview__summary-card">
                    <CardBody className="ls-kpi-card__body">
                        <span className={`dashicons dashicons-${card.icon} ls-kpi-card__icon`} aria-hidden="true" />
                        <div className="ls-kpi-card__content">
                            <p className="ls-kpi-card__label">
                                <span className="ls-kpi-card__label-text">{card.label}</span>
                                {card.tooltip ? (
                                    <Tooltip text={card.tooltip}>
                                        <Button
                                            className="ls-kpi-card__tooltip-button"
                                            variant="tertiary"
                                            isSmall
                                            aria-label={card.tooltip}
                                        >
                                            <span className="dashicons dashicons-info-outline" aria-hidden="true" />
                                        </Button>
                                    </Tooltip>
                                ) : null}
                            </p>
                            <div className="ls-kpi-card__value-row">
                                <strong className="ls-kpi-card__value">{card.value}</strong>
                                {(() => {
                                    const changePercent = calculateChangePercent(
                                        card.value,
                                        card.comparisonValue
                                    );
                                    const formattedChange = formatChangePercent(changePercent);
                                    if (!formattedChange) {
                                        return null;
                                    }

                                    return (
                                        <KpiBadge
                                            aria-label={sprintf(
                                                __('Change vs previous period: %s', 'lean-stats'),
                                                formattedChange
                                            )}
                                        >
                                            {formattedChange}
                                        </KpiBadge>
                                    );
                                })()}
                            </div>
                        </div>
                    </CardBody>
                </Card>
            ))}
        </>
    );
};

const TimeseriesChart = ({ range }) => {
    const { data, isLoading, error } = useAdminEndpoint('/admin/timeseries/day', range);
    const items = data?.items || [];
    const [chartWidth, setChartWidth] = useState(LINE_CHART_WIDTH);
    const chartData = useMemo(() => buildLineChartData(items, chartWidth), [items, chartWidth]);
    const [activePoint, setActivePoint] = useState(null);
    // ResizeObserver updates width without changing the fixed 240px height.
    const handleChartResize = useCallback(({ width }) => {
        const nextWidth = Math.max(Math.round(width), LINE_CHART_PADDING * 2 + 1);
        setChartWidth((prev) => (prev === nextWidth ? prev : nextWidth));
    }, []);

    const formatAxisLabel = (value) => {
        const date = new Date(`${value}T00:00:00`);
        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return new Intl.DateTimeFormat(undefined, {
            day: '2-digit',
            month: 'short',
        }).format(date);
    };

    const formatYAxisValue = (value) => new Intl.NumberFormat().format(value);

    const handleChartMouseMove = useCallback(
        (event) => {
            if (!chartData.points.length) {
                return;
            }
            const bounds = event.currentTarget.getBoundingClientRect();
            if (!bounds.width) {
                return;
            }
            const relativeX = ((event.clientX - bounds.left) / bounds.width) * chartData.width;
            let closestPoint = chartData.points[0];
            let closestDistance = Math.abs(closestPoint.x - relativeX);
            chartData.points.forEach((point) => {
                const distance = Math.abs(point.x - relativeX);
                if (distance < closestDistance) {
                    closestPoint = point;
                    closestDistance = distance;
                }
            });
            setActivePoint((previous) =>
                previous?.label === closestPoint.label ? previous : closestPoint
            );
        },
        [chartData.points, chartData.width]
    );

    const chartTooltip = activePoint
        ? sprintf(
            __('%1$s · %2$s %3$s', 'lean-stats'),
            formatAxisLabel(activePoint.label),
            activePoint.hits,
            __('Page views', 'lean-stats')
        )
        : null;
    const gradientId = 'ls-timeseries-gradient';

    return (
        <LsCard title={__('Daily page views', 'lean-stats')}>
            <DataState
                isLoading={isLoading}
                error={error}
                isEmpty={!isLoading && !error && items.length === 0}
                emptyLabel={__('No data available for this period.', 'lean-stats')}
                loadingLabel={__('Loading chart…', 'lean-stats')}
            />
            {!isLoading && !error && items.length > 0 && (
                <div className="ls-timeseries">
                    <ChartFrame
                        height={LINE_CHART_HEIGHT}
                        ariaLabel={__('Daily page views line chart', 'lean-stats')}
                        onResize={handleChartResize}
                    >
                        <div
                            className="ls-timeseries__chart"
                            onMouseLeave={() => setActivePoint(null)}
                        >
                            <svg
                                viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                                width="100%"
                                height="100%"
                                preserveAspectRatio="xMidYMid meet"
                                className="ls-timeseries__svg"
                                role="img"
                                aria-label={__('Daily page views line chart', 'lean-stats')}
                                onMouseMove={handleChartMouseMove}
                            >
                                <defs>
                                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--ls-text-2, #2271b1)" stopOpacity="0.35" />
                                        <stop offset="100%" stopColor="var(--ls-text-2, #2271b1)" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <rect
                                    x="0"
                                    y="0"
                                    width={chartData.width}
                                    height={chartData.height}
                                    className="ls-timeseries__bg"
                                />
                                {chartData.yTicks.map((tick) => (
                                    <g key={`tick-${tick.value}-${tick.y}`}>
                                        <line
                                            x1={chartData.padding}
                                            y1={tick.y}
                                            x2={chartData.width - chartData.padding}
                                            y2={tick.y}
                                            className="ls-timeseries__grid-line"
                                        />
                                        <text
                                            x={chartData.padding - 8}
                                            y={tick.y + 4}
                                            textAnchor="end"
                                            className="ls-timeseries__axis-label ls-timeseries__axis-label--y"
                                        >
                                            {formatYAxisValue(tick.value)}
                                        </text>
                                    </g>
                                ))}
                                <line
                                    x1={chartData.padding}
                                    y1={chartData.padding}
                                    x2={chartData.padding}
                                    y2={chartData.height - chartData.padding}
                                    className="ls-timeseries__axis"
                                />
                                <line
                                    x1={chartData.padding}
                                    y1={chartData.height - chartData.padding}
                                    x2={chartData.width - chartData.padding}
                                    y2={chartData.height - chartData.padding}
                                    className="ls-timeseries__axis"
                                />
                                <path
                                    d={chartData.areaPath}
                                    className="ls-timeseries__area"
                                    fill={`url(#${gradientId})`}
                                />
                                <path d={chartData.linePath} className="ls-timeseries__line" />
                                {chartData.xLabels.map((label) => (
                                    <text
                                        key={`label-${label.label}`}
                                        x={label.x}
                                        y={chartData.height - chartData.padding + 18}
                                        textAnchor="middle"
                                        className="ls-timeseries__axis-label"
                                    >
                                        {formatAxisLabel(label.label)}
                                    </text>
                                ))}
                                {chartData.points.map((point) => (
                                    <circle
                                        key={`${point.label}-${point.hits}`}
                                        cx={point.x}
                                        cy={point.y}
                                        r="4"
                                        className={`ls-timeseries__point${
                                            activePoint?.label === point.label ? ' is-active' : ''
                                        }`}
                                        onMouseEnter={() => setActivePoint(point)}
                                        onFocus={() => setActivePoint(point)}
                                        onBlur={() => setActivePoint(null)}
                                        tabIndex="0"
                                    >
                                        <title>
                                            {sprintf(
                                                __('%1$s: %2$s %3$s', 'lean-stats'),
                                                formatAxisLabel(point.label),
                                                point.hits,
                                                __('Page views', 'lean-stats')
                                            )}
                                        </title>
                                    </circle>
                                ))}
                            </svg>
                            {activePoint && (
                                <div
                                    className="ls-timeseries__tooltip"
                                    role="status"
                                    style={{
                                        left: `${(activePoint.x / chartData.width) * 100}%`,
                                        top: `${(activePoint.y / chartData.height) * 100}%`,
                                    }}
                                >
                                    {chartTooltip}
                                </div>
                            )}
                        </div>
                    </ChartFrame>
                </div>
            )}
        </LsCard>
    );
};

const ReportTableCard = ({
    title,
    labelHeader,
    range,
    endpoint,
    emptyLabel,
    labelFallback,
    metricLabel = __('Page views', 'lean-stats'),
    metricKey = 'hits',
    metricValueKey = 'hits',
}) => {
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [orderBy, setOrderBy] = useState(metricKey);
    const [order, setOrder] = useState('desc');

    useEffect(() => {
        setPage(1);
    }, [range.start, range.end]);

    useEffect(() => {
        setOrderBy(metricKey);
        setOrder('desc');
    }, [metricKey]);

    const { data, isLoading, error } = useAdminEndpoint(
        endpoint,
        {
            ...range,
            page,
            per_page: perPage,
            orderby: orderBy,
            order,
        },
        {
            namespace: ADMIN_CONFIG?.settings?.restNamespace,
        }
    );

    const items = data?.items || [];
    const pagination = data?.pagination || {};
    const totalPages = pagination.totalPages || 1;
    const totalItems = pagination.totalItems || items.length;

    useEffect(() => {
        if (!isLoading && !error && totalPages && page > totalPages) {
            setPage(totalPages);
        }
    }, [totalPages, page, isLoading, error]);

    const canPrevious = page > 1;
    const canNext = page < totalPages;

    const orderLabel = order === 'asc' ? __('Ascending', 'lean-stats') : __('Descending', 'lean-stats');
    const labelSortLabel = sprintf(__('%s label', 'lean-stats'), labelHeader);
    const orderToggleLabel = sprintf(
        __('Toggle sort order: %s', 'lean-stats'),
        orderLabel
    );
    const tableLabel = sprintf(__('Table: %s', 'lean-stats'), title);

    const rows = items.map((item, index) => ({
        key: `${item.label || labelFallback}-${index}`,
        label: item.label || labelFallback,
        value: item?.[metricValueKey] ?? 0,
    }));

    return (
        <LsCard title={title}>
            <div className="ls-table-controls">
                <SelectControl
                    label={__('Sort by', 'lean-stats')}
                    value={orderBy}
                    options={[
                        { label: metricLabel, value: metricKey },
                        { label: labelSortLabel, value: 'label' },
                    ]}
                    onChange={(value) => {
                        setOrderBy(value);
                        setPage(1);
                    }}
                    __nextHasNoMarginBottom
                />
                <Button
                    variant="secondary"
                    icon={order === 'asc' ? 'arrow-up-alt2' : 'arrow-down-alt2'}
                    onClick={() => {
                        setOrder(order === 'asc' ? 'desc' : 'asc');
                        setPage(1);
                    }}
                    aria-label={orderToggleLabel}
                >
                    {orderLabel}
                </Button>
                <SelectControl
                    label={__('Rows', 'lean-stats')}
                    value={String(perPage)}
                    options={[
                        { label: '5', value: '5' },
                        { label: '10', value: '10' },
                        { label: '20', value: '20' },
                    ]}
                    onChange={(value) => {
                        setPerPage(Number(value));
                        setPage(1);
                    }}
                    __nextHasNoMarginBottom
                />
            </div>
            <DataState
                isLoading={isLoading}
                error={error}
                isEmpty={!isLoading && !error && rows.length === 0}
                emptyLabel={emptyLabel}
                loadingLabel={sprintf(__('Loading: %s', 'lean-stats'), title)}
            />
            {!isLoading && !error && rows.length > 0 && (
                <>
                    <table className="widefat striped ls-report-table" aria-label={tableLabel}>
                        <thead>
                            <tr>
                                <th scope="col">{labelHeader}</th>
                                <th scope="col">{metricLabel}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.key}>
                                    <td>{row.label}</td>
                                    <td>{row.value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <Flex className="ls-table-pagination" justify="space-between" align="center">
                        <FlexItem>
                            <ButtonGroup>
                                <Button
                                    variant="secondary"
                                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={!canPrevious}
                                    aria-label={__('Previous page', 'lean-stats')}
                                >
                                    {__('Previous', 'lean-stats')}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={!canNext}
                                    aria-label={__('Next page', 'lean-stats')}
                                >
                                    {__('Next', 'lean-stats')}
                                </Button>
                            </ButtonGroup>
                        </FlexItem>
                        <FlexItem className="ls-table-pagination__meta">
                            {sprintf(__('Page %1$d of %2$d', 'lean-stats'), page, totalPages)}
                        </FlexItem>
                        <FlexItem className="ls-table-pagination__meta">
                            {sprintf(__('%s items', 'lean-stats'), totalItems)}
                        </FlexItem>
                    </Flex>
                </>
            )}
        </LsCard>
    );
};

const ReferrerSourcesTableCard = ({ range }) => {
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [orderBy, setOrderBy] = useState('hits');
    const [order, setOrder] = useState('desc');

    useEffect(() => {
        setPage(1);
    }, [range.start, range.end]);

    const { data, isLoading, error } = useAdminEndpoint(
        '/referrer-sources',
        {
            ...range,
            page,
            per_page: perPage,
            orderby: orderBy,
            order,
        },
        {
            namespace: ADMIN_CONFIG?.settings?.restNamespace,
        }
    );

    const items = data?.items || [];
    const pagination = data?.pagination || {};
    const totalPages = pagination.totalPages || 1;
    const totalItems = pagination.totalItems || items.length;

    useEffect(() => {
        if (!isLoading && !error && totalPages && page > totalPages) {
            setPage(totalPages);
        }
    }, [totalPages, page, isLoading, error]);

    const canPrevious = page > 1;
    const canNext = page < totalPages;

    const orderLabel = order === 'asc' ? __('Ascending', 'lean-stats') : __('Descending', 'lean-stats');
    const orderToggleLabel = sprintf(
        __('Toggle sort order: %s', 'lean-stats'),
        orderLabel
    );
    const tableLabel = __('Table: Referrer sources', 'lean-stats');

    const rows = items.map((item, index) => {
        const referrerDomain = item.referrer_domain || __('Direct', 'lean-stats');
        const categoryFallback = item.referrer_domain ? __('Referrer', 'lean-stats') : __('Direct', 'lean-stats');

        return {
            key: `${referrerDomain}-${item.source_category || categoryFallback}-${index}`,
            referrer: referrerDomain,
            category: item.source_category || categoryFallback,
            hits: item.hits,
        };
    });

    return (
        <LsCard title={__('Referrer sources', 'lean-stats')}>
            <div className="ls-table-controls">
                <SelectControl
                    label={__('Sort by', 'lean-stats')}
                    value={orderBy}
                    options={[
                        { label: __('Page views', 'lean-stats'), value: 'hits' },
                        { label: __('Referrer', 'lean-stats'), value: 'referrer' },
                        { label: __('Source category', 'lean-stats'), value: 'category' },
                    ]}
                    onChange={(value) => {
                        setOrderBy(value);
                        setPage(1);
                    }}
                    __nextHasNoMarginBottom
                />
                <Button
                    variant="secondary"
                    icon={order === 'asc' ? 'arrow-up-alt2' : 'arrow-down-alt2'}
                    onClick={() => {
                        setOrder(order === 'asc' ? 'desc' : 'asc');
                        setPage(1);
                    }}
                    aria-label={orderToggleLabel}
                >
                    {orderLabel}
                </Button>
                <SelectControl
                    label={__('Rows', 'lean-stats')}
                    value={String(perPage)}
                    options={[
                        { label: '5', value: '5' },
                        { label: '10', value: '10' },
                        { label: '20', value: '20' },
                    ]}
                    onChange={(value) => {
                        setPerPage(Number(value));
                        setPage(1);
                    }}
                    __nextHasNoMarginBottom
                />
            </div>
            <DataState
                isLoading={isLoading}
                error={error}
                isEmpty={!isLoading && !error && rows.length === 0}
                emptyLabel={__('No referrer data available.', 'lean-stats')}
                loadingLabel={__('Loading referrer sources…', 'lean-stats')}
            />
            {!isLoading && !error && rows.length > 0 && (
                <>
                    <table className="widefat striped ls-report-table" aria-label={tableLabel}>
                        <thead>
                            <tr>
                                <th scope="col">{__('Referrer', 'lean-stats')}</th>
                                <th scope="col">{__('Source category', 'lean-stats')}</th>
                                <th scope="col">{__('Page views', 'lean-stats')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.key}>
                                    <td>{row.referrer}</td>
                                    <td>{row.category}</td>
                                    <td>{row.hits}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <Flex className="ls-table-pagination" justify="space-between" align="center">
                        <FlexItem>
                            <ButtonGroup>
                                <Button
                                    variant="secondary"
                                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={!canPrevious}
                                    aria-label={__('Previous page', 'lean-stats')}
                                >
                                    {__('Previous', 'lean-stats')}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={!canNext}
                                    aria-label={__('Next page', 'lean-stats')}
                                >
                                    {__('Next', 'lean-stats')}
                                </Button>
                            </ButtonGroup>
                        </FlexItem>
                        <FlexItem className="ls-table-pagination__meta">
                            {sprintf(__('Page %1$d of %2$d', 'lean-stats'), page, totalPages)}
                        </FlexItem>
                        <FlexItem className="ls-table-pagination__meta">
                            {sprintf(__('%s items', 'lean-stats'), totalItems)}
                        </FlexItem>
                    </Flex>
                </>
            )}
        </LsCard>
    );
};

const ReportPanel = ({
    title,
    endpoint,
    labelHeader,
    emptyLabel,
    labelFallback,
    metricLabel,
    metricKey,
    metricValueKey,
}) => {
    const [rangePreset, setRangePreset] = useSharedRangePreset();
    const range = useMemo(() => getRangeFromPreset(rangePreset), [rangePreset]);

    return (
        <div className="ls-report-panel">
            <div className="ls-report-panel__header">
                <PeriodFilter value={rangePreset} onChange={setRangePreset} />
            </div>
            <ReportTableCard
                title={title}
                labelHeader={labelHeader}
                range={range}
                endpoint={endpoint}
                emptyLabel={emptyLabel}
                labelFallback={labelFallback}
                metricLabel={metricLabel}
                metricKey={metricKey}
                metricValueKey={metricValueKey}
            />
        </div>
    );
};

const PagesPanel = () => {
    const pagesTabs = [
        { name: 'top-pages', title: __('Top pages', 'lean-stats') },
        { name: 'entry-pages', title: __('Entry pages', 'lean-stats') },
        { name: 'exit-pages', title: __('Exit pages', 'lean-stats') },
        { name: 'not-found', title: __('Pages not found (404)', 'lean-stats') },
    ];

    return (
        <TabPanel className="ls-pages-tabs" tabs={pagesTabs}>
            {(tab) => {
                if (tab.name === 'entry-pages') {
                    return <EntryPagesPanel />;
                }

                if (tab.name === 'exit-pages') {
                    return <ExitPagesPanel />;
                }

                if (tab.name === 'not-found') {
                    return <NotFoundPanel />;
                }

                return <TopPagesPanel />;
            }}
        </TabPanel>
    );
};

const TopPagesPanel = () => (
    <ReportPanel
        title={__('Top pages', 'lean-stats')}
        labelHeader={__('Page', 'lean-stats')}
        endpoint="/top-pages"
        emptyLabel={__('No popular pages available.', 'lean-stats')}
        labelFallback="/"
    />
);

const NotFoundPanel = () => (
    <ReportPanel
        title={__('Top 404s', 'lean-stats')}
        labelHeader={__('Missing page', 'lean-stats')}
        endpoint="/404s"
        emptyLabel={__('No missing pages available.', 'lean-stats')}
        labelFallback="/"
    />
);

const SearchTermsPanel = () => (
    <ReportPanel
        title={__('Search terms', 'lean-stats')}
        labelHeader={__('Search term', 'lean-stats')}
        endpoint="/search-terms"
        emptyLabel={__('No search terms available.', 'lean-stats')}
        labelFallback={__('Unknown', 'lean-stats')}
    />
);

const EntryPagesPanel = () => (
    <ReportPanel
        title={__('Entry pages (approx.)', 'lean-stats')}
        labelHeader={__('Entry page', 'lean-stats')}
        endpoint="/entry-pages"
        emptyLabel={__('No entry pages available.', 'lean-stats')}
        labelFallback="/"
        metricLabel={__('Entries (approx.)', 'lean-stats')}
        metricKey="entries"
        metricValueKey="entries"
    />
);

const ExitPagesPanel = () => (
    <ReportPanel
        title={__('Exit pages (approx.)', 'lean-stats')}
        labelHeader={__('Exit page', 'lean-stats')}
        endpoint="/exit-pages"
        emptyLabel={__('No exit pages available.', 'lean-stats')}
        labelFallback="/"
        metricLabel={__('Exits (approx.)', 'lean-stats')}
        metricKey="exits"
        metricValueKey="exits"
    />
);

const ReferrerSourcesPanel = () => {
    const [rangePreset, setRangePreset] = useSharedRangePreset();
    const range = useMemo(() => getRangeFromPreset(rangePreset), [rangePreset]);

    return (
        <div className="ls-report-panel">
            <div className="ls-report-panel__header">
                <PeriodFilter value={rangePreset} onChange={setRangePreset} />
            </div>
            <ReferrerSourcesTableCard range={range} />
        </div>
    );
};

const DeviceSplit = ({ range }) => {
    const { data, isLoading, error } = useAdminEndpoint('/admin/device-split', range);
    const items = data?.items || [];
    const labeledItems = items.map((item) => ({
        ...item,
        label: item.label
            ? item.label.charAt(0).toUpperCase() + item.label.slice(1)
            : __('Unknown', 'lean-stats'),
    }));
    const maxHits = labeledItems.reduce((max, item) => Math.max(max, item.hits), 0);

    return (
        <LsCard title={__('Device page views', 'lean-stats')}>
            <DataState
                isLoading={isLoading}
                error={error}
                isEmpty={!isLoading && !error && labeledItems.length === 0}
                emptyLabel={__('No device data available.', 'lean-stats')}
                loadingLabel={__('Loading device breakdown…', 'lean-stats')}
            />
            {!isLoading && !error && labeledItems.length > 0 && (
                <div className="ls-device-breakdown">
                    {labeledItems.map((entry) => {
                        const percent = maxHits ? Math.round((entry.hits / maxHits) * 100) : 0;
                        return (
                            <div key={entry.label} className="ls-device-breakdown__row">
                                <div className="ls-device-breakdown__label">{entry.label}</div>
                                <div className="ls-device-breakdown__bar" aria-hidden="true">
                                    <div
                                        className="ls-device-breakdown__bar-fill"
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                                <div className="ls-device-breakdown__value">
                                    {sprintf(__('%s views', 'lean-stats'), entry.hits)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </LsCard>
    );
};

const OverviewPanel = () => {
    const [rangePreset, setRangePreset] = useSharedRangePreset();
    const range = useMemo(() => getRangeFromPreset(rangePreset), [rangePreset]);

    return (
        <div className="ls-overview">
            <div className="ls-overview__summary">
                <PeriodFilter value={rangePreset} onChange={setRangePreset} />
                <OverviewKpis range={range} />
            </div>
            <TimeseriesChart range={range} />
            <div className="ls-overview__grid">
                <ReportTableCard
                    title={__('Top pages', 'lean-stats')}
                    labelHeader={__('Page', 'lean-stats')}
                    range={range}
                    endpoint="/top-pages"
                    emptyLabel={__('No popular pages available.', 'lean-stats')}
                    labelFallback="/"
                />
                <ReportTableCard
                    title={__('Top referrers', 'lean-stats')}
                    labelHeader={__('Referrer', 'lean-stats')}
                    range={range}
                    endpoint="/referrers"
                    emptyLabel={__('No referrers available.', 'lean-stats')}
                    labelFallback={__('Direct', 'lean-stats')}
                />
                <DeviceSplit range={range} />
            </div>
        </div>
    );
};

const AdminApp = () => {
    if (!ADMIN_CONFIG) {
        return (
            <Notice status="error" isDismissible={false}>
                {__('Missing admin configuration.', 'lean-stats')}
            </Notice>
        );
    }

    const panels = normalizePanels(ADMIN_CONFIG?.panels);
    const currentPanel = ADMIN_CONFIG?.currentPanel || 'dashboard';
    const PanelComponent = getPanelComponent(currentPanel);
    const panelTitle = getCurrentPanelTitle(currentPanel, panels);
    const pluginLabel = ADMIN_CONFIG?.settings?.pluginLabel || __('Lean Stats', 'lean-stats');
    const heading = pluginLabel;
    const debugEnabled = Boolean(window.LEAN_STATS_DEBUG ?? ADMIN_CONFIG?.settings?.debugEnabled);
    const logger = useMemo(() => createLogger({ debugEnabled }), [debugEnabled]);

    useEffect(() => {
        setupGlobalErrorHandlers(logger);
        logger.info('Loading admin interface', {
            action: 'admin.init',
            traceId: createTraceId(),
            context: getRuntimeDiagnostics(),
        });
    }, [logger]);

    return (
        <div className="ls-admin-app">
            <h1>{heading}</h1>
            {!PanelComponent ? (
                <Notice status="warning" isDismissible={false}>
                    {__('No panel available for this screen.', 'lean-stats')}
                </Notice>
            ) : (
                <PanelComponent panel={{ name: currentPanel, title: panelTitle }} />
            )}
        </div>
    );
};

const root = document.getElementById('lean-stats-admin');

if (root) {
    render(
        <AdminErrorBoundary>
            <AdminApp />
        </AdminErrorBoundary>,
        root
    );
}
