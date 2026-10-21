import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate, type Location } from "react-router-dom";
import { MailCheck, PhoneCall } from "lucide-react";
import { ClientResponseError } from "pocketbase";
import { pb } from "../lib/pb";
import { useAuth } from "../lib/RequireAuth";
import "../pages/TrainingApp.css";
import "./Login.css";

type Mode = "signin" | "signup";

// New accounts are created unapproved: PocketBase's auth rule refuses to
// issue a token until a superuser ticks `verified`, so a correct password on
// a pending account still fails. Tell those people what's actually going on
// instead of "incorrect password".
const PENDING_MESSAGE =
  "This account is still awaiting approval. You'll be able to sign in once an admin approves it.";

/**
 * Who to chase about an approval.
 *
 * Accounts are approved by hand, so somebody who has signed up and is waiting
 * has no way through the product itself — these are the only route to a
 * person. The phone number is rendered only once it is set here; leaving it
 * null shows the email alone rather than a placeholder nobody can call.
 */
const CONTACT: { email: string; phone: string | null } = {
  email: "support@theballista.com",
  phone: "(850)797-9698", // TODO: add the number reps should call, e.g. "(303) 555-0134"
};

/** Shown wherever someone is stuck waiting on an approval. */
function ApprovalContact() {
  return (
    <div className="login-contact">
      <p>Need access sooner, or think something has gone wrong? Reach us directly.</p>
      <ul>
        <li>
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        </li>
        {CONTACT.phone && (
          <li>
            <a href={`tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`}>{CONTACT.phone}</a>
          </li>
        )}
      </ul>
    </div>
  );
}

export default function Login() {
  const isValid = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Signing in is what most people arrive here to do, so it stays the default.
  // The landing page's "Sign up" button says otherwise, and sends ?signup.
  const [mode, setMode] = useState<Mode>(() =>
    new URLSearchParams(location.search).has("signup") ? "signup" : "signin",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  // Separate from `error`: an unapproved account is not a mistake the person
  // can fix by retyping, so it gets the contact details rather than a red line.
  const [awaitingApproval, setAwaitingApproval] = useState(false);

  if (isValid) {
    const from = (location.state as { from?: Location } | null)?.from;
    return <Navigate to={from ? `${from.pathname}${from.search}` : "/training"} replace />;
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setAwaitingApproval(false);
    setPassword("");
  }

  async function signIn() {
    try {
      await pb.collection("users").authWithPassword(email, password);
      const from = (location.state as { from?: Location } | null)?.from;
      navigate(from ? `${from.pathname}${from.search}` : "/training", { replace: true });
    } catch (err) {
      // A pending account and a wrong password both come back as a failed
      // auth, so check whether the record exists but isn't approved yet.
      const pending = err instanceof ClientResponseError && err.status === 403;
      setAwaitingApproval(pending);
      setError(pending ? PENDING_MESSAGE : "Incorrect email or password.");
    }
  }

  async function signUp() {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    try {
      await pb.collection("users").create({
        name: name.trim(),
        email: email.trim(),
        password,
        passwordConfirm: password,
      });
      setSignedUp(true);
    } catch (err) {
      const message =
        err instanceof ClientResponseError
          ? Object.values((err.response?.data ?? {}) as Record<string, { message?: string }>)[0]
              ?.message
          : undefined;
      setError(message || "Could not create that account. Try a different email.");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mode === "signup" && !acceptedTerms) {
      setError("Please accept the Terms of Service to continue.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (mode === "signin") {
        await signIn();
      } else {
        await signUp();
      }
    } finally {
      setBusy(false);
    }
  }

  if (signedUp) {
    return (
      <div className="app-shell login-page">
        <div className="login-card">
          <div className="login-pending">
            <MailCheck size={32} />
          </div>
          <h1>Account created</h1>
          <p>
            Every account is approved by hand, so yours needs a quick check before you can sign in.
            We'll get to it as fast as we can — you'll be able to log in as soon as it's done.
          </p>
          <ApprovalContact />
          <button
            className="primary-button full"
            onClick={() => {
              setSignedUp(false);
              switchMode("signin");
            }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark">
            <PhoneCall size={21} strokeWidth={2.6} />
          </span>
          <div>
            <strong>CALL-STARS</strong>
            <small>Training HQ</small>
          </div>
        </div>

        <div className="login-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            className={mode === "signin" ? "active" : ""}
            onClick={() => switchMode("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={mode === "signup" ? "active" : ""}
            onClick={() => switchMode("signup")}
          >
            Create account
          </button>
        </div>

        <p>
          {mode === "signin"
            ? "Enter your Call-Stars credentials to continue."
            : "Create an account — an admin approves it before you get access."}
        </p>
        {error && <div className="login-error">{error}</div>}
        {awaitingApproval && <ApprovalContact />}
        <form className="login-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label>
              Full name
              <input
                required
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Jane Smith"
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              required
              autoFocus={mode === "signin"}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </label>
          {/* Acceptance is recorded on the account at signup, so signing in
              again never re-asks. */}
          {mode === "signup" && (
            <label className="login-terms">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
              />
              <span>
                I agree to the{" "}
                <Link to="/terms" target="_blank" rel="noreferrer">
                  Terms of Service
                </Link>
              </span>
            </label>
          )}
          <button
            className="primary-button full"
            type="submit"
            disabled={busy || (mode === "signup" && !acceptedTerms)}
          >
            {busy
              ? mode === "signin"
                ? "Signing in…"
                : "Creating account…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
