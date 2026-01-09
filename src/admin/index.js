/**
 * Admin entry point for Lean Stats.
 */

import { render, useEffect, useMemo, useState } from '@wordpress/element';
import { Card, CardBody, CardHeader, Flex, FlexItem, Notice, SelectControl, Spinner } from '@wordpress/components';
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
                setError('Configuration REST manquante.');
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
                    throw new Error(`Erreur API (${response.status})`);
                }

                const payload = await response.json();
                if (isMounted) {
                    setData(payload);
                }
            } catch (fetchError) {
                if (isMounted && fetchError.name !== 'AbortError') {
                    setError(fetchError.message || 'Erreur de chargement.');
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

const DataState = ({ isLoading, error, isEmpty, emptyLabel }) => {
    if (isLoading) {
        return (
            <div style={{ padding: '16px' }}>
                <Spinner />
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
        return <p>{emptyLabel}</p>;
    }

    return null;
};

const PeriodFilter = ({ value, onChange }) => (
    <Card>
        <CardBody>
            <SelectControl
                label="Période"
                value={value}
                options={[
                    { label: '7 jours', value: '7d' },
                    { label: '30 jours', value: '30d' },
                    { label: '90 jours', value: '90d' },
                ]}
                onChange={onChange}
            />
        </CardBody>
    </Card>
);

const KpiCards = ({ range }) => {
    const { data, isLoading, error } = useAdminEndpoint('/admin/kpis', range);
    const kpis = data?.kpis || null;

    return (
        <Card>
            <CardHeader>
                <strong>Indicateurs</strong>
            </CardHeader>
            <CardBody>
                <DataState
                    isLoading={isLoading}
                    error={error}
                    isEmpty={!isLoading && !error && !kpis}
                    emptyLabel="Aucun KPI disponible."
                />
                {kpis && (
                    <Flex gap="16" wrap>
                        <FlexItem>
                            <Card>
                                <CardBody>
                                    <p>Hits</p>
                                    <strong>{kpis.totalHits}</strong>
                                </CardBody>
                            </Card>
                        </FlexItem>
                        <FlexItem>
                            <Card>
                                <CardBody>
                                    <p>Pages uniques</p>
                                    <strong>{kpis.uniquePages}</strong>
                                </CardBody>
                            </Card>
                        </FlexItem>
                        <FlexItem>
                            <Card>
                                <CardBody>
                                    <p>Referrers uniques</p>
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
                <strong>Trafic dans le temps</strong>
            </CardHeader>
            <CardBody>
                <DataState
                    isLoading={isLoading}
                    error={error}
                    isEmpty={!isLoading && !error && items.length === 0}
                    emptyLabel="Aucune donnée disponible pour cette période."
                />
                {!isLoading && !error && items.length > 0 && (
                    <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer>
                            <LineChart data={items} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="bucket" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="hits" stroke="#2271b1" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
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
            />
            {!isLoading && !error && rows.length > 0 && (
                <table className="widefat striped">
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
            title="Top pages"
            headers={['Page', 'Hits']}
            rows={rows}
            isLoading={isLoading}
            error={error}
            emptyLabel="Aucune page populaire disponible."
        />
    );
};

const ReferrersTable = ({ range }) => {
    const { data, isLoading, error } = useAdminEndpoint('/admin/referrers', { ...range, limit: 10 });
    const items = data?.items || [];
    const rows = items.map((item) => ({
        key: item.label || 'direct',
        label: item.label || 'Direct',
        value: item.hits,
    }));

    return (
        <TableCard
            title="Top referrers"
            headers={['Referrer', 'Hits']}
            rows={rows}
            isLoading={isLoading}
            error={error}
            emptyLabel="Aucun referrer disponible."
        />
    );
};

const DeviceSplit = ({ range }) => {
    const { data, isLoading, error } = useAdminEndpoint('/admin/device-split', range);
    const items = data?.items || [];
    const labeledItems = items.map((item) => ({
        ...item,
        label: item.label ? item.label.charAt(0).toUpperCase() + item.label.slice(1) : 'Inconnu',
    }));

    return (
        <Card>
            <CardHeader>
                <strong>Répartition par device</strong>
            </CardHeader>
            <CardBody>
                <DataState
                    isLoading={isLoading}
                    error={error}
                    isEmpty={!isLoading && !error && labeledItems.length === 0}
                    emptyLabel="Aucune donnée device disponible."
                />
                {!isLoading && !error && labeledItems.length > 0 && (
                    <div style={{ width: '100%', height: 240 }}>
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
                        <ul>
                            {labeledItems.map((entry) => (
                                <li key={entry.label}>
                                    {entry.label}: {entry.hits}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

const AdminApp = () => {
    const [rangePreset, setRangePreset] = useState('30d');
    const range = useMemo(() => getRangeFromPreset(rangePreset), [rangePreset]);

    if (!ADMIN_CONFIG) {
        return <Notice status="error" isDismissible={false}>Configuration admin manquante.</Notice>;
    }

    return (
        <div style={{ display: 'grid', gap: '16px' }}>
            <h1>Lean Stats</h1>
            <PeriodFilter value={rangePreset} onChange={setRangePreset} />
            <KpiCards range={range} />
            <TimeseriesChart range={range} />
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                <TopPagesTable range={range} />
                <ReferrersTable range={range} />
                <DeviceSplit range={range} />
            </div>
        </div>
    );
};

const root = document.getElementById('lean-stats-admin');

if (root) {
    render(<AdminApp />, root);
}
