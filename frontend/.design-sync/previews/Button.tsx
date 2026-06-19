import { Button } from 'crm-ui-kit';

export const Primary = () => <Button variant="primary">Save changes</Button>;
export const Secondary = () => <Button variant="secondary">Cancel</Button>;
export const Outline = () => <Button variant="outline">Outline</Button>;
export const Destructive = () => <Button variant="destructive">Delete order</Button>;
export const Sizes = () => (
  <div className="flex items-center gap-3">
    <Button size="sm">Small</Button>
    <Button size="md">Medium</Button>
    <Button size="lg">Large</Button>
  </div>
);
export const Disabled = () => <Button disabled>Unavailable</Button>;
