import { useMemo } from "@wordpress/element";
import { __, sprintf } from "@wordpress/i18n";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleQuantize } from "d3-scale";

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

  const { hitLookup, totalHits, maxHits } = useMemo(() => {
    const lookup = new Map();
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

      total += hits;
      max = Math.max(max, hits);
      lookup.set(code, hits);
    });

    return {
      hitLookup: lookup,
      totalHits: total,
      maxHits: max,
    };
  }, [items]);

  const hasData = totalHits > 0;
  const formatHits = (value) => new Intl.NumberFormat().format(value);

  const colorScale = useMemo(() => {
    if (!hasData || maxHits <= 0) {
      return null;
    }

    return scaleQuantize().domain([1, maxHits]).range(COLOR_RANGE);
  }, [hasData, maxHits]);

  const getFill = (geo) => {
    const rawCode = geo?.properties?.ISO_A2 || "";
    const code = normalizeCountryCode(rawCode);
    const hits = code ? hitLookup.get(code) || 0 : 0;

    if (!hasData || hits <= 0 || !colorScale) {
      return NO_DATA_COLOR;
    }

    return colorScale(hits);
  };

  const getTooltip = (geo) => {
    const rawCode = geo?.properties?.ISO_A2 || "";
    const code = normalizeCountryCode(rawCode);
    const isUnknown = !code || isUnknownCountryCode(code);
    const countryName = !isUnknown
      ? geo?.properties?.NAME_EN || geo?.properties?.NAME || ""
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
          <ComposableMap
            projectionConfig={{ scale: 145 }}
            width={900}
            height={440}
          >
            <Geographies geography={worldGeo}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getFill(geo)}
                    stroke="#ffffff"
                    strokeWidth={0.5}
                    role="img"
                    aria-label={getTooltip(geo)}
                  >
                    <title>{getTooltip(geo)}</title>
                  </Geography>
                ))
              }
            </Geographies>
          </ComposableMap>
        </div>
      )}
    </LsCard>
  );
};

export default WorldMap;
