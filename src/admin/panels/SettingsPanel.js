import { useEffect, useMemo, useState } from "@wordpress/element";
import { __, sprintf } from "@wordpress/i18n";
import {
  Button,
  Card,
  CardBody,
  CheckboxControl,
  Modal,
  Notice,
  TabPanel,
  TextControl,
  TextareaControl,
  ToggleControl,
} from "@wordpress/components";

import useAdminEndpoint, { buildRestUrl } from "../api/useAdminEndpoint";
import DataState from "../components/DataState";
import LsCard from "../components/LsCard";
import { ADMIN_CONFIG, DEFAULT_SETTINGS } from "../constants";
import { createLogger, createTraceId } from "../logger";
import { formatLogTimestamp } from "../lib/date";

const DEBUG_FLAG = Boolean(
  window.LEAN_STATS_DEBUG ?? ADMIN_CONFIG?.settings?.debugEnabled,
);

const normalizeSettings = (settings) => {
  const normalized = {
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
  };
  const debugEnabled = Boolean(
    normalized.debug_enabled || normalized.raw_logs_enabled,
  );

  return {
    ...normalized,
    debug_enabled: debugEnabled,
    raw_logs_enabled: debugEnabled,
  };
};

const SettingsLogsTab = ({ debugEnabled }) => {
  const { data, isLoading, error } = useAdminEndpoint(
    "/admin/raw-logs",
    { limit: 50 },
    { enabled: debugEnabled },
  );
  const logs = data?.items || [];

  if (!debugEnabled) {
    return (
      <Notice status="warning" isDismissible={false}>
        {__("Enable debug mode to display raw logs.", "lean-stats")}
      </Notice>
    );
  }

  return (
    <div className="ls-settings-logs">
      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && logs.length === 0}
        emptyLabel={__("No raw logs available.", "lean-stats")}
        loadingLabel={__("Loading raw logs…", "lean-stats")}
        skeletonRows={4}
      />
      {!isLoading && !error && logs.length > 0 && (
        <table className="widefat striped ls-settings-logs__table">
          <thead>
            <tr>
              <th>{__("Date", "lean-stats")}</th>
              <th>{__("Page", "lean-stats")}</th>
              <th>{__("Referrer", "lean-stats")}</th>
              <th>{__("Device", "lean-stats")}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr key={`${log.timestamp_bucket}-${index}`}>
                <td>{formatLogTimestamp(log.timestamp_bucket)}</td>
                <td>{log.page_path}</td>
                <td>{log.referrer_domain || __("Direct", "lean-stats")}</td>
                <td>{log.device_class || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const SettingsPanel = () => {
  const { data, isLoading, error } = useAdminEndpoint("/admin/settings");
  const [formState, setFormState] = useState(DEFAULT_SETTINGS);
  const [allowlistInput, setAllowlistInput] = useState("");
  const [excludedPathsInput, setExcludedPathsInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [isPurgeOpen, setIsPurgeOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeNotice, setPurgeNotice] = useState(null);
  const logger = useMemo(() => createLogger({ debugEnabled: DEBUG_FLAG }), []);
  const debugEnabled = Boolean(formState.debug_enabled);
  const validateMaxMindFields = (nextState) => {
    if (!nextState.geo_aggregation_enabled) {
      return {};
    }
    const errors = {};
    const accountId = String(nextState.maxmind_account_id || "").trim();
    const licenseKey = String(nextState.maxmind_license_key || "").trim();

    if (!accountId) {
      errors.maxmind_account_id = __(
        "MaxMind Account ID is required.",
        "lean-stats",
      );
    } else if (!/^\d+$/.test(accountId)) {
      errors.maxmind_account_id = __(
        "MaxMind Account ID must be numeric.",
        "lean-stats",
      );
    }

    if (!licenseKey) {
      errors.maxmind_license_key = __(
        "MaxMind License Key is required.",
        "lean-stats",
      );
    }

    return errors;
  };

  useEffect(() => {
    if (data?.settings) {
      const normalized = normalizeSettings(data.settings);
      setFormState(normalized);
      setAllowlistInput(normalized.url_query_allowlist.join(", "));
      setExcludedPathsInput(normalized.excluded_paths.join("\n"));
      window.LEAN_STATS_DEBUG = Boolean(normalized.debug_enabled);
      setValidationErrors({});
    }
  }, [data]);

  const onSave = async () => {
    if (!ADMIN_CONFIG?.restNonce || !ADMIN_CONFIG?.restUrl) {
      setSaveNotice({
        status: "error",
        message: __("Missing REST configuration.", "lean-stats"),
      });
      return;
    }

    const errors = validateMaxMindFields(formState);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setSaveNotice({
        status: "error",
        message: Object.values(errors).join(" "),
      });
      return;
    }

    setIsSaving(true);
    setSaveNotice(null);
    const traceId = createTraceId();
    logger.info("Saving settings", {
      action: "settings.save",
      traceId,
    });

    try {
      const response = await fetch(buildRestUrl("/admin/settings"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": ADMIN_CONFIG.restNonce,
        },
        body: JSON.stringify(formState),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (payload?.data?.field_errors) {
          setValidationErrors(payload.data.field_errors);
        }
        throw new Error(
          payload?.message ||
            `${__("API error", "lean-stats")} (${response.status})`,
        );
      }

      if (payload?.settings) {
        const normalized = normalizeSettings(payload.settings);
        setFormState(normalized);
        setAllowlistInput(normalized.url_query_allowlist.join(", "));
        setExcludedPathsInput(normalized.excluded_paths.join("\n"));
        window.LEAN_STATS_DEBUG = Boolean(normalized.debug_enabled);
        setValidationErrors({});
      }

      setSaveNotice({
        status: "success",
        message: __("Settings saved.", "lean-stats"),
      });
      logger.info("Settings saved", {
        action: "settings.save.success",
        traceId,
      });
    } catch (saveError) {
      setSaveNotice({
        status: "error",
        message: saveError.message || __("Error while saving.", "lean-stats"),
      });
      logger.error("Settings save error", {
        action: "settings.save.error",
        traceId,
        error: saveError?.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onPurge = async () => {
    if (!ADMIN_CONFIG?.restNonce || !ADMIN_CONFIG?.restUrl) {
      setPurgeNotice({
        status: "error",
        message: __("Missing REST configuration.", "lean-stats"),
      });
      return;
    }

    setIsPurging(true);
    setPurgeNotice(null);
    const traceId = createTraceId();
    logger.info("Purging analytics data", {
      action: "settings.purge",
      traceId,
    });

    try {
      const response = await fetch(buildRestUrl("/admin/purge-data"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": ADMIN_CONFIG.restNonce,
        },
      });

      if (!response.ok) {
        throw new Error(
          `${__("API error", "lean-stats")} (${response.status})`,
        );
      }

      await response.json();
      setPurgeNotice({
        status: "success",
        message: __("Analytics data purged.", "lean-stats"),
      });
      logger.info("Analytics data purged", {
        action: "settings.purge.success",
        traceId,
      });
    } catch (purgeError) {
      setPurgeNotice({
        status: "error",
        message: purgeError.message || __("Error while purging.", "lean-stats"),
      });
      logger.error("Purge error", {
        action: "settings.purge.error",
        traceId,
        error: purgeError?.message,
      });
    } finally {
      setIsPurging(false);
      setIsPurgeOpen(false);
    }
  };

  const roles = ADMIN_CONFIG?.roles || [];
  const settingsTabs = [
    { name: "general", title: __("General", "lean-stats") },
    ...(debugEnabled
      ? [{ name: "logs", title: __("Logs", "lean-stats") }]
      : []),
  ];

  return (
    <LsCard title={__("Settings", "lean-stats")}>
      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={false}
        emptyLabel=""
        loadingLabel={__("Loading settings…", "lean-stats")}
        skeletonRows={6}
      />
      {!isLoading && !error && (
        <TabPanel tabs={settingsTabs}>
          {(tab) => {
            if (tab.name === "logs") {
              return <SettingsLogsTab debugEnabled={debugEnabled} />;
            }

            return (
              <div className="ls-settings-form">
                {saveNotice && (
                  <Notice status={saveNotice.status} isDismissible={false}>
                    {saveNotice.message}
                  </Notice>
                )}
                {purgeNotice && (
                  <Notice status={purgeNotice.status} isDismissible={false}>
                    {purgeNotice.message}
                  </Notice>
                )}
                <Card className="ls-settings-section">
                  <CardBody>
                    <h3 className="ls-settings-section__title">
                      {__("General", "lean-stats")}
                    </h3>
                    <TextControl
                      label={__(
                        "Plugin name (menu and dashboard)",
                        "lean-stats",
                      )}
                      help={__(
                        'Leave blank to use "Lean Stats".',
                        "lean-stats",
                      )}
                      value={formState.plugin_label}
                      onChange={(value) =>
                        setFormState((prev) => ({
                          ...prev,
                          plugin_label: value,
                        }))
                      }
                    />
                  </CardBody>
                </Card>
                <Card className="ls-settings-section">
                  <CardBody>
                    <h3 className="ls-settings-section__title">
                      {__("Geolocation", "lean-stats")}
                    </h3>
                    <p>
                      {__(
                        "Geolocation aggregation requires MaxMind GeoLite credentials.",
                        "lean-stats",
                      )}
                    </p>
                    <ToggleControl
                      label={__("Enable geolocation aggregation", "lean-stats")}
                      help={__(
                        "Aggregates country, region, and city data in analytics dashboards.",
                        "lean-stats",
                      )}
                      checked={Boolean(formState.geo_aggregation_enabled)}
                      onChange={(value) => {
                        setFormState((prev) => ({
                          ...prev,
                          geo_aggregation_enabled: value,
                        }));
                        if (!value) {
                          setValidationErrors((prev) => ({
                            ...prev,
                            maxmind_account_id: null,
                            maxmind_license_key: null,
                          }));
                        }
                      }}
                    />
                    <TextControl
                      label={__("MaxMind Account ID", "lean-stats")}
                      type="text"
                      disabled={!formState.geo_aggregation_enabled}
                      help={
                        validationErrors.maxmind_account_id ||
                        __(
                          "Numeric Account ID for MaxMind IP geolocation.",
                          "lean-stats",
                        )
                      }
                      value={formState.maxmind_account_id}
                      onChange={(value) => {
                        setFormState((prev) => ({
                          ...prev,
                          maxmind_account_id: value,
                        }));
                        if (validationErrors.maxmind_account_id) {
                          setValidationErrors((prev) => ({
                            ...prev,
                            maxmind_account_id: null,
                          }));
                        }
                      }}
                      isInvalid={Boolean(validationErrors.maxmind_account_id)}
                    />
                    <TextControl
                      label={__("MaxMind License Key", "lean-stats")}
                      type="password"
                      disabled={!formState.geo_aggregation_enabled}
                      help={
                        validationErrors.maxmind_license_key ||
                        __(
                          "License Key for MaxMind IP geolocation.",
                          "lean-stats",
                        )
                      }
                      value={formState.maxmind_license_key}
                      onChange={(value) => {
                        setFormState((prev) => ({
                          ...prev,
                          maxmind_license_key: value,
                        }));
                        if (validationErrors.maxmind_license_key) {
                          setValidationErrors((prev) => ({
                            ...prev,
                            maxmind_license_key: null,
                          }));
                        }
                      }}
                      isInvalid={Boolean(validationErrors.maxmind_license_key)}
                    />
                  </CardBody>
                </Card>
                <Card className="ls-settings-section">
                  <CardBody>
                    <h3 className="ls-settings-section__title">
                      {__("Privacy & consent", "lean-stats")}
                    </h3>
                    <ToggleControl
                      label={__("Respect DNT / GPC", "lean-stats")}
                      help={__(
                        "Ignore tracking if the browser sends DNT or GPC.",
                        "lean-stats",
                      )}
                      checked={formState.respect_dnt_gpc}
                      onChange={(value) =>
                        setFormState((prev) => ({
                          ...prev,
                          respect_dnt_gpc: value,
                        }))
                      }
                    />
                    <ToggleControl
                      label={__("Debug mode", "lean-stats")}
                      help={__(
                        "Enables detailed console logs and raw log capture.",
                        "lean-stats",
                      )}
                      checked={formState.debug_enabled}
                      onChange={(value) =>
                        setFormState((prev) => ({
                          ...prev,
                          debug_enabled: value,
                          raw_logs_enabled: value,
                        }))
                      }
                    />
                    <TextControl
                      label={__("Retention window (days)", "lean-stats")}
                      type="number"
                      min={1}
                      max={365}
                      value={String(formState.raw_logs_retention_days)}
                      help={__(
                        "Raw logs purge automatically after the configured window.",
                        "lean-stats",
                      )}
                      onChange={(value) => {
                        const next = Number.parseInt(value, 10);
                        setFormState((prev) => ({
                          ...prev,
                          raw_logs_retention_days: Number.isNaN(next)
                            ? prev.raw_logs_retention_days
                            : next,
                        }));
                      }}
                    />
                  </CardBody>
                </Card>
                <Card className="ls-settings-section">
                  <CardBody>
                    <h3 className="ls-settings-section__title">
                      {__("URL cleaning", "lean-stats")}
                    </h3>
                    <ToggleControl
                      label={__("Strip query parameters", "lean-stats")}
                      help={__(
                        "Remove query parameters from tracked URLs.",
                        "lean-stats",
                      )}
                      checked={formState.url_strip_query}
                      onChange={(value) =>
                        setFormState((prev) => ({
                          ...prev,
                          url_strip_query: value,
                        }))
                      }
                    />
                    <TextControl
                      label={__("Query parameter allowlist", "lean-stats")}
                      help={__(
                        "Comma-separated list of allowed query keys (used for URL tracking and UTM aggregation).",
                        "lean-stats",
                      )}
                      value={allowlistInput}
                      onChange={(value) => {
                        setAllowlistInput(value);
                        const parsed = value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean);
                        setFormState((prev) => ({
                          ...prev,
                          url_query_allowlist: parsed,
                        }));
                      }}
                    />
                  </CardBody>
                </Card>
                <Card className="ls-settings-section">
                  <CardBody>
                    <h3 className="ls-settings-section__title">
                      {__("Exclusions", "lean-stats")}
                    </h3>
                    <TextareaControl
                      label={__("Excluded paths", "lean-stats")}
                      help={__(
                        "One per line or comma-separated (e.g., /privacy, /account).",
                        "lean-stats",
                      )}
                      value={excludedPathsInput}
                      onChange={(value) => {
                        setExcludedPathsInput(value);
                        const parsed = value
                          .split(/[\n,]+/)
                          .map((item) => item.trim())
                          .filter(Boolean);
                        setFormState((prev) => ({
                          ...prev,
                          excluded_paths: parsed,
                        }));
                      }}
                    />
                    <div>
                      <p className="ls-settings-roles__title">
                        {__("Role exclusions", "lean-stats")}
                      </p>
                      <p>
                        {__(
                          "Select roles to exclude from tracking. Select all roles to ignore all logged-in users.",
                          "lean-stats",
                        )}
                      </p>
                      <div className="ls-settings-roles__list">
                        {roles.length === 0 && (
                          <p>{__("No roles available.", "lean-stats")}</p>
                        )}
                        {roles.map((role) => (
                          <CheckboxControl
                            key={role.key}
                            label={role.label}
                            checked={formState.excluded_roles.includes(
                              role.key,
                            )}
                            onChange={(isChecked) => {
                              setFormState((prev) => {
                                const nextRoles = new Set(prev.excluded_roles);
                                if (isChecked) {
                                  nextRoles.add(role.key);
                                } else {
                                  nextRoles.delete(role.key);
                                }
                                return {
                                  ...prev,
                                  excluded_roles: Array.from(nextRoles),
                                };
                              });
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </CardBody>
                </Card>
                <Card className="ls-settings-section">
                  <CardBody>
                    <h3 className="ls-settings-section__title">
                      {__("Data management", "lean-stats")}
                    </h3>
                    <p>
                      {__(
                        "Remove all aggregated analytics and raw log entries.",
                        "lean-stats",
                      )}
                    </p>
                    <Button
                      variant="secondary"
                      isDestructive
                      onClick={() => setIsPurgeOpen(true)}
                    >
                      {__("Purge analytics data", "lean-stats")}
                    </Button>
                  </CardBody>
                </Card>
                <Button
                  variant="primary"
                  isBusy={isSaving}
                  onClick={onSave}
                  aria-label={__("Save settings", "lean-stats")}
                >
                  {__("Save", "lean-stats")}
                </Button>
                {isPurgeOpen && (
                  <Modal
                    title={__("Confirm data purge", "lean-stats")}
                    onRequestClose={() => setIsPurgeOpen(false)}
                  >
                    <p>
                      {__(
                        "This action permanently removes all stored analytics and raw logs. Settings remain unchanged.",
                        "lean-stats",
                      )}
                    </p>
                    <div className="ls-settings-modal__actions">
                      <Button
                        variant="secondary"
                        onClick={() => setIsPurgeOpen(false)}
                      >
                        {__("Cancel", "lean-stats")}
                      </Button>
                      <Button
                        variant="primary"
                        isDestructive
                        isBusy={isPurging}
                        onClick={onPurge}
                      >
                        {__("Purge now", "lean-stats")}
                      </Button>
                    </div>
                  </Modal>
                )}
              </div>
            );
          }}
        </TabPanel>
      )}
    </LsCard>
  );
};

export default SettingsPanel;
