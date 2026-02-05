import { useEffect, useState } from "@wordpress/element";

import { DEFAULT_RANGE_PRESET } from "../constants";
import {
  getRangePresetFromUrl,
  getStoredRangePreset,
  isValidRangePreset,
  storeRangePreset,
} from "../lib/storage";

const useSharedRangePreset = () => {
  const urlPreset = getRangePresetFromUrl();
  const [rangePreset, setRangePresetState] = useState(
    () => urlPreset || getStoredRangePreset() || DEFAULT_RANGE_PRESET,
  );
  const [hasUserOverride, setHasUserOverride] = useState(false);

  const setRangePreset = (preset) => {
    setRangePresetState(preset);
    setHasUserOverride(true);
  };

  useEffect(() => {
    if (urlPreset && !hasUserOverride) {
      return;
    }

    if (isValidRangePreset(rangePreset)) {
      storeRangePreset(rangePreset);
    }
  }, [rangePreset, urlPreset, hasUserOverride]);

  return [rangePreset, setRangePreset];
};

export default useSharedRangePreset;
