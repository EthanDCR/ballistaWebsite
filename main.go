package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/hook"
	"github.com/pocketbase/pocketbase/tools/osutils"
)

func main() {
	app := pocketbase.New()

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
