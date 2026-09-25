// Card prose was hand-transcribed from the source flowchart. The wiring
// (every option target and `next`) is generated from coldcalltree.csv, the
// Lucidchart shape-data export — see scripts/gen_cold_call_mmd.py and
// coldCallTree.mmd. Re-verify against the CSV rather than the artwork.
// Covers the "Start Here" legend and the "First Ask" section.

import { box, type TreeCard } from "./types";

export const firstAskCards: Record<string, TreeCard> = {
  start: {
    id: "start",
    section: "start",
    kind: "legend",
    eyebrow: "Start Here",
    text: [
      "This is a conversation decision tree for our cold calls. The deeper down the tree you are able to go in a conversation before pulling back to a sale, the more qualified the lead will be.",
      "A red line means stop and wait for the prospect to respond before continuing with your pitch. A green line means go — continue your pitch by reading the next box.",
      "Don't be afraid to lose a lead trying to get a deeper understanding of their situation, because the deeper you dive into their situation the more you look like a professional instead of a salesman.",
      "With that being said: it's very important to read the person's tone, so you can determine how hot or cold they are, because you can lose a sale trying to engage someone who is no longer trying to be on the phone.",
      "When someone is warm, seek to get a deeper understanding of their situation. When they're cold, get the conversation back to the golden line and finish setting the lead.",
      '**Questions I like to ask if people are warm:**\n"If we find damage, is this something you\'re gonna want to pursue?"\n"Do you know anything about your policy?"\n"Have you filed a claim on this property before?"\n"How familiar are you with the claims process?"\n"Do you own other properties?"',
    ].join("\n\n"),
    // Aimed at the "CALL STARTS HERE" sticky next to the opener. The old
    // coords pointed at the legend block, which only exists in the .webp.
    box: { x: 0.0958, y: 0.3985, width: 0.0335, height: 0.0615 },
    next: "opener",
    options: [],
  },

  opener: {
    id: "opener",
    section: "first-ask",
    kind: "dialogue",
    eyebrow: "Step 1",
    text: "Hey (name), can you hear me?",
    box: box(0.1734, 0.4295, 0.0218, 0.0225),
    options: [
      { label: "Lead off", target: "opener-lead-off", labelPos: { x: 0.2113, y: 0.414 } },
      { label: "No lead off", target: "opener-no-lead-off", labelPos: { x: 0.2112, y: 0.442 } },
    ],
  },

  "opener-lead-off": {
    id: "opener-lead-off",
    section: "first-ask",
    kind: "dialogue",
    text: "This is (name). I work for (lead off) — he owns the (lead off) nearby your building on (street name) here in (city).",
    box: box(0.2509, 0.3991, 0.0248, 0.0268),
    next: "first-ask-core",
    options: [
      {
        label: "Ok, what about it",
        target: "first-ask-core",
        labelPos: { x: 0.27, y: 0.3991 },
      },
    ],
  },

  "opener-no-lead-off": {
    id: "opener-no-lead-off",
    section: "first-ask",
    kind: "dialogue",
    text: "This is (name). I'm working near your building on (street) here in (city). Do you still own that building?",
    box: box(0.2512, 0.4595, 0.0260, 0.0265),
    next: "first-ask-core",
    options: [
      {
        label: "Yes, what about it",
        target: "first-ask-core",
        labelPos: { x: 0.2712, y: 0.4606 },
      },
    ],
  },

  "first-ask-core": {
    id: "first-ask-core",
    section: "first-ask",
    kind: "dialogue",
    eyebrow: "First Ask",
    text: "We got called out to do a few inspections up the street from you and have been finding some **pretty bad** hail damage. *Did you have someone inspect your building after that storm in (date)?*",
    box: box(0.318, 0.428, 0.06, 0.045),
    options: [
      {
        label: "Yes, it's been inspected",
        target: "happy-to-hear-damage",
        labelPos: { x: 0.3017, y: 0.457 },
      },
      {
        label: "I don't have insurance / not filing a claim",
        target: "gov-programs",
        labelPos: { x: 0.295, y: 0.3967 },
      },
      {
        label: "I'll get someone else to look",
        target: "maintenance-or-roofer",
        labelPos: { x: 0.3283, y: 0.3949 },
      },
      {
        label: "No one has inspected the building yet",
        target: "close-gotcha",
        labelPos: { x: 0.3833, y: 0.4268 },
      },
      {
        label: "We aren't having any problems",
        target: "not-causing-leaks-yet",
        labelPos: { x: 0.3543, y: 0.4411 },
      },
      {
        label: '"Not interested"',
        target: "of-course-not-note",
        labelPos: { x: 0.337, y: 0.4201 },
      },
      {
        label: "I have a roofer",
        target: "qualify-out-of-blue-or-roofer",
        labelPos: { x: 0.3487, y: 0.3805 },
      },
      {
        label: "Don't have damage",
        target: "obj-ok-great-missed-you",
        labelPos: { x: 0.35, y: 0.4676 },
      },
      {
        label: "I'll call my insurance",
        target: "obj-may-not-need-to-call",
        labelPos: { x: 0.3467, y: 0.4849 },
      },
    ],
  },

  "happy-to-hear-damage": {
    id: "happy-to-hear-damage",
    section: "first-ask",
    kind: "dialogue",
    text: "I'm happy to hear that. Did you guys end up having damage?",
    box: box(0.2901, 0.4933, 0.0315, 0.0174),
    options: [
      { label: "Damage", target: "storm-bad-damage", labelPos: { x: 0.267, y: 0.5151 } },
      { label: "No damage", target: "storm-missed", labelPos: { x: 0.2995, y: 0.5127 } },
    ],
  },

  "storm-bad-damage": {
    id: "storm-bad-damage",
    section: "first-ask",
    kind: "dialogue",
    text: "I figured that storm was really bad. Do you guys plan on getting the roof repaired or replaced through insurance?",
    box: box(0.2422, 0.5406, 0.0317, 0.0225),
    options: [
      {
        label: "We filed a claim",
        target: "helping-process",
        labelPos: { x: 0.2133, y: 0.558 },
      },
      {
        label: "They denied the claim",
        target: "sorry-hear-damage",
        labelPos: { x: 0.2028, y: 0.5495 },
      },
      { label: "No", target: "obj-aw-man-why", labelPos: { x: 0.2512, y: 0.5657 } },
    ],
  },

  "storm-missed": {
    id: "storm-missed",
    section: "first-ask",
    kind: "dialogue",
    text: "Wow, that's awesome — I'm glad that storm missed you guys. The damage I've seen has been pretty bad. Well, just so nobody else calls you again…",
    box: box(0.3097, 0.5362, 0.0317, 0.0283),
    next: "close-photo-report-clearance",
    options: [{ label: "Continue", target: "close-photo-report-clearance" }],
  },

  "sorry-hear-damage": {
    id: "sorry-hear-damage",
    section: "first-ask",
    kind: "dialogue",
    text: "Sorry to hear that. Unfortunately this isn't uncommon. Would you be opposed to us stopping by and inspecting the property when we're nearby later this week? I'll let you know if they should've covered the damages. Getting denials overturned is very common and something our company is known for.",
    box: box(0.1751, 0.5513, 0.0322, 0.0597),
    options: [
      {
        label: "Still no",
        target: "obj-already-filed-claim",
        labelPos: { x: 0.1462, y: 0.5477 },
      },
      { label: "Yes", target: "qualify-onsite" },
    ],
  },

  "helping-process": {
    id: "helping-process",
    section: "first-ask",
    kind: "dialogue",
    text: "Do you have someone helping you through that process?",
    box: box(0.2217, 0.5874, 0.0320, 0.0174),
    options: [
      {
        label: "Yes",
        target: "qualify-out-of-blue-or-roofer",
        labelPos: { x: 0.2333, y: 0.6058 },
      },
      { label: "No", target: "obj-familiar-insurance", labelPos: { x: 0.2058, y: 0.6043 } },
    ],
  },

  "not-causing-leaks-yet": {
    id: "not-causing-leaks-yet",
    section: "first-ask",
    kind: "dialogue",
    text: "I wouldn't expect you to — the damage we're seeing isn't stuff that's causing immediate leaks, but it will cause problems in the future. I can let you know if you're in the same boat and….",
    box: box(0.3867, 0.4505, 0.0310, 0.0323),
    next: "close-free-inspection",
    options: [{ label: "Continue", target: "close-free-inspection" }],
  },

  "of-course-not-note": {
    id: "of-course-not-note",
    section: "first-ask",
    kind: "dialogue",
    text: "Of course not — just so no one from my company calls you again (I'll go ahead and put a note in the file), did you guys already come take a look, or just don't have any leaks after the storm?",
    box: box(0.3913, 0.3970, 0.0310, 0.0377),
    options: [],
  },

  "gov-programs": {
    id: "gov-programs",
    section: "first-ask",
    kind: "dialogue",
    text: "That's no problem — there's a few government programs and grants that let you put a new roof on at no cost, even if you don't have insurance. Are you dealing with any issues or leaks currently?",
    box: box(0.28, 0.359, 0.06, 0.045),
    options: [
      {
        label: "They have issues",
        target: "gov-manager-meeting",
        labelPos: { x: 0.273, y: 0.323 },
      },
      { label: "No issues", target: "biggest-reason", labelPos: { x: 0.2838, y: 0.3312 } },
    ],
  },

  "biggest-reason": {
    id: "biggest-reason",
    section: "first-ask",
    kind: "dialogue",
    text: "The biggest reason we'd get a look into this now is #1, to let you know if the damage sustained will cause you any leaks or problems in the future, and #2, to help stop them from happening before they start.",
    box: box(0.2851, 0.3002, 0.0288, 0.0304),
    next: "gov-manager-meeting",
    options: [{ label: "Continue", target: "gov-manager-meeting" }],
  },

  "maintenance-or-roofer": {
    id: "maintenance-or-roofer",
    section: "first-ask",
    kind: "dialogue",
    text: "Hey, that's great to hear — I'm sure you have a maintenance guy who works for ya, or is it a roofer?",
    box: box(0.3313, 0.3645, 0.0317, 0.0228),
    options: [
      {
        label: "Maintenance guy",
        target: "maintenance-guy-response",
        labelPos: { x: 0.3287, y: 0.3465 },
      },
      {
        label: "Roofer",
        target: "qualify-out-of-blue-or-roofer",
        labelPos: { x: 0.344, y: 0.3418 },
      },
    ],
  },

  "maintenance-guy-response": {
    id: "maintenance-guy-response",
    section: "first-ask",
    kind: "dialogue",
    text: "Pretty much all my clients have a maintenance guy and they're great, but they're not looking for the same kind of stuff we are. We'll be able to tell you if you have legitimate storm damage, if it affected the lifespan of your roof, and if it's worth looking into filing a claim.",
    box: box(0.3169, 0.3090, 0.0325, 0.0493),
    next: "close-free-inspection",
    options: [{ label: "Continue", target: "close-free-inspection" }],
  },

  // Where both government-programs branches land: hand the no-insurance
  // prospect to a manager rather than winging the grant conversation.
  "gov-manager-meeting": {
    id: "gov-manager-meeting",
    section: "first-ask",
    kind: "dialogue",
    text: "I'd love to set up a meeting to go over the options available for you, but I'm gonna have a manager reach out because I'm not super well versed in it. Do you have time in your schedule this week, or is next week better?",
    box: box(0.2458, 0.2571, 0.0265, 0.0271),
    next: "collect-good-email",
    options: [
      {
        label: "This time works…",
        target: "collect-good-email",
        labelPos: { x: 0.2458, y: 0.2301 },
      },
    ],
  },
};
