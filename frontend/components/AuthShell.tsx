import React, { type ReactNode } from 'react';

/** Frame the focused identity workflow with its product context. */
export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <p className="eyebrow">IDENTITY / SECURE ACCESS</p>
        <h1 id="auth-title">{title}</h1>
        <p className="auth-intro">A short verification keeps your account and future catalog workspace protected.</p>
        {children}
      </section>
      <aside className="auth-aside" aria-label="Identity access information">
        <p className="aside-mark">01</p>
        <h2>Proof, not passwords.</h2>
        <p>Use your mobile number to receive a one-time access check. Your session remains in this browser only.</p>
      </aside>
    </main>
  );
}
