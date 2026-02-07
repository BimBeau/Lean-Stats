import { useMemo } from "@wordpress/element";
import { __, sprintf } from "@wordpress/i18n";
import { ResponsiveChoropleth } from "@nivo/geo";

import useAdminEndpoint from "../api/useAdminEndpoint";
import DataState from "./DataState";
import LsCard from "./LsCard";
import { ADMIN_CONFIG } from "../constants";
import { isUnknownCountryCode } from "../lib/countryNames";
import worldGeo from "../data/world-countries.geojson";

const COLOR_RANGE = [
  "#6fa3d2",
  "#4f8ac4",
  "#3371b5",
  "#245a98",
  "#1a467a",
  "#10345c",
];
const NO_DATA_COLOR = "#8c8c8c";

const normalizeCountryCode = (code) => {
  if (typeof code !== "string") {
    return "";
  }

  const normalized = code.trim().toUpperCase();
  if (normalized === "-99") {
    return "";
  }

  return normalized;
};

const resolveFeatureId = (feature) => {
  const isoA2 = normalizeCountryCode(feature?.properties?.ISO_A2 || "");
  if (isoA2 && !isUnknownCountryCode(isoA2)) {
    return isoA2;
  }

  const isoA3 = normalizeCountryCode(feature?.properties?.ISO_A3 || "");
  if (isoA3 && !isUnknownCountryCode(isoA3)) {
    return isoA3;
  }

  return "";
};

export const WorldChoropleth = ({
  data,
  geoFeatures,
  maxValue,
  getTooltipLabel,
}) => (
  <ResponsiveChoropleth
    data={data}
    features={geoFeatures}
    featureId={resolveFeatureId}
    margin={{ top: 10, right: 10, bottom: 40, left: 10 }}
    colors={COLOR_RANGE}
    domain={[0, maxValue || 0]}
    valueScale={{ type: "linear" }}
    unknownColor={NO_DATA_COLOR}
    borderWidth={0.5}
    borderColor="#ffffff"
    projectionType="equalEarth"
    projectionScale={120}
    projectionTranslation={[0.5, 0.6]}
    enableGraticule={false}
    tooltip={({ feature }) => (
      <div className="ls-world-map__tooltip">{getTooltipLabel(feature)}</div>
    )}
    legends={[
      {
        anchor: "bottom-left",
        direction: "column",
        justify: false,
        translateX: 10,
        translateY: -10,
        itemsSpacing: 6,
        itemWidth: 90,
        itemHeight: 16,
        itemDirection: "left-to-right",
        itemTextColor: "#50575e",
        symbolSize: 12,
      },
    ]}
  />
);

const WorldMap = ({
  range,
  endpoint = "/geo-countries",
  emptyLabel,
  unknownCountryLabel = __("Unknown country", "lean-stats"),
}) => {
  const { data, isLoading, error } = useAdminEndpoint(
    endpoint,
    {
      ...range,
      per_page: 250,
      orderby: "hits",
      order: "desc",
    },
    {
      namespace: ADMIN_CONFIG?.settings?.restNamespace,
    },
  );

  const items = data?.items || [];
  const geoFeatures = worldGeo?.features || [];

  const isoA3ToA2 = useMemo(() => {
    const lookup = new Map();
    geoFeatures.forEach((feature) => {
      const isoA2 = normalizeCountryCode(feature?.properties?.ISO_A2 || "");
      const isoA3 = normalizeCountryCode(feature?.properties?.ISO_A3 || "");
      if (
        isoA2 &&
        isoA3 &&
        !isUnknownCountryCode(isoA2) &&
        !isUnknownCountryCode(isoA3)
      ) {
        lookup.set(isoA3, isoA2);
      }
    });
    return lookup;
  }, [geoFeatures]);

  const { hitLookup, totalHits, maxHits, chartData } = useMemo(() => {
    const lookup = new Map();
    const dataLookup = new Map();
    let total = 0;
    let max = 0;

    items.forEach((item) => {
      const rawCode = item?.country_code || item?.label || "";
      const code = normalizeCountryCode(rawCode);
      if (!code || isUnknownCountryCode(code)) {
        return;
      }

      const hits = Number(item?.hits || 0);
      if (!Number.isFinite(hits) || hits <= 0) {
        return;
      }

      let resolvedCode = code;
      if (code.length === 3 && isoA3ToA2.has(code)) {
        resolvedCode = isoA3ToA2.get(code);
      }

      total += hits;
      const currentValue = dataLookup.get(resolvedCode) || 0;
      const nextValue = currentValue + hits;
      dataLookup.set(resolvedCode, nextValue);
      lookup.set(resolvedCode, nextValue);
      max = Math.max(max, nextValue);
    });

    return {
      hitLookup: lookup,
      totalHits: total,
      maxHits: max,
      chartData: Array.from(dataLookup, ([id, value]) => ({
        id,
        value,
      })),
    };
  }, [items, isoA3ToA2]);

  const hasData = totalHits > 0;
  const formatHits = (value) => new Intl.NumberFormat().format(value);

  const getTooltip = (feature) => {
    const code = resolveFeatureId(feature);
    const isUnknown = !code || isUnknownCountryCode(code);
    const countryName = !isUnknown
      ? feature?.properties?.NAME_EN || feature?.properties?.NAME || ""
      : "";
    const resolvedName = countryName || unknownCountryLabel;
    const hits = !isUnknown && code ? hitLookup.get(code) || 0 : 0;
    const valueLabel =
      hits > 0
        ? sprintf(
            /* translators: %s: hit count. */
            __("%s visits", "lean-stats"),
            formatHits(hits),
          )
        : __("No data", "lean-stats");

    return sprintf(
      /* translators: 1: country name, 2: value label. */
      __("%1$s — %2$s", "lean-stats"),
      resolvedName,
      valueLabel,
    );
  };

  return (
    <LsCard
      title={__("World map", "lean-stats")}
      className="ls-world-map-card"
    >
      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && !hasData}
        emptyLabel={emptyLabel}
        loadingLabel={__("Loading world map", "lean-stats")}
      />
      {!isLoading && !error && hasData && (
        <div className="ls-world-map">
          <WorldChoropleth
            data={chartData}
            geoFeatures={geoFeatures}
            maxValue={maxHits}
            getTooltipLabel={getTooltip}
          />
        </div>
      )}
    </LsCard>
  );
};

export default WorldMap;
