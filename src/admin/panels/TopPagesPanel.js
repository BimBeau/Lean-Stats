import { TabPanel } from "@wordpress/components";
import { useMemo } from "@wordpress/element";
import { __ } from "@wordpress/i18n";

import useSharedRangePreset from "../hooks/useSharedRangePreset";
import { getRangeFromPreset } from "../lib/date";
import PeriodFilter from "../widgets/PeriodFilter";
import ReportTableCard from "../widgets/ReportTableCard";
import TimeseriesChart from "../widgets/TimeseriesChart";

const TopPagesReportPanel = ({ range }) => (
  <ReportTableCard
    title={__("Top pages", "lean-stats")}
    labelHeader={__("Url", "lean-stats")}
    range={range}
    endpoint="/top-pages"
    emptyLabel={__("No popular pages available.", "lean-stats")}
    labelFallback="/"
    supportsPageLabelToggle
  />
);

const NotFoundPanel = ({ range }) => (
  <ReportTableCard
    title={__("Top 404s", "lean-stats")}
    labelHeader={__("Url", "lean-stats")}
    range={range}
    endpoint="/404s"
    emptyLabel={__("No missing pages available.", "lean-stats")}
    labelFallback="/"
  />
);

const EntryPagesPanel = ({ range }) => (
  <ReportTableCard
    title={__("Entry pages (approx.)", "lean-stats")}
    labelHeader={__("Url", "lean-stats")}
    range={range}
    endpoint="/entry-pages"
    emptyLabel={__("No entry pages available.", "lean-stats")}
    labelFallback="/"
    metricLabel={__("Entries (approx.)", "lean-stats")}
    metricKey="entries"
    metricValueKey="entries"
    supportsPageLabelToggle
  />
);

const ExitPagesPanel = ({ range }) => (
  <ReportTableCard
    title={__("Exit pages (approx.)", "lean-stats")}
    labelHeader={__("Url", "lean-stats")}
    range={range}
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
  const [rangePreset, setRangePreset] = useSharedRangePreset();
  const range = useMemo(() => getRangeFromPreset(rangePreset), [rangePreset]);
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
    <div className="ls-report-panel">
      <div className="ls-report-panel__header">
        <PeriodFilter value={rangePreset} onChange={setRangePreset} />
      </div>
      <TimeseriesChart range={range} />
      <TabPanel className="ls-pages-tabs" tabs={pagesTabs}>
        {(tab) => {
          if (tab.name === "entry-pages") {
            return <EntryPagesPanel range={range} />;
          }
          if (tab.name === "exit-pages") {
            return <ExitPagesPanel range={range} />;
          }
          if (tab.name === "not-found") {
            return <NotFoundPanel range={range} />;
          }
          return <TopPagesReportPanel range={range} />;
        }}
      </TabPanel>
    </div>
  );
};

export default TopPagesPanel;
