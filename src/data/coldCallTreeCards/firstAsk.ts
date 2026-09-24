// Hand-transcribed from public/cold-call-tree/main-tree.webp (no source
// mermaid/doc exists — this was read directly off the flowchart image).
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
    box: { x: 0, y: 0.3139, width: 0.0532, height: 0.1275 },
    next: "opener",
    options: [],
  },

  opener: {
    id: "opener",
    section: "first-ask",
    kind: "dialogue",
    eyebrow: "Step 1",
    text: "Hey (name), can you hear me?",
    box: box(0.173, 0.428),
    options: [
      { label: "Lead off", target: "opener-lead-off" },
      { label: "No lead off", target: "opener-no-lead-off" },
    ],
  },

  "opener-lead-off": {
    id: "opener-lead-off",
    section: "first-ask",
    kind: "dialogue",
    text: "This is (name). I work for (lead off) — he owns the (lead off) nearby your building on (street name) here in (city).",
    box: box(0.117, 0.415),
    next: "first-ask-core",
    options: [{ label: "Ok, what about it", target: "first-ask-core" }],
  },

  "opener-no-lead-off": {
    id: "opener-no-lead-off",
    section: "first-ask",
    kind: "dialogue",
    text: "This is (name). I'm working near your building on (street) here in (city). Do you still own that building?",
    box: box(0.118, 0.495),
    next: "first-ask-core",
    options: [{ label: "Yes, what about it", target: "first-ask-core" }],
  },

  "first-ask-core": {
    id: "first-ask-core",
    section: "first-ask",
    kind: "dialogue",
    eyebrow: "First Ask",
    text: "We got called out to do a few inspections up the street from you and have been finding some **pretty bad** hail damage. *Did you have someone inspect your building after that storm in (date)?*",
    box: box(0.318, 0.428, 0.06, 0.045),
    options: [
      { label: "Yes, it's been inspected", target: "happy-to-hear-damage" },
      { label: "I don't have insurance / not filing a claim", target: "gov-programs" },
      { label: "I'll get someone else to look", target: "maintenance-or-roofer" },
      { label: "No one has inspected the building yet", target: "of-course-not-note" },
      { label: "We aren't having any problems", target: "not-causing-leaks-yet" },
      { label: '"Not interested"', target: "obj-proceed-new-roof" },
    ],
  },

  "happy-to-hear-damage": {
    id: "happy-to-hear-damage",
    section: "first-ask",
    kind: "dialogue",
    text: "I'm happy to hear that. Did you guys end up having damage?",
    box: box(0.267, 0.518),
    options: [
      { label: "Damage", target: "storm-bad-damage" },
      { label: "No damage", target: "storm-missed" },
    ],
  },

  "storm-bad-damage": {
    id: "storm-bad-damage",
    section: "first-ask",
    kind: "dialogue",
    text: "I figured that storm was really bad. Do you guys plan on getting the roof repaired or replaced through insurance?",
    box: box(0.317, 0.542),
    options: [
      { label: "We filed a claim", target: "helping-process" },
      { label: "They denied the claim", target: "sorry-hear-damage" },
      { label: "No", target: "obj-aw-man-why" },
    ],
  },

  "storm-missed": {
    id: "storm-missed",
    section: "first-ask",
    kind: "dialogue",
    text: "Wow, that's awesome — I'm glad that storm missed you guys. The damage I've seen has been pretty bad. Well, just so nobody else calls you again…",
    box: box(0.292, 0.548),
    next: "obj-insurance-cant-raise",
    options: [{ label: "Continue", target: "obj-insurance-cant-raise" }],
  },

  "sorry-hear-damage": {
    id: "sorry-hear-damage",
    section: "first-ask",
    kind: "dialogue",
    text: "Sorry to hear that. Unfortunately this isn't uncommon. Would you be opposed to us stopping by and inspecting the property when we're nearby later this week? I'll let you know if they should've covered the damages. Getting denials overturned is very common and something our company is known for.",
    box: box(0.192, 0.548, 0.06, 0.045),
    options: [{ label: "Still no", target: "obj-already-filed-claim" }],
  },

  "helping-process": {
    id: "helping-process",
    section: "first-ask",
    kind: "dialogue",
    text: "Do you have someone helping you through that process?",
    box: box(0.292, 0.624),
    options: [
      { label: "Yes", target: "obj-thats-why-here" },
      { label: "No", target: "obj-familiar-insurance" },
    ],
  },

  "not-causing-leaks-yet": {
    id: "not-causing-leaks-yet",
    section: "first-ask",
    kind: "dialogue",
    text: "I wouldn't expect you to — the damage we're seeing isn't stuff that's causing immediate leaks, but it will cause problems in the future. I can let you know if you're in the same boat and….",
    box: box(0.392, 0.472, 0.06, 0.04),
    next: "obj-got-it-radar-hail",
    options: [{ label: "Continue", target: "obj-got-it-radar-hail" }],
  },

  "of-course-not-note": {
    id: "of-course-not-note",
    section: "first-ask",
    kind: "dialogue",
    text: "Of course not — just so no one from my company calls you again (I'll go ahead and put a note in the file), did you guys already come take a look, or just don't have any leaks after the storm?",
    box: box(0.367, 0.438, 0.06, 0.045),
    next: "obj-ok-great-missed-you",
    options: [{ label: "Continue", target: "obj-ok-great-missed-you" }],
  },

  "gov-programs": {
    id: "gov-programs",
    section: "first-ask",
    kind: "dialogue",
    text: "That's no problem — there's a few government programs and grants that let you put a new roof on at no cost, even if you don't have insurance. Are you dealing with any issues or leaks currently?",
    box: box(0.28, 0.359, 0.06, 0.045),
    options: [
      { label: "They have issues", target: "biggest-reason" },
      { label: "No issues", target: "biggest-reason" },
    ],
  },

  "biggest-reason": {
    id: "biggest-reason",
    section: "first-ask",
    kind: "dialogue",
    text: "The biggest reason we'd get a look into this now is #1, to let you know if the damage sustained will cause you any leaks or problems in the future, and #2, to help stop them from happening before they start.",
    box: box(0.3, 0.298, 0.06, 0.045),
    options: [],
  },

  "maintenance-or-roofer": {
    id: "maintenance-or-roofer",
    section: "first-ask",
    kind: "dialogue",
    text: "Hey, that's great to hear — I'm sure you have a maintenance guy who works for ya, or is it a roofer?",
    box: box(0.33, 0.399, 0.06, 0.04),
    options: [
      { label: "Maintenance guy", target: "maintenance-guy-response" },
      { label: "I have a roofer", target: "qualify-out-of-blue-or-roofer" },
    ],
  },

  "maintenance-guy-response": {
    id: "maintenance-guy-response",
    section: "first-ask",
    kind: "dialogue",
    text: "Pretty much all my clients have a maintenance guy and they're great, but they're not looking for the same kind of stuff we are. We'll be able to tell you if you have legitimate storm damage, if it affected the lifespan of your roof, and if it's worth looking into filing a claim.",
    box: box(0.335, 0.313, 0.06, 0.045),
    options: [],
  },
};
