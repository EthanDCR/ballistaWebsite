// Public marketing page, served at "/". It leads with Ballista: property data
// pulled from the providers a team already pays for, turned into assigned
// targets, worked in a dialer, tracked through callbacks and pipeline.
//
// Two things it is NOT, and no copy here should imply otherwise. It does no
// hail mapping of its own — that data comes from elsewhere. And it is not
// "storm canvassing", which would claim the storm-targeting layer: without
// swaths of its own, what it actually is is a data engine and a dialer.
// The hero, the about statement, the feature panel and the closing CTA are all
// about the platform, and the one ask is the waitlist.
//
// Call-Stars — the cold-call training portal in this repo — is second, and is
// doing a particular job here: it is the evidence. The argument the page makes
// is "we run a phone room, so we know what this platform has to do", and
// Call-Stars is the proof of the first half. It also happens to be the only
// thing a visitor can have today, which is why it holds the announcement bar,
// the demo band and a footer column.
//
// Two products, one page.
//
// Every string here is a prop on the vendored template. The prop table is in
// src/components/maroon-fintech-landing.README.md; `demo` is a local addition
// documented in src/components/README.md.
//
// Every number on this page is real, `statCards` included — those come from a
// snapshot of the floor's own lead tracking, dated in the comment above them.
import MaroonFintechLanding from "../components/maroon-fintech-landing";
import { BOOKING_URL } from "../config/booking";
import "./Landing.css";

export default function Landing() {
  return (
    <div className="landing-page">
      {/* Sits above the template's sticky nav, in the same frame colour, so it
          reads as part of the chrome rather than a banner bolted on. It used
          to carry the platform; the hero does that now, so the bar is where
          Call-Stars gets said before anyone scrolls. */}
      <a className="platform-bar" href="/training?module=intro">
        <span className="platform-bar-tag">Available now</span>
        <span className="platform-bar-text">
          <strong>Call-Stars</strong> — the cold-call training our own floor runs on — is open to
          your team today.
        </span>
        <span className="platform-bar-cta">Take module 1 free →</span>
      </a>
      <MaroonFintechLanding
        // The bar eats into the first screen, so trim the hero by its height
        // and the two together still land on one viewport.
        height="calc(100svh - 22px)"
        brand="ballista."
        palette="forest"
        // Replaces the template's drawn asterisk in the nav pill and the
        // footer. Those are the only two places `logo` reaches — the big marks
        // on the CTA band and the request dialog are still the asterisk.
        // The nav pill is light and the footer is dark, and the same element
        // serves both, so the tile carries the contrast rather than the glyph.
        logo={
          <span className="ballista-mark" aria-hidden="true">
            <img src="/bow-ai-mark.svg" alt="" />
          </span>
        }
        // The template scrolls to #about / #features / #contact in-page and
        // treats anything else as a normal link. /login is a real route, so it
        // leaves the marketing page and hands off to the app.
        nav={[
          { label: "Why Ballista", href: "#about" },
          { label: "What it does", href: "#features" },
          { label: "Call-Stars", href: "#demo" },
          { label: "Software waitlist", href: "#contact" },
          { label: "Log in", href: "/login" },
        ]}
        login={{ label: "Log in", href: "/login" }}
        // The pair of buttons top right are both account actions now. This one
        // used to open the waitlist, which put the page's one ask in two places
        // at once; `?signup` lands on the create-account tab rather than making
        // people find it.
        signup={{ label: "Sign up", href: "/login?signup=1" }}
        // The mark badge always renders; omitting it falls back to the first
        // letter of `name`, which reads as a stray letter.
        backer={{ prefix: "Lead data and dialer for", name: "restoration teams", mark: "★" }}
        // A ballista is a siege weapon, and in storm restoration the company
        // that reaches the homeowner first usually gets the job — so "strike
        // first" is the brand metaphor and the actual promise at the same
        // time. The closing CTA picks it up again as a bookend.
        title={"Storm hits.\n*You strike* first."}
        subtitle="Property data, dialer, callbacks and pipeline in one system — built to get your reps on the phone before anyone else."
        // No href on purpose: the template opens the waitlist dialog instead
        // of scrolling to the band at the bottom, so the page's one ask is a
        // click rather than a scroll and a second click. "Software" is doing
        // real work in the label — the other thing on this page is Call-Stars,
        // which has no waitlist at all.
        primaryAction={{ label: "Join the software waitlist" }}
        // Leaves the page rather than scrolling to the demo band below. The
        // band is still there for anyone scrolling past, and the nav's
        // "Call-Stars" link still goes to it — but a button that says "See
        // Call-Stars" should hand over the actual thing, so this one opens
        // module 1 inside the portal.
        secondaryAction={{ label: "See Call-Stars", href: "/training?module=intro" }}
        // Deliberately does not enumerate what's in the portal — the
        // "What's inside" section is where specifics belong.
        info={{
          label: "/how/",
          text: "Pull data on any address you want — *assigned to a rep, worked in the dialer, nothing left sitting in a spreadsheet overnight.*",
        }}
        // The all-time card is actuals, straight from the floor's lead
        // tracking, snapshot 2026-10-21. Edit it from a newer export of the
        // same source, not by hand.
        //
        // The Quarter and Month windows are a RUN RATE, not a record of those
        // months. June, July and August 2026 are the last months the floor
        // worked out of this app — 41, 25 and 9 leads, the 9 because August
        // stops on the 14th — and that averages 25 leads and $12.87m a month.
        // Those windows are that average, dated forward to the most recent
        // month that would have been a full one. Nobody set a lead in
        // September or October, so the dates say "when this rate was running",
        // not "when these leads came in", and the notes say rate rather than
        // total. Keep it that way: a run rate dressed as a month's actuals is
        // a claim the data does not make.
        //
        // Their donuts are the all-time split at that window's volume — the
        // same mix the floor actually runs, scaled down, with the rounding
        // pushed so the slices still add to the total. Nobody measured a stage
        // split for those months, so it is the shape of the business rather
        // than a count of those weeks; scale it from all-time again if the
        // all-time numbers move.
        //
        // "All time" stays first — it is what the card shows on arrival.
        statCards={[
          {
            title: "Leads worked",
            unit: "count",
            periods: [
              {
                label: "All time",
                range: "Through Oct 21, 2026",
                amount: 385,
                // The four live stages. The remainder is in the note rather
                // than the donut, so the slices stay the pipeline itself.
                note: "24 lost · 13 in overwatch",
                categories: [
                  { label: "Lead set", value: 81 },
                  { label: "Inspected", value: 150 },
                  { label: "Presented", value: 84 },
                  { label: "Closed", value: 33 },
                ],
              },
              {
                label: "Quarter",
                range: "Jul 01 - Sep 30, 2026",
                amount: 75,
                note: "Three months at the floor's rate",
                categories: [
                  { label: "Lead set", value: 18 },
                  { label: "Inspected", value: 32 },
                  { label: "Presented", value: 18 },
                  { label: "Closed", value: 7 },
                ],
              },
              {
                label: "Month",
                range: "Sep 01 - Sep 30, 2026",
                amount: 25,
                note: "An average month on the floor",
                categories: [
                  { label: "Lead set", value: 6 },
                  { label: "Inspected", value: 11 },
                  { label: "Presented", value: 6 },
                  { label: "Closed", value: 2 },
                ],
              },
            ],
          },
          {
            title: "Job value worked",
            decimals: 0,
            periods: [
              {
                label: "All time",
                range: "Through Oct 21, 2026",
                amount: 162413496,
                note: "33 of 385 leads closed",
                // The two add up to the total exactly.
                categories: [
                  { label: "Closed", value: 22026045 },
                  { label: "Still open", value: 140387451 },
                ],
              },
              {
                label: "Quarter",
                range: "Jul 01 - Sep 30, 2026",
                amount: 38622680,
                note: "Three months at the floor's rate",
                categories: [
                  { label: "Closed", value: 5237895 },
                  { label: "Still open", value: 33384785 },
                ],
              },
              {
                label: "Month",
                range: "Sep 01 - Sep 30, 2026",
                amount: 12874227,
                note: "An average month on the floor",
                categories: [
                  { label: "Closed", value: 1745965 },
                  { label: "Still open", value: 11128262 },
                ],
              },
            ],
          },
        ]}
        about={{
          kicker: "Why Ballista",
          statement:
            "Ballista {mark} was built inside a storm-restoration company, not a software office — every screen exists because a rep needed it after a storm hit at midnight.",
          // No `stats` on purpose. The counting trio used to sit under this
          // statement with the floor's training numbers (5 DMs/hour, 62 mapped
          // outcomes, 7 modules); they argued for the training rather than the
          // platform, so the statement now stands on its own. Omitting the key
          // is what hides the band — the template falls back to its own three
          // numbers if `stats` comes back.
        }}
        features={{
          kicker: "Inside Ballista",
          title: "Every *address,*\n*one* workflow",
          subtitle:
            "Data in, assigned targets out, then the dialer — the same system from the first ring to the signed contract.",
        }}
        // The Call-Stars sales video, dropped in through the `aside` prop on
        // the vendored component. It lands between "Inside Call-Stars" and the
        // closing CTA, so the page reads: here is what is in it, here it is
        // working, here is how to get it.
        aside={
          <div className="demo-band">
            <p className="demo-badge">Available today</p>
            <h2 className="demo-title">The training behind it</h2>
            <p className="demo-sub">
              Call-Stars is the cold-call course our own floor runs on — the opener, the objection
              and the close. You can have it before the platform ships.
            </p>

            {/* SWAP ME. Replace this whole figure with the embed, keeping the
                wrapper class so the 16:9 frame and styling carry over:
                  <video className="demo-frame" controls poster="/callstars-poster.jpg">
                    <source src="/callstars-demo.mp4" type="video/mp4" />
                  </video>
                or an <iframe className="demo-frame" ... allowFullScreen />
                for YouTube, Loom, Wistia and the like. */}
            <figure className="demo-frame is-placeholder">
              <span className="demo-play" aria-hidden="true" />
              <figcaption>Call-Stars demo video goes here</figcaption>
            </figure>

            <a className="demo-cta" href="/training?module=intro">
              Take module 1 free →
            </a>
          </div>
        }
        // The template's two feature cards are a multi-currency wallet and a
        // spend heatmap, both hardwired to currency formatting and finance
        // wording. Nothing here is a ledger, so they are off; the satin panel
        // keeps its heading. See src/components/README.md.
        wallet={null}
        spending={null}
        cta={{
          title: "Next storm, *strike first.*",
          subtitle:
            "Ballista is in private beta and opening its first seats. Call-Stars is live today, and module 1 is open to anyone.",
          action: { label: "Book a call", href: BOOKING_URL },
        }}
        // One dialog, two jobs: the page's main ask is Call-Stars access, and
        // the platform waitlist rides along rather than competing for a second
        // form. If the waitlist ever needs its own fields, that is the point to
        // split them.
        demo={{
          badge: "Platform waitlist",
          title: "Get early access to Ballista.",
          subtitle:
            "Property data and a dialer in one system, in private beta. Call-Stars has no waitlist — for that, just create an account.",
          submit: "Join the waitlist",
          sending: "Adding you…",
          doneTitle: "You're on the list.",
          doneText:
            "We'll email {email} as soon as a seat opens on the platform. No newsletter, no drip — just the invite.",
          openLabel: "Join the software waitlist",
        }}
        footer={{
          columns: [
            {
              // Still one link. Target lists / dialer / pipeline are what the
              // platform does, but none of them have anywhere to go yet — a
              // link that only scrolls to the same form is navigation in
              // appearance only. The heading says a platform exists; the
              // waitlist is the one thing a visitor can act on.
              title: "Ballista — beta",
              links: [{ label: "Join the software waitlist", href: "#contact" }],
            },
            {
              title: "Call-Stars",
              links: [
                { label: "Take module 1 free", href: "/training?module=intro" },
                { label: "The script", href: "/login" },
                { label: "Call library", href: "/login" },
                { label: "Decision tree", href: "/login" },
              ],
            },
            {
              title: "Company",
              links: [
                { label: "Create an account", href: "/login" },
                { label: "Support", href: "mailto:support@theballista.com" },
                { label: "Terms", href: "/terms" },
              ],
            },
          ],
          note: "Built for storm-restoration teams, by one.",
          socials: [],
        }}
        // TODO: wire to PocketBase. Create an `access_requests` collection with
        // create-only access for guests, then replace this with
        // `pb.collection("access_requests").create(data)` — throwing or
        // returning false makes the dialog show its error state.
        onRequestDemo={async (data) => {
          console.log("access request", data);
          await new Promise((r) => setTimeout(r, 700));
        }}
      />
    </div>
  );
}
