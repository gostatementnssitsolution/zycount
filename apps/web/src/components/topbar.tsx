// Top bar (blueprint §44): Search | Notifications | + New | User/Profile.

export function Topbar() {
  return (
    <header className="flex items-center gap-4 border-b border-black/10 bg-white/60 px-6 py-3 dark:border-white/10 dark:bg-white/5">
      <input
        type="search"
        placeholder="Search…  (press / )"
        className="w-full max-w-md rounded-md border border-black/10 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-brand dark:border-white/15"
      />
      <div className="ml-auto flex items-center gap-3 text-sm">
        <button className="rounded-md px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/10">🔔</button>
        <button className="rounded-md bg-brand px-3 py-1.5 font-medium text-brand-fg">+ New</button>
        <div className="h-8 w-8 rounded-full bg-black/10 dark:bg-white/15" />
      </div>
    </header>
  );
}
