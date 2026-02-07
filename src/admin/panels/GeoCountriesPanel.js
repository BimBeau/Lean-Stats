import { useMemo } from "@wordpress/element";
import { __, sprintf } from "@wordpress/i18n";

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
  const emptyCountryLabel = __(
    "No country data available. Geolocation aggregation may be disabled.",
    "lean-stats",
  );
  const unknownCountryLabel = __("Unknown country", "lean-stats");

  const renderCountryLabel = (label, item) => {
    const flagClass = getCountryFlagClass(item?.label);
    const isUnknown = !flagClass || isUnknownCountryCode(item?.label);
    const countryLabel = label || unknownCountryLabel;
    const hits = Number(item?.hits || 0);
    const formattedHits = new Intl.NumberFormat().format(hits);
    const tooltipText =
      hits > 0
        ? sprintf(
            /* translators: 1: country name, 2: hit count. */
            __("%1$s — %2$s visits", "lean-stats"),
            countryLabel,
            formattedHits,
          )
        : sprintf(
            /* translators: 1: country name, 2: no data label. */
            __("%1$s — %2$s", "lean-stats"),
            countryLabel,
            __("No data", "lean-stats"),
          );
    const flagLabel = isUnknown
      ? __("Unknown country flag", "lean-stats")
      : sprintf(
          /* translators: %s: country name. */
          __("Flag of %s", "lean-stats"),
          countryLabel,
        );

    return (
      <span className="ls-country-label" title={tooltipText}>
        {isUnknown ? (
          <span
            className="ls-country-flag ls-country-flag--unknown"
            role="img"
            aria-label={flagLabel}
            title={flagLabel}
          />
        ) : (
          <span
            className={`ls-country-flag ${flagClass}`}
            role="img"
            aria-label={flagLabel}
            title={flagLabel}
          />
        )}
        <span>{countryLabel}</span>
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
          emptyLabel={emptyCountryLabel}
          unknownCountryLabel={unknownCountryLabel}
        />
        <ReportTableCard
          title={__("Top countries", "lean-stats")}
          labelHeader={__("Country", "lean-stats")}
          range={range}
          endpoint="/geo-countries"
          emptyLabel={emptyCountryLabel}
          labelFallback={unknownCountryLabel}
          formatLabel={getCountryLabel}
          renderLabel={renderCountryLabel}
          metricLabel={__("Visits", "lean-stats")}
        />
      </div>
    </div>
  );
};

export default GeoCountriesPanel;
