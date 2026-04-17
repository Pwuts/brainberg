"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AdminAuthContext {
  secret: string;
  fetchAdmin: (url: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AdminAuthContext | null>(null);

export function useAdminAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [secret, setSecret] = useState(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("admin-secret") ?? "";
  });
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const fetchAdmin = useCallback(
    (url: string, init?: RequestInit) => {
      return fetch(url, {
        ...init,
        headers: {
          ...init?.headers,
          "x-admin-secret": secret,
          "Content-Type": "application/json",
        },
      });
    },
    [secret],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate by hitting the stats endpoint
    const res = await fetch("/api/admin/stats", {
      headers: { "x-admin-secret": input },
    });
    if (res.ok) {
      sessionStorage.setItem("admin-secret", input);
      setSecret(input);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (!secret) {
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
    <AuthContext.Provider value={{ secret, fetchAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
