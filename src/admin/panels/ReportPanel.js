import { useMemo } from "@wordpress/element";

import useSharedRangePreset from "../hooks/useSharedRangePreset";
import { getRangeFromPreset } from "../lib/date";
import PeriodFilter from "../widgets/PeriodFilter";
import ReportTableCard from "../widgets/ReportTableCard";

const ReportPanel = ({
  title,
  endpoint,
  labelHeader,
  emptyLabel,
  labelFallback,
  formatLabel,
  renderLabel,
  metricLabel,
  metricKey,
  metricValueKey,
  supportsPageLabelToggle = false,
}) => {
  const [rangePreset, setRangePreset] = useSharedRangePreset();
  const range = useMemo(() => getRangeFromPreset(rangePreset), [rangePreset]);

  return (
    <div className="ls-report-panel">
      <div className="ls-report-panel__header">
        <PeriodFilter value={rangePreset} onChange={setRangePreset} />
      </div>
      <ReportTableCard
        title={title}
        labelHeader={labelHeader}
        range={range}
        endpoint={endpoint}
        emptyLabel={emptyLabel}
        labelFallback={labelFallback}
        formatLabel={formatLabel}
        renderLabel={renderLabel}
        metricLabel={metricLabel}
        metricKey={metricKey}
        metricValueKey={metricValueKey}
        supportsPageLabelToggle={supportsPageLabelToggle}
      />
    </div>
  );
};

export default ReportPanel;
