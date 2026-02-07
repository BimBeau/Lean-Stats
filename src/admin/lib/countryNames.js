import { __ } from "@wordpress/i18n";

import countryNamesFr from "../data/country-names-fr.json";

const UNKNOWN_CODES = new Set(["", "XX", "UNKNOWN"]);

const getAdminLocale = () => {
  if (typeof document !== "undefined" && document.documentElement?.lang) {
    return document.documentElement.lang;
  }

  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }

  return "en";
};

const getDisplayNames = (locale) => {
  if (typeof Intl === "undefined" || typeof Intl.DisplayNames !== "function") {
    return null;
  }

  try {
    return new Intl.DisplayNames([locale], { type: "region" });
  } catch (error) {
    return null;
  }
};

export const getCountryLabel = (code) => {
  const normalized = typeof code === "string" ? code.trim().toUpperCase() : "";
  if (!normalized || UNKNOWN_CODES.has(normalized)) {
    return __("Unknown country", "lean-stats");
  }

  const locale = getAdminLocale();
  const displayNames = getDisplayNames(locale);
  if (displayNames) {
    const label = displayNames.of(normalized);
    if (label && label !== normalized) {
      return label;
    }
  }

  if (locale.toLowerCase().startsWith("fr")) {
    return countryNamesFr[normalized] || __("Unknown country", "lean-stats");
  }

  return normalized;
};
