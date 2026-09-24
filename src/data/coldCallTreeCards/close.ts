// Hand-transcribed from public/cold-call-tree/main-tree.webp (no source
// mermaid/doc exists — this was read directly off the flowchart image).
// Covers the "Close & Schedule" section.

import { box, type TreeCard } from "./types";

export const closeCards: Record<string, TreeCard> = {
  "close-gotcha": {
    id: "close-gotcha",
    section: "close",
    kind: "dialogue",
    eyebrow: "Close",
    text: "Gotcha, **that's why I called**. We're gonna be nearby your building **(this week, next week, tomorrow, etc)**. We can go ahead and inspect it and let you know if there's anything to be worried about.",
    box: box(0.4983, 0.4259, 0.065, 0.05),
    next: "close-qualify-up-at-building",
    options: [
      {
        label: "How much does this cost?",
        target: "close-free-inspection",
        labelPos: { x: 0.5075, y: 0.4563 },
      },
      {
        label: '"Let me think about it…."',
        target: "close-perfect-next-time",
        labelPos: { x: 0.4742, y: 0.3888 },
      },
      { label: "Continue", target: "close-qualify-up-at-building" },
    ],
  },

  "close-perfect-next-time": {
    id: "close-perfect-next-time",
    section: "close",
    kind: "dialogue",
    text: "Perfect. Okay, so next we talk about what is it you need to think about, so I can have the information ready next time we talk.",
    box: box(0.4455, 0.3583, 0.06, 0.045),
    options: [{ label: '"Tells you their concerns"', target: "close-explain-disarm" }],
  },

  "close-explain-disarm": {
    id: "close-explain-disarm",
    section: "close",
    kind: "dialogue",
    text: "*Explain their concerns and disarm them.*\n\nBut none of that matters until we know if there's damage or not, so…",
    box: box(0.4968, 0.3562, 0.065, 0.05),
    next: "close-qualify-up-at-building",
    options: [{ label: "Continue", target: "close-qualify-up-at-building" }],
  },

  "close-free-inspection": {
    id: "close-free-inspection",
    section: "close",
    kind: "dialogue",
    text: "Since we are already going to be in the area, we can do it for free.",
    box: box(0.5208, 0.4837),
    next: "close-photo-report-clearance",
    options: [
      { label: "Ok great", target: "close-qualify-up-at-building" },
      { label: "Continue", target: "close-photo-report-clearance" },
    ],
  },

  "close-photo-report-clearance": {
    id: "close-photo-report-clearance",
    section: "close",
    kind: "dialogue",
    text: "Did they get you a photo report and certificate of clearance?",
    box: box(0.4323, 0.516, 0.06, 0.045),
    options: [{ label: '"A what?"', target: "close-certificate-explain" }],
  },

  "close-certificate-explain": {
    id: "close-certificate-explain",
    section: "close",
    kind: "dialogue",
    text: "A certificate of clearance. It's basically a report to turn into the insurance company that shows you had a contractor come out, inspect, and your roof was free of damage. As well as a photo report for your records. It can keep the insurance companies from raising your rates due to a storm.",
    box: box(0.481, 0.5192, 0.065, 0.055),
    options: [],
  },

  "close-qualify-up-at-building": {
    id: "close-qualify-up-at-building",
    section: "close",
    kind: "dialogue",
    eyebrow: "Qualify",
    text: "Are you going to be up at the building later this or next week?",
    box: box(0.564, 0.4232, 0.055, 0.04),
    options: [
      { label: "Yes", target: "close-email-company-info-yes" },
      { label: "No", target: "close-email-company-info-no" },
    ],
  },

  "close-email-company-info-yes": {
    id: "close-email-company-info-yes",
    section: "close",
    kind: "dialogue",
    text: "Awesome, I'll go ahead and email you over our company info. What day is best for you next week?",
    box: box(0.618, 0.4034, 0.055, 0.04),
    next: "close-partner-stop-by",
    options: [{ label: "Continue", target: "close-partner-stop-by" }],
  },

  "close-partner-stop-by": {
    id: "close-partner-stop-by",
    section: "close",
    kind: "dialogue",
    text: "I'll have my partner stop by. We don't need to take up any of your time, but we would love to stop by and shake your hand, drop off some info, and take a look for you.",
    box: box(0.6587, 0.4043, 0.06, 0.045),
    next: "collect-good-email",
    options: [{ label: "Continue", target: "collect-good-email" }],
  },

  "close-email-company-info-no": {
    id: "close-email-company-info-no",
    section: "close",
    kind: "dialogue",
    text: "No problem, I'll go ahead and send over my company info. Is there anyone we should check in with when we get up there?",
    box: box(0.6167, 0.4393, 0.06, 0.045),
    next: "close-report-and-call",
    options: [{ label: "Continue", target: "close-report-and-call" }],
  },

  "close-report-and-call": {
    id: "close-report-and-call",
    section: "close",
    kind: "dialogue",
    text: "I'll go ahead and put the report together and call you when we're finished up.",
    box: box(0.6582, 0.4391, 0.055, 0.04),
    next: "collect-good-email",
    options: [{ label: "Continue", target: "collect-good-email" }],
  },

  "close-claim-necessary-check": {
    id: "close-claim-necessary-check",
    section: "close",
    kind: "dialogue",
    text: "But before we talk more about this, I have no idea if a claim is even necessary. My job is to let you know if the damage is bad enough to even go down that path, so while my guys are in the area, I'll have them take a look at your property and let you know what's up.",
    box: box(0.4992, 0.5822, 0.065, 0.055),
    options: [
      { label: "Ok", target: "close-text-info-goodluck" },
      { label: "No", target: "close-text-info-goodluck" },
    ],
  },

  "close-text-info-goodluck": {
    id: "close-text-info-goodluck",
    section: "close",
    kind: "dialogue",
    text: "Ok, no worries. Well, I'll text you over my company's information, and if you ever run into a problem during this process give me a call. I'd be happy to help. Good luck with everything.",
    box: box(0.635, 0.5282, 0.06, 0.05),
    options: [],
  },
};
