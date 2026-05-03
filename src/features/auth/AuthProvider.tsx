import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getStoredToken } from "../../services/api";
import type { User } from "../../types";

interface AuthContextValue {
  user: User | null;
  token: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  message: string;
  setMessage: (message: string) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: (message?: string) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  async function refreshUser() {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
      return;
    }

    if (getStoredToken()) {
      const demoUser = {
        id: "demo-user",
        name: "Demo Admin",
        email: "admin@clinicfeed.com",
        role: "admin",
      } as User;

      localStorage.setItem("user", JSON.stringify(demoUser));
      setUser(demoUser);
    }
  }

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    refreshUser().finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    const handler = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");

      setToken("");
      setUser(null);
      queryClient.clear();
      setMessage("انتهت الجلسة، الرجاء تسجيل الدخول مرة أخرى");
    };

    window.addEventListener("clinicfeed:unauthorized", handler);
    return () => window.removeEventListener("clinicfeed:unauthorized", handler);
  }, [queryClient]);

  useEffect(() => {
    if (!message) return;

    const timer = window.setTimeout(() => setMessage(""), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function login(email: string, _password: string) {
    setMessage("");

    const demoToken = "demo-token";

    const demoUser = {
      id: "demo-user",
      name: "Demo Admin",
      email: email,
      role: "admin",
    } as User;

    localStorage.setItem("token", demoToken);
    localStorage.setItem("authToken", demoToken);
    localStorage.setItem("user", JSON.stringify(demoUser));

    setToken(demoToken);
    setUser(demoUser);
  }

  function logout(customMessage = "") {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");

    setToken("");
    setUser(null);
    queryClient.clear();
    setMessage(customMessage);
  }

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      isLoading,
      message,
      setMessage,
      login,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, message],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
