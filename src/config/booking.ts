/**
 * Where every "Book a call" button goes. One constant on purpose: when the
 * real scheduler is picked (Cal.com / Calendly / whatever ends up holding the
 * calendar), swapping this line is the whole change.
 *
 * Until then it is a placeholder that drops people on the landing page's
 * waitlist band, so no booking button is ever a dead end.
 */
export const BOOKING_URL = "#contact";

/**
 * The same link for anywhere that is not the landing page. The landing page
 * can scroll to its own in-page anchor; the training app has to leave for "/"
 * first. A real scheduler URL is absolute, so it passes through both of these
 * untouched and `BOOKING_URL` stays the only thing to edit.
 */
export const BOOKING_URL_OFFSITE = BOOKING_URL.startsWith("#") ? `/${BOOKING_URL}` : BOOKING_URL;
