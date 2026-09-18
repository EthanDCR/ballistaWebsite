import './App.css'

function App() {
  const year = new Date().getFullYear()

  return (
    <div className="page">
      <header className="nav">
        <span className="wordmark">Ballista</span>
      </header>

      <main className="hero">
        <h1>Outbound sales infrastructure, built for the field.</h1>
        <p className="subhead">
          Ballista powers dialing, lead routing, and pipeline management for outbound sales teams.
        </p>
        <a className="cta" href="mailto:support@theballista.com">
          Get in touch
        </a>
      </main>

      <footer className="footer">
        <span>© {year} Praxis Innovations LLC</span>
        <a href="mailto:support@theballista.com">support@theballista.com</a>
      </footer>
    </div>
  )
}

export default App
