import { __ } from "@wordpress/i18n";

import ReportPanel from "./ReportPanel";

const SearchTermsPanel = () => (
  <ReportPanel
    title={__("Search terms", "lean-stats")}
    labelHeader={__("Search term", "lean-stats")}
    endpoint="/search-terms"
    emptyLabel={__("No search terms available.", "lean-stats")}
    labelFallback={__("Unknown", "lean-stats")}
  />
);

export default SearchTermsPanel;
