export interface User {
  id: string;
  email: string;
  isVerified: boolean;
  mfaEnabled: boolean;
  isGuest?: boolean;
}

export interface SessionRecord {
  id: string;
  ipAddress: string;
  userAgent: string;
  isCurrent: boolean;
  createdAt: number;
}

export interface SecurityLog {
  id: string;
  userId: string | null;
  email: string | null;
  event: string;
  status: "SUCCESS" | "FAILURE" | "INFO";
  ipAddress: string;
  userAgent: string;
  createdAt: number;
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
  path: string;
  language: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface RunResult {
  success: boolean;
  status: "SUCCESS" | "ERROR" | "TIMEOUT" | "STOPPED";
  output: string;
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  exitCode: number | null;
  runtimeInfo?: string;
  isEmulated: boolean;
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

export interface ExplanationResult {
  summary: string;
  structureAnalysis: string;
  entrypoint: string;
  dependencies: string[];
  executionFlow: string;
  recommendations: string[];
}

export interface ErrorExplanation {
  rootCause: string;
  suggestion: string;
  fixExample: string;
}

export interface Diagnostic {
  file: string;
  line: number;
  column: number;
  message: string;
  category: string;
  severity: "ERROR" | "WARNING" | "INFO" | "HINT";
}

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  autoCloseBrackets: boolean;
  autoCloseQuotes: boolean;
  minimap: boolean;
}

export interface LanguageDefinition {
  name: string;
  extension: string;
  isExecutableNatively: boolean;
  compilerCommand?: string;
  runCommand?: string;
}

export const LANGUAGES: Record<string, LanguageDefinition> = {
  python: { name: "Python", extension: ".py", isExecutableNatively: true },
  javascript: { name: "JavaScript", extension: ".js", isExecutableNatively: true },
  typescript: { name: "TypeScript", extension: ".ts", isExecutableNatively: true },
  c: { name: "C", extension: ".c", isExecutableNatively: false },
  cpp: { name: "C++", extension: ".cpp", isExecutableNatively: false },
  java: { name: "Java", extension: ".java", isExecutableNatively: false },
  csharp: { name: "C#", extension: ".cs", isExecutableNatively: false },
  go: { name: "Go", extension: ".go", isExecutableNatively: false },
  rust: { name: "Rust", extension: ".rs", isExecutableNatively: false },
  php: { name: "PHP", extension: ".php", isExecutableNatively: false },
  kotlin: { name: "Kotlin", extension: ".kt", isExecutableNatively: false },
  swift: { name: "Swift", extension: ".swift", isExecutableNatively: false },
  dart: { name: "Dart", extension: ".dart", isExecutableNatively: false },
  ruby: { name: "Ruby", extension: ".rb", isExecutableNatively: false },
  r: { name: "R", extension: ".r", isExecutableNatively: false },
  lua: { name: "Lua", extension: ".lua", isExecutableNatively: false },
  perl: { name: "Perl", extension: ".pl", isExecutableNatively: false },
  bash: { name: "Bash", extension: ".sh", isExecutableNatively: true },
  sql: { name: "SQL", extension: ".sql", isExecutableNatively: false },
  fortran: { name: "Fortran", extension: ".f90", isExecutableNatively: false },
};
