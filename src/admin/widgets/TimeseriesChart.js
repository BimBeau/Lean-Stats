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
import { getPreviousRange } from "../lib/date";

const metricConfig = {
  pageViews: {
    key: "pageViews",
    label: __("Page views", "lean-stats"),
    title: __("Daily page views", "lean-stats"),
    ariaLabel: __("Daily page views line chart", "lean-stats"),
    tooltipLabel: (value) =>
      `${new Intl.NumberFormat().format(value)} ${_n(
        "page view",
        "page views",
        value,
        "lean-stats",
      )}`,
  },
  visits: {
    key: "visits",
    label: __("Visits", "lean-stats"),
    title: __("Daily visits", "lean-stats"),
    ariaLabel: __("Daily visits line chart", "lean-stats"),
    tooltipLabel: (value) =>
      `${new Intl.NumberFormat().format(value)} ${_n(
        "visit",
        "visits",
        value,
        "lean-stats",
      )}`,
  },
};

const TimeseriesChart = ({ range, metric = "pageViews" }) => {
  const config = metricConfig[metric] ?? metricConfig.pageViews;
  const previousRange = useMemo(() => getPreviousRange(range), [range]);
  const {
    data: currentData,
    isLoading: isCurrentLoading,
    error: currentError,
  } = useAdminEndpoint("/admin/timeseries/day", range);
  const {
    data: previousData,
    isLoading: isPreviousLoading,
    error: previousError,
  } = useAdminEndpoint("/admin/timeseries/day", previousRange, {
    enabled: Boolean(previousRange),
  });
  const items = currentData?.items ?? [];
  const previousItems = previousData?.items ?? [];
  const currentSeries = useMemo(
    () =>
      items.map((item) => ({
        bucket: item.bucket,
        value: item[config.key] ?? 0,
      })),
    [items, config.key],
  );
  const previousSeries = useMemo(() => {
    const previousValues = previousItems.map(
      (item) => item[config.key] ?? 0,
    );
    return items.map((item, index) => ({
      bucket: item.bucket,
      value: previousValues[index] ?? 0,
    }));
  }, [items, previousItems, config.key]);
  const [chartWidth, setChartWidth] = useState(LINE_CHART_WIDTH);
  const chartData = useMemo(
    () => buildLineChartData(currentSeries, previousSeries, chartWidth),
    [currentSeries, previousSeries, chartWidth],
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

  const formatMetricLabel = (value) => config.tooltipLabel(value);
  const formatTooltipSummary = (point) =>
    sprintf(
      /* translators: 1: formatted date, 2: current metric count, 3: previous metric count */
      __(
        "%1$s: Current %2$s, Previous %3$s",
        "lean-stats",
      ),
      formatTooltipDate(point.label),
      formatMetricLabel(point.currentValue),
      formatMetricLabel(point.previousValue),
    );

  const handleChartMouseMove = useCallback(
    (event) => {
      if (!chartData.currentPoints.length) {
        return;
      }
      const bounds = event.currentTarget.getBoundingClientRect();
      if (!bounds.width) {
        return;
      }
      const relativeX =
        ((event.clientX - bounds.left) / bounds.width) * chartData.width;
      let closestPoint = chartData.currentPoints[0];
      let closestDistance = Math.abs(closestPoint.x - relativeX);
      chartData.currentPoints.forEach((point) => {
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
    [chartData.currentPoints, chartData.width],
  );

  const chartTooltip = activePoint ? (
    <>
      <div className="ls-timeseries__tooltip-date">
        {formatTooltipDate(activePoint.label)}
      </div>
      <div className="ls-timeseries__tooltip-metric">
        {sprintf(
          /* translators: 1: current metric count */
          __("Current: %1$s", "lean-stats"),
          formatMetricLabel(activePoint.currentValue),
        )}
      </div>
      <div className="ls-timeseries__tooltip-metric">
        {sprintf(
          /* translators: 1: previous metric count */
          __("Previous: %1$s", "lean-stats"),
          formatMetricLabel(activePoint.previousValue),
        )}
      </div>
    </>
  ) : null;
  const isLoading = isCurrentLoading || isPreviousLoading;
  const error = currentError || previousError;
  const currentGradientId = `ls-timeseries-gradient-${config.key}`;

  return (
    <LsCard title={config.title}>
      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && items.length === 0}
        emptyLabel={__("No data available for this period.", "lean-stats")}
        loadingLabel={__("Loading chart…", "lean-stats")}
      />
      {!isLoading && !error && items.length > 0 && (
        <div className={`ls-timeseries ls-timeseries--${config.key}`}>
          <Flex className="ls-timeseries__legend" align="center">
            <FlexItem>
              <span className="ls-timeseries__legend-item">
                <span
                  className="ls-timeseries__legend-swatch"
                  aria-hidden="true"
                />
                {sprintf(
                  /* translators: 1: metric label */
                  __("Current %s", "lean-stats"),
                  config.label,
                )}
              </span>
            </FlexItem>
            <FlexItem>
              <span className="ls-timeseries__legend-item">
                <span
                  className="ls-timeseries__legend-swatch ls-timeseries__legend-swatch--previous"
                  aria-hidden="true"
                />
                {sprintf(
                  /* translators: 1: metric label */
                  __("Previous %s", "lean-stats"),
                  config.label,
                )}
              </span>
            </FlexItem>
          </Flex>
          <ChartFrame
            height={LINE_CHART_HEIGHT}
            ariaLabel={config.ariaLabel}
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
                aria-label={config.ariaLabel}
                onMouseMove={handleChartMouseMove}
              >
                <defs>
                  <linearGradient
                    id={currentGradientId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--ls-timeseries-line-color, #2271b1)"
                      stopOpacity="var(--ls-timeseries-gradient-opacity, 0.35)"
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--ls-timeseries-line-color, #2271b1)"
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
                  d={chartData.currentAreaPath}
                  className="ls-timeseries__area ls-timeseries__area--current"
                  fill={`url(#${currentGradientId})`}
                />
                <path
                  d={chartData.currentLinePath}
                  className="ls-timeseries__line ls-timeseries__line--current"
                />
                <path
                  d={chartData.previousLinePath}
                  className="ls-timeseries__line ls-timeseries__line--previous"
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
                {chartData.currentPoints.map((point) => (
                  <circle
                    key={`${point.label}-${point.currentValue}`}
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
                  key={`${activePoint.label}-${activePoint.currentValue}`}
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
