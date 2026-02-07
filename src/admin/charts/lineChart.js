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
  current = [],
  previous = [],
  chartWidth = LINE_CHART_WIDTH,
) => {
  const maxValue = Math.max(
    0,
    ...current.map((item) => item.value ?? 0),
    ...previous.map((item) => item.value ?? 0),
  );
  const width = Math.max(Math.round(chartWidth), LINE_CHART_PADDING * 2 + 1);
  const height = LINE_CHART_HEIGHT;
  const padding = LINE_CHART_PADDING;
  const innerWidth = Math.max(width - padding * 2, 1);
  const innerHeight = Math.max(height - padding * 2, 1);
  const totalItems = Math.max(current.length, previous.length);
  const totalPoints = Math.max(totalItems - 1, 1);

  const resolveLabel = (index) =>
    current[index]?.bucket ?? previous[index]?.bucket ?? "";
  const resolveValue = (series, index) => series[index]?.value ?? 0;

  const buildPoints = (valueSelector) =>
    Array.from({ length: totalItems }, (_, index) => {
      const currentValue = resolveValue(current, index);
      const previousValue = resolveValue(previous, index);
      const value = valueSelector(currentValue, previousValue);
      const x = padding + (innerWidth * index) / totalPoints;
      const y =
        height - padding - (maxValue ? (value / maxValue) * innerHeight : 0);
      return {
        x,
        y,
        label: resolveLabel(index),
        currentValue,
        previousValue,
      };
    });

  const currentPoints = buildPoints((currentValue) => currentValue);
  const previousPoints = buildPoints((_, previousValue) => previousValue);

  const currentLinePath = buildSmoothPath(currentPoints);
  const previousLinePath = buildSmoothPath(previousPoints);
  const baselineY = height - padding;
  const currentAreaPath =
    currentPoints.length > 0
      ? `${currentLinePath} L ${
          currentPoints[currentPoints.length - 1].x
        } ${baselineY} L ${currentPoints[0].x} ${baselineY} Z`
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
    currentPoints,
    previousPoints,
    currentLinePath,
    previousLinePath,
    currentAreaPath,
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
