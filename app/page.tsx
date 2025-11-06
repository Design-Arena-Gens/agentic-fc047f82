import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <section className="hero card">
        <span className="badge">Gentle AI Companion</span>
        <h1 className="h1">A caring chat companion, just for you</h1>
        <p className="mono">
          Thoughtful, supportive, and respectful conversation. No explicit content.
        </p>
        <Link href="/chat" className="button">Start chatting</Link>
      </section>

      <section className="grid" style={{ marginTop: 24 }}>
        <div className="card">
          <h3>What to expect</h3>
          <p className="small">Warm, attentive, and encouraging companionship focused on your wellbeing.</p>
        </div>
        <div className="card">
          <h3>Safety first</h3>
          <p className="small">No explicit sexual content. Healthy boundaries. Opt-out anytime.</p>
        </div>
        <div className="card">
          <h3>Private by default</h3>
          <p className="small">Your chats stay in your browser unless you choose to clear them.</p>
        </div>
      </section>
    </main>
  );
}
