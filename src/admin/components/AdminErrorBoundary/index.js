import { Component } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Notice } from '@wordpress/components';

class AdminErrorBoundary extends Component {
    state = {
        error: null,
    };

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        const { onError } = this.props;
        if (onError) {
            onError(error, info);
        }
    }

    render() {
        const { error } = this.state;
        const {
            fatal,
            checkedHandles = [],
            checkedGlobals = [],
            children,
        } = this.props;
        const details = fatal || error;

        if (details) {
            const handlesList = (details?.checkedHandles || checkedHandles).filter(Boolean);
            const globalsList = (details?.checkedGlobals || checkedGlobals).filter(Boolean);

            return (
                <Notice status="error" isDismissible={false}>
                    <p>
                        {__('Lean Stats cannot load the admin interface.', 'lean-stats')}
                    </p>
                    {details?.reason && <p>{details.reason}</p>}
                    {handlesList.length > 0 && (
                        <p>
                            {sprintf(
                                __('Script handles checked: %s', 'lean-stats'),
                                handlesList.join(', ')
                            )}
                        </p>
                    )}
                    {globalsList.length > 0 && (
                        <p>
                            {sprintf(
                                __('Global namespaces checked: %s', 'lean-stats'),
                                globalsList.join(', ')
                            )}
                        </p>
                    )}
                </Notice>
            );
        }

        return children;
    }
}

export default AdminErrorBoundary;
