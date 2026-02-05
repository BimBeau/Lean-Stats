import { useEffect, useMemo, useState } from "@wordpress/element";
import { __, sprintf } from "@wordpress/i18n";

import { ADMIN_CONFIG } from "../constants";
import { createLogger, createTraceId } from "../logger";

const DEBUG_FLAG = () =>
  Boolean(window.LEAN_STATS_DEBUG ?? ADMIN_CONFIG?.settings?.debugEnabled);

export const buildRestUrl = (path, params, namespace) => {
  const base = ADMIN_CONFIG?.restUrl ? `${ADMIN_CONFIG.restUrl}` : "";
  const resolvedNamespace =
    namespace ?? (ADMIN_CONFIG?.settings?.restInternalNamespace || "");
  const url = new URL(`${resolvedNamespace}${path}`, base);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }

  return url.toString();
};

const useAdminEndpoint = (path, params, options = {}) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const paramsKey = useMemo(() => JSON.stringify(params ?? {}), [params]);
  const logger = useMemo(() => createLogger({ debugEnabled: DEBUG_FLAG }), []);
  const {
    enabled = true,
    namespace = ADMIN_CONFIG?.settings?.restInternalNamespace,
  } = options;

  useEffect(() => {
    if (!enabled || !path) {
      setIsLoading(false);
      setError(null);
      setData(null);
      return undefined;
    }

    let isMounted = true;
    const controller = new AbortController();
    const traceId = createTraceId();

    const fetchData = async () => {
      if (!ADMIN_CONFIG?.restNonce || !ADMIN_CONFIG?.restUrl) {
        setError(__("Missing REST configuration.", "lean-stats"));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      logger.debug("Loading admin data", {
        action: "admin.fetch",
        traceId,
        path,
        params,
      });

      try {
        const response = await fetch(buildRestUrl(path, params, namespace), {
          signal: controller.signal,
          headers: {
            "X-WP-Nonce": ADMIN_CONFIG.restNonce,
          },
        });

        if (!response.ok) {
          throw new Error(
            sprintf(__("API error (%s)", "lean-stats"), response.status),
          );
        }

        const payload = await response.json();
        if (isMounted) {
          setData(payload);
        }
        logger.debug("Admin data received", {
          action: "admin.fetch.success",
          traceId,
          path,
        });
      } catch (fetchError) {
        if (isMounted && fetchError.name !== "AbortError") {
          setError(fetchError.message || __("Loading error.", "lean-stats"));
          logger.error("Admin load error", {
            action: "admin.fetch.error",
            traceId,
            path,
            error: fetchError?.message,
          });
        } else if (fetchError.name === "AbortError") {
          logger.debug("Admin load cancelled", {
            action: "admin.fetch.abort",
            traceId,
            path,
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [path, paramsKey, enabled]);

  return { data, isLoading, error };
};

export default useAdminEndpoint;
