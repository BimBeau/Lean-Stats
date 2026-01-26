import { DataViews as ImportedDataViews } from '@wordpress/dataviews';
import { __, sprintf } from '@wordpress/i18n';

import DataState from '../DataState';
import LsCard from '../LsCard';

const DEFAULT_LAYOUTS = {
    table: {
        showMedia: false,
    },
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
    if (!ImportedDataViews) {
        throw new Error(
            __('Lean Stats requires WordPress Data Views to render this table.', 'lean-stats')
        );
    }

    return (
        <LsCard title={title}>
            <DataState
                isLoading={isLoading}
                error={error}
                isEmpty={!isLoading && !error && data.length === 0}
                emptyLabel={emptyLabel}
                loadingLabel={sprintf(__('Loading: %s', 'lean-stats'), title)}
            />
            {!isLoading && !error && data.length > 0 && (
                <ImportedDataViews
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
