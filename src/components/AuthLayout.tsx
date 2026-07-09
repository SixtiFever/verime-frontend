import type { ReactNode } from "react";

type AuthLayoutProps = {
  title?: string;
  children: ReactNode;
};

export function AuthLayout({ title, children }: AuthLayoutProps) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        {title && <h1 className="auth-title">{title}</h1>}
        {children}
      </div>
    </div>
  );
}
