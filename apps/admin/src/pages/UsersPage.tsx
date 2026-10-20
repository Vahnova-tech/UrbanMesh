export function UsersPage() {
  return (
    <div className="h-full overflow-y-auto px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-2xl">
        <p className="um-eyebrow">Admin</p>
        <h2 className="text-xl font-semibold text-civic-ink">Users & roles</h2>
        <p className="mt-2 text-sm leading-relaxed text-civic-slate">
          UrbanMesh admin access is currently a shared Bearer token (
          <code className="text-xs">ADMIN_API_TOKEN</code>
          ). There are no end-user accounts in the database yet, so suspend /
          role management is not available.
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
