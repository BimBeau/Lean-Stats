/**
 * Admin entry point for Lean Stats.
 */

import { render } from "@wordpress/element";

import AdminErrorBoundary from "./components/AdminErrorBoundary";
import AdminApp from "./AdminApp";

const root = document.getElementById("lean-stats-admin");

if (root) {
  render(
    <AdminErrorBoundary>
      <AdminApp />
    </AdminErrorBoundary>,
    root,
  );
}
