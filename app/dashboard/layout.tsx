/**
 * Dashboard Layout
 * Mithril-inspired dark theme with navigation.
 */

import { type ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Ambient background effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo */}
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-white">
                  Oracle
                </h1>
                <p className="text-xs text-slate-500">Attribution Dashboard</p>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex items-center gap-6">
              <NavLink href="/dashboard">Overview</NavLink>
              <NavLink href="/dashboard/utm-builder">UTM Builder</NavLink>
              <NavLink href="/dashboard/settings">Settings</NavLink>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-6">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-center text-sm text-slate-600">
            Hepta Analytics &middot; Built with precision
          </p>
        </div>
      </footer>
    </div>
  );
}

interface NavLinkProps {
  href: string;
  children: ReactNode;
  active?: boolean;
}

function NavLink({ href, children, active = false }: NavLinkProps) {
  return (
    <a
      href={href}
      className={`
        text-sm font-medium transition-colors
        ${
          active
            ? 'text-white'
            : 'text-slate-400 hover:text-slate-200'
        }
      `}
    >
      {children}
    </a>
  );
}
