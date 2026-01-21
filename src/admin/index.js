/**
 * Admin entry point for Lean Stats.
 */

import { render, useEffect, useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
    Button,
    Card,
    CardBody,
    CheckboxControl,
    Modal,
    Notice,
    SelectControl,
    TabPanel,
    TextControl,
    TextareaControl,
    ToggleControl,
} from '@wordpress/components';
import {
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { createLogger, createTraceId, getRuntimeDiagnostics, setupGlobalErrorHandlers } from './logger';
import ChartFrame from './components/ChartFrame';
import DataState from './components/DataState';
import DataTableCard from './components/DataTableCard';
import LsCard from './components/LsCard';

const ADMIN_CONFIG = window.LeanStatsAdmin || null;
const DEBUG_FLAG = () => Boolean(window.LEAN_STATS_DEBUG ?? ADMIN_CONFIG?.settings?.debugEnabled);
const CHART_COLORS = ['#2271b1', '#72aee6', '#1e8cbe', '#d63638', '#00a32a'];
const DEFAULT_PANELS = [
    { name: 'dashboard', title: __('Dashboard', 'lean-stats') },
    { name: 'settings', title: __('Settings', 'lean-stats') },
];
const DEFAULT_SETTINGS = {
    plugin_label: '',
    strict_mode: false,
    respect_dnt_gpc: true,
    url_strip_query: true,
    url_query_allowlist: [],
    raw_logs_enabled: false,
    raw_logs_retention_days: 1,
    excluded_roles: [],
    excluded_paths: [],
    debug_enabled: false,
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

const buildAdminUrl = (path, params) => {
    const base = ADMIN_CONFIG?.restUrl ? `${ADMIN_CONFIG.restUrl}` : '';
    const namespace = ADMIN_CONFIG?.settings?.restInternalNamespace || '';
    const url = new URL(`${namespace}${path}`, base);

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
    const { enabled = true } = options;

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
                const response = await fetch(buildAdminUrl(path, params), {
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
        dashboard: DashboardPanel,
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

const PeriodFilter = ({ value, onChange }) => (
    <Card className="ls-dashboard__summary-card ls-dashboard__summary-card--filter">
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
    const [isPurgeOpen, setIsPurgeOpen] = useState(false);
    const [isPurging, setIsPurging] = useState(false);
    const [purgeNotice, setPurgeNotice] = useState(null);
    const logger = useMemo(() => createLogger({ debugEnabled: DEBUG_FLAG }), []);
    const debugEnabled = Boolean(formState.debug_enabled);

    const privacyChecklistItems = useMemo(
        () => [
            __('Aggregated page views by URL path.', 'lean-stats'),
            __('Aggregated referrer domains.', 'lean-stats'),
            __('Aggregated device class totals.', 'lean-stats'),
            __('Aggregated 404 paths.', 'lean-stats'),
            __('Aggregated on-site search terms.', 'lean-stats'),
            __('Raw log snapshots (timestamp, page path, referrer, device) when debug mode is enabled.', 'lean-stats'),
        ],
        []
    );

    const privacyWarnings = useMemo(() => {
        const warnings = [];
        if (!formState.respect_dnt_gpc) {
            warnings.push(__('Tracking continues even when browsers send DNT or GPC.', 'lean-stats'));
        }
        if (!formState.url_strip_query) {
            warnings.push(__('Full query strings remain in stored page paths.', 'lean-stats'));
        }
        if (formState.raw_logs_enabled) {
            warnings.push(__('Raw logs store granular hit details while debug mode is enabled.', 'lean-stats'));
        }
        if (formState.raw_logs_retention_days > 30) {
            warnings.push(__('Raw log retention exceeds 30 days.', 'lean-stats'));
        }
        return warnings;
    }, [formState]);

    useEffect(() => {
        if (data?.settings) {
            const normalized = normalizeSettings(data.settings);
            setFormState(normalized);
            setAllowlistInput(normalized.url_query_allowlist.join(', '));
            setExcludedPathsInput(normalized.excluded_paths.join('\n'));
            window.LEAN_STATS_DEBUG = Boolean(normalized.debug_enabled);
        }
    }, [data]);

    const onSave = async () => {
        if (!ADMIN_CONFIG?.restNonce || !ADMIN_CONFIG?.restUrl) {
            setSaveNotice({ status: 'error', message: __('Missing REST configuration.', 'lean-stats') });
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
            const response = await fetch(buildAdminUrl('/admin/settings'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': ADMIN_CONFIG.restNonce,
                },
                body: JSON.stringify(formState),
            });

            if (!response.ok) {
                throw new Error(
                    sprintf(__('API error (%s)', 'lean-stats'), response.status)
                );
            }

            const payload = await response.json();
            if (payload?.settings) {
                const normalized = normalizeSettings(payload.settings);
                setFormState(normalized);
                setAllowlistInput(normalized.url_query_allowlist.join(', '));
                setExcludedPathsInput(normalized.excluded_paths.join('\n'));
                window.LEAN_STATS_DEBUG = Boolean(normalized.debug_enabled);
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
            const response = await fetch(buildAdminUrl('/admin/purge-data'), {
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
                                        <ToggleControl
                                            label={__('Strict mode', 'lean-stats')}
                                            help={__('Ignore tracking for logged-in users.', 'lean-stats')}
                                            checked={formState.strict_mode}
                                            onChange={(value) => setFormState((prev) => ({ ...prev, strict_mode: value }))}
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
                                            help={__('Comma-separated list (e.g., utm_source, utm_campaign).', 'lean-stats')}
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
                                        <h3 className="ls-settings-section__title">
                                            {__('Privacy checklist', 'lean-stats')}
                                        </h3>
                                        <ul className="ls-settings-privacy__list">
                                            {privacyChecklistItems.map((item) => (
                                                <li key={item}>{item}</li>
                                            ))}
                                        </ul>
                                        {privacyWarnings.length > 0 && (
                                            <Notice status="warning" isDismissible={false}>
                                                <p>{__('Review these privacy risks:', 'lean-stats')}</p>
                                                <ul className="ls-settings-privacy__warnings">
                                                    {privacyWarnings.map((warning) => (
                                                        <li key={warning}>{warning}</li>
                                                    ))}
                                                </ul>
                                            </Notice>
                                        )}
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

const KpiCards = ({ range }) => {
    const { data, isLoading, error } = useAdminEndpoint('/admin/kpis', range);
    const kpis = data?.kpis || null;
    const isEmpty = !isLoading && !error && !kpis;

    if (isLoading || error || isEmpty) {
        return (
            <Card className="ls-dashboard__summary-card ls-dashboard__summary-card--status">
                <CardBody>
                    <DataState
                        isLoading={isLoading}
                        error={error}
                        isEmpty={isEmpty}
                        emptyLabel={__('No KPIs available.', 'lean-stats')}
                        loadingLabel={__('Loading KPIs…', 'lean-stats')}
                        skeletonRows={3}
                    />
                </CardBody>
            </Card>
        );
    }

    return (
        <>
            <Card className="ls-dashboard__summary-card">
                <CardBody className="ls-kpi-card__body">
                    <span className="dashicons dashicons-chart-bar ls-kpi-card__icon" aria-hidden="true" />
                    <div className="ls-kpi-card__content">
                        <p className="ls-kpi-card__label">{__('Visits', 'lean-stats')}</p>
                        <strong className="ls-kpi-card__value">{kpis.visits}</strong>
                    </div>
                </CardBody>
            </Card>
            <Card className="ls-dashboard__summary-card">
                <CardBody className="ls-kpi-card__body">
                    <span className="dashicons dashicons-admin-page ls-kpi-card__icon" aria-hidden="true" />
                    <div className="ls-kpi-card__content">
                        <p className="ls-kpi-card__label">{__('Page views', 'lean-stats')}</p>
                        <strong className="ls-kpi-card__value">{kpis.pageViews}</strong>
                    </div>
                </CardBody>
            </Card>
            <Card className="ls-dashboard__summary-card">
                <CardBody className="ls-kpi-card__body">
                    <span className="dashicons dashicons-admin-links ls-kpi-card__icon" aria-hidden="true" />
                    <div className="ls-kpi-card__content">
                        <p className="ls-kpi-card__label">{__('Unique referrers', 'lean-stats')}</p>
                        <strong className="ls-kpi-card__value">{kpis.uniqueReferrers}</strong>
                    </div>
                </CardBody>
            </Card>
        </>
    );
};

const TimeseriesChart = ({ range }) => {
    const { data, isLoading, error } = useAdminEndpoint('/admin/timeseries/day', range);
    const items = data?.items || [];

    return (
        <LsCard title={__('Traffic over time', 'lean-stats')}>
            <DataState
                isLoading={isLoading}
                error={error}
                isEmpty={!isLoading && !error && items.length === 0}
                emptyLabel={__('No data available for this period.', 'lean-stats')}
                    loadingLabel={__('Loading chart…', 'lean-stats')}
                />
                {!isLoading && !error && items.length > 0 && (
                    <ChartFrame height={260} ariaLabel={__('Traffic chart', 'lean-stats')}>
                        <ResponsiveContainer>
                            <LineChart data={items} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="bucket" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="hits" stroke="#2271b1" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartFrame>
                )}
        </LsCard>
    );
};

const TopPagesTable = ({ range }) => {
    const { data, isLoading, error } = useAdminEndpoint('/admin/top-pages', { ...range, limit: 10 });
    const items = data?.items || [];
    const rows = items.map((item) => ({
        key: item.label,
        label: item.label || '/',
        value: item.hits,
    }));

    return (
        <DataTableCard
            title={__('Top pages', 'lean-stats')}
            headers={[__('Page', 'lean-stats'), __('Page views', 'lean-stats')]}
            rows={rows}
            isLoading={isLoading}
            error={error}
            emptyLabel={__('No popular pages available.', 'lean-stats')}
        />
    );
};

const ReferrersTable = ({ range }) => {
    const { data, isLoading, error } = useAdminEndpoint('/admin/referrers', { ...range, limit: 10 });
    const items = data?.items || [];
    const rows = items.map((item) => ({
        key: item.label || 'direct',
        label: item.label || __('Direct', 'lean-stats'),
        value: item.hits,
    }));

    return (
        <DataTableCard
            title={__('Top referrers', 'lean-stats')}
            headers={[__('Referrer', 'lean-stats'), __('Page views', 'lean-stats')]}
            rows={rows}
            isLoading={isLoading}
            error={error}
            emptyLabel={__('No referrers available.', 'lean-stats')}
        />
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

    return (
        <LsCard title={__('Device breakdown', 'lean-stats')}>
            <DataState
                isLoading={isLoading}
                error={error}
                isEmpty={!isLoading && !error && labeledItems.length === 0}
                emptyLabel={__('No device data available.', 'lean-stats')}
                    loadingLabel={__('Loading device breakdown…', 'lean-stats')}
                />
                {!isLoading && !error && labeledItems.length > 0 && (
                    <ChartFrame height={240} ariaLabel={__('Device breakdown chart', 'lean-stats')}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie dataKey="hits" data={labeledItems} nameKey="label" innerRadius={40} outerRadius={80}>
                                    {labeledItems.map((entry, index) => (
                                        <Cell key={entry.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <ul aria-label={__('Device breakdown details', 'lean-stats')}>
                            {labeledItems.map((entry) => (
                                <li key={entry.label}>
                                    {sprintf(__('%s : %s', 'lean-stats'), entry.label, entry.hits)}
                                </li>
                            ))}
                        </ul>
                    </ChartFrame>
                )}
        </LsCard>
    );
};

const DashboardPanel = () => {
    const [rangePreset, setRangePreset] = useState('30d');
    const range = useMemo(() => getRangeFromPreset(rangePreset), [rangePreset]);

    return (
        <div className="ls-dashboard">
            <div className="ls-dashboard__summary">
                <PeriodFilter value={rangePreset} onChange={setRangePreset} />
                <KpiCards range={range} />
            </div>
            <TimeseriesChart range={range} />
            <div className="ls-dashboard__grid">
                <TopPagesTable range={range} />
                <ReferrersTable range={range} />
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
    render(<AdminApp />, root);
}
