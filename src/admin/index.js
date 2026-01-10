/**
 * Admin entry point for Lean Stats.
 */

import { render, useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
    Button,
    Card,
    CardBody,
    CardHeader,
    CheckboxControl,
    Flex,
    FlexItem,
    Notice,
    SelectControl,
    Spinner,
    TextControl,
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

const ADMIN_CONFIG = window.LeanStatsAdmin || null;
const CHART_COLORS = ['#2271b1', '#72aee6', '#1e8cbe', '#d63638', '#00a32a'];
const DEFAULT_PANELS = [
    { name: 'dashboard', title: __('Tableau de bord', 'lean-stats') },
    { name: 'settings', title: __('Réglages', 'lean-stats') },
];
const DEFAULT_SETTINGS = {
    plugin_label: '',
    strict_mode: false,
    respect_dnt_gpc: true,
    url_strip_query: true,
    url_query_allowlist: [],
    raw_logs_retention_days: 1,
    excluded_roles: [],
};
const DEFAULT_SKELETON_ROWS = 4;

const useSizedContainer = () => {
    const ref = useRef(null);
    const [hasSize, setHasSize] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) {
            return undefined;
        }

        const updateSize = () => {
            const rect = node.getBoundingClientRect();
            const nextHasSize = rect.width > 0 && rect.height > 0;
            setHasSize((prev) => (prev === nextHasSize ? prev : nextHasSize));
        };

        updateSize();

        let observer;
        if (window.ResizeObserver) {
            observer = new ResizeObserver(() => updateSize());
            observer.observe(node);
        } else {
            window.addEventListener('resize', updateSize);
        }

        return () => {
            if (observer) {
                observer.disconnect();
            } else {
                window.removeEventListener('resize', updateSize);
            }
        };
    }, []);

    return { ref, hasSize };
};

const ChartFrame = ({ height, ariaLabel, children }) => {
    const { ref, hasSize } = useSizedContainer();

    return (
        <div ref={ref} style={{ width: '100%', height }} role="img" aria-label={ariaLabel}>
            {hasSize ? children : null}
        </div>
    );
};

const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

const useAdminEndpoint = (path, params) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const paramsKey = useMemo(() => JSON.stringify(params ?? {}), [params]);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const fetchData = async () => {
            if (!ADMIN_CONFIG?.restNonce || !ADMIN_CONFIG?.restUrl) {
                setError(__('Configuration REST manquante.', 'lean-stats'));
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(buildAdminUrl(path, params), {
                    signal: controller.signal,
                    headers: {
                        'X-WP-Nonce': ADMIN_CONFIG.restNonce,
                    },
                });

                if (!response.ok) {
                    throw new Error(
                        sprintf(__('Erreur API (%s)', 'lean-stats'), response.status)
                    );
                }

                const payload = await response.json();
                if (isMounted) {
                    setData(payload);
                }
            } catch (fetchError) {
                if (isMounted && fetchError.name !== 'AbortError') {
                    setError(fetchError.message || __('Erreur de chargement.', 'lean-stats'));
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
    }, [path, paramsKey]);

    return { data, isLoading, error };
};

const DataState = ({
    isLoading,
    error,
    isEmpty,
    emptyLabel,
    loadingLabel = __('Chargement…', 'lean-stats'),
    skeletonRows = DEFAULT_SKELETON_ROWS,
}) => {
    if (isLoading) {
        const rows = Array.from({ length: skeletonRows }, (_, index) => index);
        return (
            <div
                style={{ padding: '16px', display: 'grid', gap: '12px' }}
                aria-live="polite"
                aria-busy="true"
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Spinner />
                    <span>{loadingLabel}</span>
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                    {rows.map((row) => (
                        <div
                            key={row}
                            style={{
                                height: '12px',
                                width: `${80 - row * 6}%`,
                                backgroundColor: '#f0f0f1',
                                borderRadius: '4px',
                            }}
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Notice status="error" isDismissible={false}>
                {error}
            </Notice>
        );
    }

    if (isEmpty) {
        return <p role="status">{emptyLabel}</p>;
    }

    return null;
};

const normalizeSettings = (settings) => ({
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
});

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

const PeriodFilter = ({ value, onChange }) => (
    <Card>
        <CardBody>
            <SelectControl
                label={__('Période', 'lean-stats')}
                value={value}
                options={[
                    { label: __('7 jours', 'lean-stats'), value: '7d' },
                    { label: __('30 jours', 'lean-stats'), value: '30d' },
                    { label: __('90 jours', 'lean-stats'), value: '90d' },
                ]}
                onChange={onChange}
            />
        </CardBody>
    </Card>
);

const SettingsPanel = () => {
    const { data, isLoading, error } = useAdminEndpoint('/admin/settings');
    const [formState, setFormState] = useState(DEFAULT_SETTINGS);
    const [allowlistInput, setAllowlistInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveNotice, setSaveNotice] = useState(null);

    useEffect(() => {
        if (data?.settings) {
            const normalized = normalizeSettings(data.settings);
            setFormState(normalized);
            setAllowlistInput(normalized.url_query_allowlist.join(', '));
        }
    }, [data]);

    const onSave = async () => {
        if (!ADMIN_CONFIG?.restNonce || !ADMIN_CONFIG?.restUrl) {
            setSaveNotice({ status: 'error', message: __('Configuration REST manquante.', 'lean-stats') });
            return;
        }

        setIsSaving(true);
        setSaveNotice(null);

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
                    sprintf(__('Erreur API (%s)', 'lean-stats'), response.status)
                );
            }

            const payload = await response.json();
            if (payload?.settings) {
                const normalized = normalizeSettings(payload.settings);
                setFormState(normalized);
                setAllowlistInput(normalized.url_query_allowlist.join(', '));
            }

            setSaveNotice({ status: 'success', message: __('Réglages enregistrés.', 'lean-stats') });
        } catch (saveError) {
            setSaveNotice({
                status: 'error',
                message: saveError.message || __('Erreur lors de la sauvegarde.', 'lean-stats'),
            });
        } finally {
            setIsSaving(false);
        }
    };

    const roles = ADMIN_CONFIG?.roles || [];

    return (
        <Card>
            <CardHeader>
                <strong>{__('Réglages', 'lean-stats')}</strong>
            </CardHeader>
            <CardBody>
                <DataState
                    isLoading={isLoading}
                    error={error}
                    isEmpty={false}
                    emptyLabel=""
                    loadingLabel={__('Chargement des réglages…', 'lean-stats')}
                    skeletonRows={6}
                />
                {!isLoading && !error && (
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {saveNotice && (
                            <Notice status={saveNotice.status} isDismissible={false}>
                                {saveNotice.message}
                            </Notice>
                        )}
                        <TextControl
                            label={__('Nom du plugin (menu et tableau de bord)', 'lean-stats')}
                            help={__('Laisser vide pour utiliser "Lean Stats".', 'lean-stats')}
                            value={formState.plugin_label}
                            onChange={(value) => setFormState((prev) => ({ ...prev, plugin_label: value }))}
                        />
                        <ToggleControl
                            label={__('Mode strict', 'lean-stats')}
                            help={__('Ignore le suivi pour les utilisateurs connectés.', 'lean-stats')}
                            checked={formState.strict_mode}
                            onChange={(value) => setFormState((prev) => ({ ...prev, strict_mode: value }))}
                        />
                        <ToggleControl
                            label={__('Respecter DNT / GPC', 'lean-stats')}
                            help={__('Ignore le suivi si le navigateur envoie DNT ou GPC.', 'lean-stats')}
                            checked={formState.respect_dnt_gpc}
                            onChange={(value) => setFormState((prev) => ({ ...prev, respect_dnt_gpc: value }))}
                        />
                        <ToggleControl
                            label={__('Nettoyage des URLs', 'lean-stats')}
                            help={__('Supprime les paramètres de requête.', 'lean-stats')}
                            checked={formState.url_strip_query}
                            onChange={(value) => setFormState((prev) => ({ ...prev, url_strip_query: value }))}
                        />
                        <TextControl
                            label={__('Allowlist des paramètres de requête', 'lean-stats')}
                            help={__('Liste séparée par des virgules (ex: utm_source, utm_campaign).', 'lean-stats')}
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
                        <TextControl
                            label={__('Rétention des logs bruts (jours)', 'lean-stats')}
                            type="number"
                            min={1}
                            max={365}
                            value={String(formState.raw_logs_retention_days)}
                            onChange={(value) => {
                                const next = Number.parseInt(value, 10);
                                setFormState((prev) => ({
                                    ...prev,
                                    raw_logs_retention_days: Number.isNaN(next) ? prev.raw_logs_retention_days : next,
                                }));
                            }}
                        />
                        <div>
                            <p style={{ marginBottom: '8px' }}>{__('Exclusions par rôle', 'lean-stats')}</p>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                {roles.length === 0 && <p>{__('Aucun rôle disponible.', 'lean-stats')}</p>}
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
                        <Button
                            variant="primary"
                            isBusy={isSaving}
                            onClick={onSave}
                            aria-label={__('Enregistrer les réglages', 'lean-stats')}
                        >
                            {__('Enregistrer', 'lean-stats')}
                        </Button>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

const KpiCards = ({ range }) => {
    const { data, isLoading, error } = useAdminEndpoint('/admin/kpis', range);
    const kpis = data?.kpis || null;

    return (
        <Card>
            <CardHeader>
                <strong>{__('Indicateurs', 'lean-stats')}</strong>
            </CardHeader>
            <CardBody>
                <DataState
                    isLoading={isLoading}
                    error={error}
                    isEmpty={!isLoading && !error && !kpis}
                    emptyLabel={__('Aucun KPI disponible.', 'lean-stats')}
                    loadingLabel={__('Chargement des indicateurs…', 'lean-stats')}
                    skeletonRows={3}
                />
                {kpis && (
                    <Flex gap="16" wrap>
                        <FlexItem>
                            <Card>
                                <CardBody>
                                    <p>{__('Hits', 'lean-stats')}</p>
                                    <strong>{kpis.totalHits}</strong>
                                </CardBody>
                            </Card>
                        </FlexItem>
                        <FlexItem>
                            <Card>
                                <CardBody>
                                    <p>{__('Pages uniques', 'lean-stats')}</p>
                                    <strong>{kpis.uniquePages}</strong>
                                </CardBody>
                            </Card>
                        </FlexItem>
                        <FlexItem>
                            <Card>
                                <CardBody>
                                    <p>{__('Referrers uniques', 'lean-stats')}</p>
                                    <strong>{kpis.uniqueReferrers}</strong>
                                </CardBody>
                            </Card>
                        </FlexItem>
                    </Flex>
                )}
            </CardBody>
        </Card>
    );
};

const TimeseriesChart = ({ range }) => {
    const { data, isLoading, error } = useAdminEndpoint('/admin/timeseries/day', range);
    const items = data?.items || [];

    return (
        <Card>
            <CardHeader>
                <strong>{__('Trafic dans le temps', 'lean-stats')}</strong>
            </CardHeader>
            <CardBody>
                <DataState
                    isLoading={isLoading}
                    error={error}
                    isEmpty={!isLoading && !error && items.length === 0}
                    emptyLabel={__('Aucune donnée disponible pour cette période.', 'lean-stats')}
                    loadingLabel={__('Chargement du graphique…', 'lean-stats')}
                />
                {!isLoading && !error && items.length > 0 && (
                    <ChartFrame height={260} ariaLabel={__('Graphique du trafic', 'lean-stats')}>
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
            </CardBody>
        </Card>
    );
};

const TableCard = ({ title, headers, rows, isLoading, error, emptyLabel }) => (
    <Card>
        <CardHeader>
            <strong>{title}</strong>
        </CardHeader>
        <CardBody>
            <DataState
                isLoading={isLoading}
                error={error}
                isEmpty={!isLoading && !error && rows.length === 0}
                emptyLabel={emptyLabel}
                loadingLabel={sprintf(__('Chargement : %s', 'lean-stats'), title)}
            />
            {!isLoading && !error && rows.length > 0 && (
                <table className="widefat striped" aria-label={title}>
                    <thead>
                        <tr>
                            {headers.map((header) => (
                                <th key={header}>{header}</th>
                            ))}
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
            )}
        </CardBody>
    </Card>
);

const TopPagesTable = ({ range }) => {
    const { data, isLoading, error } = useAdminEndpoint('/admin/top-pages', { ...range, limit: 10 });
    const items = data?.items || [];
    const rows = items.map((item) => ({
        key: item.label,
        label: item.label || '/',
        value: item.hits,
    }));

    return (
        <TableCard
            title={__('Top pages', 'lean-stats')}
            headers={[__('Page', 'lean-stats'), __('Hits', 'lean-stats')]}
            rows={rows}
            isLoading={isLoading}
            error={error}
            emptyLabel={__('Aucune page populaire disponible.', 'lean-stats')}
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
        <TableCard
            title={__('Top referrers', 'lean-stats')}
            headers={[__('Referrer', 'lean-stats'), __('Hits', 'lean-stats')]}
            rows={rows}
            isLoading={isLoading}
            error={error}
            emptyLabel={__('Aucun referrer disponible.', 'lean-stats')}
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
            : __('Inconnu', 'lean-stats'),
    }));

    return (
        <Card>
            <CardHeader>
                <strong>{__('Répartition par device', 'lean-stats')}</strong>
            </CardHeader>
            <CardBody>
                <DataState
                    isLoading={isLoading}
                    error={error}
                    isEmpty={!isLoading && !error && labeledItems.length === 0}
                    emptyLabel={__('Aucune donnée device disponible.', 'lean-stats')}
                    loadingLabel={__('Chargement de la répartition des devices…', 'lean-stats')}
                />
                {!isLoading && !error && labeledItems.length > 0 && (
                    <ChartFrame height={240} ariaLabel={__('Graphique de répartition par device', 'lean-stats')}>
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
                        <ul aria-label={__('Détail de répartition par device', 'lean-stats')}>
                            {labeledItems.map((entry) => (
                                <li key={entry.label}>
                                    {sprintf(__('%s : %s', 'lean-stats'), entry.label, entry.hits)}
                                </li>
                            ))}
                        </ul>
                    </ChartFrame>
                )}
            </CardBody>
        </Card>
    );
};

const DashboardPanel = () => {
    const [rangePreset, setRangePreset] = useState('30d');
    const range = useMemo(() => getRangeFromPreset(rangePreset), [rangePreset]);

    return (
        <div style={{ display: 'grid', gap: '16px' }}>
            <Flex gap="16" wrap align="stretch">
                <FlexItem style={{ minWidth: '240px', flex: '0 1 280px' }}>
                    <PeriodFilter value={rangePreset} onChange={setRangePreset} />
                </FlexItem>
                <FlexItem style={{ minWidth: '280px', flex: '1 1 320px' }}>
                    <KpiCards range={range} />
                </FlexItem>
            </Flex>
            <TimeseriesChart range={range} />
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
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
                {__('Configuration admin manquante.', 'lean-stats')}
            </Notice>
        );
    }

    const panels = normalizePanels(ADMIN_CONFIG?.panels);
    const currentPanel = ADMIN_CONFIG?.currentPanel || 'dashboard';
    const PanelComponent = getPanelComponent(currentPanel);
    const panelTitle = getCurrentPanelTitle(currentPanel, panels);
    const pluginLabel = ADMIN_CONFIG?.settings?.pluginLabel || __('Lean Stats', 'lean-stats');
    const heading = pluginLabel;

    return (
        <div style={{ display: 'grid', gap: '16px' }}>
            <h1>{heading}</h1>
            {!PanelComponent ? (
                <Notice status="warning" isDismissible={false}>
                    {__('Aucun panneau disponible pour cet écran.', 'lean-stats')}
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
