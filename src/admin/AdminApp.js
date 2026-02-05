/**
 * Admin application shell for Lean Stats.
 */

import { useEffect, useMemo } from "@wordpress/element";
import { Notice } from "@wordpress/components";
import { __ } from "@wordpress/i18n";

import { ADMIN_CONFIG } from "./constants";
import {
  createLogger,
  createTraceId,
  getRuntimeDiagnostics,
  setupGlobalErrorHandlers,
} from "./logger";
import {
  getCurrentPanelTitle,
  getPanelComponent,
  normalizePanels,
} from "./panels/registry";

const AdminApp = () => {
  const debugEnabled = Boolean(
    window.LEAN_STATS_DEBUG ?? ADMIN_CONFIG?.settings?.debugEnabled,
  );
  const logger = useMemo(() => createLogger({ debugEnabled }), [debugEnabled]);

  const panels = normalizePanels(ADMIN_CONFIG?.panels);
  const currentPanel = ADMIN_CONFIG?.currentPanel || "dashboard";
  const PanelComponent = getPanelComponent(currentPanel);
  const panelTitle = getCurrentPanelTitle(currentPanel, panels);
  const pluginLabel =
    ADMIN_CONFIG?.settings?.pluginLabel || __("Lean Stats", "lean-stats");

  useEffect(() => {
    setupGlobalErrorHandlers(logger);
    logger.info("Loading admin interface", {
      action: "admin.init",
      traceId: createTraceId(),
      context: getRuntimeDiagnostics(),
    });
  }, [logger]);

  if (!ADMIN_CONFIG) {
    return (
      <Notice status="error" isDismissible={false}>
        {__("Missing admin configuration.", "lean-stats")}
      </Notice>
    );
  }

  return (
    <div className="ls-admin-app">
      <h1>{pluginLabel}</h1>
      {!PanelComponent ? (
        <Notice status="warning" isDismissible={false}>
          {__("No panel available for this screen.", "lean-stats")}
        </Notice>
      ) : (
        <PanelComponent panel={{ name: currentPanel, title: panelTitle }} />
      )}
    </div>
  );
};

export default AdminApp;
