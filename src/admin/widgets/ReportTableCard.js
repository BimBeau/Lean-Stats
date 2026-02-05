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
import { ADMIN_CONFIG, DEFAULT_PAGE_LABEL_DISPLAY } from "../constants";
import useSharedPageLabelDisplay from "../hooks/useSharedPageLabelDisplay";
import { truncatePageTitle } from "../lib/formatters";
import { normalizePageLabelDisplay } from "../lib/storage";
const ReportTableCard = ({
  title,
  labelHeader,
  range,
  endpoint,
  emptyLabel,
  labelFallback,
  metricLabel = __("Page views", "lean-stats"),
  metricKey = "hits",
  metricValueKey = "hits",
  supportsPageLabelToggle = false,
}) => {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState(metricKey);
  const [order, setOrder] = useState("desc");
  const [pageLabelDisplay, setPageLabelDisplay] = useSharedPageLabelDisplay();
  const activeLabelHeader =
    supportsPageLabelToggle && pageLabelDisplay === "title"
      ? __("Title", "lean-stats")
      : labelHeader;
  const activeLabelSortKey =
    supportsPageLabelToggle && pageLabelDisplay === "title"
      ? "page_title"
      : "label";

  useEffect(() => {
    setPage(1);
  }, [range.start, range.end]);

  useEffect(() => {
    setOrderBy(metricKey);
    setOrder("desc");
  }, [metricKey]);

  useEffect(() => {
    if (
      supportsPageLabelToggle &&
      orderBy === "label" &&
      activeLabelSortKey === "page_title"
    ) {
      setOrderBy("page_title");
      setPage(1);
    }

    if (
      supportsPageLabelToggle &&
      orderBy === "page_title" &&
      activeLabelSortKey === "label"
    ) {
      setOrderBy("label");
      setPage(1);
    }
  }, [supportsPageLabelToggle, orderBy, activeLabelSortKey]);

  const { data, isLoading, error } = useAdminEndpoint(
    endpoint,
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
  /* translators: %s: active first-column label. */
  const labelSortLabel = `${activeLabelHeader} ${__("label", "lean-stats")}`;
  /* translators: %s: current sort order label. */
  const orderToggleLabel = `${__(
    "Toggle sort order",
    "lean-stats",
  )}: ${orderLabel}`;
  /* translators: %s: table title. */
  const tableLabel = `${__("Table", "lean-stats")}: ${title}`;

  const rows = items.map((item, index) => ({
    key: `${item.label || labelFallback}-${index}`,
    label: item.label || labelFallback,
    pageTitle: item.page_title || "",
    value: item?.[metricValueKey] ?? 0,
  }));

  return (
    <LsCard title={title}>
      <div className="ls-table-controls">
        <SelectControl
          label={__("Sort by", "lean-stats")}
          value={orderBy}
          options={[
            { label: metricLabel, value: metricKey },
            { label: labelSortLabel, value: activeLabelSortKey },
          ]}
          onChange={(value) => {
            setOrderBy(value);
            setPage(1);
          }}
          __nextHasNoMarginBottom
        />
        {supportsPageLabelToggle && (
          <SelectControl
            label={__("Display", "lean-stats")}
            value={pageLabelDisplay}
            options={[
              { label: __("URL", "lean-stats"), value: "url" },
              {
                label: __("Title", "lean-stats"),
                value: "title",
              },
            ]}
            onChange={(value) => {
              const nextMode =
                normalizePageLabelDisplay(value) || DEFAULT_PAGE_LABEL_DISPLAY;
              setPageLabelDisplay(nextMode);
              setOrderBy(nextMode === "title" ? "page_title" : "label");
              setPage(1);
            }}
            __nextHasNoMarginBottom
          />
        )}
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
        emptyLabel={emptyLabel}
        loadingLabel={`${__("Loading", "lean-stats")}: ${title}`}
      />
      {!isLoading && !error && rows.length > 0 && (
        <>
          <table
            className="widefat striped ls-report-table"
            aria-label={tableLabel}
          >
            <thead>
              <tr>
                <th scope="col">{activeLabelHeader}</th>
                <th scope="col">{metricLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td>
                    {supportsPageLabelToggle && pageLabelDisplay === "title"
                      ? truncatePageTitle(row.pageTitle || row.label)
                      : row.label}
                  </td>
                  <td>{row.value}</td>
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

export default ReportTableCard;
