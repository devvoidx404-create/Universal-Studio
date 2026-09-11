import React, { useState, useEffect, useRef } from "react";
import { OfflineIndicator } from "./OfflineIndicator";
import {
  Folder,
  File,
  FileCode,
  Plus,
  Play,
  Square,
  Sparkles,
  Download,
  Upload,
  ChevronRight,
  Settings,
  HelpCircle,
  X,
  FileUp,
  Terminal,
  Activity,
  ChevronDown,
  Trash2,
  Save,
  HelpCircle as HelpIcon,
  RefreshCw,
  Zap,
  ArrowRight
} from "lucide-react";
import { Project, ProjectFile, RunResult, EditorSettings, ErrorExplanation, ExplanationResult } from "../types";
import SettingsModal from "./SettingsModal";

interface CodeArenaProps {
  token: string;
  projectId: string;
  onBackToDashboard: () => void;
  onNavigateToHelp: () => void;
  isMobileLayout?: boolean;
}

export default function CodeArena({
  token,
  projectId,
  onBackToDashboard,
  onNavigateToHelp,
  isMobileLayout = false,
}: CodeArenaProps) {
  // Config & Entities State
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);

  // Editor Settings
  const [editorSettings, setEditorSettings] = useState<EditorSettings>({
    fontSize: 14,
    tabSize: 4,
    wordWrap: true,
    autoCloseBrackets: true,
    autoCloseQuotes: true,
    minimap: false,
  });
  const [showSettings, setShowSettings] = useState(false);

  // Layout panels
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [consoleTab, setConsoleTab] = useState<"terminal" | "diagnostics" | "history">("terminal");
  const [activeMobilePanel, setActiveMobilePanel] = useState<"files" | "editor" | "terminal">("editor");

  // File explorer creation controls
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [dragOverTree, setDragOverTree] = useState(false);

  // Code Execution and Compilation
  const [isRunning, setIsRunning] = useState(false);
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string>("[Universal Console Engine v1.0 Ready]\nSelect a file and click Run to execute in the container sandbox.\n");
  const [runHistory, setRunHistory] = useState<any[]>([]);

  // Smart Error Center & AI Suggestions
  const [compilerErrorOccurred, setCompilerErrorOccurred] = useState(false);
  const [errorContext, setErrorContext] = useState<{ fileName: string; language: string; log: string; code: string } | null>(null);
  const [aiErrorFix, setAiErrorFix] = useState<ErrorExplanation | null>(null);
  const [aiFixLoading, setAiFixLoading] = useState(false);

  // Project Architect static audits
  const [showProjectArchitect, setShowProjectArchitect] = useState(false);
  const [projectAudit, setProjectAudit] = useState<ExplanationResult | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // Debugger states
  const [breakpoints, setBreakpoints] = useState<Record<string, Set<number>>>({});
  const [debugLog, setDebugLog] = useState<string[]>([]);

  // Save states
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFile = files.find((f) => f.id === activeFileId);

  // Fetch initial files layout
  const fetchProjectFiles = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Get project details
      const projRes = await fetch(`/api/projects`, { headers });
      if (projRes.ok) {
        const projs = await projRes.json();
        const activeProj = projs.find((p: any) => p.id === projectId);
        if (activeProj) setProject(activeProj);
      }

      // Get files list
      const filesRes = await fetch(`/api/projects/${projectId}/files`, { headers });
      if (filesRes.ok) {
        const filesData = await filesRes.json();
        setFiles(filesData);
        if (filesData.length > 0 && !activeFileId) {
          setActiveFileId(filesData[0].id);
          setOpenTabIds([filesData[0].id]);
        }
      }

      // Sync runs histories
      const runRes = await fetch(`/api/projects/${projectId}/runs`, { headers });
      if (runRes.ok) {
        setRunHistory(await runRes.json());
      }
    } catch (err) {
      console.error("Failed to sync project details:", err);
    }
  };

  useEffect(() => {
    fetchProjectFiles();
  }, [projectId]);

  // Handle Tab Selections
  const selectFile = (fileId: string) => {
    setActiveFileId(fileId);
    if (!openTabIds.includes(fileId)) {
      setOpenTabIds([...openTabIds, fileId]);
    }
    // Dismiss any stale compiler fix
    setAiErrorFix(null);
    if (isMobileLayout) {
      setActiveMobilePanel("editor");
    }
  };

  const closeTab = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedTabs = openTabIds.filter((id) => id !== fileId);
    setOpenTabIds(updatedTabs);

    if (activeFileId === fileId) {
      if (updatedTabs.length > 0) {
        setActiveFileId(updatedTabs[updatedTabs.length - 1]);
      } else {
        setActiveFileId(null);
      }
    }
  };

  // Safe file updates
  const handleContentChange = (newVal: string) => {
    if (!activeFileId) return;
    setFiles(
      files.map((f) => (f.id === activeFileId ? { ...f, content: newVal, updatedAt: Date.now() } : f))
    );
  };

  // Keyboard closures and save hooks
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!activeFile) return;

    // Ctrl + S manual save override
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveActiveFileContent();
      return;
    }

    // Auto brackets/quotes enclosures
    const text = activeFile.content;
    const start = e.currentTarget.selectionStart;
    const end = e.currentTarget.selectionEnd;

    const brackets: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
    const quotes: Record<string, string> = { '"': '"', "'": "'" };

    if (editorSettings.autoCloseBrackets && brackets[e.key]) {
      e.preventDefault();
      const closing = brackets[e.key];
      const newVal = text.slice(0, start) + e.key + closing + text.slice(end);
      handleContentChange(newVal);
      setTimeout(() => {
        if (fileInputRef.current) {
          const textarea = document.getElementById("code-editor") as HTMLTextAreaElement;
          if (textarea) {
            textarea.selectionStart = textarea.selectionEnd = start + 1;
          }
        }
      }, 0);
    } else if (editorSettings.autoCloseQuotes && quotes[e.key]) {
      e.preventDefault();
      const closing = quotes[e.key];
      const newVal = text.slice(0, start) + e.key + closing + text.slice(end);
      handleContentChange(newVal);
      setTimeout(() => {
        const textarea = document.getElementById("code-editor") as HTMLTextAreaElement;
        if (textarea) {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }
      }, 0);
    }
  };

  const saveActiveFileContent = async () => {
    if (!activeFile) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/files/${activeFile.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: activeFile.content }),
      });
      if (!res.ok) console.warn("Failed to autosave changes.");
    } catch (e) {
      console.warn("Autosave network error.");
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced autosave triggers
  useEffect(() => {
    if (!activeFile) return;
    const timer = setTimeout(() => {
      saveActiveFileContent();
    }, 1200);
    return () => clearTimeout(timer);
  }, [activeFile?.content]);

  // File Explorer interactions
  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newFileName,
          path: newFileName,
          content: "",
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setFiles([...files, created]);
        setNewFileName("");
        setIsCreatingFile(false);
        selectFile(created.id);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create file.");
      }
    } catch (err) {
      alert("Network error.");
    }
  };

  const handleDeleteFile = async (fileId: string, name: string) => {
    if (files.length <= 1) {
      alert("Projects must contain at least one file sandbox.");
      return;
    }
    if (!confirm(`Permanently delete "${name}"?`)) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const updatedFiles = files.filter((f) => f.id !== fileId);
        setFiles(updatedFiles);
        closeTab(fileId, { stopPropagation: () => {} } as any);
      }
    } catch (e) {
      alert("Network error.");
    }
  };

  // Code Executions and Smart Center handles
  const handleRunCode = async () => {
    if (!activeFile) {
      alert("Open a source file to launch execution.");
      return;
    }

    setIsRunning(true);
    setCompilerErrorOccurred(false);
    setAiErrorFix(null);
    setConsoleTab("terminal");
    if (isMobileLayout) {
      setActiveMobilePanel("terminal");
    }
    setTerminalOutput(`[Launching Sandbox Execution: ${activeFile.name}]\nRunning in container sandbox...\n`);

    try {
      // First, forcefully save current changes to database
      await saveActiveFileContent();

      const res = await fetch(`/api/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          fileId: activeFile.id,
          code: activeFile.content,
        }),
      });

      const data: RunResult = await res.json();

      if (!res.ok) {
        setTerminalOutput((prev) => prev + `\nExecution Engine Crash: ${data.output || "Unexpected server closure."}`);
        return;
      }

      // Check for errors to configure compiler help
      if (data.status === "ERROR" || data.exitCode !== 0) {
        setCompilerErrorOccurred(true);
        setErrorContext({
          fileName: activeFile.name,
          language: activeFile.language,
          log: data.output,
          code: activeFile.content,
        });
      }

      setTerminalOutput((prev) => {
        return (
          prev +
          `\n--- Standard Output (stdout) ---\n${data.stdout || "(Empty Output)"}\n` +
          `--- Standard Error (stderr) ---\n${data.stderr || "(None)"}\n` +
          `-------------------------------\n` +
          `Status: ${data.status}\n` +
          `Exit Code: ${data.exitCode ?? "N/A"}\n` +
          `Execution Duration: ${data.executionTimeMs}ms\n` +
          `Sandbox Layer: ${data.runtimeInfo || "Local Container Sandbox"}\n`
        );
      });

      // Fetch running histories update
      const runRes = await fetch(`/api/projects/${projectId}/runs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (runRes.ok) {
        setRunHistory(await runRes.json());
      }
    } catch (err: any) {
      setTerminalOutput((prev) => prev + `\n\nRuntime controller lost connection: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Debugger Controls (Adaptive simulations with clear diagnostics)
  const handleToggleBreakpoint = (lineNum: number) => {
    if (!activeFileId) return;
    const current = breakpoints[activeFileId] || new Set();
    const copy = new Set(current);
    if (copy.has(lineNum)) {
      copy.delete(lineNum);
    } else {
      copy.add(lineNum);
    }
    setBreakpoints({
      ...breakpoints,
      [activeFileId]: copy,
    });
    setDebugLog((prev) => [...prev, `[Debugger] Breakpoint configured on line ${lineNum} of ${activeFile?.name}`]);
  };

  const handleDebuggerAction = (action: string) => {
    setDebugLog((prev) => [...prev, `[Debugger] Action trigger: ${action}`]);
    setTerminalOutput((prev) => prev + `\n[Debugger Diagnostic] Stepping action: ${action}\n`);
  };

  // Smart Error Center AI assistance
  const explainRuntimeError = async () => {
    if (!errorContext) return;
    setAiFixLoading(true);
    setAiErrorFix(null);

    try {
      const res = await fetch("/api/run/explain-error", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(errorContext),
      });

      if (res.ok) {
        const suggestion = await res.json();
        setAiErrorFix(suggestion);
      } else {
        alert("Failed to compile suggestions.");
      }
    } catch (e) {
      alert("Network connection failure.");
    } finally {
      setAiFixLoading(false);
    }
  };

  // Project static layout analysis
  const runProjectArchitect = async () => {
    setAuditLoading(true);
    setShowProjectArchitect(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/explain`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const audit = await res.json();
        setProjectAudit(audit);
      } else {
        alert("Static analysis engine failed.");
      }
    } catch (e) {
      alert("Connection failed.");
    } finally {
      setAuditLoading(false);
    }
  };

  // Project Backup Exporters
  const handleExportProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${project?.name || "sandbox"}_export.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      alert("Backup creation failed.");
    }
  };

  // File Upload Handlers (Click and Drag-and-Drop)
  const triggerManualUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;

    for (let i = 0; i < filesList.length; i++) {
      const fileObj = filesList[i];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const contentStr = event.target?.result as string;
        await createUploadedFile(fileObj.name, contentStr);
      };
      reader.readAsText(fileObj);
    }
  };

  const createUploadedFile = async (name: string, content: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, path: name, content }),
      });

      if (res.ok) {
        const createdFile = await res.json();
        setFiles((prev) => [...prev, createdFile]);
        selectFile(createdFile.id);
      } else {
        const err = await res.json();
        alert(`Failed importing "${name}": ${err.error}`);
      }
    } catch (e) {
      alert("Import failed.");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTree(true);
  };

  const handleDragLeave = () => {
    setDragOverTree(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTree(false);

    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles || droppedFiles.length === 0) return;

    for (let i = 0; i < droppedFiles.length; i++) {
      const fileObj = droppedFiles[i];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const contentStr = event.target?.result as string;
        await createUploadedFile(fileObj.name, contentStr);
      };
      reader.readAsText(fileObj);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white flex flex-col font-sans overflow-hidden select-none">
      {/* Upper Action Header */}
      <header className="h-12 border-b border-gray-800 bg-[#121216] px-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="text-xs text-gray-400 hover:text-white font-semibold flex items-center gap-1 bg-[#1C1C22] border border-gray-800 px-2.5 py-1 rounded transition"
          >
            ← Back to Dashboard
          </button>
          <div className="h-4 w-px bg-gray-800" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white font-mono break-all truncate max-w-[150px] sm:max-w-[300px]">
              {project?.name || "Initializing..."}
            </span>
            <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono font-bold px-1.5 py-0.5 rounded uppercase">
              {project?.primaryLanguage}
            </span>
          </div>
        </div>

        {/* Action button center */}
        <div className="flex items-center gap-2">
          {/* Export / Backup Project */}
          <button
            onClick={handleExportProject}
            className="p-1.5 hover:bg-[#1C1C22] border border-transparent hover:border-gray-800 rounded text-gray-400 hover:text-white transition"
            title="Export Project Backup"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Upload / Code Imports */}
          <button
            onClick={triggerManualUpload}
            className="p-1.5 hover:bg-[#1C1C22] border border-transparent hover:border-gray-800 rounded text-gray-400 hover:text-white transition"
            title="Import Code File"
          >
            <Upload className="w-4 h-4" />
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            className="hidden"
            accept=".py,.js,.ts,.c,.cpp,.rs,.java,.cs,.go,.php,.kt,.swift,.rb,.pl,.sh,.sql,.f90"
          />

          <div className="h-4 w-px bg-gray-800" />

          {/* Dynamic run status */}
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="px-3.5 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded flex items-center gap-1.5 transition shadow"
          >
            {isRunning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-white" />
            )}
            Run Code
          </button>

          <button
            onClick={runProjectArchitect}
            className="px-3 py-1 bg-[#1A1A22] border border-gray-800 hover:border-blue-500 text-xs text-blue-400 font-semibold rounded flex items-center gap-1.5 transition"
            title="Project Architect AI audit"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Architect
          </button>

          <div className="h-4 w-px bg-gray-800" />

          {/* Preferences Settings Trigger */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 hover:bg-[#1C1C22] border border-transparent hover:border-gray-800 rounded text-gray-400 hover:text-white transition"
            title="Preferences settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Support manual link */}
          <button
            onClick={onNavigateToHelp}
            className="p-1.5 hover:bg-[#1C1C22] border border-transparent hover:border-gray-800 rounded text-gray-400 hover:text-white transition"
            title="Support center"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Sandbox Workspace Grid */}
      <div className={`flex-1 flex overflow-hidden ${isMobileLayout ? "pb-14" : ""}`}>
        {/* LEFT SIDEBAR: FILE EXPLORER */}
        {isSidebarOpen && (!isMobileLayout || activeMobilePanel === "files") && (
          <aside
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`${isMobileLayout ? "w-full" : "w-64"} border-r border-gray-800 bg-[#121216] flex flex-col select-none transition ${
              dragOverTree ? "border-blue-500 bg-blue-500/5" : ""
            }`}
            id="workspace-sidebar"
          >
            <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-[#1A1A22]/30">
              <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase font-mono">
                Project Explorer
              </span>
              <button
                onClick={() => setIsCreatingFile(true)}
                className="p-1 hover:bg-[#1C1C22] rounded text-gray-400 hover:text-white transition"
                title="Add Source File"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Creating File Inline Form */}
            {isCreatingFile && (
              <form onSubmit={handleCreateFile} className="p-2 border-b border-gray-800 bg-[#1C1C22]/40">
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="name.py"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <div className="flex justify-end gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingFile(false);
                      setNewFileName("");
                    }}
                    className="px-2 py-0.5 text-[9px] text-gray-500 hover:text-white font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-[9px] font-bold text-white font-mono rounded"
                  >
                    Create
                  </button>
                </div>
              </form>
            )}

            {/* Tree files lists */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
              <div className="flex items-center gap-1 text-gray-500 py-1 px-1.5">
                <Folder className="w-4 h-4 text-gray-400" />
                <span>sandbox-root/</span>
              </div>

              {files.map((file) => {
                const isActive = file.id === activeFileId;
                return (
                  <div
                    key={file.id}
                    onClick={() => selectFile(file.id)}
                    className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition ${
                      isActive ? "bg-blue-600/15 text-blue-400 font-bold" : "hover:bg-[#1C1C22] text-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileCode className={`w-3.5 h-3.5 ${isActive ? "text-blue-400" : "text-gray-500"}`} />
                      <span className="truncate">{file.path || file.name}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(file.id, file.name);
                      }}
                      className="p-1 text-gray-500 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition focus:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

              {dragOverTree && (
                <div className="border border-dashed border-blue-500/50 bg-blue-600/5 text-blue-400 text-center p-6 rounded-lg font-sans text-xs mt-4">
                  <FileUp className="w-6 h-6 mx-auto mb-1" />
                  Drop file to import
                </div>
              )}
            </div>
          </aside>
        )}

        {/* WORKSPACE COLUMN (EDITOR + TERMINAL) */}
        {(!isMobileLayout || activeMobilePanel !== "files") && (
          <main className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0C]">
            {/* EDITOR SECTION */}
            {(!isMobileLayout || activeMobilePanel === "editor") && (
              <section className="flex-1 flex flex-col overflow-hidden border-b border-gray-800">
            {/* Top Tab bar */}
            <div className="h-9 border-b border-gray-800 bg-[#121216] flex items-center justify-between select-none pr-3">
              <div className="flex items-center overflow-x-auto h-full scrollbar-none">
                {openTabIds.map((tabId) => {
                  const f = files.find((item) => item.id === tabId);
                  if (!f) return null;
                  const isActive = tabId === activeFileId;
                  return (
                    <div
                      key={tabId}
                      onClick={() => setActiveFileId(tabId)}
                      className={`h-full px-4 border-r border-gray-800 flex items-center gap-2 text-xs cursor-pointer transition ${
                        isActive ? "bg-[#0A0A0C] border-t-2 border-t-blue-500 text-white font-semibold" : "bg-[#18181E]/40 text-gray-400 hover:bg-[#1C1C22]"
                      }`}
                    >
                      <FileCode className={`w-3.5 h-3.5 ${isActive ? "text-blue-500" : "text-gray-500"}`} />
                      <span className="font-mono">{f.name}</span>
                      <button
                        onClick={(e) => closeTab(tabId, e)}
                        className="p-0.5 hover:bg-[#1C1C22] rounded text-gray-500 hover:text-white transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {isSaving && (
                <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1 animate-pulse">
                  <Save className="w-3 h-3" /> Autosaving...
                </span>
              )}
            </div>

            {/* Core Textarea layout */}
            {activeFile ? (
              <div className="flex-1 flex overflow-hidden relative">
                {/* Simulated line counts */}
                <div className="w-10 bg-[#0F0F13]/40 select-none border-r border-gray-800/80 p-2 text-right font-mono text-[11px] text-gray-600">
                  {activeFile.content.split("\n").map((_, idx) => (
                    <div
                      key={idx}
                      className="cursor-pointer hover:text-blue-500 transition"
                      onClick={() => handleToggleBreakpoint(idx + 1)}
                    >
                      {breakpoints[activeFile.id]?.has(idx + 1) ? (
                        <span className="text-red-500 font-bold mr-1">•</span>
                      ) : (
                        ""
                      )}
                      {idx + 1}
                    </div>
                  ))}
                </div>

                {/* Main Code writing canvas */}
                <textarea
                  id="code-editor"
                  value={activeFile.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent p-4 font-mono focus:outline-none text-white resize-none h-full selection:bg-blue-600 selection:text-white placeholder:text-gray-600"
                  placeholder={`// Start writing code in ${activeFile.language}...`}
                  style={{
                    fontSize: `${editorSettings.fontSize}px`,
                    whiteSpace: editorSettings.wordWrap ? "pre-wrap" : "pre",
                    lineHeight: "1.6",
                  }}
                />

                {/* Visual debug breakpoints bar overlay */}
                <div className="absolute right-4 top-4 p-2.5 bg-[#121216]/90 border border-gray-800 rounded-xl space-y-2 z-10 flex flex-col font-mono text-[10px] text-gray-400">
                  <span className="font-bold border-b border-gray-800 pb-1 text-gray-300 block">DEBUGGER ADAPTER</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleDebuggerAction("STEP_OVER")}
                      className="px-1.5 py-0.5 bg-[#1C1C22] border border-gray-800 hover:border-blue-500 rounded text-[9px] font-bold"
                    >
                      STEP_OVER
                    </button>
                    <button
                      onClick={() => handleDebuggerAction("CONTINUE")}
                      className="px-1.5 py-0.5 bg-blue-600/20 border border-blue-500 hover:bg-blue-600 text-white rounded text-[9px] font-bold"
                    >
                      CONT
                    </button>
                  </div>
                  <span className="text-[9px] text-gray-500 truncate max-w-[130px]">
                    Breakpoints: {breakpoints[activeFile.id]?.size || 0} configured
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center space-y-2.5 text-center p-6">
                <Terminal className="w-10 h-10 text-gray-700" />
                <div>
                  <p className="text-sm font-semibold">No Open Tab</p>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-0.5">
                    Select a source file from the Explorer to spin up compilation workflows.
                  </p>
                </div>
              </div>
            )}
          </section>
          )}

          {/* LOWER SECTION: TERMINAL, DIAGNOSTICS & SMART ERROR CENTER */}
          {(!isMobileLayout || activeMobilePanel === "terminal") && (
            <section className={`${isMobileLayout ? "flex-1" : "h-56"} bg-[#121216] border-t border-gray-800 flex flex-col overflow-hidden`}>
            {/* Headers Toggle */}
            <div className="h-8 border-b border-gray-800 bg-[#121216] px-3 flex justify-between items-center select-none">
              <div className="flex gap-2">
                {[
                  { id: "terminal", label: "Runtime Terminal" },
                  { id: "diagnostics", label: "Smart Error Center" },
                  { id: "history", label: "Execution History" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setConsoleTab(tab.id as any)}
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded transition ${
                      consoleTab === tab.id
                        ? "bg-blue-600/10 border border-blue-500/20 text-blue-400"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {tab.label}
                    {tab.id === "diagnostics" && compilerErrorOccurred && (
                      <span className="ml-1 px-1 py-0.5 bg-red-500/20 text-red-400 text-[8px] font-bold rounded animate-pulse">
                        ALERT
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Consolidated outputs */}
            <div className="flex-1 overflow-auto p-4 font-mono text-xs text-gray-300 bg-black/30 selection:bg-blue-600 select-text">
              {/* TERMINAL VIEW */}
              {consoleTab === "terminal" && (
                <pre className="whitespace-pre-wrap leading-relaxed">{terminalOutput}</pre>
              )}

              {/* SMART ERROR CENTER VIEW */}
              {consoleTab === "diagnostics" && (
                <div className="space-y-4">
                  {!compilerErrorOccurred ? (
                    <div className="text-center py-6 text-gray-500 flex flex-col items-center gap-1">
                      <Zap className="w-5 h-5 text-gray-700" />
                      <span>No Compiler or Runtime Errors detected. Clean Compilation!</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Active error card warning */}
                      <div className="p-3 bg-red-950/20 border border-red-800/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-red-400 block uppercase">Compiler Stacking Failure Intercepted</span>
                          <span className="text-[10px] text-gray-500 block">The execution sandbox exited with non-zero flags. Resolve via AI code suggestions.</span>
                        </div>
                        <button
                          onClick={explainRuntimeError}
                          disabled={aiFixLoading}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[10px] font-bold rounded-lg flex items-center gap-1.5 transition whitespace-nowrap self-start sm:self-auto"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> {aiFixLoading ? "Formulating Correction..." : "Explain Error with AI"}
                        </button>
                      </div>

                      {/* AI suggestions output details */}
                      {aiErrorFix && (
                        <div className="bg-[#1C1C22]/80 border border-gray-800 p-4 rounded-xl space-y-3 font-mono text-xs leading-relaxed">
                          <div className="space-y-1">
                            <h4 className="font-bold text-blue-400 uppercase tracking-wide text-[11px]">Detected Root Cause</h4>
                            <p className="text-gray-300">{aiErrorFix.rootCause}</p>
                          </div>

                          <div className="space-y-1">
                            <h4 className="font-bold text-blue-400 uppercase tracking-wide text-[11px]">Resolution Suggestions</h4>
                            <p className="text-gray-300">{aiErrorFix.suggestion}</p>
                          </div>

                          {aiErrorFix.fixExample && (
                            <div className="space-y-1.5">
                              <h4 className="font-bold text-blue-400 uppercase tracking-wide text-[11px]">Corrected Syntax Blueprint</h4>
                              <pre className="p-3 bg-black/60 border border-gray-800 rounded text-green-400 overflow-x-auto">
                                {aiErrorFix.fixExample}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* RUN HISTORY VIEW */}
              {consoleTab === "history" && (
                <div className="space-y-2.5">
                  {runHistory.length === 0 ? (
                    <p className="text-center py-6 text-gray-500">No previous execution records registered.</p>
                  ) : (
                    <div className="space-y-2">
                      {runHistory.map((run: any) => (
                        <div
                          key={run.id}
                          className="p-2.5 bg-[#1C1C22]/50 border border-gray-800/60 rounded-lg flex items-center justify-between"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs font-mono">{run.fileName}</span>
                              <span className="text-[9px] bg-blue-500/10 text-blue-400 font-bold px-1 py-0.5 rounded uppercase">
                                {run.language}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-500 block">
                              Duration: {run.executionTimeMs}ms • Exit: {run.exitCode ?? "0"}
                            </span>
                          </div>

                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                              run.status === "SUCCESS"
                                ? "bg-green-500/10 border-green-500/20 text-green-500"
                                : "bg-red-500/10 border-red-500/20 text-red-400"
                            }`}
                          >
                            {run.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            </section>
          )}
        </main>
        )}
      </div>

      {/* Mobile touch-optimized bottom navigation dock */}
      {isMobileLayout && (
        <div className="fixed bottom-0 left-0 right-0 h-14 bg-[#121216] border-t border-gray-800 flex items-center justify-around z-30 px-4">
          <button
            onClick={() => setActiveMobilePanel("files")}
            className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold font-mono uppercase tracking-wider transition ${
              activeMobilePanel === "files" ? "text-blue-500 font-bold" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Folder className="w-5 h-5" />
            <span>Files</span>
          </button>
          <button
            onClick={() => setActiveMobilePanel("editor")}
            className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold font-mono uppercase tracking-wider transition ${
              activeMobilePanel === "editor" ? "text-blue-500 font-bold" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <FileCode className="w-5 h-5" />
            <span>Editor</span>
          </button>
          <button
            onClick={() => setActiveMobilePanel("terminal")}
            className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold font-mono uppercase tracking-wider transition relative ${
              activeMobilePanel === "terminal" ? "text-blue-500 font-bold" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Terminal className="w-5 h-5" />
            <span>Terminal</span>
            {compilerErrorOccurred && (
              <span className="absolute top-1.5 right-3 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        </div>
      )}

      {/* PROJECT ARCHITECT DRAWER / MODAL */}
      {showProjectArchitect && (
        <div className="fixed inset-0 bg-black/75 z-40 flex justify-end animate-fadeIn">
          <div className="w-full max-w-xl bg-[#121216] border-l border-gray-850 p-6 flex flex-col overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-5">
              <h3 className="text-sm font-bold tracking-wide uppercase text-blue-500 flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> Project Architect Audit
              </h3>
              <button
                onClick={() => setShowProjectArchitect(false)}
                className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {auditLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center font-mono text-xs text-gray-500 py-20">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                Performing multi-file static semantic scan...
              </div>
            ) : (
              projectAudit && (
                <div className="space-y-6 font-mono text-xs leading-relaxed">
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-blue-400 uppercase tracking-wider text-[11px]">Logical Project Entrypoint</h4>
                    <pre className="p-2.5 bg-black/60 border border-gray-800 text-white rounded font-bold break-all">
                      {projectAudit.entrypoint || "None detected."}
                    </pre>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-blue-400 uppercase tracking-wider text-[11px]">System Summary</h4>
                    <p className="text-gray-300 bg-[#1C1C22]/50 p-3.5 border border-gray-800 rounded-xl leading-relaxed">
                      {projectAudit.summary}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-blue-400 uppercase tracking-wider text-[11px]">Project Structure & Layout</h4>
                    <p className="text-gray-300 bg-[#1C1C22]/50 p-3.5 border border-gray-800 rounded-xl whitespace-pre-wrap leading-relaxed">
                      {projectAudit.structureAnalysis}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-blue-400 uppercase tracking-wider text-[11px]">Logical Execution Flow</h4>
                    <p className="text-gray-300 bg-[#1C1C22]/50 p-3.5 border border-gray-800 rounded-xl leading-relaxed">
                      {projectAudit.executionFlow}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-blue-400 uppercase tracking-wider text-[11px]">Detected Modules & Libraries</h4>
                    <div className="flex flex-wrap gap-2">
                      {projectAudit.dependencies?.map((dep, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-black/60 border border-gray-800 text-gray-300 rounded font-mono">
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-gray-800">
                    <h4 className="font-bold text-blue-400 uppercase tracking-wider text-[11px]">Architectural Recommendations</h4>
                    <ul className="space-y-2">
                      {projectAudit.recommendations?.map((rec, idx) => (
                        <li key={idx} className="flex gap-2 text-gray-300 leading-relaxed">
                          <span className="text-blue-500 font-bold">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* EDITOR SETTINGS PREFERENCES MODAL */}
      {showSettings && (
        <SettingsModal
          settings={editorSettings}
          onUpdate={setEditorSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Connectivity Alert */}
      <OfflineIndicator />
    </div>
  );
}
