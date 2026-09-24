import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate, type Location } from "react-router-dom";
import { PhoneCall } from "lucide-react";
import { pb } from "../lib/pb";
import { useAuth } from "../lib/RequireAuth";
import "../pages/TrainingApp.css";
import "./Login.css";

export default function Login() {
  const isValid = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isValid) {
    const from = (location.state as { from?: Location } | null)?.from;
    return <Navigate to={from ? `${from.pathname}${from.search}` : "/"} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!acceptedTerms) {
      setError("Please accept the Terms of Service to continue.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await pb.collection("users").authWithPassword(email, password);
      const from = (location.state as { from?: Location } | null)?.from;
      navigate(from ? `${from.pathname}${from.search}` : "/", { replace: true });
    } catch {
      setError("Incorrect email or password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark">
            <PhoneCall size={26} strokeWidth={2.6} />
          </span>
          <div>
            <strong>CALL-STARS</strong>
            <small>Training HQ</small>
          </div>
        </div>
        <h1>Sign in</h1>
        <p>Enter your Call-Stars credentials to continue.</p>
        {error && <div className="login-error">{error}</div>}
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              required
              autoFocus
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
          <button className="primary-button full" type="submit" disabled={busy || !acceptedTerms}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
