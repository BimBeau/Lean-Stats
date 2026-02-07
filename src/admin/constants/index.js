import { __ } from "@wordpress/i18n";

export const ADMIN_CONFIG = window.LeanStatsAdmin || null;

export const DEFAULT_PANELS = [
  { name: "dashboard", title: __("Dashboard", "lean-stats") },
  { name: "top-pages", title: __("Pages", "lean-stats") },
  { name: "referrers", title: __("Referring sites", "lean-stats") },
  { name: "search-terms", title: __("Internal searches", "lean-stats") },
  { name: "geolocation", title: __("Geolocation", "lean-stats") },
  { name: "settings", title: __("Settings", "lean-stats") },
];

export const DEFAULT_SETTINGS = {
  plugin_label: "",
  respect_dnt_gpc: true,
  url_strip_query: true,
  url_query_allowlist: [],
  raw_logs_enabled: false,
  raw_logs_retention_days: 1,
  excluded_roles: [],
  excluded_paths: [],
  debug_enabled: false,
  geo_aggregation_enabled: true,
  maxmind_account_id: "",
  maxmind_license_key: "",
};

export const DEFAULT_RANGE_PRESET = "30d";
export const RANGE_PRESET_OPTIONS = ["7d", "30d", "90d"];
export const RANGE_PRESET_STORAGE_PREFIX = "lean_stats_range_preset";
export const PERIOD_PRESET_OPTIONS = [
  { label: __("7 days", "lean-stats"), value: "7d" },
  { label: __("30 days", "lean-stats"), value: "30d" },
  { label: __("90 days", "lean-stats"), value: "90d" },
];

export const PAGE_LABEL_DISPLAY_OPTIONS = ["url", "title"];
export const DEFAULT_PAGE_LABEL_DISPLAY = "url";
export const PAGE_LABEL_DISPLAY_STORAGE_PREFIX =
  "lean_stats_page_label_display";
