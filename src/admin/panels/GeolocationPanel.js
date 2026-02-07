import { __ } from "@wordpress/i18n";
import { TabPanel } from "@wordpress/components";
import ReportPanel from "./ReportPanel";
import {
  getCountryFlagClass,
  getCountryLabel,
  isUnknownCountryCode,
} from "../lib/countryNames";
const GeolocationPanel = () => {
  const tabs = [
    { name: "countries", title: __("Top countries", "lean-stats") },
    { name: "cities", title: __("Top cities", "lean-stats") },
  ];

  const renderCountryLabel = (label, item) => {
    const flagClass = getCountryFlagClass(item?.label);
    const isUnknown = !flagClass || isUnknownCountryCode(item?.label);

    return (
      <span className="ls-country-label">
        {isUnknown ? (
          <span
            className="ls-country-flag ls-country-flag--unknown"
            aria-hidden="true"
          />
        ) : (
          <span className={`ls-country-flag ${flagClass}`} aria-hidden="true" />
        )}
        <span>{label}</span>
      </span>
    );
  };

  return (
    <TabPanel className="ls-geolocation-tabs" tabs={tabs}>
      {(tab) => {
        if (tab.name === "countries") {
          return (
            <ReportPanel
              title={__("Top countries", "lean-stats")}
              labelHeader={__("Country", "lean-stats")}
              endpoint="/geo-countries"
              emptyLabel={__("No country data available.", "lean-stats")}
              labelFallback={__("Unknown country", "lean-stats")}
              formatLabel={getCountryLabel}
              renderLabel={renderCountryLabel}
            />
          );
        }

        if (tab.name === "cities") {
          return (
            <ReportPanel
              title={__("Top cities", "lean-stats")}
              labelHeader={__("City", "lean-stats")}
              endpoint="/geo-cities"
              emptyLabel={__("No city data available.", "lean-stats")}
              labelFallback={__("Unknown", "lean-stats")}
            />
          );
        }

        return null;
      }}
    </TabPanel>
  );
};

export default GeolocationPanel;
