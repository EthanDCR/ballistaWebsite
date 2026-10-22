import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import TrainingApp from "./pages/TrainingApp.tsx";
import ColdCallTree from "./pages/ColdCallTree.tsx";
import Login from "./pages/Login.tsx";
import Terms from "./pages/Terms.tsx";
import Landing from "./pages/Landing.tsx";
import RequireAuth from "./lib/RequireAuth.tsx";
import { CALLSTARS_HOST, onCallStarsHost, onMainHost } from "./config/hosts.ts";

// On callstars.theballista.com the portal IS the site, so it answers at "/"
// rather than making people find /training. On theballista.com the landing
// page answers at "/" and /training bounces to the other domain, so the
// portal has one address rather than two. Everywhere else — localhost, a
// preview URL — both paths work exactly as written.
const callStars = onCallStarsHost();
const mainSite = onMainHost();

/**
 * Leaves for the portal's own domain, carrying the query with it — the
 * landing page links to "/training?module=intro" and that module has to
 * survive the hop. A full assignment, not a router navigation: this is a
 * different origin.
 */
function RedirectToCallStars() {
  window.location.replace(`https://${CALLSTARS_HOST}/${window.location.search}`);
  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/" element={callStars ? <TrainingApp /> : <Landing />} />
        {/* Public on purpose: a signed-out visitor gets the preview module and
            nothing else. TrainingApp decides what to show, and the collection
            rules in main.go decide what is actually served. */}
        <Route
          path="/training"
          element={mainSite ? <RedirectToCallStars /> : <TrainingApp />}
        />
        <Route
          path="/cold-call-tree"
          element={
            <RequireAuth>
              <ColdCallTree />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
