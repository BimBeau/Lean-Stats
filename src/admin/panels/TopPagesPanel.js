import { TabPanel } from "@wordpress/components";
import { __ } from "@wordpress/i18n";

import ReportPanel from "./ReportPanel";

const TopPagesReportPanel = () => (
  <ReportPanel
    title={__("Top pages", "lean-stats")}
    labelHeader={__("Url", "lean-stats")}
    endpoint="/top-pages"
    emptyLabel={__("No popular pages available.", "lean-stats")}
    labelFallback="/"
    supportsPageLabelToggle
  />
);

const NotFoundPanel = () => (
  <ReportPanel
    title={__("Top 404s", "lean-stats")}
    labelHeader={__("Url", "lean-stats")}
    endpoint="/404s"
    emptyLabel={__("No missing pages available.", "lean-stats")}
    labelFallback="/"
    supportsPageLabelToggle
  />
);

const EntryPagesPanel = () => (
  <ReportPanel
    title={__("Entry pages (approx.)", "lean-stats")}
    labelHeader={__("Url", "lean-stats")}
    endpoint="/entry-pages"
    emptyLabel={__("No entry pages available.", "lean-stats")}
    labelFallback="/"
    metricLabel={__("Entries (approx.)", "lean-stats")}
    metricKey="entries"
    metricValueKey="entries"
    supportsPageLabelToggle
  />
);

const ExitPagesPanel = () => (
  <ReportPanel
    title={__("Exit pages (approx.)", "lean-stats")}
    labelHeader={__("Url", "lean-stats")}
    endpoint="/exit-pages"
    emptyLabel={__("No exit pages available.", "lean-stats")}
    labelFallback="/"
    metricLabel={__("Exits (approx.)", "lean-stats")}
    metricKey="exits"
    metricValueKey="exits"
    supportsPageLabelToggle
  />
);

const TopPagesPanel = () => {
  const pagesTabs = [
    { name: "top-pages", title: __("Top pages", "lean-stats") },
    { name: "entry-pages", title: __("Entry pages", "lean-stats") },
    { name: "exit-pages", title: __("Exit pages", "lean-stats") },
    {
      name: "not-found",
      title: __("Pages not found (404)", "lean-stats"),
    },
  ];

  return (
    <TabPanel className="ls-pages-tabs" tabs={pagesTabs}>
      {(tab) => {
        if (tab.name === "entry-pages") {
          return <EntryPagesPanel />;
        }
        if (tab.name === "exit-pages") {
          return <ExitPagesPanel />;
        }
        if (tab.name === "not-found") {
          return <NotFoundPanel />;
        }
        return <TopPagesReportPanel />;
      }}
    </TabPanel>
  );
};

export default TopPagesPanel;
