# CRM UI Kit — build conventions

This is the `ui/`+`form/` component subset of a TailAdmin-based React CRM
(Tailwind CSS v4). No provider/root wrapper is required — none of these
components read from React context, so import and render them directly.

## Styling idiom: Tailwind v4 utility classes, real token names

Style with utility classes, not inline styles. Real color families shipped
in the bundle (each has shades `-25`/`-50` through `-900`/`-950`, e.g.
`bg-brand-500`, `text-gray-700`, `border-error-300`):

| Family | Use for |
|---|---|
| `brand` | primary actions, focus rings, links (`bg-brand-500`, `text-brand-600`) |
| `gray` | text, borders, backgrounds, dark-mode surfaces |
| `success` / `error` / `warning` | status (paid/overdue/pending, form validation) |
| `blue-light`, `orange` | secondary accents |
| `black` / `white` / `gray-dark` | base surfaces |

Other real tokens: `font-outfit` (the brand font, loaded via Google Fonts
`@import` in the bundle — no local font files to ship), `shadow-theme-xs/sm/md/lg/xl`,
`text-theme-xs/sm/xl` with matching line-heights, `rounded-xl`/`rounded-full`
for the rounded-corner look this kit uses throughout (buttons, badges, inputs).

Dark mode: every component pairs each utility with a `dark:` variant
(`bg-white dark:bg-gray-dark`, `text-gray-700 dark:text-gray-300`) — follow
that pairing when composing with these components, don't ship a light-only
composition.

A few hand-rolled utility classes exist for specific patterns — reuse them
instead of recreating the look: `menu-item` / `menu-item-active` /
`menu-item-inactive` (nav/menu rows), `custom-scrollbar` / `no-scrollbar`,
`animate-fade-in` / `animate-fade-in-down` / `animate-scale-in`.

## Where the truth lives

`styles.css` → `_ds_bundle.css` is the full closure (tokens + every utility
class + the hand-rolled ones above) — read it before styling anything this
kit doesn't already cover. Per-component `.prompt.md` files have the prop
contracts; several (`DateRangePicker`, `FormDatePicker`, etc.) are one of six
named exports from a single `DatePickerVariants` source — check the sibling
exports in its `.prompt.md` before reaching for a different date picker.

## Build example

```tsx
import { Button, Badge, Input, Checkbox } from 'crm-ui-kit';

function OrderRow() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-dark">
      <div className="flex items-center gap-3">
        <Checkbox checked={false} onChange={() => {}} />
        <span className="text-sm font-medium text-gray-800 dark:text-white/90">Order #1024</span>
        <Badge color="success" size="sm">Paid</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Input placeholder="Add note" />
        <Button variant="primary" size="sm">View</Button>
      </div>
    </div>
  );
}
```

## Scope note

This kit covers reusable primitives only — domain-specific CRM components
(orders, payroll, customers, etc.) and several components are still on the
**floor card** (fully importable, preview not yet authored): `Modal`,
`Dropdown`, `Select`, `MultiSelect`'s dropdown-open state, `PhoneInput`,
`Table`/`TableHeader`/`TableBody`/`TableRow`/`TableCell`, and the five
`DatePickerVariants` siblings other than the previewed ones. Read their
`.d.ts`/`.prompt.md` for the real API — the component is real and works,
only the preview card is a placeholder.
