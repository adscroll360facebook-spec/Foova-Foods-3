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

// Use absolute backend URL for all API calls — critical for Vercel+Render split deployment
const API_URL = import.meta.env.VITE_API_URL || "https://foova-foods-3.onrender.com";

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok && data.error) throw new Error(data.error);
  return data;
}

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
      } catch { /* ignore parse errors */ }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const signIn = async (email: string, password: string) => {
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      if (data.token && data.user) {
        localStorage.setItem("foova_token", data.token);
        applyUser(data.user);
      }
      return {};
    } catch (err: any) {
      return { error: err.message || "Sign in failed" };
    }
  };

  // Called after Google OAuth redirect returns a JWT token
  const signInWithGoogle = async (token: string) => {
    try {
      localStorage.setItem("foova_token", token);
      // Decode user info from JWT payload
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const userData: User = { id: payload.id, role: payload.role };
          applyUser(userData);
        }
      } catch { /* ignore decode errors */ }
      return {};
    } catch (err: any) {
      return { error: err.message || "Google sign in failed" };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, full_name: fullName })
      });
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
