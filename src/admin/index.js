/**
 * Admin entry point for Lean Stats.
 */

import { render } from '@wordpress/element';

const root = document.getElementById('lean-stats-admin');

if (root) {
    render(<div>Lean Stats Admin UI</div>, root);
}
