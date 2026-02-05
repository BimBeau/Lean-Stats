import { __ } from "@wordpress/i18n";
import { Card, CardBody, SelectControl } from "@wordpress/components";

import { PERIOD_PRESET_OPTIONS } from "../constants";

const PeriodFilter = ({ value, onChange }) => (
  <Card className="ls-overview__summary-card ls-overview__summary-card--filter">
    <CardBody>
      <SelectControl
        label={__("Period", "lean-stats")}
        value={value}
        options={PERIOD_PRESET_OPTIONS}
        onChange={onChange}
        __next40pxDefaultSize
        __nextHasNoMarginBottom
      />
    </CardBody>
  </Card>
);

export default PeriodFilter;
