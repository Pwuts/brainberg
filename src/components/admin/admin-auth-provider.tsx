"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AdminAuthContext {
  fetchAdmin: (url: string, init?: RequestInit) => Promise<Response>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AdminAuthContext | null>(null);

export function useAdminAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}

type AuthState = "checking" | "signed-out" | "signed-in";

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stats", { credentials: "same-origin" })
      .then((res) => setAuthState(res.ok ? "signed-in" : "signed-out"))
      .catch(() => setAuthState("signed-out"));
  }, []);

  const fetchAdmin = useCallback(
    async (url: string, init?: RequestInit) => {
      const res = await fetch(url, {
        ...init,
        credentials: "same-origin",
        headers: {
          ...init?.headers,
          "Content-Type": "application/json",
        },
      });
      if (res.status === 401) setAuthState("signed-out");
      return res;
    },
    [],
  );

  const logout = useCallback(async () => {
    await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" });
    setAuthState("signed-out");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: input }),
    });
    if (res.ok) {
      setAuthState("signed-in");
      setInput("");
      setError(false);
    } else {
      setError(true);
    }
  };

  if (authState === "checking") {
    return <p className="text-muted-foreground p-8">Loading...</p>;
  }

  if (authState === "signed-out") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <h2 className="text-xl font-semibold">Admin Access</h2>
          <p className="text-sm text-muted-foreground">
            Enter the admin secret to continue.
          </p>
          <Input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Admin secret"
            autoFocus
          />
          {error && (
            <p className="text-sm text-red-500">Invalid secret. Try again.</p>
          )}
          <Button type="submit" className="w-full">
            Sign In
          </Button>
        </form>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ fetchAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
