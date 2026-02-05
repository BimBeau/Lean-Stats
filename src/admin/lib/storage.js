import {
  ADMIN_CONFIG,
  PAGE_LABEL_DISPLAY_OPTIONS,
  PAGE_LABEL_DISPLAY_STORAGE_PREFIX,
  RANGE_PRESET_OPTIONS,
  RANGE_PRESET_STORAGE_PREFIX,
} from "../constants";

const normalizeRangePreset = (preset) =>
  RANGE_PRESET_OPTIONS.includes(preset) ? preset : null;

const normalizePageLabelDisplay = (mode) =>
  PAGE_LABEL_DISPLAY_OPTIONS.includes(mode) ? mode : null;

export const getRangePresetStorageKey = () => {
  const userId = ADMIN_CONFIG?.currentUserId
    ? String(ADMIN_CONFIG.currentUserId)
    : "default";
  return `${RANGE_PRESET_STORAGE_PREFIX}:${userId}`;
};

export const getRangePresetFromUrl = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  return normalizeRangePreset(params.get("period") || params.get("range"));
};

export const getStoredRangePreset = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  try {
    return normalizeRangePreset(
      window.localStorage.getItem(getRangePresetStorageKey()),
    );
  } catch (error) {
    return null;
  }
};

export const storeRangePreset = (preset) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(getRangePresetStorageKey(), preset);
  } catch (error) {
    // Ignore storage failures (e.g. privacy mode).
  }
};

export const isValidRangePreset = (preset) =>
  Boolean(normalizeRangePreset(preset));

export const getPageLabelDisplayStorageKey = () => {
  const userId = ADMIN_CONFIG?.currentUserId
    ? String(ADMIN_CONFIG.currentUserId)
    : "default";
  return `${PAGE_LABEL_DISPLAY_STORAGE_PREFIX}:${userId}`;
};

export const getStoredPageLabelDisplay = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  try {
    return normalizePageLabelDisplay(
      window.localStorage.getItem(getPageLabelDisplayStorageKey()),
    );
  } catch (error) {
    return null;
  }
};

export const storePageLabelDisplay = (mode) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(getPageLabelDisplayStorageKey(), mode);
  } catch (error) {
    // Ignore storage failures (e.g. privacy mode).
  }
};

export const isValidPageLabelDisplay = (mode) =>
  Boolean(normalizePageLabelDisplay(mode));
