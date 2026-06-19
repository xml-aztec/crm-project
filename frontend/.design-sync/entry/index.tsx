// Curated entry for the design-sync converter — re-exports exactly the
// reusable UI primitives in scope (src/components/ui + src/components/form),
// excluding page-level demo compositions and unused template leftovers.
// Hand-maintained: add a line here when a new primitive enters scope.

export { default as Button } from '../../src/components/ui/button/Button';
export { default as Badge } from '../../src/components/ui/badge/Badge';
export { default as Avatar } from '../../src/components/ui/avatar/Avatar';
export { default as Alert } from '../../src/components/ui/alert/Alert';
export { Dropdown } from '../../src/components/ui/dropdown/Dropdown';
export { DropdownItem } from '../../src/components/ui/dropdown/DropdownItem';
export { Modal } from '../../src/components/ui/modal/index';
export { Table, TableHeader, TableBody, TableRow, TableCell } from '../../src/components/ui/table/index';
export { default as LoadingSpinner } from '../../src/components/ui/LoadingSpinner';

export { default as Label } from '../../src/components/form/Label';
export { default as Form } from '../../src/components/form/Form';
export { default as Select } from '../../src/components/form/Select';
export { default as MultiSelect } from '../../src/components/form/MultiSelect';
export { default as Switch } from '../../src/components/form/switch/Switch';
export { default as PhoneInput } from '../../src/components/form/group-input/PhoneInput';
export { default as Checkbox } from '../../src/components/form/input/Checkbox';
export { default as FileInput } from '../../src/components/form/input/FileInput';
export { default as Input } from '../../src/components/form/input/InputField';
export { default as Radio } from '../../src/components/form/input/Radio';
export { default as RadioSm } from '../../src/components/form/input/RadioSm';
export { default as TextArea } from '../../src/components/form/input/TextArea';
export {
  FormDatePicker,
  DateTimePicker,
  DateRangePicker,
  FilterDatePicker,
  FutureDatePicker,
  PastDatePicker,
} from '../../src/components/form/DatePickerVariants';
