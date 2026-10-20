// Public marketing page, served at "/". It leads with Ballista, the storm
// canvassing platform (target lists, dialer, callbacks, pipeline). Note it
// does not do its own hail mapping — that data comes from elsewhere — so no
// copy here should imply otherwise.
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
// Two products, one page, and the counts in `about.stats` belong to the
// training rather than the platform on purpose — see the note there.
//
// Every string here is a prop on the vendored template. The prop table is in
// src/components/maroon-fintech-landing.README.md; `demo` is a local addition
// documented in src/components/README.md.
//
// The numbers in `about.stats` are real and come from this repo — keep them
// that way, or drop them. The figures inside `statCards` are different: those
// illustrate the product's own UI, not a claim about the business.
import MaroonFintechLanding from "../components/maroon-fintech-landing";
import "./Landing.css";

export default function Landing() {
  return (
    <div className="landing-page">
      {/* Sits above the template's sticky nav, in the same frame colour, so it
          reads as part of the chrome rather than a banner bolted on. It used
          to carry the platform; the hero does that now, so the bar is where
          Call-Stars gets said before anyone scrolls. */}
      <a className="platform-bar" href="/training">
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
        height="calc(100svh - 42px)"
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
          { label: "Join the waitlist", href: "#contact" },
          { label: "Log in", href: "/login" },
        ]}
        login={{ label: "Log in", href: "/login" }}
        signup={{ label: "Join the waitlist", href: "#contact" }}
        // The mark badge always renders; omitting it falls back to the first
        // letter of `name`, which reads as a stray letter.
        backer={{ prefix: "Storm canvassing for", name: "restoration teams", mark: "★" }}
        // A ballista is a siege weapon, and in storm restoration the company
        // that reaches the homeowner first usually gets the job — so "strike
        // first" is the brand metaphor and the actual promise at the same
        // time. The closing CTA picks it up again as a bookend.
        title={"The storm hits.\n*You strike* first."}
        subtitle="Targets, dialer, callbacks and pipeline in one system — built to get your reps on the phone before anyone else."
        primaryAction={{ label: "Join the waitlist", href: "#contact" }}
        secondaryAction={{ label: "See Call-Stars", href: "#demo" }}
        // Deliberately does not enumerate what's in the portal — the counts
        // are already in `about.stats` below, and the "What's inside" section
        // is where specifics belong.
        info={{
          label: "/how/",
          text: "Your storm data becomes a worked list — *every address assigned, every callback booked, nothing sitting in a spreadsheet overnight.*",
        }}
        // Illustrative product UI — the pipeline a manager sees once trained
        // reps are working the phones. Not a claim about Ballista's revenue.
        statCards={[
          {
            title: "Cold-call pipeline",
            periods: [
              {
                label: "Month",
                range: "Sep 01, 2026 - Sep 30, 2026",
                amount: 412800,
                change: 9.4,
                categories: [
                  { label: "Inspection set", value: 96400 },
                  { label: "Estimate out", value: 138200 },
                  { label: "Contract sent", value: 121000 },
                  { label: "Supplement", value: 57200 },
                ],
              },
              {
                label: "Week",
                range: "Sep 24, 2026 - Sep 30, 2026",
                amount: 86300,
                change: 4.1,
                categories: [
                  { label: "Inspection set", value: 31200 },
                  { label: "Estimate out", value: 28100 },
                  { label: "Contract sent", value: 27000 },
                ],
              },
            ],
          },
          {
            title: "Signed from calls",
            periods: [
              {
                label: "Month",
                range: "Sep 01, 2026 - Sep 30, 2026",
                amount: 268500,
                change: 12.6,
                categories: [
                  { label: "Insurance", value: 192300 },
                  { label: "Retail", value: 51400 },
                  { label: "Referral", value: 24800 },
                ],
              },
            ],
          },
        ]}
        about={{
          kicker: "Why Ballista",
          statement:
            "Ballista {mark} is built inside a storm-restoration company, not a software office — every screen exists because a rep needed it on a Tuesday afternoon.",
          // All three are real counts from this repo and the training standard
          // — 7 modules in src/config/modules.ts, 62 cards across
          // src/data/coldCallTreeCards/, and the 5 DM/hour bar reps are held to.
          // Still the real counts from this repo and the floor's standard.
          // They are training numbers rather than platform ones on purpose:
          // the argument is that the people building this run a phone room,
          // and these are the evidence for it.
          stats: [
            { value: 5, label: "Decision-makers per hour" },
            { value: 62, label: "Mapped call outcomes" },
            { value: 7, label: "Modules our reps run" },
          ],
        }}
        features={{
          kicker: "Inside Ballista",
          title: "Every *address,*\n*one* workflow",
          subtitle:
            "Target lists, dialer, callbacks and pipeline — the same system from the first ring to the signed contract.",
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

            <a className="demo-cta" href="/training">
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
          action: { label: "Take module 1 free", href: "/training" },
        }}
        // One dialog, two jobs: the page's main ask is Call-Stars access, and
        // the platform waitlist rides along rather than competing for a second
        // form. If the waitlist ever needs its own fields, that is the point to
        // split them.
        demo={{
          badge: "Platform waitlist",
          title: "Get early access to Ballista.",
          subtitle:
            "The storm canvassing platform, in private beta. Call-Stars has no waitlist — for that, just create an account.",
          submit: "Join the waitlist",
          sending: "Adding you…",
          doneTitle: "You're on the list.",
          doneText:
            "We'll email {email} as soon as a seat opens on the platform. No newsletter, no drip — just the invite.",
          openLabel: "Join the waitlist",
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
              links: [{ label: "Join the waitlist", href: "#contact" }],
            },
            {
              title: "Call-Stars",
              links: [
                { label: "Take module 1 free", href: "/training" },
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
