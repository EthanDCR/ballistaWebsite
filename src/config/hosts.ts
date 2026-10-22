/**
 * Two products, two domains, one deployment.
 *
 * `theballista.com` is the marketing page for the platform.
 * `callstars.theballista.com` is the training portal.
 *
 * Both names point at the same Render service and the same Go binary, so the
 * split happens here rather than in the server: the hostname decides what "/"
 * renders, and each product gets one canonical home instead of both being
 * reachable at both names.
 *
 * Any other host — localhost, a Render preview URL, an IP — matches neither
 * and gets the paths as written: "/" is the landing page, "/training" is the
 * portal. Development is unaffected by any of this.
 */
export const CALLSTARS_HOST = "callstars.theballista.com";
export const MAIN_HOST = "theballista.com";

/** The training portal's own domain, where "/" is Call-Stars itself. */
export function onCallStarsHost(hostname = window.location.hostname): boolean {
  return hostname === CALLSTARS_HOST;
}

/** The marketing domain, with or without the www. */
export function onMainHost(hostname = window.location.hostname): boolean {
  return hostname === MAIN_HOST || hostname === `www.${MAIN_HOST}`;
}

/**
 * Where a link to Call-Stars should point from wherever it is being rendered.
 *
 * On the marketing domain that is the other hostname, so the portal is only
 * ever one address; anywhere else — development included — it stays a path on
 * the current origin, which is the same app either way.
 */
export function callStarsUrl(search = ""): string {
  const suffix = search && !search.startsWith("?") ? `?${search}` : search;
  return onMainHost() ? `https://${CALLSTARS_HOST}/${suffix}` : `/training${suffix}`;
}
