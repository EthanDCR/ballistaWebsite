# Vendored components

Third-party source, copied in rather than installed. Kept byte-for-byte apart
from a provenance header at the top of each file, so a newer upstream version
can be diffed against what we have. ESLint skips this directory
(`eslint.config.js`) — linting it would only report other people's style
choices, and fixing them would fork the copy.

## maroon-fintech-landing.tsx

A complete finance-SaaS landing page in one file. Rendered by
`src/pages/Landing.tsx` at `/landing`.

| | |
|---|---|
| Upstream | https://github.com/Kedhareswer/21stdev-my-components |
| Path | `components/maroon-fintech-landing/maroon-fintech-landing.tsx` |
| Listed as | "Fintech SaaS Landing Page Template" on 21st.dev |
| Pulled | 2026-10-11 (upstream last pushed the same day) |
| Props | `maroon-fintech-landing.README.md`, next to the source |

Dependencies: none beyond React. The device, circuit board, satin, flags,
donuts and heatmap are all inline SVG; the type is the system stack. Nothing
loads at runtime, and it does not use Tailwind — it injects its own `mfl-*`
stylesheet.

### Local changes

Three, each marked `LOCAL ADDITION` in the source:

1. The original first line was a Next.js `"use client"` directive. Replaced by
   the provenance header.
2. **Added a `demo` prop** (`MflDemoCopy`) carrying the wording for the
   request-demo dialog and the button in the CTA band that opens it. Upstream
   hardwires that copy, and some of it is finance-specific — the dialog offered
   "a 25-minute walkthrough with a finance specialist", which is not what this
   page is for. The change is purely additive: every field falls back to the
   original string, so the component behaves identically when `demo` is
   omitted. `src/pages/Landing.tsx` passes waitlist wording.

3. **Added an `aside` prop** taking arbitrary content, rendered as its own
   band between the feature panel and the closing call to action, inside the
   dark `main`. The section gets `data-sec="platform"` so in-page links to
   `#platform` scroll to it like any built-in section. Also additive: omit the
   prop and the markup is identical to upstream. `src/pages/Landing.tsx` uses
   it for the platform demo video.

Everything else is byte-for-byte upstream. In particular the two feature-panel
widgets were left alone: `WalletWidget` is hardwired to currency flags and
per-USD conversion, and `SpendingWidget` to "Spending Overview", `$`
formatting and a `>$500 / >$900` legend. Neither says anything true about
storm sales, so `Landing.tsx` passes `wallet={null}` and `spending={null}` and
the satin panel keeps only its heading. Making them generic would mean
genuinely forking those widgets — worth doing if that section should carry
real product UI, but it is a bigger change than the `demo` prop.

### Licensing — read before this page goes public

**The upstream repo has no LICENSE file.** GitHub reports no license, which by
default means all rights reserved, whatever the listing says.

21st.dev lists this template under "From other sites" ("listed here, bought on
the author's own site") and marks it **Free** — it is not hosted on 21st.dev
and is not covered by a 21st.dev plan. The registry route
`https://21st.dev/r/kedhareswer/maroon-fintech-landing` exists but returns
`403 Authentication required`, so the shadcn CLI is not the way in; the repo
is. The author's root README does say, of this repo: "Or copy the source —
grab `components/<slug>/` straight from this repo."

That invitation is explicit but informal, and it is not a grant of commercial
use. Before shipping this on a public Ballista page, either get the author to
add a license, or ask them directly. Fine as-is for local and internal work.

### Updating

```sh
curl -sSf -o src/components/maroon-fintech-landing.tsx \
  https://raw.githubusercontent.com/Kedhareswer/21stdev-my-components/main/components/maroon-fintech-landing/maroon-fintech-landing.tsx
```

Then re-apply the provenance header and the `demo` and `aside` props, and re-check
`src/pages/Landing.css` — it
neutralises global tag styles that leak in from `index.css`, and it depends on
the class names and specificity the template uses internally.
