import { Badge } from 'crm-ui-kit';

export const Colors = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge color="primary">Primary</Badge>
    <Badge color="success">Paid</Badge>
    <Badge color="error">Overdue</Badge>
    <Badge color="warning">Pending</Badge>
    <Badge color="info">Info</Badge>
    <Badge color="dark">Archived</Badge>
  </div>
);
export const Solid = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge variant="solid" color="success">In stock</Badge>
    <Badge variant="solid" color="error">Out of stock</Badge>
  </div>
);
export const Sizes = () => (
  <div className="flex items-center gap-2">
    <Badge size="sm">Small</Badge>
    <Badge size="md">Medium</Badge>
  </div>
);
