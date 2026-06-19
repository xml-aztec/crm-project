import { DropdownItem } from 'crm-ui-kit';

export const Menu = () => (
  <div className="w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark">
    <DropdownItem onItemClick={() => {}}>Edit</DropdownItem>
    <DropdownItem onItemClick={() => {}}>Duplicate</DropdownItem>
    <DropdownItem onItemClick={() => {}}>Archive</DropdownItem>
  </div>
);
