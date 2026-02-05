import { __ } from "@wordpress/i18n";

import { DEFAULT_PANELS } from "../constants";
import GeolocationPanel from "./GeolocationPanel";
import OverviewPanel from "./OverviewPanel";
import ReferrerSourcesPanel from "./ReferrerSourcesPanel";
import SearchTermsPanel from "./SearchTermsPanel";
import SettingsPanel from "./SettingsPanel";
import TopPagesPanel from "./TopPagesPanel";

const normalizePanels = (panels) => {
  if (!Array.isArray(panels)) {
    return DEFAULT_PANELS;
  }

  const normalized = panels
    .map((panel) => ({
      name: panel?.name || "",
      title: panel?.title || panel?.name || "",
    }))
    .filter((panel) => panel.name);

  return normalized.length > 0 ? normalized : DEFAULT_PANELS;
};

const getCurrentPanelTitle = (panelName, panels) => {
  const match = panels.find((panel) => panel.name === panelName);
  return match?.title || __("Lean Stats", "lean-stats");
};

const getPanelComponent = (name) => {
  const corePanels = {
    dashboard: OverviewPanel,
    "top-pages": TopPagesPanel,
    referrers: ReferrerSourcesPanel,
    "search-terms": SearchTermsPanel,
    geolocation: GeolocationPanel,
    settings: SettingsPanel,
  };

  if (corePanels[name]) {
    return corePanels[name];
  }

  const registry = window.LeanStatsAdminPanels || {};
  return registry[name] || null;
};

export { getCurrentPanelTitle, getPanelComponent, normalizePanels };
