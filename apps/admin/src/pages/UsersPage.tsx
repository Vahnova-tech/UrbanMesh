export function UsersPage() {
  return (
    <div className="h-full overflow-y-auto px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-xl font-semibold text-civic-ink">Users</h2>
        <p className="mt-2 text-sm text-civic-slate">
          Shared admin token. No user accounts yet.
        </p>
        <p className="mt-4 rounded-card border border-civic-line bg-civic-surface px-4 py-3 text-sm text-civic-muted">
          When accounts are introduced, user administration will be restricted to
          authorized roles and will not expose reporter identities beyond what
          policy allows.
        </p>
      </div>
    </div>
  );
}
