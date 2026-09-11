import { useState, useEffect } from "react";
import { Monitor, Smartphone } from "lucide-react";
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
  const [layoutMode, setLayoutMode] = useState<"pc" | "mobile" | null>(() => {
    return (localStorage.getItem("ucs_layout_mode") as "pc" | "mobile" | null) || null;
  });

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
    localStorage.removeItem("ucs_layout_mode");
    setToken(null);
    setUser(null);
    setLayoutMode(null);
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

  // If Guest has bypassed login, but has NOT chosen PC or Mobile perspective yet
  const isGuest = user && (user.isGuest || user.email.startsWith("guest_"));
  const showModeSelector = token && user && isGuest && !layoutMode;

  if (showModeSelector) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-[#0E0E12] border border-blue-900/30 rounded-2xl p-6 md:p-8 shadow-2xl relative text-center space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] text-blue-500 font-mono uppercase tracking-widest font-bold">Workspace Optimization</span>
            <h1 className="text-xl md:text-2xl font-extrabold text-white font-mono uppercase tracking-tight">Select Device Perspective</h1>
            <p className="text-xs text-gray-400 max-w-lg mx-auto leading-relaxed">
              Welcome to <strong>Universal Code Studio</strong>. Your sandbox environment supports high-performance code execution, visual rendering, and scripting commands. Select how your guest workspace should align with your device.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Option A: Desktop PC */}
            <button
              onClick={() => {
                localStorage.setItem("ucs_layout_mode", "pc");
                setLayoutMode("pc");
              }}
              className="flex flex-col items-center text-center p-6 bg-[#121217] hover:bg-[#16161C] border border-gray-800/80 hover:border-blue-900/40 rounded-xl transition group space-y-4"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-950/20 border border-blue-900/20 flex items-center justify-center text-blue-400 group-hover:text-blue-300 group-hover:scale-105 transition shrink-0">
                <Monitor className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wide text-white group-hover:text-blue-400 transition">PC Desktop Layout</h3>
                <p className="text-[10px] text-gray-500 leading-normal">
                  Standard multi-column workspace with file tree, split terminal, and floating compiler controls. Optimized for monitors, keyboards, and tablets.
                </p>
              </div>
            </button>

            {/* Option B: Mobile Smartphone */}
            <button
              onClick={() => {
                localStorage.setItem("ucs_layout_mode", "mobile");
                setLayoutMode("mobile");
              }}
              className="flex flex-col items-center text-center p-6 bg-[#121217] hover:bg-[#16161C] border border-gray-800/80 hover:border-emerald-900/40 rounded-xl transition group space-y-4"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-950/20 border border-emerald-900/20 flex items-center justify-center text-emerald-400 group-hover:text-emerald-300 group-hover:scale-105 transition shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wide text-white group-hover:text-emerald-400 transition">Mobile Touch Layout</h3>
                <p className="text-[10px] text-gray-500 leading-normal">
                  Single-pane focused touch stack. Slides files, editor windows, and terminal logs into compact, finger-swipeable tab panels.
                </p>
              </div>
            </button>
          </div>

          <div className="pt-2 border-t border-gray-800/40 flex justify-between items-center text-[10px] text-gray-500 font-mono">
            <span>Powered by VoidX_404 Core</span>
            <button onClick={handleLogout} className="text-red-500 hover:underline">
              Cancel & Log Out
            </button>
          </div>
        </div>
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
          isMobileLayout={layoutMode === "mobile"}
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
          isMobileLayout={layoutMode === "mobile"}
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
