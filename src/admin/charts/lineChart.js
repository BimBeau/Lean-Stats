const LINE_CHART_WIDTH = 640;
const LINE_CHART_HEIGHT = 240;
const LINE_CHART_PADDING = 32;
const LINE_CHART_LABEL_COUNT = 5;
const LINE_CHART_Y_TICK_COUNT = 4;

const buildSmoothPath = (points, smoothing = 0.2) => {
  if (points.length === 0) {
    return "";
  }

  const controlPoint = (current, previous, next, reverse = false) => {
    const previousPoint = previous || current;
    const nextPoint = next || current;
    const length = Math.hypot(
      nextPoint.x - previousPoint.x,
      nextPoint.y - previousPoint.y,
    );
    const angle =
      Math.atan2(nextPoint.y - previousPoint.y, nextPoint.x - previousPoint.x) +
      (reverse ? Math.PI : 0);
    const controlLength = length * smoothing;

    return {
      x: current.x + Math.cos(angle) * controlLength,
      y: current.y + Math.sin(angle) * controlLength,
    };
  };

  return points.reduce((path, point, index, allPoints) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    const previousPoint = allPoints[index - 1];
    const nextPoint = allPoints[index + 1];
    const controlPointStart = controlPoint(
      previousPoint,
      allPoints[index - 2],
      point,
    );
    const controlPointEnd = controlPoint(point, previousPoint, nextPoint, true);

    return `${path} C ${controlPointStart.x} ${controlPointStart.y} ${controlPointEnd.x} ${controlPointEnd.y} ${point.x} ${point.y}`;
  }, "");
};

const buildLineChartData = (
  pageViews = [],
  visits = [],
  chartWidth = LINE_CHART_WIDTH,
) => {
  const maxValue = Math.max(
    0,
    ...pageViews.map((item) => item.value ?? 0),
    ...visits.map((item) => item.value ?? 0),
  );
  const width = Math.max(Math.round(chartWidth), LINE_CHART_PADDING * 2 + 1);
  const height = LINE_CHART_HEIGHT;
  const padding = LINE_CHART_PADDING;
  const innerWidth = Math.max(width - padding * 2, 1);
  const innerHeight = Math.max(height - padding * 2, 1);
  const totalItems = Math.max(pageViews.length, visits.length);
  const totalPoints = Math.max(totalItems - 1, 1);

  const resolveLabel = (index) =>
    pageViews[index]?.bucket ?? visits[index]?.bucket ?? "";
  const resolveValue = (series, index) => series[index]?.value ?? 0;

  const buildPoints = (metricKey) =>
    Array.from({ length: totalItems }, (_, index) => {
      const pageViewsValue = resolveValue(pageViews, index);
      const visitsValue = resolveValue(visits, index);
      const value = metricKey === "pageViews" ? pageViewsValue : visitsValue;
      const x = padding + (innerWidth * index) / totalPoints;
      const y =
        height - padding - (maxValue ? (value / maxValue) * innerHeight : 0);
      return {
        x,
        y,
        label: resolveLabel(index),
        pageViews: pageViewsValue,
        visits: visitsValue,
      };
    });

  const pageViewsPoints = buildPoints("pageViews");
  const visitsPoints = buildPoints("visits");

  const pageViewsLinePath = buildSmoothPath(pageViewsPoints);
  const visitsLinePath = buildSmoothPath(visitsPoints);
  const baselineY = height - padding;
  const pageViewsAreaPath =
    pageViewsPoints.length > 0
      ? `${pageViewsLinePath} L ${
          pageViewsPoints[pageViewsPoints.length - 1].x
        } ${baselineY} L ${pageViewsPoints[0].x} ${baselineY} Z`
      : "";
  const visitsAreaPath =
    visitsPoints.length > 0
      ? `${visitsLinePath} L ${
          visitsPoints[visitsPoints.length - 1].x
        } ${baselineY} L ${visitsPoints[0].x} ${baselineY} Z`
      : "";

  const labelCount = Math.min(LINE_CHART_LABEL_COUNT, totalItems);
  const labelIndices = new Set();
  if (labelCount <= 1) {
    labelIndices.add(0);
  } else {
    const step = (totalItems - 1) / (labelCount - 1);
    for (let i = 0; i < labelCount; i += 1) {
      labelIndices.add(Math.round(i * step));
    }
  }

  const xLabels = Array.from({ length: totalItems }, (_, index) => {
    if (!labelIndices.has(index)) {
      return null;
    }
    return {
      x: padding + (innerWidth * index) / totalPoints,
      label: resolveLabel(index),
    };
  }).filter(Boolean);

  const yTicks = Array.from({ length: LINE_CHART_Y_TICK_COUNT }, (_, index) => {
    if (LINE_CHART_Y_TICK_COUNT <= 1) {
      return {
        y: padding,
        value: maxValue,
      };
    }
    const ratio = index / (LINE_CHART_Y_TICK_COUNT - 1);
    return {
      y: padding + innerHeight * ratio,
      value: Math.round(maxValue * (1 - ratio)),
    };
  });

  return {
    pageViewsPoints,
    visitsPoints,
    pageViewsLinePath,
    visitsLinePath,
    pageViewsAreaPath,
    visitsAreaPath,
    maxValue,
    width,
    height,
    padding,
    baselineY,
    xLabels,
    yTicks,
  };
};

export {
  LINE_CHART_HEIGHT,
  LINE_CHART_LABEL_COUNT,
  LINE_CHART_PADDING,
  LINE_CHART_WIDTH,
  LINE_CHART_Y_TICK_COUNT,
  buildLineChartData,
  buildSmoothPath,
};
