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
			if err := lockDownUsersCollection(e.App); err != nil {
				return err
			}
			return ensureContentCollections(e.App)
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
	ruleAdmin  = "@request.auth.role = 'admin'"
)

// lockDownUsersCollection disables public self-registration on the built-in
// users collection (accounts are created manually from the PocketBase admin
// dashboard) and adds the role field used to gate the Admin mode of the app.
func lockDownUsersCollection(app core.App) error {
	collection, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return err
	}

	collection.CreateRule = nil
	collection.ListRule = nil
	collection.DeleteRule = nil

	if collection.Fields.GetByName("role") == nil {
		collection.Fields.Add(&core.SelectField{
			Name:      "role",
			Values:    []string{"rep", "admin"},
			MaxSelect: 1,
		})
	}

	return app.Save(collection)
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
	adminOnly := types.Pointer(ruleAdmin)

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
			list:     authed, view: authed, create: adminOnly, update: adminOnly, delete: adminOnly,
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
			list:     authed, view: authed, create: adminOnly, update: adminOnly, delete: adminOnly,
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

// ensureCallRecordingsCollection creates the call_recordings collection on
// first boot so the Call Library upload feature has somewhere to store
// audio, and keeps its access rules in sync on every boot. Only admins may
// upload/remove recordings; any signed-in rep can list/listen.
func ensureCallRecordingsCollection(app core.App) error {
	authed := types.Pointer(ruleAuthed)
	adminOnly := types.Pointer(ruleAdmin)

	return ensureCollection(app, collectionDef{
		name: "call_recordings",
		fields: []core.Field{
			&core.TextField{Name: "title", Required: true, Max: 200},
			&core.TextField{Name: "duration", Max: 20},
			&core.TextField{Name: "coaching_notes", Max: 1500},
			&core.FileField{
				Name:      "file",
				MaxSelect: 1,
				MaxSize:   100 << 20,
				MimeTypes: []string{
					"audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/x-wav",
					"audio/aac", "audio/ogg", "audio/webm",
				},
			},
			&core.JSONField{Name: "timestamps"},
			&core.AutodateField{Name: "created", OnCreate: true},
		},
		list: authed, view: authed, create: adminOnly, delete: adminOnly,
	})
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
