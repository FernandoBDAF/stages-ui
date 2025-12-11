'use client';

import { useEffect } from 'react';

export default function ViewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Minimal layout - no header/footer from main app
  useEffect(() => {
    // Add viewer-specific body class for global styling
    document.body.classList.add('viewer-mode');
    return () => {
      document.body.classList.remove('viewer-mode');
    };
  }, []);

  return (
    <div className="min-h-screen bg-viewer-bg transition-colors duration-300">
      {children}
    </div>
  );
}

