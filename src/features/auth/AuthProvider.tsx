import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getStoredToken, setStoredToken } from "../../services/api";
import { getMe, login as loginRequest } from "../../services/authService";
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

function clearStoredCredentialArtifacts() {
  const sensitiveKeys = [
    "user",
    "email",
    "username",
    "password",
    "clinicfeed_email",
    "clinicfeed_username",
    "clinicfeed_password",
    "rememberedEmail",
    "rememberedUsername",
  ];

  for (const storage of [localStorage, sessionStorage]) {
    for (const key of sensitiveKeys) storage.removeItem(key);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(getStoredToken()));
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  async function refreshUser() {
    const storedToken = getStoredToken();
    clearStoredCredentialArtifacts();

    if (!storedToken) {
      setToken("");
      setUser(null);
      return;
    }

    setStoredToken(storedToken);
    setUser(await getMe());
  }

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    refreshUser()
      .catch(() => {
        setToken("");
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    const handler = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("clinicfeed_token");
      clearStoredCredentialArtifacts();

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
    clearStoredCredentialArtifacts();

    const response = await loginRequest(email.trim(), password);

    const accessToken = response.token;
    const loginUser = response.user;

    if (!accessToken || !loginUser) {
      throw new Error("بيانات تسجيل الدخول غير مكتملة من الخادم");
    }

    setStoredToken(accessToken);
    clearStoredCredentialArtifacts();

    setToken(accessToken);
    setUser(loginUser);
  }

  function logout(customMessage = "") {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("clinicfeed_token");
    clearStoredCredentialArtifacts();

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
