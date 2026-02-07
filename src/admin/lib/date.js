export const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatLogTimestamp = (timestamp) => {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
};

export const getRangeFromPreset = (preset) => {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);

  switch (preset) {
    case "7d":
      start.setDate(start.getDate() - 6);
      break;
    case "30d":
      start.setDate(start.getDate() - 29);
      break;
    case "90d":
      start.setDate(start.getDate() - 89);
      break;
    default:
      start.setDate(start.getDate() - 29);
  }

  return {
    start: formatDate(start),
    end: formatDate(end),
  };
};

export const getPreviousRange = (range) => {
  if (!range?.start || !range?.end) {
    return null;
  }

  const startDate = new Date(`${range.start}T00:00:00`);
  const endDate = new Date(`${range.end}T00:00:00`);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  const dayInMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(
    1,
    Math.round((endDate - startDate) / dayInMs) + 1,
  );
  const previousEnd = new Date(startDate.getTime() - dayInMs);
  const previousStart = new Date(
    previousEnd.getTime() - (totalDays - 1) * dayInMs,
  );

  return {
    start: formatDate(previousStart),
    end: formatDate(previousEnd),
  };
};
