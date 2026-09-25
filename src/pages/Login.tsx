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

export default function Login() {
  const isValid = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedUp, setSignedUp] = useState(false);

  if (isValid) {
    const from = (location.state as { from?: Location } | null)?.from;
    return <Navigate to={from ? `${from.pathname}${from.search}` : "/"} replace />;
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setPassword("");
  }

  async function signIn() {
    try {
      await pb.collection("users").authWithPassword(email, password);
      const from = (location.state as { from?: Location } | null)?.from;
      navigate(from ? `${from.pathname}${from.search}` : "/", { replace: true });
    } catch (err) {
      // A pending account and a wrong password both come back as a failed
      // auth, so check whether the record exists but isn't approved yet.
      setError(
        err instanceof ClientResponseError && err.status === 403
          ? PENDING_MESSAGE
          : "Incorrect email or password.",
      );
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
            Your account is pending approval. An admin needs to approve it before you can sign in —
            you'll get access as soon as that's done.
          </p>
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
