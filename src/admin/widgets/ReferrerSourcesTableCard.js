import { useEffect, useState } from "@wordpress/element";
import { __, sprintf } from "@wordpress/i18n";
import {
  Button,
  ButtonGroup,
  Flex,
  FlexItem,
  SelectControl,
} from "@wordpress/components";

import useAdminEndpoint from "../api/useAdminEndpoint";
import DataState from "../components/DataState";
import LsCard from "../components/LsCard";
import { ADMIN_CONFIG } from "../constants";

const ReferrerSourcesTableCard = ({ range }) => {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState("hits");
  const [order, setOrder] = useState("desc");

  useEffect(() => {
    setPage(1);
  }, [range.start, range.end]);

  const { data, isLoading, error } = useAdminEndpoint(
    "/referrer-sources",
    {
      ...range,
      page,
      per_page: perPage,
      orderby: orderBy,
      order,
    },
    {
      namespace: ADMIN_CONFIG?.settings?.restNamespace,
    },
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

  const orderLabel =
    order === "asc"
      ? __("Ascending", "lean-stats")
      : __("Descending", "lean-stats");
  /* translators: %s: current sort order label. */
  const orderToggleLabel = `${__(
    "Toggle sort order",
    "lean-stats",
  )}: ${orderLabel}`;
  const tableLabel = __("Table: Referrer sources", "lean-stats");

  const rows = items.map((item, index) => {
    const referrerDomain = item.referrer_domain || __("Direct", "lean-stats");
    const categoryFallback = item.referrer_domain
      ? __("Referrer", "lean-stats")
      : __("Direct", "lean-stats");

    return {
      key: `${referrerDomain}-${
        item.source_category || categoryFallback
      }-${index}`,
      referrer: referrerDomain,
      category: item.source_category || categoryFallback,
      hits: item.hits,
    };
  });

  return (
    <LsCard title={__("Referrer sources", "lean-stats")}>
      <div className="ls-table-controls">
        <SelectControl
          label={__("Sort by", "lean-stats")}
          value={orderBy}
          options={[
            {
              label: __("Visits", "lean-stats"),
              value: "hits",
            },
            {
              label: __("Referrer", "lean-stats"),
              value: "referrer",
            },
            {
              label: __("Source category", "lean-stats"),
              value: "category",
            },
          ]}
          onChange={(value) => {
            setOrderBy(value);
            setPage(1);
          }}
          __nextHasNoMarginBottom
        />
        <Button
          variant="secondary"
          icon={order === "asc" ? "arrow-up-alt2" : "arrow-down-alt2"}
          onClick={() => {
            setOrder(order === "asc" ? "desc" : "asc");
            setPage(1);
          }}
          aria-label={orderToggleLabel}
        >
          {orderLabel}
        </Button>
        <SelectControl
          label={__("Rows", "lean-stats")}
          value={String(perPage)}
          options={[
            { label: "5", value: "5" },
            { label: "10", value: "10" },
            { label: "20", value: "20" },
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
        emptyLabel={__("No referrer data available.", "lean-stats")}
        loadingLabel={__("Loading referrer sources…", "lean-stats")}
      />
      {!isLoading && !error && rows.length > 0 && (
        <>
          <table
            className="widefat striped ls-report-table"
            aria-label={tableLabel}
          >
            <thead>
              <tr>
                <th scope="col">{__("Referrer", "lean-stats")}</th>
                <th scope="col">{__("Source category", "lean-stats")}</th>
                <th scope="col">{__("Visits", "lean-stats")}</th>
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
          <Flex
            className="ls-table-pagination"
            justify="space-between"
            align="center"
          >
            <FlexItem>
              <ButtonGroup>
                <Button
                  variant="secondary"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={!canPrevious}
                  aria-label={__("Previous page", "lean-stats")}
                >
                  {__("Previous", "lean-stats")}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={!canNext}
                  aria-label={__("Next page", "lean-stats")}
                >
                  {__("Next", "lean-stats")}
                </Button>
              </ButtonGroup>
            </FlexItem>
            <FlexItem className="ls-table-pagination__meta">
              {`${__("Page", "lean-stats")} ${page} ${__(
                "of",
                "lean-stats",
              )} ${totalPages}`}
            </FlexItem>
            <FlexItem className="ls-table-pagination__meta">
              {`${totalItems} ${__("items", "lean-stats")}`}
            </FlexItem>
          </Flex>
        </>
      )}
    </LsCard>
  );
};

export default ReferrerSourcesTableCard;
