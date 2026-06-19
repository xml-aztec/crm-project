import { useState } from 'react';
import { Checkbox } from 'crm-ui-kit';

export const Default = () => {
  const [checked, setChecked] = useState(true);
  return <Checkbox label="Email me about order updates" checked={checked} onChange={setChecked} />;
};
export const Unchecked = () => {
  const [checked, setChecked] = useState(false);
  return <Checkbox label="Subscribe to newsletter" checked={checked} onChange={setChecked} />;
};
export const Disabled = () => (
  <Checkbox label="Locked setting" checked disabled onChange={() => {}} />
);
