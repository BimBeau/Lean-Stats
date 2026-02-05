import { createElement } from '@wordpress/element';
import { Card, CardBody, CardHeader } from '@wordpress/components';

const Wrapper = ({ className, children }) => (
    <div className={className}>{children}</div>
);

const LsCard = ({ title, children, ...props }) => {
    const CardComponent = Card || Wrapper;
    const CardHeaderComponent = CardHeader || Wrapper;
    const CardBodyComponent = CardBody || Wrapper;

    const fallbackProps = {
        className: [
            'ls-card',
            props.className,
        ]
            .filter(Boolean)
            .join(' '),
    };

    const cardProps = Card ? props : fallbackProps;

    return createElement(
        CardComponent,
        cardProps,
        title
            ? createElement(
                  CardHeaderComponent,
                  CardHeader ? undefined : { className: 'ls-card__header' },
                  createElement('strong', null, title),
              )
            : null,
        createElement(
            CardBodyComponent,
            CardBody ? undefined : { className: 'ls-card__body' },
            children,
        ),
    );
};

export default LsCard;
