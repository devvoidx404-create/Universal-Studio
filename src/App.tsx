import { useState, useEffect } from "react";
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";
import CodeArena from "./components/CodeArena";
import SecurityCenter from "./components/SecurityCenter";
import HelpCenter from "./components/HelpCenter";
import { User } from "./types";

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("ucs_token"));
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<"auth" | "dashboard" | "arena" | "security" | "help">("auth");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Validate session on load
  const validateSession = async (savedToken: string) => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${savedToken}` },
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setToken(savedToken);
        setView("dashboard");
      } else {
        // Clear invalid token
        localStorage.removeItem("ucs_token");
        setToken(null);
        setView("auth");
      }
    } catch (e) {
      console.error("Session verification network failure:", e);
      setView("auth");
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("ucs_token");
    if (savedToken) {
      validateSession(savedToken);
    } else {
      setView("auth");
      setInitializing(false);
    }
  }, []);

  const handleLoginSuccess = (newToken: string, loggedUser: User) => {
    localStorage.setItem("ucs_token", newToken);
    setToken(newToken);
    setUser(loggedUser);
    setView("dashboard");
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        console.warn("Logout request failed on server.");
      }
    }
    localStorage.removeItem("ucs_token");
    setToken(null);
    setUser(null);
    setView("auth");
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex flex-col items-center justify-center font-mono text-xs text-gray-500">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        Establishing secure session channels...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C]">
      {/* 1. AUTH SCREEN */}
      {view === "auth" && <AuthPage onLoginSuccess={handleLoginSuccess} />}

      {/* 2. DASHBOARD LAUNCHER */}
      {view === "dashboard" && token && user && (
        <Dashboard
          token={token}
          userEmail={user.email}
          onSelectProject={(id) => {
            setActiveProjectId(id);
            setView("arena");
          }}
          onNavigateToSecurity={() => setView("security")}
          onLogout={handleLogout}
        />
      )}

      {/* 3. CODE ARENA IDE */}
      {view === "arena" && token && activeProjectId && (
        <CodeArena
          token={token}
          projectId={activeProjectId}
          onBackToDashboard={() => {
            setActiveProjectId(null);
            setView("dashboard");
          }}
          onNavigateToHelp={() => setView("help")}
        />
      )}

      {/* 4. SECURITY AUDITING PANEL */}
      {view === "security" && token && (
        <SecurityCenter token={token} onBack={() => setView("dashboard")} />
      )}

      {/* 5. MANUAL INFO GUIDES */}
      {view === "help" && (
        <HelpCenter
          onBack={() => {
            setView(activeProjectId ? "arena" : "dashboard");
          }}
        />
      )}
    </div>
  );
}
