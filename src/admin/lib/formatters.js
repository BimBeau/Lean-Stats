export const truncatePageTitle = (title) => {
  if (typeof title !== "string") {
    return "";
  }

  return title.length > 40 ? `${title.slice(0, 40)}...` : title;
};

export const calculateChangePercent = (current, previous) => {
  if (previous === null || previous === undefined) {
    return null;
  }

  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return ((current - previous) / previous) * 100;
};

export const formatChangePercent = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value === 0 || Object.is(value, -0)) {
    return null;
  }

  const formatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
    signDisplay: "exceptZero",
  });

  return `${formatter.format(value)}%`;
};
