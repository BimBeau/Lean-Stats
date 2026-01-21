import { Table, TableBody, TableCell, TableHeader, TableRow } from '@wordpress/components';
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
            <Table className="widefat striped" aria-label={title}>
                <TableHeader>
                    <TableRow>
                        {headers.map((header) => (
                            <TableCell key={header} as="th" scope="col">
                                {header}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={row.key}>
                            <TableCell>{row.label}</TableCell>
                            <TableCell>{row.value}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        )}
    </LsCard>
);

export default DataTableCard;
