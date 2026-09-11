import fs from "fs";
import path from "path";

// Define absolute path to JSON database
const DB_DIR = path.join(process.cwd(), "server", "data");
const DB_FILE = path.join(DB_DIR, "db.json");

// Ensure DB directory and file exist
function initializeDB() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [],
      sessions: [],
      projects: [],
      files: [],
      securityLogs: [],
      executionHistory: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf8");
  }
}

// Low-level read/write
function readDB(): any {
  initializeDB();
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to read database file, resetting:", error);
    return {
      users: [],
      sessions: [],
      projects: [],
      files: [],
      securityLogs: [],
      executionHistory: [],
    };
  }
}

function writeDB(data: any) {
  initializeDB();
  try {
    // Write atomically to avoid corruptions
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tempFile, DB_FILE);
  } catch (error) {
    console.error("Failed to write to database:", error);
  }
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  isVerified: boolean;
  verificationCode?: string;
  verificationExpires?: number;
  mfaEnabled: boolean;
  mfaSecret?: string; // Encrypted or obfuscated in-memory
  mfaRecoveryCodes: string[]; // Hashed
  resetToken?: string;
  resetExpires?: number;
  createdAt: number;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  userAgent: string;
  ipAddress: string;
  expiresAt: number;
  createdAt: number;
  mfaVerified: boolean; // Flag to check if session completed 2nd factor
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  primaryLanguage: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  path: string; // relative to project root
  language: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface SecurityLog {
  id: string;
  userId: string | null;
  email: string | null;
  event: string; // e.g., 'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'MFA_ENABLED', 'PASSWORD_RESET_REQUEST'
  status: "SUCCESS" | "FAILURE" | "INFO";
  ipAddress: string;
  userAgent: string;
  createdAt: number;
}

export interface ExecutionHistoryEntry {
  id: string;
  projectId: string;
  fileId: string;
  fileName: string;
  language: string;
  status: "SUCCESS" | "ERROR" | "TIMEOUT" | "STOPPED";
  executionTimeMs: number;
  exitCode: number | null;
  output: string;
  createdAt: number;
}

export const db = {
  // --- USERS ---
  getUsers(): User[] {
    return readDB().users;
  },

  getUserById(id: string): User | undefined {
    return this.getUsers().find((u) => u.id === id);
  },

  getUserByEmail(email: string): User | undefined {
    return this.getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  },

  createUser(user: User) {
    const data = readDB();
    data.users.push(user);
    writeDB(data);
  },

  updateUser(id: string, updates: Partial<User>) {
    const data = readDB();
    const index = data.users.findIndex((u: User) => u.id === id);
    if (index !== -1) {
      data.users[index] = { ...data.users[index], ...updates };
      writeDB(data);
    }
  },

  // --- SESSIONS ---
  getSessions(): Session[] {
    return readDB().sessions;
  },

  getSessionByToken(token: string): Session | undefined {
    return this.getSessions().find((s) => s.token === token && s.expiresAt > Date.now());
  },

  createSession(session: Session) {
    const data = readDB();
    data.sessions.push(session);
    writeDB(data);
  },

  updateSession(id: string, updates: Partial<Session>) {
    const data = readDB();
    const index = data.sessions.findIndex((s: Session) => s.id === id);
    if (index !== -1) {
      data.sessions[index] = { ...data.sessions[index], ...updates };
      writeDB(data);
    }
  },

  deleteSession(token: string) {
    const data = readDB();
    data.sessions = data.sessions.filter((s: Session) => s.token !== token);
    writeDB(data);
  },

  deleteUserSessions(userId: string) {
    const data = readDB();
    data.sessions = data.sessions.filter((s: Session) => s.userId !== userId);
    writeDB(data);
  },

  // --- PROJECTS ---
  getProjects(userId: string): Project[] {
    return readDB().projects.filter((p: Project) => p.userId === userId);
  },

  getProjectById(id: string, userId: string): Project | undefined {
    return readDB().projects.find((p: Project) => p.id === id && p.userId === userId);
  },

  createProject(project: Project) {
    const data = readDB();
    data.projects.push(project);
    writeDB(data);
  },

  updateProject(id: string, userId: string, updates: Partial<Project>) {
    const data = readDB();
    const index = data.projects.findIndex((p: Project) => p.id === id && p.userId === userId);
    if (index !== -1) {
      data.projects[index] = { ...data.projects[index], ...updates, updatedAt: Date.now() };
      writeDB(data);
    }
  },

  deleteProject(id: string, userId: string) {
    const data = readDB();
    // Only delete if owned by user
    const project = data.projects.find((p: Project) => p.id === id && p.userId === userId);
    if (project) {
      data.projects = data.projects.filter((p: Project) => p.id !== id);
      data.files = data.files.filter((f: ProjectFile) => f.projectId !== id);
      data.executionHistory = data.executionHistory.filter((eh: ExecutionHistoryEntry) => eh.projectId !== id);
      writeDB(data);
    }
  },

  // --- FILES ---
  getFilesByProject(projectId: string): ProjectFile[] {
    return readDB().files.filter((f: ProjectFile) => f.projectId === projectId);
  },

  getFileById(id: string, projectId: string): ProjectFile | undefined {
    return readDB().files.find((f: ProjectFile) => f.id === id && f.projectId === projectId);
  },

  createFile(file: ProjectFile) {
    const data = readDB();
    data.files.push(file);
    writeDB(data);
  },

  updateFile(id: string, projectId: string, updates: Partial<ProjectFile>) {
    const data = readDB();
    const index = data.files.findIndex((f: ProjectFile) => f.id === id && f.projectId === projectId);
    if (index !== -1) {
      data.files[index] = { ...data.files[index], ...updates, updatedAt: Date.now() };
      writeDB(data);
    }
  },

  deleteFile(id: string, projectId: string) {
    const data = readDB();
    data.files = data.files.filter((f: ProjectFile) => !(f.id === id && f.projectId === projectId));
    writeDB(data);
  },

  // --- SECURITY LOGS ---
  getSecurityLogs(userId: string): SecurityLog[] {
    return readDB().securityLogs.filter((l: SecurityLog) => l.userId === userId);
  },

  logSecurityEvent(userId: string | null, email: string | null, event: string, status: "SUCCESS" | "FAILURE" | "INFO", ipAddress: string, userAgent: string) {
    const data = readDB();
    const log: SecurityLog = {
      id: "sec_" + Math.random().toString(36).substring(2, 15),
      userId,
      email,
      event,
      status,
      ipAddress,
      userAgent,
      createdAt: Date.now(),
    };
    data.securityLogs.push(log);
    // Keep last 100 entries for efficiency
    if (data.securityLogs.length > 500) {
      data.securityLogs.shift();
    }
    writeDB(data);
  },

  // --- EXECUTION HISTORY ---
  getExecutionHistory(projectId: string): ExecutionHistoryEntry[] {
    return readDB().executionHistory.filter((eh: ExecutionHistoryEntry) => eh.projectId === projectId);
  },

  logExecution(entry: ExecutionHistoryEntry) {
    const data = readDB();
    data.executionHistory.push(entry);
    // Limit log storage size
    if (data.executionHistory.length > 500) {
      data.executionHistory.shift();
    }
    writeDB(data);
  },
};
