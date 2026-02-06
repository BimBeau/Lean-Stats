import { __, _n } from "@wordpress/i18n";

import useAdminEndpoint from "../api/useAdminEndpoint";
import DataState from "../components/DataState";
import LsCard from "../components/LsCard";
const DeviceSplit = ({ range }) => {
  const { data, isLoading, error } = useAdminEndpoint(
    "/admin/device-split",
    range,
  );
  const items = data?.items || [];
  const labeledItems = items.map((item) => {
    const normalizedLabel = item.label
      ? item.label.toLowerCase()
      : "";
    const translatedLabel =
      normalizedLabel === "desktop"
        ? __("Desktop", "lean-stats")
        : null;

    return {
      ...item,
      label: translatedLabel
        ? translatedLabel
        : item.label
          ? item.label.charAt(0).toUpperCase() + item.label.slice(1)
          : __("Unknown", "lean-stats"),
    };
  });
  const maxHits = labeledItems.reduce(
    (max, item) => Math.max(max, item.hits),
    0,
  );

  return (
    <LsCard title={__("Device page views", "lean-stats")}>
      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && labeledItems.length === 0}
        emptyLabel={__("No device data available.", "lean-stats")}
        loadingLabel={__("Loading device breakdown…", "lean-stats")}
      />
      {!isLoading && !error && labeledItems.length > 0 && (
        <div className="ls-device-breakdown">
          {labeledItems.map((entry) => {
            const percent = maxHits
              ? Math.round((entry.hits / maxHits) * 100)
              : 0;
            return (
              <div key={entry.label} className="ls-device-breakdown__row">
                <div className="ls-device-breakdown__label">{entry.label}</div>
                <div className="ls-device-breakdown__bar" aria-hidden="true">
                  <div
                    className="ls-device-breakdown__bar-fill"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="ls-device-breakdown__value">
                  {`${entry.hits} ${_n(
                    "view",
                    "views",
                    entry.hits,
                    "lean-stats",
                  )}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </LsCard>
  );
};

export default DeviceSplit;
