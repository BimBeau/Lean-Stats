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

const buildLineChartData = (items, chartWidth = LINE_CHART_WIDTH) => {
  const maxHits = items.reduce((max, item) => Math.max(max, item.hits), 0);
  const width = Math.max(Math.round(chartWidth), LINE_CHART_PADDING * 2 + 1);
  const height = LINE_CHART_HEIGHT;
  const padding = LINE_CHART_PADDING;
  const innerWidth = Math.max(width - padding * 2, 1);
  const innerHeight = Math.max(height - padding * 2, 1);
  const totalPoints = Math.max(items.length - 1, 1);

  const points = items.map((item, index) => {
    const x = padding + (innerWidth * index) / totalPoints;
    const y =
      height - padding - (maxHits ? (item.hits / maxHits) * innerHeight : 0);
    return {
      x,
      y,
      label: item.bucket,
      hits: item.hits,
    };
  });

  const linePath = buildSmoothPath(points);
  const baselineY = height - padding;
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${
          points[0].x
        } ${baselineY} Z`
      : "";

  const labelCount = Math.min(LINE_CHART_LABEL_COUNT, items.length);
  const labelIndices = new Set();
  if (labelCount <= 1) {
    labelIndices.add(0);
  } else {
    const step = (items.length - 1) / (labelCount - 1);
    for (let i = 0; i < labelCount; i += 1) {
      labelIndices.add(Math.round(i * step));
    }
  }

  const xLabels = items
    .map((item, index) => {
      if (!labelIndices.has(index)) {
        return null;
      }
      return {
        x: padding + (innerWidth * index) / totalPoints,
        label: item.bucket,
      };
    })
    .filter(Boolean);

  const yTicks = Array.from({ length: LINE_CHART_Y_TICK_COUNT }, (_, index) => {
    if (LINE_CHART_Y_TICK_COUNT <= 1) {
      return {
        y: padding,
        value: maxHits,
      };
    }
    const ratio = index / (LINE_CHART_Y_TICK_COUNT - 1);
    return {
      y: padding + innerHeight * ratio,
      value: Math.round(maxHits * (1 - ratio)),
    };
  });

  return {
    points,
    linePath,
    areaPath,
    maxHits,
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
