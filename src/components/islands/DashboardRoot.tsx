import { ClerkProvider } from "@clerk/clerk-react";
import { UserMenuPure } from "../auth/UserMenu";
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
                <header className="page-header">
                    <div className="page-header-content">
                        <div>
                            <h1>My Canvases</h1>
                            <p>View and manage all your saved canvases</p>
                        </div>
                        <UserMenuPure />
                    </div>
                </header>

                <main className="page-main">
                    <div className="page-container">
                        <CanvasLibraryPure />
                    </div>
                </main>
            </div>

            <style>{`
        .canvases-page {
          min-height: 100vh;
          background: #f9fafb;
        }

        .page-header {
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 2rem 0;
        }

        .page-header-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .page-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem;
        }

        .page-header p {
          color: #6b7280;
          margin: 0;
        }

        .page-main {
          padding: 3rem 2rem;
        }

        .page-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .page-header-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
        }
      `}</style>
        </ClerkProvider>
    );
}
