import React, { useState, useEffect } from "react";
import { FolderPlus, FileText, Activity, ShieldAlert, ShieldCheck, Terminal, LogOut, Code, Trash2, ArrowRight } from "lucide-react";
import { Project, SecurityLog, LANGUAGES } from "../types";
import { PWAInstallButton } from "./PWAInstallButton";
import { OfflineIndicator } from "./OfflineIndicator";

interface DashboardProps {
  token: string;
  onSelectProject: (projectId: string) => void;
  onNavigateToSecurity: () => void;
  onLogout: () => void;
  userEmail: string;
  isMobileLayout?: boolean;
}

export default function Dashboard({
  token,
  onSelectProject,
  onNavigateToSecurity,
  onLogout,
  userEmail,
  isMobileLayout = false,
}: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [securityStatus, setSecurityStatus] = useState<any>({ mfaEnabled: false });
  const [recentLogs, setRecentLogs] = useState<SecurityLog[]>([]);
  
  // Tab control for mobile view
  const [mobileTab, setMobileTab] = useState<"projects" | "security">("projects");

  // Project Creation states
  const [isCreating, setIsCreating] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [primaryLanguage, setPrimaryLanguage] = useState("python");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch Projects
      const projRes = await fetch("/api/projects", { headers });
      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData);
      }

      // 2. Fetch Security status
      const secRes = await fetch("/api/security/status", { headers });
      if (secRes.ok) {
        const secData = await secRes.json();
        setSecurityStatus(secData);
        if (secData.securityLogs) {
          setRecentLogs(secData.securityLogs.slice(0, 4));
        }
      }
    } catch (err) {
      setError("Failed to sync workspace states.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: projectName,
          description: projectDesc,
          primaryLanguage,
        }),
      });

      if (res.ok) {
        const newProj = await res.json();
        setProjectName("");
        setProjectDesc("");
        setIsCreating(false);
        onSelectProject(newProj.id); // Open immediately!
      } else {
        const err = await res.json();
        alert(err.error || "Failed to establish sandbox.");
      }
    } catch (e) {
      alert("Network error.");
    }
  };

  const handleDeleteProject = async (projectId: string, name: string) => {
    if (!confirm(`Are you absolutely sure you want to delete "${name}"? This will permanently delete all files, histories, and states.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setProjects(projects.filter((p) => p.id !== projectId));
      } else {
        alert("Delete permission denied.");
      }
    } catch (e) {
      alert("Network error.");
    }
  };

  return (
    <div className={`min-h-screen bg-[#0A0A0C] text-white ${isMobileLayout ? "p-4 pb-16" : "p-6 md:p-8"} selection:bg-blue-600 selection:text-white`}>
      {/* Upper Navigation bar */}
      <header className="max-w-7xl mx-auto flex justify-between items-center border-b border-gray-800 pb-5 mb-6">
        <div>
          <h1 className={`${isMobileLayout ? "text-base" : "text-xl"} font-extrabold tracking-tight flex items-center gap-2 uppercase`}>
            <Code className="w-5 h-5 text-blue-500 animate-pulse" /> Universal Code Studio
          </h1>
          <p className="text-[10px] text-gray-500 font-mono truncate max-w-[200px] sm:max-w-none">OPERATOR: {userEmail}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onNavigateToSecurity}
            className={`px-2.5 py-2 border border-gray-800 bg-[#121216] text-[10px] font-semibold rounded-lg hover:bg-gray-800/50 transition flex items-center gap-1.5 ${isMobileLayout ? "min-h-[44px]" : ""}`}
          >
            {securityStatus.mfaEnabled ? (
              <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            )}
            {!isMobileLayout && "MFA Status"}
          </button>
          <button
            onClick={onLogout}
            className={`px-3 py-2 bg-red-950/20 border border-red-900/30 text-red-400 text-[10px] font-semibold rounded-lg hover:bg-red-950/60 transition flex items-center gap-1.5 ${isMobileLayout ? "min-h-[44px]" : ""}`}
          >
            <LogOut className="w-3.5 h-3.5" /> {!isMobileLayout && "Logout"}
          </button>
        </div>
      </header>

      {/* PWA Guided Installation Banner */}
      <div className="max-w-7xl mx-auto mb-6">
        <PWAInstallButton />
      </div>

      {/* Mobile-only touch tab switcher */}
      {isMobileLayout && (
        <div className="max-w-7xl mx-auto flex gap-2 p-1 bg-[#121216] border border-gray-800 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => setMobileTab("projects")}
            className={`flex-1 py-2.5 text-center text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition ${
              mobileTab === "projects"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Projects
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("security")}
            className={`flex-1 py-2.5 text-center text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition ${
              mobileTab === "security"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Security Status
          </button>
        </div>
      )}

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2 cols wide): Projects & Creations */}
        {(!isMobileLayout || mobileTab === "projects") && (
          <section className="lg:col-span-2 space-y-6">
            {/* Header Action card */}
            <div className="bg-[#121216] border border-gray-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-sm md:text-lg font-bold">Select or Create a Sandbox</h2>
                <p className="text-[10px] md:text-xs text-gray-400 mt-0.5">
                  Establish clean local project structures. Boost templates automatically.
                </p>
              </div>
              {!isCreating && (
                <button
                  onClick={() => setIsCreating(true)}
                  className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 font-semibold text-xs rounded-lg transition flex items-center gap-2 self-start sm:self-auto ${isMobileLayout ? "w-full justify-center py-3 min-h-[44px]" : ""}`}
                >
                  <FolderPlus className="w-4 h-4" /> New Project
                </button>
              )}
            </div>

          {/* Project creation state drawer/panel */}
          {isCreating && (
            <form onSubmit={handleCreateProject} className="bg-[#121216] border border-blue-500/30 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                <h3 className="text-sm font-bold tracking-wide uppercase text-blue-500 flex items-center gap-1.5">
                  <FolderPlus className="w-4 h-4" /> Create New Workspace
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-gray-500 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-gray-400 uppercase">Project Name</label>
                  <input
                    type="text"
                    required
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="my-awesome-sandbox"
                    className="w-full bg-[#1C1C22] border border-gray-800 px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-gray-400 uppercase">Primary Language</label>
                  <select
                    value={primaryLanguage}
                    onChange={(e) => setPrimaryLanguage(e.target.value)}
                    className="w-full bg-[#1C1C22] border border-gray-800 px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition font-mono"
                  >
                    {Object.entries(LANGUAGES).map(([id, def]) => (
                      <option key={id} value={id}>
                        {def.name} ({def.extension})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono text-gray-400 uppercase">Description (Optional)</label>
                <input
                  type="text"
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="A container-isolated runtime playground"
                  className="w-full bg-[#1C1C22] border border-gray-800 px-3 py-1.5 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-semibold rounded-lg transition"
              >
                Bootstrap Sandbox
              </button>
            </form>
          )}

          {/* Projects lists */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-[#121216]/50 border border-gray-800 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="border border-dashed border-gray-800 rounded-xl p-12 text-center space-y-3 bg-[#121216]/20">
              <Code className="w-10 h-10 text-gray-600 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">No Projects Found</p>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  You haven't established any code sandboxes yet. Create one above to begin real multi-language compilation!
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => {
                const langDef = LANGUAGES[proj.primaryLanguage] || { name: proj.primaryLanguage, extension: "" };
                return (
                  <div
                    key={proj.id}
                    className="bg-[#121216] border border-gray-800 rounded-xl p-5 hover:border-blue-500/50 transition duration-150 flex flex-col justify-between group"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-[10px] uppercase tracking-wide rounded">
                          {langDef.name}
                        </span>
                        <button
                          onClick={() => handleDeleteProject(proj.id, proj.name)}
                          className="text-gray-500 hover:text-red-400 transition p-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white font-mono break-all group-hover:text-blue-400 transition">{proj.name}</h4>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2 h-8">{proj.description || "Sandbox project environment."}</p>
                      </div>
                    </div>

                    <div className="border-t border-gray-800 mt-4 pt-3 flex justify-between items-center">
                      <span className="text-[10px] text-gray-500 font-mono">
                        Updated {new Date(proj.updatedAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => onSelectProject(proj.id)}
                        className="px-3 py-1 bg-[#1C1C22] border border-gray-800 hover:border-blue-500 hover:bg-blue-600/10 text-xs font-semibold rounded-lg flex items-center gap-1 transition"
                      >
                        Launch <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        )}

        {/* Right column: Security metrics & auditable logs */}
        {(!isMobileLayout || mobileTab === "security") && (
          <section className="space-y-6">
          {/* Security Summary Widget */}
          <div className="bg-[#121216] border border-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold tracking-widest text-gray-400 font-mono uppercase flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-blue-500" /> Security Status
            </h3>

            <div className="space-y-3 font-mono">
              <div className="flex justify-between items-center p-2.5 bg-[#1C1C22] rounded-lg border border-gray-800/80">
                <span className="text-[11px] text-gray-400">Two-Factor Auth (2FA)</span>
                {securityStatus.mfaEnabled ? (
                  <span className="text-[10px] px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 font-bold rounded">
                    ACTIVE
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold rounded">
                    DISABLED
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center p-2.5 bg-[#1C1C22] rounded-lg border border-gray-800/80">
                <span className="text-[11px] text-gray-400">Email Verification</span>
                {securityStatus.emailVerified ? (
                  <span className="text-[10px] px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 font-bold rounded">
                    VERIFIED
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold rounded">
                    UNVERIFIED
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center p-2.5 bg-[#1C1C22] rounded-lg border border-gray-800/80">
                <span className="text-[11px] text-gray-400">Active Sessions</span>
                <span className="text-xs font-bold text-white">{securityStatus.sessionsCount || 1} Device(s)</span>
              </div>
            </div>

            <button
              onClick={onNavigateToSecurity}
              className="w-full py-2 bg-[#1C1C22] border border-gray-800 hover:border-blue-500 text-xs font-semibold rounded-lg transition text-center"
            >
              Configure Security Controls
            </button>
          </div>

          {/* Audit Logging Overview */}
          <div className="bg-[#121216] border border-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold tracking-widest text-gray-400 font-mono uppercase flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-500" /> Recent Security Audit
            </h3>

            {recentLogs.length === 0 ? (
              <p className="text-xs text-gray-500 font-mono">No recent security updates recorded.</p>
            ) : (
              <div className="space-y-3 font-mono">
                {recentLogs.map((log) => (
                  <div key={log.id} className="border-b border-gray-800/60 pb-2 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start text-[10px]">
                      <span className="font-bold text-gray-300 uppercase truncate max-w-[150px]">{log.event.replace(/_/g, " ")}</span>
                      <span
                        className={`font-semibold ${
                          log.status === "SUCCESS"
                            ? "text-green-500"
                            : log.status === "FAILURE"
                            ? "text-red-400"
                            : "text-blue-400"
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-500 mt-0.5">
                      <span>IP: {log.ipAddress}</span>
                      <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        )}
      </main>

      {/* Network Connectivity Toast Indicator */}
      <OfflineIndicator />
    </div>
  );
}
