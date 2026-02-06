import { __ } from "@wordpress/i18n";
import { Card, CardBody, Spinner } from "@wordpress/components";

import useAdminEndpoint from "../api/useAdminEndpoint";
import DataState from "../components/DataState";
import { ADMIN_CONFIG } from "../constants";
import {
  calculateChangePercent,
  formatChangePercent,
} from "../lib/formatters";

const KpiBadge = ({ children, status = "info" }) => {
  return (
    <span
      className={`ls-kpi-card__badge ls-kpi-card__badge--${status}`}
      role="status"
    >
      {children}
    </span>
  );
};

const OverviewKpis = ({ range }) => {
  const { data, isLoading, error } = useAdminEndpoint("/overview", range, {
    namespace: ADMIN_CONFIG?.settings?.restNamespace,
  });
  const overview = data?.overview || null;
  const comparisonOverview = data?.comparison?.overview || null;
  const isEmpty = !isLoading && !error && !overview;

  if (isLoading) {
    const loadingCards = [
      { icon: "visibility" },
      { icon: "chart-bar" },
      { icon: "admin-links" },
      { icon: "warning" },
      { icon: "search" },
    ];

    return (
      <>
        {loadingCards.map((card, index) => (
          <Card
            key={`loading-${card.icon}-${index}`}
            className="ls-overview__summary-card"
          >
            <CardBody className="ls-kpi-card__body ls-kpi-card__body--loading">
              <div className="ls-kpi-card__content">
                <p className="ls-kpi-card__label ls-kpi-card__label--loading">
                  <Spinner />
                  <span>{__("Loading…", "lean-stats")}</span>
                </p>
                <span
                  className="ls-kpi-card__value-skeleton"
                  aria-hidden="true"
                />
              </div>
              <span
                className={`dashicons dashicons-${card.icon} ls-kpi-card__icon`}
                aria-hidden="true"
              />
            </CardBody>
          </Card>
        ))}
      </>
    );
  }

  if (error || isEmpty) {
    return (
      <Card className="ls-overview__summary-card ls-overview__summary-card--status">
        <CardBody>
          <DataState
            isLoading={isLoading}
            error={error}
            isEmpty={isEmpty}
            emptyLabel={__("No overview metrics available.", "lean-stats")}
            loadingLabel={__("Loading KPIs…", "lean-stats")}
            skeletonRows={3}
          />
        </CardBody>
      </Card>
    );
  }

  const cards = [
    {
      key: "visits",
      label: __("Visits", "lean-stats"),
      value: overview.visits,
      icon: "visibility",
      comparison: comparisonOverview?.visits,
    },
    {
      key: "pageViews",
      label: __("Page views", "lean-stats"),
      value: overview.pageViews,
      icon: "chart-bar",
      comparison: comparisonOverview?.pageViews,
    },
    {
      key: "uniqueReferrers",
      label: __("Referring sites", "lean-stats"),
      value: overview.uniqueReferrers,
      icon: "admin-links",
      comparison: comparisonOverview?.uniqueReferrers,
    },
    {
      key: "notFoundHits",
      label: __("Pages not found (404)", "lean-stats"),
      value: overview.notFoundHits,
      icon: "warning",
      comparison: comparisonOverview?.notFoundHits,
    },
    {
      key: "searchHits",
      label: __("Internal searches", "lean-stats"),
      value: overview.searchHits,
      icon: "search",
      comparison: comparisonOverview?.searchHits,
    },
  ];

  return (
    <>
      {cards.map((card) => {
        const currentValue = Number(card.value) || 0;
        const previousValue =
          card.comparison === null || card.comparison === undefined
            ? null
            : Number(card.comparison);
        const changePercent = calculateChangePercent(currentValue, previousValue);
        const changeLabel = formatChangePercent(changePercent);
        const isPositive = changePercent > 0;
        const isNegative = changePercent < 0;
        const isZero =
          changePercent === 0 || Object.is(changePercent, -0);
        return (
          <Card key={card.key} className="ls-overview__summary-card">
            <CardBody className="ls-kpi-card__body">
              <div className="ls-kpi-card__content">
                <p className="ls-kpi-card__label">{card.label}</p>
                <p className="ls-kpi-card__value-row">
                  <span className="ls-kpi-card__value">{currentValue}</span>
                  {changeLabel !== null && (
                    <KpiBadge
                      status={
                        isPositive
                          ? "success"
                          : isNegative
                          ? "error"
                          : isZero
                          ? "warning"
                          : "info"
                      }
                    >
                      {changeLabel}
                    </KpiBadge>
                  )}
                </p>
              </div>
              <span
                className={`dashicons dashicons-${card.icon} ls-kpi-card__icon`}
                aria-hidden="true"
              />
            </CardBody>
          </Card>
        );
      })}
    </>
  );
};

export default OverviewKpis;
