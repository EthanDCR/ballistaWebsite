# Maroon Fintech Landing

A complete finance-SaaS landing page in one component. A maroon frame holds a
cream hero where a sage-green device sits at the centre of a circuit board,
with live expense and income cards at its feet. Below, a dark section reads
like a statement of intent, then a satin-lit feature panel shows the product
working. A call to action, a request-demo dialog and a footer finish it.

```tsx
import MaroonFintechLanding from "@/components/ui/maroon-fintech-landing"

<MaroonFintechLanding
  brand="ledgerly."
  palette="forest"
  title={"Close the books\n*in a single* afternoon"}
  about={{ statement: "Ledgerly {mark} gives controllers their evenings back.", stats: [{ value: 4000, suffix: "+", label: "Finance teams" }] }}
  onRequestDemo={(data) => fetch("/api/demo", { method: "POST", body: JSON.stringify(data) })}
/>
```

**No dependencies beyond React.** The device, the circuit board, the satin,
the currency flags, the donuts and the heatmap are SVG drawn in the file. The
type is the system stack (Inter Tight / Inter when installed). No fonts,
images or stylesheets load, so it renders inside the 21st capture sandbox.

## Play with it

| Do this | And |
|---|---|
| Move the pointer over the hero | The device tilts toward it; the nearest circuit chip lights up |
| Click the device, or the floating ✻ tile | It pulses: rings ripple out, the light under the lid flares, the callout reads *Synced just now* |
| Open the ☰ menu | A dark fold-out with numbered links; in-page ones smooth-scroll. Escape or click away closes it |
| Pick *Total / Week / Today* on a card | The amount, range, change and donut all switch |
| Hover a donut arc or a legend row | The others dim and the arc shows its share |
| Scroll through *About us* | The statement lights up word by word; the stats count up |
| Click a wallet tile, or use the currency picker | The total balance is re-added in that currency |
| *See all* | Unfolds the rest of the wallets |
| Hover or tab through the heatmap | Each week shows its spend; *Yearly / Half-year / Quarter* reframes the total and budget bar |
| *Request demo* | A dialog with validation, a sending state and a confirmation |

Signals run along the circuit traces toward the device, the device floats, and
the satin drifts and follows the pointer.

## Props

| Prop | Default | Description |
|---|---|---|
| `brand` | `"synais."` | Nav, footer and the giant footer wordmark. A trailing `.` is set in the brand colour. |
| `logo` | drawn asterisk | Replaces the mark beside the brand. |
| `nav` | About, Features, Pricing, Contact | `{ label, href }[]` for the fold-out menu. `#about`, `#features`, `#contact` scroll in-page. |
| `login` / `signup` | `Log in` / `Sign up` | `{ label, href }`, or `null` to hide. |
| `backer` | `Backed by Orbit Ventures` | `{ prefix?, name, mark? }` badge above the headline. `null` hides it. |
| `title` | `Smarter *Financial*\nManagement` | `*asterisks*` mute words; `\n` breaks the line. Pass it in braces (`title={"…\n…"}`) so the `\n` is a real newline. |
| `subtitle` | — | Muted line under the headline. |
| `primaryAction` | `Get started → #contact` | Brand button. |
| `secondaryAction` | `Request demo` | Without an `href` it opens the request-demo dialog. |
| `info` | `/info/` paragraph | `{ label?, text }`, bottom-left of the hero. `*` mutes the tail. `null` hides it. |
| `statCards` | Total Expenses, Total Income | `{ title, periods: { label, range, amount, change, categories: { label, value, color? }[] }[] }[]`. The first two show. |
| `about` | statement + 3 stats | `{ kicker?, statement, stats? }`. `{mark}` in `statement` places the three-tile mark inline. Stats are `{ value, prefix?, suffix?, decimals?, label }`. |
| `features` | *Essential Tools For Finance Managers* | `{ kicker?, title, subtitle? }`. `null` hides the satin panel. |
| `wallet` | 6 wallets | `{ title?, description?, growth?, wallets? }`. Wallets are `{ code, symbol, balance, perUsd, active? }`; `perUsd` is units per US dollar, used to total them. USD, EUR, KRW, IDR, GBP and JPY get drawn flags. |
| `spending` | seeded year | `{ title?, description?, budget?, seed?, months? }`. `months` is 12 arrays of up to 5 weekly amounts; otherwise `seed` draws a believable year. |
| `cta` | *Every dollar, finally in view.* | `{ title, subtitle?, action? }`. `null` hides it. |
| `footer` | 3 columns + socials | `{ columns?, note?, socials? }`. `null` hides it. |
| `palette` | `"maroon"` | `"maroon"`, `"forest"`, `"midnight"`, or any subset of `{ frame, paper, ink, muted, brand, night, card, cream, device, glow, satin: [dark, mid, light] }` over maroon. |
| `onRequestDemo` | — | Called with `{ name, email, company, size }`. Return (or resolve to) `false`, or throw, to show an error. Without it the dialog fakes a 0.9 s send. |
| `height` | `"100svh"` | Minimum height of the hero (never below 700px). |

## Notes

- The page keeps its own colours in both host themes — it's a brand page, not
  a themed widget. Colours are CSS variables on the root, so the palette prop
  reaches everything, satin included.
- The nav is `position: sticky`, so the root clips sideways with
  `overflow-x: clip` rather than `overflow: hidden`.
- Content that starts below the fold rises in as it scrolls into view; content
  already on screen is never hidden.
- `prefers-reduced-motion` stops every animation and transition, lights the
  whole statement, shows final stat values and keeps the device still.
