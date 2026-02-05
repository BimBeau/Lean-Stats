import { useMemo } from "@wordpress/element";

import useSharedRangePreset from "../hooks/useSharedRangePreset";
import { getRangeFromPreset } from "../lib/date";
import PeriodFilter from "../widgets/PeriodFilter";
import ReferrerSourcesTableCard from "../widgets/ReferrerSourcesTableCard";

const ReferrerSourcesPanel = () => {
  const [rangePreset, setRangePreset] = useSharedRangePreset();
  const range = useMemo(() => getRangeFromPreset(rangePreset), [rangePreset]);

  return (
    <div className="ls-report-panel">
      <div className="ls-report-panel__header">
        <PeriodFilter value={rangePreset} onChange={setRangePreset} />
      </div>
      <ReferrerSourcesTableCard range={range} />
    </div>
  );
};

export default ReferrerSourcesPanel;
