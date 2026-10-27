'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="login-page">
      <section className="login-card">
        <h1>
          Your school desk
          <br />
          couldn’t open.
        </h1>
        <p>
          Check that setup and database migrations have completed, then try again. Private data has
          not been replaced with demo content.
        </p>
        <button className="button" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
