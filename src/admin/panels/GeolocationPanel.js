import { __ } from "@wordpress/i18n";
import { Notice } from "@wordpress/components";

import useAdminEndpoint from "../api/useAdminEndpoint";
import DataState from "../components/DataState";
import LsCard from "../components/LsCard";
const GeolocationPanel = () => {
  const { data, isLoading, error } = useAdminEndpoint("/admin/geolocation");
  const location = data?.location || null;
  const hasLocation = location && !location.error;
  const sourceLabel = __("MaxMind API", "lean-stats");
  const errorDetails = location?.details || null;
  const detailItems = [
    { label: __("IP address", "lean-stats"), value: location?.ip },
    { label: __("HTTP status", "lean-stats"), value: errorDetails?.status },
    { label: __("MaxMind error code", "lean-stats"), value: errorDetails?.error_code },
    {
      label: __("MaxMind error message", "lean-stats"),
      value: errorDetails?.error_message,
    },
    { label: __("Request ID", "lean-stats"), value: errorDetails?.request_id },
    {
      label: __("Response excerpt", "lean-stats"),
      value: errorDetails?.response_excerpt,
    },
  ].filter((item) => item.value);
  const hasDetails = detailItems.length > 0;

  return (
    <LsCard title={__("Geolocation", "lean-stats")}>
      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && !hasLocation}
        emptyLabel={__("No geolocation data available.", "lean-stats")}
        loadingLabel={__("Looking up location…", "lean-stats")}
        skeletonRows={4}
      />
      {!isLoading && !error && location?.error && (
        <>
          <Notice status="warning" isDismissible={false}>
            {location.error}
          </Notice>
          {hasDetails && (
            <details>
              <summary>{__("MaxMind API diagnostics", "lean-stats")}</summary>
              <table className="widefat striped">
                <tbody>
                  {detailItems.map((item) => (
                    <tr key={item.label}>
                      <th>{item.label}</th>
                      <td>{item.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </>
      )}
      {!isLoading && !error && hasLocation && (
        <>
          <p>
            {__(
              "Location is derived from the current request IP and is not stored.",
              "lean-stats",
            )}
          </p>
          <table className="widefat striped">
            <tbody>
              <tr>
                <th>{__("IP address", "lean-stats")}</th>
                <td>{location.ip}</td>
              </tr>
              <tr>
                <th>{__("Country", "lean-stats")}</th>
                <td>{location.country || __("Unavailable", "lean-stats")}</td>
              </tr>
              <tr>
                <th>{__("Region", "lean-stats")}</th>
                <td>{location.region || __("Unavailable", "lean-stats")}</td>
              </tr>
              <tr>
                <th>{__("City", "lean-stats")}</th>
                <td>{location.city || __("Unavailable", "lean-stats")}</td>
              </tr>
              <tr>
                <th>{__("Source", "lean-stats")}</th>
                <td>{sourceLabel}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </LsCard>
  );
};

export default GeolocationPanel;
