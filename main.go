package main

import (
	"embed"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/hook"
	"github.com/pocketbase/pocketbase/tools/osutils"
	"github.com/pocketbase/pocketbase/tools/types"
)

//go:embed seed/*.json
var seedFS embed.FS

func main() {
	app := pocketbase.New()

	app.OnBootstrap().Bind(&hook.Handler[*core.BootstrapEvent]{
		Func: func(e *core.BootstrapEvent) error {
			if err := e.Next(); err != nil {
				return err
			}
			// Order matters: users gains a relation to orgs, and the backfill
			// needs both to exist before it can place anyone.
			if err := ensureOrgsCollection(e.App); err != nil {
				return err
			}
			if err := lockDownUsersCollection(e.App); err != nil {
				return err
			}
			if err := backfillOrgMembership(e.App); err != nil {
				return err
			}
			return ensureContentCollections(e.App)
		},
	})

	// Self-signups always land as unapproved reps. PocketBase already refuses
	// to let a non-superuser set `verified`, but `role` is our own field and
	// would otherwise be settable straight from the signup payload — letting
	// someone grant themselves Admin mode the moment they were approved.
	app.OnRecordCreateRequest("users").Bind(&hook.Handler[*core.RecordRequestEvent]{
		Func: func(e *core.RecordRequestEvent) error {
			if !e.HasSuperuserAuth() {
				e.Record.Set("staff_role", "rep")
				e.Record.SetVerified(false)
				// Signing up never chooses your company. Without this the
				// payload could name any org id and join it outright. An
				// admin assigns org and org_role when approving the account.
				e.Record.Set("org", "")
				e.Record.Set("org_role", "rep")
				// Stamped here rather than taken from the payload for the same
				// reason as role: the signup request is attacker-controlled and
				// could otherwise claim acceptance of any version it likes. The
				// signup form refuses to submit without the box ticked.
				e.Record.Set("terms_accepted_at", types.NowDateTime())
				e.Record.Set("terms_version", termsVersion)
			}
			return e.Next()
		},
	})

	// staff_role, org, org_role and verified are all privilege fields, and the
	// users collection lets an account edit its own record. Without this a rep
	// could PATCH their own org and read another company's recordings, or set
	// staff_role=admin and rewrite the course content every company shares.
	// Reset all four from what is stored.
	app.OnRecordUpdateRequest("users").Bind(&hook.Handler[*core.RecordRequestEvent]{
		Func: func(e *core.RecordRequestEvent) error {
			if e.HasSuperuserAuth() {
				return e.Next()
			}
			original := e.Record.Original()

			// staff_role grants write access to the course content every
			// company shares. Promoting someone to it stays a dashboard
			// action — there is no path to it through the app, for anyone.
			e.Record.Set("staff_role", original.GetString("staff_role"))

			// Ballista staff administer membership from the admin studio.
			// Everyone else — including a rep editing their own record — gets
			// these reset, which is what stops someone moving themselves into
			// another company to read its recordings.
			if e.Auth == nil || e.Auth.GetString("staff_role") != "admin" {
				e.Record.Set("org", original.GetString("org"))
				e.Record.Set("org_role", original.GetString("org_role"))
				e.Record.SetVerified(original.GetBool("verified"))
			}
			return e.Next()
		},
	})

	// A rep uploads for themselves, into their own company. Both fields are
	// taken from the token rather than the request body — the collection rule
	// would reject a mismatch anyway, but stamping means a wrong value cannot
	// be sent in the first place, and the client never has to know its org id.
	app.OnRecordCreateRequest("call_recordings").Bind(&hook.Handler[*core.RecordRequestEvent]{
		Func: func(e *core.RecordRequestEvent) error {
			if !e.HasSuperuserAuth() && e.Auth != nil {
				e.Record.Set("owner", e.Auth.Id)
				e.Record.Set("org", e.Auth.GetString("org"))
			}
			return e.Next()
		},
	})

	// Same for a review: it belongs to whoever wrote it, in their company.
	app.OnRecordCreateRequest("call_reviews").Bind(&hook.Handler[*core.RecordRequestEvent]{
		Func: func(e *core.RecordRequestEvent) error {
			if !e.HasSuperuserAuth() && e.Auth != nil {
				e.Record.Set("author", e.Auth.Id)
				e.Record.Set("org", e.Auth.GetString("org"))
			}
			return e.Next()
		},
	})

	// serve the built frontend (npm run build -> pb_public) so prod only
	// needs this one process; falls back to index.html for client routing.
	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			if !e.Router.HasRoute(http.MethodGet, "/{path...}") {
				e.Router.GET("/{path...}", apis.Static(os.DirFS(publicDir()), true))
			}
			return e.Next()
		},
		Priority: 999,
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

// publicDir mirrors pocketbase's own default: relative to the working
// directory under `go run`, relative to the executable when built.
func publicDir() string {
	if osutils.IsProbablyGoRun() {
		return "./pb_public"
	}

	return filepath.Join(filepath.Dir(os.Args[0]), "pb_public")
}

const (
	ruleAuthed = "@request.auth.id != ''"

	// Ballista staff. Governs the global course content every company shares,
	// so it is deliberately NOT the same thing as running a customer's org —
	// see orgRoleManager for that. Never set staff_role on a customer.
	ruleStaffAdmin = "@request.auth.staff_role = 'admin'"

	// Membership of the signed-in rep's own company. Every org-scoped
	// collection carries an `org` relation so this is one comparison.
	ruleOwnOrg = "org = @request.auth.org"

	// A manager inside their own company.
	ruleOrgManager = ruleOwnOrg + " && @request.auth.org_role = 'manager'"

	// The org every pre-existing account is backfilled into.
	defaultOrgName = "Ballista"

	// previewModuleKey is the one module a signed-out visitor may read. The
	// landing page sends people straight into the portal to look around, and
	// this is what they are allowed to see; everything else needs an account.
	// Must stay in sync with PREVIEW_MODULES in src/pages/TrainingApp.tsx.
	previewModuleKey = "intro"

	// rulePreview guards the two collections keyed by module. Signed-in reps
	// read everything; anyone at all reads the preview module. Note this is
	// readable by guests on purpose — it is the only content on the site that
	// is. PocketBase applies a list rule as a filter rather than refusing the
	// request, so a visitor simply gets the preview rows and nothing else.
	rulePreview = ruleAuthed + " || module_key = '" + previewModuleKey + "'"
)

// termsVersion is the Terms of Service revision stamped onto an account when
// it signs up. Bump it when the terms in Terms.tsx change; comparing it against
// a user's terms_version is what tells you who still owes a fresh acceptance.
// Unrelated to the Standard of Performance version recorded in sign_offs.
const termsVersion = "1.0"

// lockDownUsersCollection opens self-registration on the built-in users
// collection but gates it behind manual approval: anyone may create an
// account, yet PocketBase refuses to issue a token until a superuser ticks
// `verified` from the admin dashboard. Enforcing that through AuthRule (not
// the frontend) means an unapproved account cannot authenticate even by
// calling the API directly. It also adds the role field used to gate the
// Admin mode of the app.
func lockDownUsersCollection(app core.App) error {
	collection, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return err
	}

	// Anyone can sign up; nobody can delete an account through the API.
	openSignup := ""
	collection.CreateRule = &openSignup
	collection.DeleteRule = nil

	// Listing accounts is Ballista staff only — the roster is the customer
	// list, and the admin studio that consumes it is itself gated on
	// staff_role. Reps have no reason to enumerate anyone.
	collection.ListRule = types.Pointer(ruleStaffAdmin)

	// Viewing a single account is wider: anyone may read a colleague in their
	// own company. `expand` follows the view rule, and without this a rep
	// could not resolve the name of whoever reviewed their call. It exposes
	// little — PocketBase withholds `email` from anyone without manage access,
	// so this is a name within a company that already knows it.
	collection.ViewRule = types.Pointer(ruleStaffAdmin + " || " + ruleOwnOrg)

	// Your own record, or anyone staff is administering.
	ownOrStaff := types.Pointer("id = @request.auth.id || " + ruleStaffAdmin)
	collection.UpdateRule = ownOrStaff

	// ManageRule is what PocketBase checks before letting a non-superuser
	// change `verified` (and email) on someone else's record — without it,
	// approving an account is impossible outside the dashboard. Staff only:
	// manage access also covers setting a password, which is more than a
	// customer's manager should hold over a colleague.
	collection.ManageRule = types.Pointer(ruleStaffAdmin)

	// ...but only approved (verified) accounts may obtain an auth token
	onlyApproved := "verified = true"
	collection.AuthRule = &onlyApproved

	// `role` was ambiguous once customers arrived: it gates the global course
	// content, which is a Ballista-staff concern, not a customer-admin one.
	// Renamed in place so SetName keeps the field id and PocketBase renames
	// the column instead of dropping what is stored in it.
	if field := collection.Fields.GetByName("role"); field != nil {
		field.SetName("staff_role")
	}
	if collection.Fields.GetByName("staff_role") == nil {
		collection.Fields.Add(&core.SelectField{
			Name:      "staff_role",
			Values:    []string{"rep", "admin"},
			MaxSelect: 1,
		})
	}

	// Which company this person belongs to, and what they are inside it.
	// Neither is settable by the account holder — see the create and update
	// hooks in main(). An admin assigns both when approving the account.
	orgs, err := app.FindCollectionByNameOrId("orgs")
	if err != nil {
		return err
	}
	if collection.Fields.GetByName("org") == nil {
		collection.Fields.Add(&core.RelationField{
			Name:         "org",
			CollectionId: orgs.Id,
			MaxSelect:    1,
		})
	}
	if collection.Fields.GetByName("org_role") == nil {
		collection.Fields.Add(&core.SelectField{
			Name:      "org_role",
			Values:    []string{"rep", "manager"},
			MaxSelect: 1,
		})
	}

	// Terms of Service acceptance, recorded once at signup so reps aren't
	// asked again on every sign-in. The version travels with the timestamp:
	// a bool could not say *which* terms were accepted, so revising them
	// would leave no way to tell who still needs to re-accept.
	if collection.Fields.GetByName("terms_accepted_at") == nil {
		collection.Fields.Add(&core.DateField{Name: "terms_accepted_at"})
	}
	if collection.Fields.GetByName("terms_version") == nil {
		collection.Fields.Add(&core.TextField{Name: "terms_version", Max: 20})
	}

	return app.Save(collection)
}

// ensureOrgsCollection creates the tenant table and seeds one org, so the
// accounts that predate multi-tenancy have somewhere to be placed.
func ensureOrgsCollection(app core.App) error {
	collection, err := app.FindCollectionByNameOrId("orgs")
	if err != nil {
		collection = core.NewBaseCollection("orgs")
		collection.Fields.Add(
			&core.TextField{Name: "name", Required: true, Max: 200},
			&core.AutodateField{Name: "created", OnCreate: true},
		)
	}

	// A rep may read their own company's row — the admin studio shows the name
	// — but only Ballista staff may list every company or change one.
	visible := types.Pointer("id = @request.auth.org || " + ruleStaffAdmin)
	staffOnly := types.Pointer(ruleStaffAdmin)
	collection.ListRule = visible
	collection.ViewRule = visible
	collection.CreateRule = staffOnly
	collection.UpdateRule = staffOnly
	collection.DeleteRule = staffOnly

	if err := app.Save(collection); err != nil {
		return err
	}

	existing, err := app.FindAllRecords("orgs")
	if err != nil {
		return err
	}
	if len(existing) > 0 {
		return nil
	}

	record := core.NewRecord(collection)
	record.Set("name", defaultOrgName)
	return app.Save(record)
}

// backfillOrgMembership places any account without an org into the first one.
// It has to run before the org-scoped rules take effect, or the rows that
// predate them become invisible to everybody.
func backfillOrgMembership(app core.App) error {
	orgs, err := app.FindAllRecords("orgs")
	if err != nil {
		return err
	}
	if len(orgs) == 0 {
		return nil
	}
	home := orgs[0].Id

	users, err := app.FindAllRecords("users")
	if err != nil {
		return err
	}
	for _, user := range users {
		changed := false
		if user.GetString("org") == "" {
			user.Set("org", home)
			changed = true
		}
		if user.GetString("org_role") == "" {
			// Whoever was already a Ballista admin runs the founding org; the
			// rest start as reps and get promoted by hand.
			if user.GetString("staff_role") == "admin" {
				user.Set("org_role", "manager")
			} else {
				user.Set("org_role", "rep")
			}
			changed = true
		}
		if !changed {
			continue
		}
		if err := app.Save(user); err != nil {
			return err
		}
	}
	return nil
}

type collectionDef struct {
	name   string
	fields []core.Field
	// seedFile, if set, is a seed/*.json filename holding an array of
	// records to insert the first time this collection is created.
	seedFile string
	// rule presets; a nil string pointer means "superuser only"
	list, view, create, update, delete *string
}

// ensureContentCollections creates (on first boot) and re-syncs the access
// rules (on every boot) for all of the portal's content collections. Content
// is readable by any signed-in rep; only accounts with role=admin may write.
func ensureContentCollections(app core.App) error {
	authed := types.Pointer(ruleAuthed)
	preview := types.Pointer(rulePreview)
	adminOnly := types.Pointer(ruleStaffAdmin)
	// The waitlist form on the public landing page is filled in by people who
	// have no account, so this one create rule has to be open. An empty string
	// is "anyone, signed in or not"; nil would be superuser-only and the form
	// would fail for every real visitor. Everything else about the collection
	// stays admin-only — a readable waitlist is a mailing list anyone can
	// scrape.
	anyone := types.Pointer("")

	defs := []collectionDef{
		{
			name: "opening_call_scripts",
			fields: []core.Field{
				&core.NumberField{Name: "part", Required: true},
				&core.TextField{Name: "part_title", Required: true, Max: 200},
				&core.TextField{Name: "purpose", Max: 1000},
				&core.TextField{Name: "exact_script", Max: 4000},
				&core.JSONField{Name: "success_indicators"},
				&core.JSONField{Name: "common_mistakes"},
				&core.BoolField{Name: "active"},
				&core.NumberField{Name: "order"},
			},
			seedFile: "opening_call_scripts.json",
			list:     authed, view: authed, create: adminOnly, update: adminOnly, delete: adminOnly,
		},
		{
			name: "opening_call_scenarios",
			fields: []core.Field{
				&core.TextField{Name: "name", Required: true, Max: 100},
				&core.TextField{Name: "address", Max: 200},
				&core.TextField{Name: "city", Max: 100},
				&core.TextField{Name: "hail_date", Max: 50},
				&core.BoolField{Name: "active"},
				&core.NumberField{Name: "order"},
			},
			seedFile: "opening_call_scenarios.json",
			list:     authed, view: authed, create: adminOnly, update: adminOnly, delete: adminOnly,
		},
		{
			name: "objections",
			fields: []core.Field{
				&core.TextField{Name: "objection_id", Max: 50},
				&core.TextField{Name: "title", Required: true, Max: 200},
				&core.SelectField{Name: "level", Values: []string{"easy", "medium", "hard", "expert"}, MaxSelect: 1},
				&core.JSONField{Name: "prompts"},
				&core.TextField{Name: "rebuttal", Max: 4000},
				&core.JSONField{Name: "required_keywords"},
				&core.JSONField{Name: "optional_keywords"},
				&core.JSONField{Name: "forbidden_keywords"},
				&core.JSONField{Name: "hints"},
				&core.BoolField{Name: "active"},
				&core.NumberField{Name: "order"},
			},
			seedFile: "objections.json",
			list:     authed, view: authed, create: adminOnly, update: adminOnly, delete: adminOnly,
		},
		{
			name: "closing_scripts",
			fields: []core.Field{
				&core.TextField{Name: "close_type", Max: 100},
				&core.TextField{Name: "title", Required: true, Max: 200},
				&core.TextField{Name: "when_to_use", Max: 1000},
				&core.TextField{Name: "exact_script", Max: 4000},
				&core.JSONField{Name: "success_indicators"},
				&core.BoolField{Name: "active"},
				&core.NumberField{Name: "order"},
			},
			seedFile: "closing_scripts.json",
			list:     authed, view: authed, create: adminOnly, update: adminOnly, delete: adminOnly,
		},
		{
			name: "objection_mastery_labs",
			fields: []core.Field{
				&core.TextField{Name: "title", Required: true, Max: 200},
				&core.SelectField{Name: "level", Values: []string{"easy", "medium", "hard", "expert"}, MaxSelect: 1},
				&core.TextField{Name: "prompt", Max: 1000},
				&core.TextField{Name: "rebuttal", Max: 4000},
				&core.JSONField{Name: "keywords"},
				&core.BoolField{Name: "active"},
				&core.NumberField{Name: "order"},
			},
			seedFile: "objection_mastery_labs.json",
			list:     authed, view: authed, create: adminOnly, update: adminOnly, delete: adminOnly,
		},
		{
			name: "training_videos",
			fields: []core.Field{
				&core.SelectField{Name: "category", Values: []string{"software", "prospecting"}, MaxSelect: 1},
				&core.TextField{Name: "title", Required: true, Max: 200},
				&core.TextField{Name: "description", Max: 1000},
				&core.TextField{Name: "video_url", Max: 500},
				&core.BoolField{Name: "active"},
				&core.NumberField{Name: "order"},
			},
			seedFile: "training_videos.json",
			list:     authed, view: authed, create: adminOnly, update: adminOnly, delete: adminOnly,
		},
		{
			name: "modules_content",
			fields: []core.Field{
				&core.TextField{Name: "module_key", Required: true, Max: 50},
				&core.TextField{Name: "video_url", Max: 500},
				&core.TextField{Name: "overview_title", Max: 200},
				&core.TextField{Name: "overview_description", Max: 1000},
				&core.JSONField{Name: "overview_topics"},
			},
			seedFile: "modules_content.json",
			list:     preview, view: preview, create: adminOnly, update: adminOnly, delete: adminOnly,
		},
		{
			name: "quiz_questions",
			fields: []core.Field{
				&core.TextField{Name: "module_key", Required: true, Max: 50},
				&core.TextField{Name: "question", Required: true, Max: 1000},
				&core.TextField{Name: "type", Max: 50},
				&core.JSONField{Name: "options"},
				&core.NumberField{Name: "correct_index"},
				&core.TextField{Name: "explanation", Max: 1000},
				&core.NumberField{Name: "order"},
			},
			seedFile: "quiz_questions.json",
			list:     preview, view: preview, create: adminOnly, update: adminOnly, delete: adminOnly,
		},
		{
			name: "sign_offs",
			fields: []core.Field{
				&core.TextField{Name: "typed_name", Required: true, Max: 200},
				&core.TextField{Name: "user_email", Required: true, Max: 200},
				&core.TextField{Name: "signed_at", Max: 50},
				&core.TextField{Name: "signature_data", Max: 200000},
				&core.TextField{Name: "document_version", Max: 20},
				&core.AutodateField{Name: "created", OnCreate: true},
			},
			list: adminOnly, view: adminOnly, create: authed, update: adminOnly, delete: adminOnly,
		},
		{
			// Signups from the landing page's "Join the software waitlist"
			// dialog. Field names match MflDemoRequest in
			// src/components/maroon-fintech-landing.tsx — the client posts
			// that object as-is, so renaming a field there means renaming it
			// here. Nothing is required at this layer: the dialog validates
			// name, email and phone before it ever posts, and a half-filled
			// row is still a lead worth keeping over a rejected request.
			name: "access_requests",
			fields: []core.Field{
				&core.TextField{Name: "name", Max: 200},
				&core.TextField{Name: "email", Max: 200},
				&core.TextField{Name: "phone", Max: 50},
				&core.TextField{Name: "company", Max: 200},
				&core.TextField{Name: "size", Max: 50},
				&core.TextField{Name: "revenue", Max: 50},
				&core.AutodateField{Name: "created", OnCreate: true},
			},
			list: adminOnly, view: adminOnly, create: anyone, update: adminOnly, delete: adminOnly,
		},
		{
			name: "app_settings",
			fields: []core.Field{
				&core.TextField{Name: "sop_document_text", Max: 20000},
				&core.TextField{Name: "script_lab_document_title", Max: 200},
				&core.TextField{Name: "script_lab_document_description", Max: 500},
				&core.FileField{Name: "script_lab_document_file", MaxSize: 20 << 20, MimeTypes: []string{"application/pdf"}},
			},
			list: authed, view: authed, create: adminOnly, update: adminOnly, delete: adminOnly,
		},
	}

	for _, def := range defs {
		if err := ensureCollection(app, def); err != nil {
			return err
		}
	}

	if err := ensureCallRecordingsCollection(app); err != nil {
		return err
	}
	if err := protectRecordingFiles(app); err != nil {
		return err
	}

	return ensureAppSettingsRecord(app)
}

func ensureCollection(app core.App, def collectionDef) error {
	collection, err := app.FindCollectionByNameOrId(def.name)
	isNew := err != nil
	if isNew {
		collection = core.NewBaseCollection(def.name)
		collection.Fields.Add(def.fields...)
	} else {
		// reconcile: add any fields introduced since this collection was
		// first created (e.g. after a code update), leave existing ones alone.
		for _, field := range def.fields {
			if collection.Fields.GetByName(field.GetName()) == nil {
				collection.Fields.Add(field)
			}
		}
	}

	collection.ListRule = def.list
	collection.ViewRule = def.view
	collection.CreateRule = def.create
	collection.UpdateRule = def.update
	collection.DeleteRule = def.delete

	if err := app.Save(collection); err != nil {
		return err
	}

	if isNew && def.seedFile != "" {
		return seedCollection(app, collection, def.seedFile)
	}

	return nil
}

// seedCollection bulk-inserts the records embedded in seed/<file> (an array
// of field->value objects) into a freshly-created collection.
func seedCollection(app core.App, collection *core.Collection, file string) error {
	raw, err := seedFS.ReadFile("seed/" + file)
	if err != nil {
		return err
	}

	var rows []map[string]any
	if err := json.Unmarshal(raw, &rows); err != nil {
		return err
	}

	for _, row := range rows {
		record := core.NewRecord(collection)
		for key, value := range row {
			record.Set(key, value)
		}
		if err := app.Save(record); err != nil {
			return err
		}
	}

	return nil
}

// ensureCallRecordingsCollection creates call_recordings and call_reviews and
// keeps their rules in sync. Reps upload their own calls; everyone in the same
// company can listen; nobody sees another company's.
//
// Recordings are created before reviews because a relation field must name an
// existing collection — PocketBase rejects a blank collectionId on save, so
// the two cannot be wired up in either order.
func ensureCallRecordingsCollection(app core.App) error {
	orgs, err := app.FindCollectionByNameOrId("orgs")
	if err != nil {
		return err
	}
	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return err
	}

	// Read is company-wide: a rep learns from a colleague's call as much as
	// their own. Ballista staff see everything so they can support customers.
	visible := types.Pointer(ruleOwnOrg + " || " + ruleStaffAdmin)
	// Create rules are evaluated against the *submitted* body, before
	// OnRecordCreateRequest runs — so they cannot check org or owner, which
	// the hook supplies. (Requiring the client to send them instead would be
	// worse: it would have to know its own org id, and could lie about it.)
	// So the rule answers only "may this account upload at all", and the hook
	// in main() is what makes the stored org and owner correct. It overwrites
	// whatever arrived, so a forged payload gains nothing.
	upload := types.Pointer(ruleAuthed + " && @request.auth.org != ''")
	// Your own call, or anyone managing your company.
	mutate := types.Pointer(
		"owner = @request.auth.id || " + ruleOrgManager + " || " + ruleStaffAdmin,
	)
	// Reviews are written by whoever runs the company, not by the rep being
	// reviewed. Create is split from update/delete for the same reason as
	// upload above: it cannot look at the row's own org.
	reviewCreate := types.Pointer(
		"(@request.auth.org_role = 'manager' && @request.auth.org != '') || " + ruleStaffAdmin,
	)
	review := types.Pointer(ruleOrgManager + " || " + ruleStaffAdmin)

	if err := ensureCollection(app, collectionDef{
		name: "call_recordings",
		fields: []core.Field{
			&core.TextField{Name: "title", Required: true, Max: 200},
			&core.TextField{Name: "duration", Max: 20},
			&core.TextField{Name: "coaching_notes", Max: 1500},
			&core.FileField{
				Name:      "file",
				MaxSelect: 1,
				MaxSize:   100 << 20,
				// Without this the file URL works for anyone holding it,
				// whatever the collection rules say — which would make the
				// org scoping decorative. Playback must mint a token; see
				// recordingUrl() in TrainingApp.tsx.
				Protected: true,
				MimeTypes: []string{
					"audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/x-wav",
					"audio/aac", "audio/ogg", "audio/webm",
				},
			},
			&core.JSONField{Name: "timestamps"},
			&core.RelationField{Name: "org", CollectionId: orgs.Id, MaxSelect: 1, Required: true},
			// Who uploaded it. Stamped from the token, never from the payload.
			&core.RelationField{Name: "owner", CollectionId: users.Id, MaxSelect: 1, Required: true},
			&core.AutodateField{Name: "created", OnCreate: true},
		},
		list: visible, view: visible, create: upload, update: mutate, delete: mutate,
	}); err != nil {
		return err
	}

	recordings, err := app.FindCollectionByNameOrId("call_recordings")
	if err != nil {
		return err
	}

	return ensureCollection(app, collectionDef{
		name: "call_reviews",
		fields: []core.Field{
			&core.RelationField{
				Name: "recording", CollectionId: recordings.Id, MaxSelect: 1, Required: true,
				// A review is about one call; losing the call loses the review.
				CascadeDelete: true,
			},
			&core.RelationField{Name: "org", CollectionId: orgs.Id, MaxSelect: 1, Required: true},
			&core.RelationField{Name: "author", CollectionId: users.Id, MaxSelect: 1},
			&core.TextField{Name: "body", Max: 4000},
			&core.TextField{Name: "loom_url", Max: 500},
			&core.AutodateField{Name: "created", OnCreate: true},
		},
		list: visible, view: visible, create: reviewCreate, update: review, delete: review,
	})
}

// protectRecordingFiles flips the file field to protected.
//
// It is separate because ensureCollection reconciles by *adding* fields that
// are missing and leaves existing ones alone — which is the right default
// (it will not clobber something changed in the dashboard) but means a
// changed attribute on a field that already exists is silently ignored. The
// file field predates org scoping, so its Protected flag needs setting by
// hand. Anything similar in future needs the same treatment.
func protectRecordingFiles(app core.App) error {
	collection, err := app.FindCollectionByNameOrId("call_recordings")
	if err != nil {
		return err
	}
	field, ok := collection.Fields.GetByName("file").(*core.FileField)
	if !ok || field.Protected {
		return nil
	}
	field.Protected = true
	return app.Save(collection)
}

// ensureAppSettingsRecord makes sure exactly one app_settings row exists;
// the frontend fetches whichever one it finds since there's only ever one.
func ensureAppSettingsRecord(app core.App) error {
	collection, err := app.FindCollectionByNameOrId("app_settings")
	if err != nil {
		return err
	}

	existing, err := app.FindAllRecords("app_settings")
	if err != nil {
		return err
	}
	if len(existing) > 0 {
		return nil
	}

	raw, err := seedFS.ReadFile("seed/app_settings.json")
	if err != nil {
		return err
	}
	var fields map[string]any
	if err := json.Unmarshal(raw, &fields); err != nil {
		return err
	}

	record := core.NewRecord(collection)
	for key, value := range fields {
		record.Set(key, value)
	}

	return app.Save(record)
}
