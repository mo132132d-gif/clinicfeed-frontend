import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getStoredToken, setStoredToken } from "../../services/api";
import { login as loginRequest } from "../../services/authService";
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

function getStoredUser(): User | null {
  const storedUser = localStorage.getItem("user");

  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as User;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(Boolean(getStoredToken()));
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  async function refreshUser() {
    const storedUser = getStoredUser();
    const storedToken = getStoredToken();

    if (!storedToken) {
      setToken("");
      setUser(null);
      return;
    }

    if (storedUser) {
      setUser(storedUser);
      return;
    }

    // Keep legacy key for backward-compatible logout flows.
    setStoredToken(storedToken);
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

  async function login(email: string, password: string) {
    setMessage("");

    const response = await loginRequest(email.trim(), password);

    const accessToken = response.token;
    const loginUser = response.user;

    if (!accessToken || !loginUser) {
      throw new Error("بيانات تسجيل الدخول غير مكتملة من الخادم");
    }

    setStoredToken(accessToken);
    localStorage.setItem("user", JSON.stringify(loginUser));

    setToken(accessToken);
    setUser(loginUser);
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
      isAuthenticated: Boolean(token && user),
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