import { useCallback, useMemo, useState } from "@wordpress/element";
import { Flex, FlexItem } from "@wordpress/components";
import { __, _n, sprintf } from "@wordpress/i18n";

import useAdminEndpoint from "../api/useAdminEndpoint";
import ChartFrame from "../components/ChartFrame";
import DataState from "../components/DataState";
import LsCard from "../components/LsCard";
import {
  LINE_CHART_HEIGHT,
  LINE_CHART_PADDING,
  LINE_CHART_WIDTH,
  buildLineChartData,
} from "../charts/lineChart";
const TimeseriesChart = ({ range }) => {
  const { data, isLoading, error } = useAdminEndpoint(
    "/admin/timeseries/day",
    range,
  );
  const items = data?.items ?? [];
  const pageViewsSeries = useMemo(
    () =>
      items.map((item) => ({
        bucket: item.bucket,
        value: item.pageViews ?? 0,
      })),
    [items],
  );
  const visitsSeries = useMemo(
    () =>
      items.map((item) => ({
        bucket: item.bucket,
        value: item.visits ?? 0,
      })),
    [items],
  );
  const [chartWidth, setChartWidth] = useState(LINE_CHART_WIDTH);
  const chartData = useMemo(
    () => buildLineChartData(pageViewsSeries, visitsSeries, chartWidth),
    [pageViewsSeries, visitsSeries, chartWidth],
  );
  const [activePoint, setActivePoint] = useState(null);
  // ResizeObserver updates width without changing the fixed 240px height.
  const handleChartResize = useCallback(({ width }) => {
    const nextWidth = Math.max(Math.round(width), LINE_CHART_PADDING * 2 + 1);
    setChartWidth((prev) => (prev === nextWidth ? prev : nextWidth));
  }, []);

  const formatAxisLabel = (value) => {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "short",
    }).format(date);
  };

  const formatYAxisValue = (value) => new Intl.NumberFormat().format(value);

  const formatTooltipDate = (value) => {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const locale = new Intl.DateTimeFormat().resolvedOptions().locale || "";
    const isEnglishLocale = /^en(?:-|$)/i.test(locale);

    return new Intl.DateTimeFormat(isEnglishLocale ? "en-US" : undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(date);
  };

  const formatPageViewsLabel = (value) =>
    `${formatYAxisValue(value)} ${_n(
      "page view",
      "page views",
      value,
      "lean-stats",
    )}`;
  const formatVisitsLabel = (value) =>
    `${formatYAxisValue(value)} ${_n(
      "visit",
      "visits",
      value,
      "lean-stats",
    )}`;
  const formatTooltipSummary = (point) =>
    sprintf(
      /* translators: 1: formatted date, 2: page views count, 3: visits count */
      __("%1$s: %2$s, %3$s", "lean-stats"),
      formatTooltipDate(point.label),
      formatPageViewsLabel(point.pageViews),
      formatVisitsLabel(point.visits),
    );

  const handleChartMouseMove = useCallback(
    (event) => {
      if (!chartData.pageViewsPoints.length) {
        return;
      }
      const bounds = event.currentTarget.getBoundingClientRect();
      if (!bounds.width) {
        return;
      }
      const relativeX =
        ((event.clientX - bounds.left) / bounds.width) * chartData.width;
      let closestPoint = chartData.pageViewsPoints[0];
      let closestDistance = Math.abs(closestPoint.x - relativeX);
      chartData.pageViewsPoints.forEach((point) => {
        const distance = Math.abs(point.x - relativeX);
        if (distance < closestDistance) {
          closestPoint = point;
          closestDistance = distance;
        }
      });
      setActivePoint((previous) =>
        previous?.label === closestPoint.label ? previous : closestPoint,
      );
    },
    [chartData.pageViewsPoints, chartData.width],
  );

  const chartTooltip = activePoint ? (
    <>
      <div className="ls-timeseries__tooltip-date">
        {formatTooltipDate(activePoint.label)}
      </div>
      <div className="ls-timeseries__tooltip-metric">
        {sprintf(
          /* translators: 1: page views count, 2: visits count */
          __("%1$s, %2$s", "lean-stats"),
          formatPageViewsLabel(activePoint.pageViews),
          formatVisitsLabel(activePoint.visits),
        )}
      </div>
    </>
  ) : null;
  const pageViewsGradientId = "ls-timeseries-gradient-pageviews";
  const visitsGradientId = "ls-timeseries-gradient-visits";

  return (
    <LsCard title={__("Daily page views and visits", "lean-stats")}>
      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && items.length === 0}
        emptyLabel={__("No data available for this period.", "lean-stats")}
        loadingLabel={__("Loading chart…", "lean-stats")}
      />
      {!isLoading && !error && items.length > 0 && (
        <div className="ls-timeseries">
          <Flex className="ls-timeseries__legend" align="center">
            <FlexItem>
              <span className="ls-timeseries__legend-item">
                <span
                  className="ls-timeseries__legend-swatch ls-timeseries__legend-swatch--pageviews"
                  aria-hidden="true"
                />
                {__("Page views", "lean-stats")}
              </span>
            </FlexItem>
            <FlexItem>
              <span className="ls-timeseries__legend-item">
                <span
                  className="ls-timeseries__legend-swatch ls-timeseries__legend-swatch--visits"
                  aria-hidden="true"
                />
                {__("Visits", "lean-stats")}
              </span>
            </FlexItem>
          </Flex>
          <ChartFrame
            height={LINE_CHART_HEIGHT}
            ariaLabel={__("Daily page views and visits line chart", "lean-stats")}
            onResize={handleChartResize}
          >
            <div
              className="ls-timeseries__chart"
              onMouseLeave={() => setActivePoint(null)}
            >
              <svg
                viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMid meet"
                className="ls-timeseries__svg"
                role="img"
                aria-label={__("Daily page views and visits line chart", "lean-stats")}
                onMouseMove={handleChartMouseMove}
              >
                <defs>
                  <linearGradient
                    id={pageViewsGradientId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--ls-border, #2271b1)"
                      stopOpacity="0.45"
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--ls-border, #2271b1)"
                      stopOpacity="0"
                    />
                  </linearGradient>
                  <linearGradient
                    id={visitsGradientId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--ls-text-2, #2271b1)"
                      stopOpacity="0.25"
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--ls-text-2, #2271b1)"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>
                <rect
                  x="0"
                  y="0"
                  width={chartData.width}
                  height={chartData.height}
                  className="ls-timeseries__bg"
                />
                {chartData.yTicks.map((tick) => (
                  <g key={`tick-${tick.value}-${tick.y}`}>
                    <line
                      x1={chartData.padding}
                      y1={tick.y}
                      x2={chartData.width - chartData.padding}
                      y2={tick.y}
                      className="ls-timeseries__grid-line"
                    />
                    <text
                      x={chartData.padding - 8}
                      y={tick.y + 4}
                      textAnchor="end"
                      className="ls-timeseries__axis-label ls-timeseries__axis-label--y"
                    >
                      {formatYAxisValue(tick.value)}
                    </text>
                  </g>
                ))}
                <line
                  x1={chartData.padding}
                  y1={chartData.padding}
                  x2={chartData.padding}
                  y2={chartData.height - chartData.padding}
                  className="ls-timeseries__axis"
                />
                <line
                  x1={chartData.padding}
                  y1={chartData.height - chartData.padding}
                  x2={chartData.width - chartData.padding}
                  y2={chartData.height - chartData.padding}
                  className="ls-timeseries__axis"
                />
                <path
                  d={chartData.visitsAreaPath}
                  className="ls-timeseries__area ls-timeseries__area--visits"
                  fill={`url(#${visitsGradientId})`}
                />
                <path
                  d={chartData.pageViewsAreaPath}
                  className="ls-timeseries__area ls-timeseries__area--pageviews"
                  fill={`url(#${pageViewsGradientId})`}
                />
                <path
                  d={chartData.visitsLinePath}
                  className="ls-timeseries__line ls-timeseries__line--visits"
                />
                <path
                  d={chartData.pageViewsLinePath}
                  className="ls-timeseries__line ls-timeseries__line--pageviews"
                />
                {chartData.xLabels.map((label) => (
                  <text
                    key={`label-${label.label}`}
                    x={label.x}
                    y={chartData.height - chartData.padding + 18}
                    textAnchor="middle"
                    className="ls-timeseries__axis-label"
                  >
                    {formatAxisLabel(label.label)}
                  </text>
                ))}
                {chartData.pageViewsPoints.map((point) => (
                  <circle
                    key={`${point.label}-${point.pageViews}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    className={`ls-timeseries__point${
                      activePoint?.label === point.label ? " is-active" : ""
                    }`}
                    onMouseEnter={() => setActivePoint(point)}
                    onFocus={() => setActivePoint(point)}
                    onBlur={() => setActivePoint(null)}
                    tabIndex="0"
                    aria-label={formatTooltipSummary(point)}
                  >
                    <title>{formatTooltipSummary(point)}</title>
                  </circle>
                ))}
              </svg>
              {activePoint && (
                <div
                  key={`${activePoint.label}-${activePoint.pageViews}`}
                  className="ls-timeseries__tooltip"
                  role="status"
                  style={{
                    left: `${(activePoint.x / chartData.width) * 100}%`,
                    top: `calc(${
                      (activePoint.y / chartData.height) * 100
                    }% - 3px)`,
                  }}
                >
                  {chartTooltip}
                </div>
              )}
            </div>
          </ChartFrame>
        </div>
      )}
    </LsCard>
  );
};

export default TimeseriesChart;
