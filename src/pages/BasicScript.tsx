import { Link } from "react-router-dom";
import "./BasicScript.css";

export default function BasicScript() {
  return (
    <div className="bs-page">
      <header className="bs-header">
        <Link to="/" className="bs-wordmark">
          Ballista
        </Link>
        <Link to="/cold-call-tree" className="bs-back">
          ← Full Decision Tree
        </Link>
      </header>
      <main className="bs-main">
        <h1>The Basic Script</h1>
        <div className="bs-image-wrap">
          <img
            src="/cold-call-tree/basic-script.webp"
            alt="Basic cold call script: confirm the name, confirm the building, reason for the call, close, qualify, collect, end call"
          />
        </div>
      </main>
    </div>
  );
}
