import { ClerkProvider } from "@clerk/clerk-react";
import { CanvasLibraryPure } from "../auth/CanvasLibrary";

// Load key from environment (Vite automatically replaces import.meta.env)
const PUBLISHABLE_KEY = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

export default function DashboardRoot() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <div className="canvases-page">
        <section className="dashboard-hero" aria-label="Dashboard intro">
          <p className="dashboard-kicker">Canvas Workspace</p>
          <h1>My Canvases</h1>
          <p className="dashboard-subtitle">
            Browse, search, and organize your saved boards from one place.
          </p>
        </section>

        <main className="page-main" aria-label="Canvas library">
          <div className="page-container">
            <CanvasLibraryPure />
          </div>
        </main>
      </div>

      <style>{`
        .canvases-page {
          min-height: 100%;
          display: grid;
          gap: var(--space-lg);
        }

        .dashboard-hero {
          max-width: 48rem;
        }

        .dashboard-kicker {
          margin: 0 0 var(--space-xs);
          font-family: var(--font-ui);
          font-size: var(--text-sm);
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-accent);
        }

        .dashboard-hero h1 {
          margin: 0;
          font-size: clamp(2rem, 1.7rem + 1.8vw, 3rem);
          line-height: 1.1;
          color: var(--color-text);
        }

        .dashboard-subtitle {
          margin-top: var(--space-sm);
          max-width: 40rem;
          color: var(--color-text-secondary);
          font-size: var(--text-base);
        }

        .page-main {
          padding: 0;
        }

        .page-container {
          border: 1px solid color-mix(in srgb, var(--color-stroke-muted) 65%, transparent);
          border-radius: var(--radius-xl);
          padding: clamp(1rem, 0.9rem + 0.6vw, 1.5rem);
          background: color-mix(in srgb, var(--color-bg) 72%, transparent);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          box-shadow: 0 24px 40px -34px rgba(15, 23, 42, 0.45);
        }

        @media (max-width: 768px) {
          .canvases-page {
            gap: var(--space-md);
          }

          .dashboard-hero h1 {
            font-size: clamp(1.8rem, 1.3rem + 3vw, 2.25rem);
          }
        }
      `}</style>
    </ClerkProvider>
  );
}
