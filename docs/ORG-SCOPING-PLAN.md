# Org scoping for call recordings and reviews — plan

## Why

Reps upload their own calls; an admin posts a written review or a Loom link
against each one. Once a second company is on Call-Stars, every rep can
currently see every other company's calls — `call_recordings` is readable by
any signed-in account (`list: authed`).

The goal: a rep sees calls and reviews from their own company and nobody
else's.

This mirrors `MULTI-TENANCY-PLAN.md` in the Praxis repo, which landed on
`org_id` + a separate role enum enforced at the database layer rather than
filtered in app code. Same reasoning applies: one forgotten `.filter()` in a
future code path is a cross-company leak, so the boundary belongs in the
collection rules.

---

## The two problems that make this more than "add an org field"

### 1. `role` already means something, and it is not what customers need

`ruleAdmin` is `@request.auth.role = 'admin'`, and it is the **write rule on
every global content collection** — `opening_call_scripts`, `objections`,
`closing_scripts`, `modules_content`, `quiz_questions`, `training_videos`,
`app_settings`.

So if a customer's admin is given `role: "admin"` so they can manage their own
company's recordings, they also get write access to the course content that
every company shares. That is a cross-tenant escalation and it is a very easy
mistake to make, because the field is just called `role`.

**Two axes, not one:**

| field | values | means |
|---|---|---|
| `staff_role` (renamed from `role`) | `rep` \| `admin` | Ballista staff. Governs global course content. Never set for a customer. |
| `org_role` (new) | `rep` \| `manager` | Position inside one company. Governs that company's recordings and reviews. |

Renaming `role` → `staff_role` costs a backfill of two rows plus updating
`ruleAdmin` and `isAdmin()` in `TrainingApp.tsx`. Doing it later, with
customer accounts in the table, costs considerably more. Recommend renaming
now. The cheaper alternative is to keep `role` and lean on comments, but the
whole point of this work is preventing that exact confusion.

### 2. The recordings are served from public URLs

`call_recordings.file` is a `core.FileField` with no `Protected` set, and it
defaults to `false`. A `false` here means **the file URL works for anyone who
has it, regardless of the collection's list/view rules.** `TrainingApp.tsx:120`
builds exactly such a URL with `pb.files.getURL(...)`.

So org-scoping the *records* would not protect the *audio*. Any leaked or
forwarded link stays playable by anyone. Fixing this is not optional if the
point of the exercise is that companies cannot hear each other's calls.

Requires, together in one deploy:
- `Protected: true` on the file field
- the frontend calling `pb.files.getToken()` and appending `?token=`

**Watch the token lifetime.** `fileToken.duration` is 180 seconds. The current
code bakes `recording_url` once in `fetchUploadedRecordings`
(`TrainingApp.tsx:116-120`), so a page left open for three minutes would have
dead URLs. The token has to be minted when the rep hits play, not when the
list loads.

### 3. Two holes that org scoping would activate

Both are latent today and become real the moment org membership means
something:

- **`OnRecordCreateRequest("users")`** forces `role: "rep"` and
  `verified: false`, but would not control `org`. A signup payload could claim
  any org id and join another company at creation.
- **`users.updateRule` is `id = @request.auth.id`** with no hook guarding
  privileged fields. A verified rep could `PATCH` their own record's `org` and
  read another company's recordings.

Both fixed by an `OnRecordUpdateRequest("users")` hook that resets
`staff_role`, `org`, `org_role` and `verified` from `e.Record.Original()` for
any non-superuser request — the same shape as the existing create hook.

---

## Schema

### `orgs` (new)

| field | type | notes |
|---|---|---|
| `name` | text, required | company name |
| `created` | autodate | |

Rules: members and staff read (`id = @request.auth.org`); only staff write.

### `users` (modify)

- rename `role` → `staff_role`
- add `org` — relation to `orgs`, maxSelect 1
- add `org_role` — select `rep` \| `manager`

### `call_recordings` (modify)

- add `org` — relation to `orgs`, required
- add `owner` — relation to `users`, required (who uploaded it)
- set `Protected: true` on `file`

| rule | value |
|---|---|
| list / view | `org = @request.auth.org` |
| create | `org = @request.auth.org && owner = @request.auth.id` |
| update | `owner = @request.auth.id \|\| (org = @request.auth.org && @request.auth.org_role = 'manager')` |
| delete | same as update |

`create` is also enforced in a hook rather than trusted from the payload —
`OnRecordCreateRequest("call_recordings")` stamps `org` and `owner` from the
authenticated user. The rule catches it; the hook means it cannot be sent
wrong in the first place.

### `call_reviews` (new)

| field | type | notes |
|---|---|---|
| `recording` | relation → `call_recordings`, required | |
| `org` | relation → `orgs`, required | denormalised so the rule is one comparison, not a join |
| `author` | relation → `users` | who wrote it |
| `body` | text, 4000 | written review |
| `loom_url` | text, 500 | link to a recorded review |
| `created` | autodate | |

| rule | value |
|---|---|
| list / view | `org = @request.auth.org` |
| create / update / delete | `@request.auth.org_role = 'manager' && org = @request.auth.org`, or staff |

**Open question — review visibility.** The rules above let everyone in a
company read every review, matching "calls and reviews from themselves and
people in their own company". If a review should instead be private between
the rep and the reviewer, the read rule becomes
`recording.owner = @request.auth.id || @request.auth.org_role = 'manager'`.
Worth deciding before this ships: reps may be franker about their own calls if
the whole floor is not reading the feedback.

---

## Order of work

The order matters — applying restrictive rules before backfilling makes
existing rows invisible to everyone.

1. Create `orgs`; seed a single "Ballista" org.
2. Add `org` / `org_role` to `users`, rename `role` → `staff_role`. Backfill
   both existing accounts into the Ballista org. Update `ruleAdmin` and
   `isAdmin()` to match.
3. Add the users update hook, and extend the create hook to cover `org`.
4. Add `org` / `owner` to `call_recordings`. Backfill existing rows to the
   Ballista org and a staff owner.
5. **Only now** apply the restrictive rules to `call_recordings`.
6. Create `call_reviews`.
7. Flip `Protected: true` **and** ship the frontend token change together.
   Either alone breaks playback.
8. Rep-facing upload UI, and an admin screen for reviews.

Steps 1–6 are backward compatible if done in order. Step 7 is the one that
must land as a single deploy.

---

## Not covered here, but needed

- **An admin screen to create orgs and assign people to them.** Nothing in the
  app does this yet, and the approval flow is already manual (an admin ticks
  `verified`), so assigning an org fits naturally in the same step. Until that
  exists, org assignment happens in the PocketBase dashboard.
- **A rep-facing upload path.** `AudioUploadPanel` currently lives inside
  `AdminStudio` and `call_recordings.create` is `adminOnly`. Reps uploading
  their own calls needs the panel moved or duplicated into the rep portal.
- **Storage growth.** Disk is the right call for now — `pb_data` is already a
  mounted volume in the Dockerfile. But curated review clips and "every rep
  uploads every call" are different orders of magnitude: at ~2.4 MB for a
  five-minute call, ten reps uploading fifty calls a day is ~1.2 GB/day. Worth
  deciding which model this is, and setting PocketBase's backup job to ship to
  S3 either way.
- **A Render persistent disk pins the service to one instance** and rules out
  zero-downtime deploys. Fine for an internal portal; worth knowing before
  this is sold.
