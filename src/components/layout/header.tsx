'use client';

import { Settings2 } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center gap-2">
          <Settings2 className="h-6 w-6" />
          <span className="font-semibold text-lg">Stages Configuration</span>
        </div>
        <div className="flex-1" />
        <nav className="flex items-center gap-2">
          <a
            href="#"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Help
          </a>
        </nav>
      </div>
    </header>
  );
}

