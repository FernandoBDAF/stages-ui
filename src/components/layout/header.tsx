'use client';

import { Settings2, Play, Database, FileText } from 'lucide-react';
import { NavLink } from './nav-link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center gap-2 mr-6">
          <Settings2 className="h-6 w-6" />
          <span className="font-semibold text-lg">StagesUI</span>
        </div>

        <nav className="flex items-center gap-1">
          <NavLink href="/execution">
            <span className="flex items-center gap-1.5">
              <Play className="h-4 w-4" />
              Execution
            </span>
          </NavLink>
          <NavLink href="/management">
            <span className="flex items-center gap-1.5">
              <Database className="h-4 w-4" />
              Management
            </span>
          </NavLink>
          <NavLink href="/viewer">
            <span className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Viewer
            </span>
          </NavLink>
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Docs
          </a>
        </div>
      </div>
    </header>
  );
}
