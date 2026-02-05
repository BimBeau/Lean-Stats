import { __, _n } from "@wordpress/i18n";
import { Badge, Card, CardBody, Spinner } from "@wordpress/components";

import useAdminEndpoint from "../api/useAdminEndpoint";
import DataState from "../components/DataState";
import { ADMIN_CONFIG } from "../constants";
import {
  calculateChangePercent,
  formatChangePercent,
  truncatePageTitle,
} from "../lib/formatters";

const KpiBadge = ({ children, ...props }) => {
  return (
    <Badge className="ls-kpi-card__badge" {...props}>
      {children}
    </Badge>
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
      key: "pageViews",
      label: __("Page views", "lean-stats"),
      value: overview.pageViews,
      icon: "visibility",
      comparison: comparisonOverview?.pageViews,
    },
    {
      key: "visitors",
      label: __("Visitors", "lean-stats"),
      value: overview.visitors,
      icon: "chart-bar",
      comparison: comparisonOverview?.visitors,
    },
    {
      key: "topPage",
      label: __("Top page", "lean-stats"),
      value: truncatePageTitle(overview.topPage),
      icon: "admin-links",
      comparison: comparisonOverview?.topPage,
      isText: true,
    },
    {
      key: "bounceRate",
      label: __("Bounce rate", "lean-stats"),
      value: `${overview.bounceRate}%`,
      icon: "warning",
      comparison: comparisonOverview?.bounceRate,
      formatter: (nextValue) => `${nextValue}%`,
    },
    {
      key: "avgTime",
      label: __("Average time", "lean-stats"),
      value: overview.avgTime,
      icon: "search",
      comparison: comparisonOverview?.avgTime,
      formatter: (nextValue) =>
        `${nextValue} ${_n("second", "seconds", nextValue, "lean-stats")}`,
    },
  ];

  return (
    <>
      {cards.map((card) => {
        const changePercent = calculateChangePercent(
          card.value,
          card.comparison,
        );
        const changeLabel = formatChangePercent(changePercent);
        const isPositive = changePercent > 0;
        const isNegative = changePercent < 0;
        let badgeStatus = "info";
        if (isPositive) {
          badgeStatus = "success";
        }
        if (isNegative) {
          badgeStatus = "warning";
        }

        return (
          <Card key={card.key} className="ls-overview__summary-card">
            <CardBody className="ls-kpi-card__body">
              <div className="ls-kpi-card__content">
                <p className="ls-kpi-card__label">{card.label}</p>
                <p
                  className={`ls-kpi-card__value${
                    card.isText ? " ls-kpi-card__value--text" : ""
                  }`}
                >
                  {card.value}
                </p>
                {changeLabel !== null && (
                  <KpiBadge
                    status={
                      isPositive ? "success" : isNegative ? "warning" : "info"
                    }
                  >
                    {changeLabel}
                  </KpiBadge>
                )}
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
