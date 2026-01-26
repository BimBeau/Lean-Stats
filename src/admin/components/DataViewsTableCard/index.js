import { Notice } from '@wordpress/components';
import { DataViews as ImportedDataViews } from '@wordpress/dataviews/wp';
import { __, sprintf } from '@wordpress/i18n';

import DataState from '../DataState';
import LsCard from '../LsCard';

const DEFAULT_LAYOUTS = {
    table: {
        showMedia: false,
    },
};

const DATA_VIEWS_LOOKUPS = [
    {
        label: 'imported @wordpress/dataviews/wp',
        get: () => ImportedDataViews,
    },
    {
        label: 'window.wp.dataviews.DataViews',
        get: () => (typeof window === 'undefined' ? null : window.wp?.dataviews?.DataViews),
    },
    {
        label: 'window.wp["dataviews/wp"].DataViews',
        get: () => (typeof window === 'undefined' ? null : window.wp?.['dataviews/wp']?.DataViews),
    },
    {
        label: 'window.wp.dataviewsWp.DataViews',
        get: () => (typeof window === 'undefined' ? null : window.wp?.dataviewsWp?.DataViews),
    },
];

let hasWarnedMissingDataViews = false;

const resolveDataViewsComponent = () => {
    for (const lookup of DATA_VIEWS_LOOKUPS) {
        const candidate = lookup.get();
        if (candidate) {
            return candidate;
        }
    }

    if (typeof window !== 'undefined' && !hasWarnedMissingDataViews) {
        hasWarnedMissingDataViews = true;
        // eslint-disable-next-line no-console
        console.warn(
            `Lean Stats: Data Views not found. Checked: ${DATA_VIEWS_LOOKUPS.map(
                (lookup) => lookup.label
            ).join(', ')}.`
        );
    }

    return null;
};

const DataViewsTableCard = ({
    title,
    data,
    fields,
    view,
    onChangeView,
    isLoading,
    error,
    emptyLabel,
    paginationInfo,
    getItemId,
    perPageSizes = [5, 10, 20],
}) => {
    const DataViewsComponent = resolveDataViewsComponent();

    return (
        <LsCard title={title}>
            <DataState
                isLoading={isLoading}
                error={error}
                isEmpty={!isLoading && !error && data.length === 0}
                emptyLabel={emptyLabel}
                loadingLabel={sprintf(__('Loading: %s', 'lean-stats'), title)}
            />
            {!DataViewsComponent && !isLoading && !error && (
                <Notice status="warning" isDismissible={false}>
                    {__(
                        'Data views are unavailable. Update WordPress to enable the interactive table.',
                        'lean-stats'
                    )}
                </Notice>
            )}
            {DataViewsComponent && !isLoading && !error && data.length > 0 && (
                <DataViewsComponent
                    data={data}
                    fields={fields}
                    view={view}
                    onChangeView={onChangeView}
                    paginationInfo={paginationInfo}
                    getItemId={getItemId}
                    defaultLayouts={DEFAULT_LAYOUTS}
                    search={false}
                    isLoading={isLoading}
                    config={{ perPageSizes }}
                />
            )}
        </LsCard>
    );
};

export default DataViewsTableCard;
