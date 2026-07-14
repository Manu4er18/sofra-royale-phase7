"use client";

/**
 * Last-resort error boundary — replaces the root layout when even that
 * fails, so it must render its own <html>/<body> and stay dependency-free.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#17110c",
          color: "#f3ead9",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>
            Sofra Royale ist gleich zurück
          </h1>
          <p style={{ opacity: 0.75, marginBottom: "1.5rem" }}>
            Ein schwerwiegender Fehler ist aufgetreten.
            {error.digest ? ` (Ref: ${error.digest})` : ""}
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: "#c9a24b",
              color: "#241a10",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.7rem 1.6rem",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Erneut versuchen
          </button>
        </div>
      </body>
    </html>
  );
}
