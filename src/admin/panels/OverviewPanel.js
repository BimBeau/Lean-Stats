import { useMemo } from "@wordpress/element";
import { __ } from "@wordpress/i18n";

import useSharedRangePreset from "../hooks/useSharedRangePreset";
import { getRangeFromPreset } from "../lib/date";
import DeviceSplit from "../widgets/DeviceSplit";
import OverviewKpis from "../widgets/OverviewKpis";
import PeriodFilter from "../widgets/PeriodFilter";
import ReportTableCard from "../widgets/ReportTableCard";
import TimeseriesChart from "../widgets/TimeseriesChart";

const OverviewPanel = () => {
  const [rangePreset, setRangePreset] = useSharedRangePreset();
  const range = useMemo(() => getRangeFromPreset(rangePreset), [rangePreset]);

  return (
    <div className="ls-overview">
      <div className="ls-overview__summary">
        <PeriodFilter value={rangePreset} onChange={setRangePreset} />
        <OverviewKpis range={range} />
      </div>
      <TimeseriesChart range={range} />
      <div className="ls-overview__grid">
        <ReportTableCard
          title={__("Top pages", "lean-stats")}
          labelHeader={__("Url", "lean-stats")}
          range={range}
          endpoint="/top-pages"
          emptyLabel={__("No popular pages available.", "lean-stats")}
          labelFallback="/"
          supportsPageLabelToggle
        />
        <ReportTableCard
          title={__("Top referrers", "lean-stats")}
          labelHeader={__("Referrer", "lean-stats")}
          range={range}
          endpoint="/referrers"
          emptyLabel={__("No referrers available.", "lean-stats")}
          labelFallback={__("Direct", "lean-stats")}
        />
        <DeviceSplit range={range} />
      </div>
    </div>
  );
};

export default OverviewPanel;
