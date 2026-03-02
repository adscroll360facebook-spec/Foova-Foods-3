import { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface User {
  id: string;
  email?: string;
  full_name?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: (credential: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const applyUser = (userData: User) => {
    setUser(userData);
    setIsAdmin(userData.role === "admin");
    localStorage.setItem("foova_user", JSON.stringify(userData));
  };

  const initAuth = useCallback(async () => {
    const token = localStorage.getItem("foova_token");
    const storedUser = localStorage.getItem("foova_user");

    if (token && storedUser) {
      try {
        const u = JSON.parse(storedUser);
        applyUser(u);
      } catch { /* ignore */ }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.error) return { error: data.error };
      if (data.token && data.user) {
        localStorage.setItem("foova_token", data.token);
        applyUser(data.user);
      }
      return {};
    } catch (err: any) {
      return { error: err.message || "Sign in failed" };
    }
  };

  // Google OAuth is handled via redirect — this handles the token from /google-success
  const signInWithGoogle = async (credential: string) => {
    try {
      // Store the token from google redirect (used by GoogleSuccess page)
      localStorage.setItem("foova_token", credential);
      // Try to decode basic info from JWT
      try {
        const parts = credential.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const userData = { id: payload.id, role: payload.role };
          applyUser(userData);
        }
      } catch { /* ignore */ }
      return {};
    } catch (err: any) {
      return { error: err.message || "Google sign in failed" };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName })
      });
      const data = await res.json();

      if (data.error) return { error: data.error };
      if (data.token && data.user) {
        localStorage.setItem("foova_token", data.token);
        applyUser(data.user);
      }
      return {};
    } catch (err: any) {
      return { error: err.message || "Sign up failed" };
    }
  };

  const signOut = async () => {
    localStorage.removeItem("foova_token");
    localStorage.removeItem("foova_user");
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signInWithGoogle, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
