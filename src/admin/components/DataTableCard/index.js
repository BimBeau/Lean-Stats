import { __, sprintf } from '@wordpress/i18n';

import DataState from '../DataState';
import LsCard from '../LsCard';

const DataTableCard = ({ title, headers, rows, isLoading, error, emptyLabel }) => (
    <LsCard title={title}>
        <DataState
            isLoading={isLoading}
            error={error}
            isEmpty={!isLoading && !error && rows.length === 0}
            emptyLabel={emptyLabel}
            loadingLabel={sprintf(__('Loading: %s', 'lean-stats'), title)}
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
    </LsCard>
);

export default DataTableCard;
