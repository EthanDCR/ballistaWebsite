// Hand-transcribed from public/cold-call-tree/main-tree.webp (no source
// mermaid/doc exists — this was read directly off the flowchart image).
// Covers the "Insurance Objections" section: the claim-denied / "no
// insurance" / "don't want to file" objection-handling cluster that grows
// out of First Ask's damage questions.

import { box, type TreeCard } from "./types";

export const objectionsCards: Record<string, TreeCard> = {
  "obj-already-filed-claim": {
    id: "obj-already-filed-claim",
    section: "objections",
    kind: "dialogue",
    text: "I get it, you already filed the claim — I'm sure it was a pain, took a bunch of time and didn't get anywhere. I'm not looking to add anything to your plate. How about this: I'll stop by and take a look, and if I think they messed up I'll let you know — I can win the claim and we can have a 20 minute meeting on how. If not, I won't bother you again.",
    box: box(0.114, 0.537, 0.065, 0.06),
    options: [],
  },

  "obj-aw-man-why": {
    id: "obj-aw-man-why",
    section: "objections",
    kind: "dialogue",
    text: "Aw man, can I ask why?",
    box: box(0.258, 0.594),
    options: [
      {
        label: '"I don\'t want my premiums to go up"',
        target: "obj-insurance-cant-raise",
        labelPos: { x: 0.288, y: 0.5936 },
      },
      {
        label: '"I don\'t have time"',
        target: "obj-thats-why-here",
        labelPos: { x: 0.2532, y: 0.6272 },
      },
      {
        label: '"Dropped by insurance"',
        target: "obj-damned-if-you-do",
        labelPos: { x: 0.281, y: 0.6327 },
      },
    ],
  },

  "obj-insurance-cant-raise": {
    id: "obj-insurance-cant-raise",
    section: "objections",
    kind: "dialogue",
    text: "Your insurance provider can't raise your premiums when filing for storm damage since it's an **act of god**. They raise premiums based on claims filed in a zip code, and since this storm was bad and many claims have been filed, premiums are going to raise regardless. You might as well also benefit from a brand new roof instead of just paying for everyone else's.",
    box: box(0.33, 0.591, 0.06, 0.06),
    next: "close-claim-necessary-check",
    options: [{ label: "Continue", target: "close-claim-necessary-check" }],
  },

  "obj-damned-if-you-do": {
    id: "obj-damned-if-you-do",
    section: "objections",
    kind: "dialogue",
    text: "Totally understand the concern. Unfortunately this is one of those damned-if-you-do, damned-if-you-don't situations. The damage your carrier will see — your building is a liability, putting you at risk of being dropped anyway.",
    box: box(0.326, 0.652, 0.06, 0.05),
    next: "obj-proceed-new-roof",
    options: [
      {
        label: "I understand",
        target: "obj-proceed-new-roof",
        labelPos: { x: 0.3535, y: 0.6606 },
      },
    ],
  },

  "obj-proceed-new-roof": {
    id: "obj-proceed-new-roof",
    section: "objections",
    kind: "dialogue",
    eyebrow: "4",
    text: "Or you proceed and get a brand new roof, which increases your asset value. Worst case your carrier drops you — that does happen, but it's rare. Although you'll have a much better roof, which makes the building extremely attractive to new carriers.",
    box: box(0.362, 0.711, 0.06, 0.06),
    options: [],
  },

  "obj-thats-why-here": {
    id: "obj-thats-why-here",
    section: "objections",
    kind: "dialogue",
    text: "And that's exactly what we're here for. Nobody wants to deal with it, so we handle everything — from here to approved claim and new roof on your building. All it would take is 20 minutes so I can walk you through the process. Are you going to be at your building this week?",
    box: box(0.256, 0.689, 0.06, 0.06),
    options: [
      {
        label: "At building",
        target: "obj-qualify-day-time",
        labelPos: { x: 0.2763, y: 0.6996 },
      },
      {
        label: "Not at building",
        target: "obj-zoom-call-time",
        labelPos: { x: 0.268, y: 0.7394 },
      },
    ],
  },

  "obj-qualify-day-time": {
    id: "obj-qualify-day-time",
    section: "objections",
    kind: "dialogue",
    eyebrow: "Qualify",
    text: "Ok great. What day works best for me to stop by?.... Are mornings or afternoons better?....",
    box: box(0.299, 0.715, 0.055, 0.045),
    next: "obj-meeting-scheduled",
    options: [{ label: "Continue", target: "obj-meeting-scheduled" }],
  },

  "obj-meeting-scheduled": {
    id: "obj-meeting-scheduled",
    section: "objections",
    kind: "dialogue",
    eyebrow: "Outcome",
    text: "**Meeting Scheduled**",
    box: box(0.3245, 0.7147, 0.03, 0.025),
    options: [],
  },

  "obj-zoom-call-time": {
    id: "obj-zoom-call-time",
    section: "objections",
    kind: "dialogue",
    text: "Perfect. What time this week works best to do a quick zoom call and go over everything?",
    box: box(0.291, 0.76, 0.055, 0.045),
    options: [
      { label: "This time", target: "obj-meeting-scheduled", labelPos: { x: 0.3208, y: 0.7593 } },
      { label: "No thanks", target: "obj-no-worries-info", labelPos: { x: 0.3047, y: 0.7339 } },
    ],
  },

  "obj-no-worries-info": {
    id: "obj-no-worries-info",
    section: "objections",
    kind: "dialogue",
    text: "No worries. Well, I'll just send over more information about us and this process in case you ever need our help in the future.",
    box: box(0.249, 0.797, 0.06, 0.045),
    options: [],
  },

  "obj-familiar-insurance": {
    id: "obj-familiar-insurance",
    section: "objections",
    kind: "dialogue",
    text: "I'm sure you're familiar with the insurance process and have done a roof claim before?",
    box: box(0.1932, 0.6300, 0.0320, 0.0265),
    options: [
      { label: "Yes", target: "obj-anyone-in-place", labelPos: { x: 0.167, y: 0.6378 } },
      { label: "No", target: "obj-third-party", labelPos: { x: 0.1933, y: 0.6493 } },
    ],
  },

  "obj-third-party": {
    id: "obj-third-party",
    section: "objections",
    kind: "dialogue",
    text: "It's very important to have a third party working on your behalf, so you have the best chance of getting all the damage fully covered through your insurance provider. We handle hundreds of claims a year and handle the whole process from start to finish. When would be a good time for us to talk more about if there's anything we could do to help you through the process?",
    box: box(0.194, 0.69, 0.065, 0.06),
    options: [],
  },

  "obj-anyone-in-place": {
    id: "obj-anyone-in-place",
    section: "objections",
    kind: "dialogue",
    text: "Do you have anyone in place to do the construction once it gets approved?",
    box: box(0.151, 0.666, 0.05, 0.04),
    options: [
      { label: "No", target: "obj-help-with-that", labelPos: { x: 0.149, y: 0.692 } },
    ],
  },

  "obj-help-with-that": {
    id: "obj-help-with-that",
    section: "objections",
    kind: "dialogue",
    text: "I can help with that.",
    box: box(0.138, 0.725, 0.04, 0.032),
    options: [],
  },

  // Reached from First Ask's damage/inspection branches — "ok great" is the
  // twin of first-ask's "of-course-not-note" for the no-damage-yet case,
  // and confirmed cross-links into two Close & Schedule cards.
  "obj-ok-great-missed-you": {
    id: "obj-ok-great-missed-you",
    section: "objections",
    kind: "dialogue",
    text: "Ok great, I'm glad that missed you guys. Just so nobody else calls you again, did you guys already have someone inspect and document the building after this storm?",
    box: box(0.3833, 0.4813, 0.06, 0.05),
    options: [
      { label: "Yes", target: "close-photo-report-clearance" },
      { label: "No", target: "obj-got-it-radar-hail" },
    ],
  },

  "obj-got-it-radar-hail": {
    id: "obj-got-it-radar-hail",
    section: "objections",
    kind: "dialogue",
    text: "Got it, the only reason I called is because our weather radar says (hail size) hit the building. So regardless if there's damage or not, it's important to document the effects of this storm for your insurance — this protects you from future insurance denials when you do get storm damage. Would you be opposed to us getting those photos for you when we're nearby your building (next week, later this week, etc)?",
    box: box(0.4362, 0.4694, 0.065, 0.06),
    options: [{ label: "Ok, you can inspect", target: "close-free-inspection" }],
  },
};
