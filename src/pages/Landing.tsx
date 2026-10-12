// Public marketing page, served at "/". It sells one thing: Call-Stars, the
// cold-call training portal in this repo. Everything above the footer is about
// the training — who it's for, what's inside, how to get it.
//
// The Ballista platform (hail map, target lists, dialer, callbacks, pipeline)
// is secondary but not hidden. It isn't commercially available, so it never
// competes with Call-Stars for the hero — instead it gets the announcement bar
// above the nav, a menu entry, its own footer column, and a line in both the
// closing CTA and the request form. There is one dialog on the page and it
// does double duty: requesting Call-Stars access also joins the waitlist.
//
// Every string here is a prop on the vendored template. The prop table is in
// src/components/maroon-fintech-landing.README.md; `demo` is a local addition
// documented in src/components/README.md.
//
// The numbers in `about.stats` are real and come from this repo — keep them
// that way, or drop them. The figures inside `statCards` are different: those
// illustrate the product's own UI, not a claim about the business.
import type { MouseEvent } from "react";
import MaroonFintechLanding from "../components/maroon-fintech-landing";
import "./Landing.css";

// The template scrolls its own in-page links by looking for `[data-sec]`, and
// those sections carry no `id`, so a bare href="#contact" from outside the
// component would find nothing. Do the scroll by hand.
function scrollToContact(e: MouseEvent<HTMLAnchorElement>) {
  const target = document.querySelector('[data-sec="contact"]');
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
}

export default function Landing() {
  return (
    <div className="landing-page">
      {/* Sits above the template's sticky nav, in the same frame colour, so it
          reads as part of the chrome rather than a banner bolted on. This is
          the platform's most visible placement on a page that otherwise
          belongs to Call-Stars. */}
      <a className="platform-bar" href="#contact" onClick={scrollToContact}>
        <span className="platform-bar-tag">Private beta</span>
        <span className="platform-bar-text">
          <strong>Ballista</strong> — the storm canvassing platform our own reps call from — is
          opening its first seats.
        </span>
        <span className="platform-bar-cta">Join the waitlist →</span>
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
          { label: "Why Call-Stars", href: "#about" },
          { label: "What's inside", href: "#features" },
          { label: "Ballista platform", href: "#contact" },
          { label: "Request access", href: "#contact" },
          { label: "Log in", href: "/login" },
        ]}
        login={{ label: "Log in", href: "/login" }}
        signup={{ label: "Request access", href: "#contact" }}
        // The mark badge always renders; omitting it falls back to the first
        // letter of `name`, which reads as a stray "s". A star ties it to the
        // Call-Stars name.
        backer={{ prefix: "Cold-call training for", name: "storm-restoration teams", mark: "★" }}
        title={"New rep Monday.\n*Booking* by Friday."}
        subtitle="The cold-call training we built for our own floor. Now open to yours."
        primaryAction={{ label: "Request access", href: "#contact" }}
        secondaryAction={{ label: "Open Call-Stars", href: "/login" }}
        // Deliberately does not enumerate what's in the portal — the counts
        // are already in `about.stats` below, and the "What's inside" section
        // is where specifics belong.
        info={{
          label: "/why/",
          text: "Built from the calls we actually made — *the openers that worked, and what to say when they don't.*",
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
          kicker: "Why Call-Stars",
          statement:
            "Call-Stars {mark} teaches the call the way it actually goes — opener, objection, close — so a new rep stops reading a script and starts running one.",
          // All three are real counts from this repo and the training standard
          // — 7 modules in src/config/modules.ts, 62 cards across
          // src/data/coldCallTreeCards/, and the 5 DM/hour bar reps are held to.
          stats: [
            { value: 7, label: "Modules, start to standard" },
            { value: 62, label: "Mapped call outcomes" },
            { value: 5, label: "Decision-makers per hour" },
          ],
        }}
        features={{
          kicker: "Inside Call-Stars",
          title: "Seven modules,\n*one* standard",
          subtitle:
            "The script, the call library, the objection tree and the operating standard — in one portal your reps will actually open.",
        }}
        // The template's two feature cards are a multi-currency wallet and a
        // spend heatmap, both hardwired to currency formatting and finance
        // wording. Nothing here is a ledger, so they are off; the satin panel
        // keeps its heading. See src/components/README.md.
        wallet={null}
        spending={null}
        cta={{
          title: "Your next hire, *ready to dial.*",
          subtitle:
            "Call-Stars is live today. Request access for your team — and we'll add you to the waitlist for the Ballista platform while we're at it.",
          action: { label: "Open Call-Stars", href: "/login" },
        }}
        // One dialog, two jobs: the page's main ask is Call-Stars access, and
        // the platform waitlist rides along rather than competing for a second
        // form. If the waitlist ever needs its own fields, that is the point to
        // split them.
        demo={{
          badge: "Request access",
          title: "Put your team on Call-Stars.",
          subtitle:
            "Tell us about your crew and we'll get you set up. You'll go on the Ballista platform waitlist too.",
          submit: "Request access",
          sending: "Sending…",
          doneTitle: "Request received.",
          doneText:
            "We'll email {email} within one business day to get your team set up — and you're on the Ballista platform waitlist.",
          openLabel: "Request access",
        }}
        footer={{
          columns: [
            {
              title: "Call-Stars",
              links: [
                { label: "The script", href: "/login" },
                { label: "Call library", href: "/login" },
                { label: "Decision tree", href: "/login" },
                { label: "Tools & systems", href: "/login" },
              ],
            },
            {
              title: "Platform — beta",
              links: [
                { label: "Hail map", href: "#contact" },
                { label: "Target lists", href: "#contact" },
                { label: "Dialer", href: "#contact" },
                { label: "Join the waitlist", href: "#contact" },
              ],
            },
            {
              title: "Company",
              links: [
                { label: "Request access", href: "#contact" },
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
