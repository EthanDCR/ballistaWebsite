import { CALLSTARS_HOST } from "../config/hosts";

/**
 * Leaves for the portal's own domain, carrying the query with it — the
 * landing page links to "?module=intro" and that module has to survive the
 * hop. A full assignment rather than a router navigation, because this is a
 * different origin; `replace` so the back button returns to wherever the
 * visitor actually came from instead of bouncing them forward again.
 *
 * Only mounted on theballista.com, where /training is an address the portal
 * no longer answers at. See src/config/hosts.ts.
 */
export default function RedirectToCallStars() {
  window.location.replace(`https://${CALLSTARS_HOST}/${window.location.search}`);
  return null;
}
