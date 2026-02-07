import { __ } from "@wordpress/i18n";
import { TabPanel } from "@wordpress/components";
import ReportPanel from "./ReportPanel";
const GeolocationPanel = () => {
  const tabs = [
    { name: "countries", title: __("Top countries", "lean-stats") },
    { name: "cities", title: __("Top cities", "lean-stats") },
  ];

  return (
    <TabPanel className="ls-geolocation-tabs" tabs={tabs}>
      {(tab) => {
        if (tab.name === "countries") {
          return (
            <ReportPanel
              title={__("Top countries", "lean-stats")}
              labelHeader={__("Country code", "lean-stats")}
              endpoint="/geo-countries"
              emptyLabel={__("No country data available.", "lean-stats")}
              labelFallback="--"
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
