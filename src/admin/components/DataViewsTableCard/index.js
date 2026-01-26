import { Notice } from '@wordpress/components';
import { DataViews } from '@wordpress/dataviews';
import { __, sprintf } from '@wordpress/i18n';

import DataState from '../DataState';
import LsCard from '../LsCard';

const DEFAULT_LAYOUTS = {
    table: {
        showMedia: false,
    },
};

const resolveDataViewsComponent = () => {
    if (DataViews) {
        return DataViews;
    }

    if (typeof window === 'undefined' || !window.wp) {
        return null;
    }

    return window.wp?.dataviews?.DataViews || window.wp?.['dataviews/wp']?.DataViews || null;
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
    const showFallbackTable = !DataViewsComponent && !isLoading && !error && data.length > 0;

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
            {showFallbackTable && (
                <table className="widefat striped ls-data-views-fallback">
                    <thead>
                        <tr>
                            {fields.map((field) => (
                                <th key={field.name}>{field.label || field.name}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, index) => {
                            const rowKey = getItemId ? getItemId(item) : `${item?.id ?? index}`;
                            return (
                                <tr key={rowKey}>
                                    {fields.map((field) => (
                                        <td key={field.name}>{item?.[field.name] ?? ''}</td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </LsCard>
    );
};

export default DataViewsTableCard;
