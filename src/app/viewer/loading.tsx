export default function ViewerLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
        <p className="text-neutral-500 text-sm font-medium">Loading viewer...</p>
      </div>
    </div>
  );
}

