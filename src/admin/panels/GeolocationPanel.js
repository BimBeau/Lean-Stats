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
        <Notice status="warning" isDismissible={false}>
          {location.error}
        </Notice>
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
