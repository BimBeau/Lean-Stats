import { __ } from "@wordpress/i18n";
import { TabPanel } from "@wordpress/components";
import ReportPanel from "./ReportPanel";
import GeoCountriesPanel from "./GeoCountriesPanel";

const GeolocationPanel = () => {
  const emptyCityLabel = __(
    "No city data available. Geolocation aggregation may be disabled.",
    "lean-stats",
  );

  const tabs = [
    { name: "countries", title: __("Top countries", "lean-stats") },
    { name: "cities", title: __("Top cities", "lean-stats") },
  ];

  return (
    <TabPanel className="ls-geolocation-tabs" tabs={tabs}>
      {(tab) => {
        if (tab.name === "countries") {
          return <GeoCountriesPanel />;
        }

        if (tab.name === "cities") {
          return (
            <ReportPanel
              title={__("Top cities", "lean-stats")}
              labelHeader={__("City", "lean-stats")}
              endpoint="/geo-cities"
              emptyLabel={emptyCityLabel}
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
