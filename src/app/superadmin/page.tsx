"use client";

import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogOut, Plus, Search, Building2, UserCircle, KeyRound, MonitorCheck } from "lucide-react";
import useSWR from "swr";

// Types
type Tenant = { id: string; name: string; createdAt: string; users: { id: string; name: string; email: string }[] };

const fetcher = (url: string) => fetch(url).then(async (res) => {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Request failed");
  }
  return res.json();
});

export default function SuperadminPortal() {
  const router = useRouter();
  const { data: session, status } = useSession({ required: true, onUnauthenticated() {
    window.location.href = "/";
  }});

  const isSuperadmin = (session?.user as any)?.role === "superadmin";

  useEffect(() => {
    // Failsafe: Redirect out if not superadmin
    if (status === "authenticated" && !isSuperadmin) {
      router.replace("/dashboard");
    }
  }, [status, isSuperadmin, router]);

  const { data: tenants, mutate, error: tenantsError } = useSWR<Tenant[]>(
    isSuperadmin ? "/api/superadmin/tenants" : null,
    fetcher
  );

  // Tenant Creation State
  const [salonName, setSalonName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  if (status === "loading" || !isSuperadmin) {
    return <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-100">Verifying credentials...</div>;
  }

  async function handleCreateTenant(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsCreating(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: salonName, email: adminEmail, password: adminPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create tenant");
      }

      setSuccess(`Successfully created workspace for ${salonName}.`);
      setSalonName("");
      setAdminEmail("");
      setAdminPassword("");
      mutate(); // refresh tenants list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  }

  const filteredTenants = tenants?.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.users.some(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-stone-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <MonitorCheck size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">System Control Panel</h1>
            <p className="text-xs text-stone-400 font-medium tracking-wide uppercase">Superadmin Access</p>
          </div>
        </div>

        <button 
          onClick={() => signOut({ callbackUrl: "/" })} 
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors text-stone-300"
        >
          <LogOut size={16} /> <span className="hidden sm:inline">Sign Out</span>
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 lg:py-16 grid lg:grid-cols-[1fr_400px] gap-10">
        
        {/* Left Column: Tenants Directory */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Active Workspaces</h2>
              <p className="text-stone-400 text-sm mt-1">Manage global tenant access and provisions.</p>
            </div>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
              <input
                type="text"
                placeholder="Search salons or emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-400 transition-colors placeholder:text-stone-600"
              />
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-1 overflow-hidden shadow-2xl">
            {!tenants ? (
              <div className="p-12 text-center text-stone-500 animate-pulse">Scanning system database...</div>
            ) : tenantsError ? (
              <div className="p-8 text-center text-red-400 bg-red-500/10 rounded-2xl m-2">Failed to load system data.</div>
            ) : filteredTenants?.length === 0 ? (
              <div className="p-16 text-center text-stone-500 border border-dashed border-white/5 rounded-2xl m-2 bg-black/20">
                {searchQuery ? "No matching workspaces found." : "No active tenant workspaces exist."}
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredTenants?.map((tenant) => (
                  <div key={tenant.id} className="p-5 sm:p-6 hover:bg-white/[0.02] transition-colors group">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                      
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-stone-900 border border-white/10 flex items-center justify-center shrink-0">
                          <Building2 size={20} className="text-stone-400 group-hover:text-indigo-400 transition-colors" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-white">{tenant.name}</h3>
                          <p className="text-xs text-stone-500 mt-0.5">ID: <span className="font-mono">{tenant.id.slice(0, 8)}...</span></p>
                        </div>
                      </div>

                      <div className="sm:text-right space-y-1 pl-16 sm:pl-0">
                        {tenant.users.map(u => (
                          <div key={u.id} className="inline-flex items-center gap-2 bg-black/40 border border-white/5 rounded-md px-3 py-1.5 text-sm">
                            <UserCircle size={14} className="text-indigo-400" />
                            <span className="text-stone-300">{u.email}</span>
                          </div>
                        ))}
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: New Tenant Provisioning Form */}
        <div>
          <div className="sticky top-28 rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,#2e1065_0%,#18181b_50%,#09090b_100%)] p-6 sm:p-8 shadow-2xl">
            <h3 className="text-xl font-semibold tracking-tight text-white mb-2 flex items-center gap-2">
              <Plus size={20} className="text-indigo-400" /> Provision Tenant
            </h3>
            <p className="text-sm text-stone-400 mb-8">Create a new isolated salon workspace with primary admin credentials.</p>

            <form onSubmit={handleCreateTenant} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-400">Salon Name</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white/5"
                  type="text"
                  placeholder="e.g. Prestige Styles"
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-400">Admin Email</span>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
                  <input
                    className="w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white/5"
                    type="email"
                    placeholder="manager@prestige.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-400">Initial Password</span>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
                  <input
                    className="w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white/5"
                    type="password"
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </label>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={isCreating}
                className="w-full mt-4 rounded-xl bg-indigo-500 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-indigo-500/20"
              >
                {isCreating ? "Provisioning Workspace..." : "Initialize Workspace"}
              </button>
            </form>
          </div>
        </div>

      </main>
    </div>
  );
}
