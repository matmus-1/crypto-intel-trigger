export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Crypto Intelligence API</h1>
      <p>Track crypto movers and predict market movements.</p>

      <h2>API Endpoints</h2>
      <ul>
        <li>
          <code>GET /api/health</code> - Health check
        </li>
        <li>
          <code>GET /api/movers</code> - Get recent significant movers
        </li>
        <li>
          <code>GET /api/movers?hours=24&direction=up&limit=10</code> - Filter
          movers
        </li>
        <li>
          <code>GET /api/research/[eventId]</code> - Get research report
        </li>
        <li>
          <code>GET /api/stats</code> - System statistics
        </li>
      </ul>

      <h2>Status</h2>
      <p>
        Background jobs are running on{" "}
        <a href="https://trigger.dev">Trigger.dev</a>
      </p>

      <h2>Links</h2>
      <ul>
        <li>
          <a href="/api/health">Health Check</a>
        </li>
        <li>
          <a href="/api/movers">Recent Movers</a>
        </li>
        <li>
          <a href="/api/stats">Statistics</a>
        </li>
      </ul>
    </main>
  );
}
