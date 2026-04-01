"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role === "superadmin") {
        router.replace("/superadmin");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [router, status, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    // Role-based routing is handled by the useEffect once the session updates,
    // but just to be safe, we refresh so the next-auth provider fetches session.
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-stone-950 px-6 py-12 text-stone-50">
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-5xl gap-10 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,#3f3f46_0%,#18181b_35%,#09090b_100%)] p-8 shadow-2xl lg:grid-cols-[1.1fr_0.9fr] lg:p-12">
        <section className="flex flex-col justify-between gap-10">
          <div className="space-y-5">
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300">
              Nithal, Manage your Salon in style!
            </p>
            <h1 className="max-w-xl text-5xl font-semibold leading-tight">
              Keep bookings, customers, and staff in one place.
            </h1>
            <p className="max-w-lg text-base leading-7 text-stone-300">
              Sign in with the seeded admin account to manage your salon tenant,
              create services, and book appointments from the dashboard.
            </p>
          </div>

          <div className="grid gap-4 text-sm text-stone-300 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              Customer records that stay scoped to the signed-in tenant.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              Service and appointment APIs protected by the session.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              Role-aware user management for admins.
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <form
            onSubmit={handleSubmit}
            className="w-full rounded-[1.75rem] border border-white/10 bg-black/30 p-6 backdrop-blur"
          >
            <div className="mb-6 space-y-2">
              <h2 className="text-2xl font-semibold">Sign In</h2>
              <p className="text-sm text-stone-300">
                Default seed credentials are prefilled for local development.
              </p>
            </div>

            <label className="mb-4 block text-sm">
              <span className="mb-2 block text-stone-300">Email</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-amber-300"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="mb-4 block text-sm">
              <span className="mb-2 block text-stone-300">Password</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-amber-300"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error ? (
              <p className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-amber-300 px-4 py-3 font-medium text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Signing in..." : "Open Dashboard"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
