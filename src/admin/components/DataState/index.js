import { Spinner, Notice } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const DEFAULT_SKELETON_ROWS = 4;
const SKELETON_WIDTH_CLASSES = [
    'ls-skeleton__bar--w80',
    'ls-skeleton__bar--w74',
    'ls-skeleton__bar--w68',
    'ls-skeleton__bar--w62',
    'ls-skeleton__bar--w56',
    'ls-skeleton__bar--w50',
];

const DataState = ({
    isLoading,
    error,
    isEmpty,
    emptyLabel,
    loadingLabel = __('Loading…', 'lean-stats'),
    skeletonRows = DEFAULT_SKELETON_ROWS,
}) => {
    if (isLoading) {
        const rows = Array.from({ length: skeletonRows }, (_, index) => index);
        return (
            <div className="ls-data-state" aria-live="polite" aria-busy="true">
                <div className="ls-data-state__header">
                    <Spinner />
                    <span>{loadingLabel}</span>
                </div>
                <div className="ls-skeleton">
                    {rows.map((row) => (
                        <div
                            key={row}
                            className={`ls-skeleton__bar ${SKELETON_WIDTH_CLASSES[Math.min(row, SKELETON_WIDTH_CLASSES.length - 1)]}`}
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

export default DataState;
