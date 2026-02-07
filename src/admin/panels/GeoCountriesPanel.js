import { useMemo } from "@wordpress/element";
import { __ } from "@wordpress/i18n";

import useSharedRangePreset from "../hooks/useSharedRangePreset";
import { getRangeFromPreset } from "../lib/date";
import PeriodFilter from "../widgets/PeriodFilter";
import ReportTableCard from "../widgets/ReportTableCard";
import WorldMap from "../components/WorldMap";
import {
  getCountryFlagClass,
  getCountryLabel,
  isUnknownCountryCode,
} from "../lib/countryNames";

const GeoCountriesPanel = () => {
  const [rangePreset, setRangePreset] = useSharedRangePreset();
  const range = useMemo(() => getRangeFromPreset(rangePreset), [rangePreset]);

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
    <div className="ls-report-panel">
      <div className="ls-report-panel__header">
        <PeriodFilter value={rangePreset} onChange={setRangePreset} />
      </div>
      <div className="ls-geo-countries-panel__content">
        <WorldMap
          range={range}
          emptyLabel={__("No country data available.", "lean-stats")}
        />
        <ReportTableCard
          title={__("Top countries", "lean-stats")}
          labelHeader={__("Country", "lean-stats")}
          range={range}
          endpoint="/geo-countries"
          emptyLabel={__("No country data available.", "lean-stats")}
          labelFallback={__("Unknown country", "lean-stats")}
          formatLabel={getCountryLabel}
          renderLabel={renderCountryLabel}
        />
      </div>
    </div>
  );
};

export default GeoCountriesPanel;
