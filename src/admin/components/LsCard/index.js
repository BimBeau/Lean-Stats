import { Card, CardBody, CardHeader } from '@wordpress/components';

const LsCard = ({ title, children, ...props }) => (
    <Card {...props}>
        {title ? (
            <CardHeader>
                <strong>{title}</strong>
            </CardHeader>
        ) : null}
        <CardBody>{children}</CardBody>
    </Card>
);

export default LsCard;
