import { useEffect, useRef, useState } from '@wordpress/element';

const useSizedContainer = () => {
    const ref = useRef(null);
    const [hasSize, setHasSize] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) {
            return undefined;
        }

        const updateSize = () => {
            const rect = node.getBoundingClientRect();
            const nextHasSize = rect.width > 0 && rect.height > 0;
            setHasSize((prev) => (prev === nextHasSize ? prev : nextHasSize));
        };

        updateSize();

        let observer;
        if (window.ResizeObserver) {
            observer = new ResizeObserver(() => updateSize());
            observer.observe(node);
        } else {
            window.addEventListener('resize', updateSize);
        }

        return () => {
            if (observer) {
                observer.disconnect();
            } else {
                window.removeEventListener('resize', updateSize);
            }
        };
    }, []);

    return { ref, hasSize };
};

const ChartFrame = ({ height, ariaLabel, children }) => {
    const { ref, hasSize } = useSizedContainer();

    return (
        <div ref={ref} className="ls-chart-frame" data-height={height} role="img" aria-label={ariaLabel}>
            {hasSize ? children : null}
        </div>
    );
};

export default ChartFrame;
