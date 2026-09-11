import express, { Request, Response, NextFunction } from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { db, User, Session, Project, ProjectFile } from "./server/db";
import {
  hashPassword,
  generateSalt,
  generateSecureToken,
  generateMFASecret,
  verifyTOTP,
  generateRecoveryCodes,
  useRecoveryCode,
  isRateLimited,
} from "./server/auth";
import { executeCode, stopExecution, LANGUAGES, detectLanguageByExtension } from "./server/executor";
import { explainProject, explainError } from "./server/analyzer";
import { sendEmail } from "./server/mailer";

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json({ limit: "5mb" }));

// Security Headers Middleware (OWASP alignment)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

// Authenticated Request Context Definition
export interface AuthRequest extends Request {
  user?: User;
  session?: Session;
}

// Authentication Middleware
const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Missing token" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const session = db.getSessionByToken(token);

  if (!session) {
    res.status(401).json({ error: "Unauthorized: Session invalid or expired" });
    return;
  }

  const user = db.getUserById(session.userId);
  if (!user) {
    res.status(401).json({ error: "Unauthorized: User not found" });
    return;
  }

  // Check if 2FA is enabled but session is not MFA verified
  if (user.mfaEnabled && !session.mfaVerified && !req.path.startsWith("/api/auth/otp")) {
    res.status(403).json({ error: "MFA verification required", mfaRequired: true });
    return;
  }

  req.user = user;
  req.session = session;
  next();
};

// ==========================================
// 1. AUTHENTICATION & SECURITY APIS
// ==========================================

// Register
app.post("/api/auth/register", async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip || "127.0.0.1";
  const ua = req.headers["user-agent"] || "";

  if (isRateLimited(`register_${ip}`, 5, 60000 * 15)) {
    db.logSecurityEvent(null, req.body.email || "", "REGISTER_ATTEMPT", "FAILURE", ip, ua);
    res.status(429).json({ error: "Too many registration attempts. Please wait 15 minutes." });
    return;
  }

  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters long." });
    return;
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    db.logSecurityEvent(null, email, "REGISTER_DUPLICATE", "FAILURE", ip, ua);
    res.status(400).json({ error: "An account with this email already exists." });
    return;
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);

  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // Secure 6-digit OTP code

  const newUser: User = {
    id: "usr_" + crypto.randomBytes(16).toString("hex"),
    email,
    passwordHash,
    salt,
    isVerified: false,
    verificationCode,
    verificationExpires: Date.now() + 60000 * 30, // 30 mins
    mfaEnabled: false,
    mfaRecoveryCodes: [],
    createdAt: Date.now(),
  };

  db.createUser(newUser);
  db.logSecurityEvent(newUser.id, email, "USER_REGISTRATION", "SUCCESS", ip, ua);

  // Send real email with template
  const emailResult = await sendEmail({
    to: email,
    subject: "Universal Code Studio - Verify Your Account",
    text: `Universal Code Studio - Verify Your Account\n\nHello,\n\nThank you for registering a workspace on Universal Code Studio. To activate your secure development container, please use the 6-digit verification code below:\n\nVerification Code: ${verificationCode}\n\nThis verification code is valid for 30 minutes. If you did not request this registration, please disregard this email.\n\nUniversal Code Studio Sandbox Environment`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em;">Universal Code Studio</h1>
          <p style="font-size: 14px; color: #64748b; margin-top: 4px;">Security Audited Development Workspace</p>
        </div>
        <p>Hello,</p>
        <p>Thank you for registering a workspace on <strong>Universal Code Studio</strong>. To activate your secure development container, please use the 6-digit verification code below:</p>
        <div style="text-align: center; margin: 32px 0; padding: 16px; background-color: #f1f5f9; border-radius: 8px; border: 1px solid #e2e8f0;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 0.1em; color: #1e293b; font-family: monospace;">${verificationCode}</span>
        </div>
        <p style="font-size: 13px; color: #64748b;">This verification code is valid for 30 minutes. If you did not request this registration, please disregard this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Universal Code Studio Sandbox Environment</p>
      </div>
    `,
  });

  res.status(201).json({
    message: emailResult.provider === "simulation"
      ? "Registration successful. Use the sandbox verification code generated below."
      : "Registration successful. A verification code has been sent to your email.",
    email: newUser.email,
    emailProvider: emailResult.provider,
    verificationCodeSimulation: emailResult.provider === "simulation" ? verificationCode : undefined,
  });
});

// Verify Account
app.post("/api/auth/verify", (req: Request, res: Response): void => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400).json({ error: "Email and code are required." });
    return;
  }

  const user = db.getUserByEmail(email);
  if (!user || user.verificationCode !== code || (user.verificationExpires && user.verificationExpires < Date.now())) {
    res.status(400).json({ error: "Invalid or expired verification code." });
    return;
  }

  db.updateUser(user.id, {
    isVerified: true,
    verificationCode: undefined,
    verificationExpires: undefined,
  });

  db.logSecurityEvent(user.id, email, "EMAIL_VERIFIED", "SUCCESS", req.ip || "127.0.0.1", req.headers["user-agent"] || "");
  res.json({ message: "Account verified successfully. You can now log in." });
});

// Login
app.post("/api/auth/login", (req: Request, res: Response): void => {
  const ip = req.ip || "127.0.0.1";
  const ua = req.headers["user-agent"] || "";

  if (isRateLimited(`login_${ip}`, 10, 60000 * 5)) {
    db.logSecurityEvent(null, req.body.email || "", "LOGIN_BRUTEFORCE", "FAILURE", ip, ua);
    res.status(429).json({ error: "Too many login attempts. Please wait 5 minutes." });
    return;
  }

  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    db.logSecurityEvent(null, email, "LOGIN_FAILED_USER_NOT_FOUND", "FAILURE", ip, ua);
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  // Check credentials
  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    db.logSecurityEvent(user.id, email, "LOGIN_FAILED_WRONG_PASSWORD", "FAILURE", ip, ua);
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  // Handle sessions
  const sessionToken = generateSecureToken();
  const session: Session = {
    id: "ses_" + crypto.randomBytes(16).toString("hex"),
    userId: user.id,
    token: sessionToken,
    userAgent: ua,
    ipAddress: ip,
    expiresAt: Date.now() + 60000 * 60 * 24, // 24 hours
    createdAt: Date.now(),
    mfaVerified: !user.mfaEnabled, // verified if mfa not enabled
  };

  db.createSession(session);
  db.logSecurityEvent(user.id, email, "LOGIN_STAGE_1", "SUCCESS", ip, ua);

  if (user.mfaEnabled) {
    res.json({
      mfaRequired: true,
      tempToken: sessionToken,
      message: "MFA code verification required to complete login.",
    });
  } else {
    res.json({
      token: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        isVerified: user.isVerified,
        mfaEnabled: user.mfaEnabled,
      },
    });
  }
});

// Guest Access Login (no credentials required)
app.post("/api/auth/guest", (req: Request, res: Response): void => {
  const ip = req.ip || "127.0.0.1";
  const ua = req.headers["user-agent"] || "";

  if (isRateLimited(`guest_${ip}`, 15, 60000 * 5)) {
    res.status(429).json({ error: "Too many guest accesses. Please wait 5 minutes." });
    return;
  }

  const randomId = crypto.randomBytes(8).toString("hex");
  const email = `guest_${randomId}@ucs.local`;
  const salt = generateSalt();
  const passwordHash = hashPassword("guest_dummy_pwd_123!", salt);

  const guestUser: User = {
    id: "usr_gst_" + randomId,
    email,
    passwordHash,
    salt,
    isVerified: true,
    mfaEnabled: false,
    mfaRecoveryCodes: [],
    createdAt: Date.now(),
  };

  db.createUser(guestUser);
  db.logSecurityEvent(guestUser.id, email, "GUEST_ACCESS", "SUCCESS", ip, ua);

  // Generate Guest Session
  const sessionToken = generateSecureToken();
  const session: Session = {
    id: "ses_" + crypto.randomBytes(16).toString("hex"),
    userId: guestUser.id,
    token: sessionToken,
    userAgent: ua,
    ipAddress: ip,
    expiresAt: Date.now() + 60000 * 60 * 24, // 24 hours
    createdAt: Date.now(),
    mfaVerified: true,
  };

  db.createSession(session);

  res.json({
    token: sessionToken,
    user: {
      id: guestUser.id,
      email: guestUser.email,
      isVerified: true,
      mfaEnabled: false,
      isGuest: true,
    },
  });
});

// Verify login 2FA OTP / Recovery Codes
app.post("/api/auth/otp/verify", (req: Request, res: Response): void => {
  const { token, code, isRecovery } = req.body;
  if (!token || !code) {
    res.status(400).json({ error: "Session token and code are required." });
    return;
  }

  const session = db.getSessionByToken(token);
  if (!session) {
    res.status(401).json({ error: "Invalid or expired session token." });
    return;
  }

  const user = db.getUserById(session.userId);
  if (!user) {
    res.status(401).json({ error: "User associated with session not found." });
    return;
  }

  let verified = false;

  if (isRecovery) {
    verified = useRecoveryCode(user, code);
    if (verified) {
      db.logSecurityEvent(user.id, user.email, "MFA_RECOVERY_CODE_USED", "SUCCESS", req.ip || "", req.headers["user-agent"] || "");
    }
  } else if (user.mfaSecret) {
    verified = verifyTOTP(code, user.mfaSecret);
  }

  if (!verified) {
    db.logSecurityEvent(user.id, user.email, "MFA_CODE_FAILED", "FAILURE", req.ip || "", req.headers["user-agent"] || "");
    res.status(400).json({ error: "Invalid 2FA code." });
    return;
  }

  db.updateSession(session.id, { mfaVerified: true });
  db.logSecurityEvent(user.id, user.email, "LOGIN_COMPLETE", "SUCCESS", req.ip || "", req.headers["user-agent"] || "");

  res.json({
    token: session.token,
    user: {
      id: user.id,
      email: user.email,
      isVerified: user.isVerified,
      mfaEnabled: user.mfaEnabled,
    },
  });
});

// Forgot Password
app.post("/api/auth/forgot-password", async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required." });
    return;
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    // Return success to prevent email enumeration attacks (OWASP)
    res.json({ message: "If that email exists, we have generated a password reset link." });
    return;
  }

  const resetToken = generateSecureToken();
  db.updateUser(user.id, {
    resetToken,
    resetExpires: Date.now() + 60000 * 30, // 30 minutes
  });

  db.logSecurityEvent(user.id, email, "PASSWORD_RESET_REQUESTED", "SUCCESS", req.ip || "", req.headers["user-agent"] || "");

  // Send real email with template
  const emailResult = await sendEmail({
    to: email,
    subject: "Universal Code Studio - Reset Your Password",
    text: `Universal Code Studio - Reset Your Password\n\nHello,\n\nWe received a request to reset the password for your Universal Code Studio workspace account. Use the authorization token below to reset your password:\n\nReset Token: ${resetToken}\n\nCopy this token and paste it into the reset password verification field inside your login workspace window.\n\nThis reset token is valid for 30 minutes. If you did not request a password reset, please secure your account immediately.\n\nUniversal Code Studio Sandbox Environment`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em;">Universal Code Studio</h1>
          <p style="font-size: 14px; color: #64748b; margin-top: 4px;">Security Audited Development Workspace</p>
        </div>
        <p>Hello,</p>
        <p>We received a request to reset the password for your Universal Code Studio workspace account. Use the authorization token below to reset your password:</p>
        <div style="text-align: center; margin: 32px 0; padding: 16px; background-color: #f1f5f9; border-radius: 8px; border: 1px solid #e2e8f0;">
          <span style="font-size: 20px; font-weight: 700; color: #2563eb; font-family: monospace; word-break: break-all;">${resetToken}</span>
        </div>
        <p>Copy this token and paste it into the reset password verification field inside your login workspace window.</p>
        <p style="font-size: 13px; color: #64748b;">This reset token is valid for 30 minutes. If you did not request a password reset, please secure your account immediately.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Universal Code Studio Sandbox Environment</p>
      </div>
    `,
  });

  res.json({
    message: "If that email exists, we have generated a password reset link.",
    resetTokenSimulation: emailResult.provider === "simulation" ? resetToken : undefined,
  });
});

// Reset Password
app.post("/api/auth/reset-password", (req: Request, res: Response): void => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    res.status(400).json({ error: "Token and password are required." });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters long." });
    return;
  }

  const users = db.getUsers();
  const user = users.find((u) => u.resetToken === token && u.resetExpires && u.resetExpires > Date.now());

  if (!user) {
    res.status(400).json({ error: "Invalid or expired reset token." });
    return;
  }

  const salt = generateSalt();
  const hash = hashPassword(newPassword, salt);

  db.updateUser(user.id, {
    passwordHash: hash,
    salt,
    resetToken: undefined,
    resetExpires: undefined,
  });

  // Terminate all current active sessions for security (OWASP)
  db.deleteUserSessions(user.id);

  db.logSecurityEvent(user.id, user.email, "PASSWORD_RESET_COMPLETE", "SUCCESS", req.ip || "", req.headers["user-agent"] || "");
  res.json({ message: "Password updated successfully. You can now log in with your new password." });
});

// Logout
app.post("/api/auth/logout", authenticate, (req: AuthRequest, res: Response): void => {
  if (req.session) {
    db.deleteSession(req.session.token);
    db.logSecurityEvent(req.user?.id || null, req.user?.email || null, "LOGOUT", "SUCCESS", req.ip || "", req.headers["user-agent"] || "");
  }
  res.json({ message: "Logged out successfully" });
});

// Get Current User
app.get("/api/auth/me", authenticate, (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }
  res.json({
    id: req.user.id,
    email: req.user.email,
    isVerified: req.user.isVerified,
    mfaEnabled: req.user.mfaEnabled,
  });
});

// ==========================================
// 2. SECURITY CENTER APIS
// ==========================================

// Get complete security status
app.get("/api/security/status", authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  const sessions = db.getSessions().filter((s) => s.userId === user.id);
  const logs = db.getSecurityLogs(user.id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 15);

  res.json({
    mfaEnabled: user.mfaEnabled,
    emailVerified: user.isVerified,
    sessionsCount: sessions.length,
    activeSessions: sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      isCurrent: s.token === req.session?.token,
      createdAt: s.createdAt,
    })),
    securityLogs: logs,
  });
});

// Enable 2FA — Stage 1 (Generate Secret)
app.post("/api/security/mfa/enable", authenticate, (req: AuthRequest, res: Response): void => {
  const secret = generateMFASecret();
  // We can write a custom QR simulation URL or direct key manual verification
  const qrUrlSimulated = `otpauth://totp/UniversalCodeStudio:${req.user!.email}?secret=${secret}&issuer=UniversalCodeStudio`;

  // We temporarily store it on the user profile so they can confirm it in step 2
  db.updateUser(req.user!.id, { mfaSecret: secret });

  res.json({
    secret,
    qrUrlSimulated,
  });
});

// Enable 2FA — Stage 2 (Confirm OTP code & emit Recovery Codes)
app.post("/api/security/mfa/confirm", authenticate, (req: AuthRequest, res: Response): void => {
  const { code } = req.body;
  const user = req.user!;

  if (!code || !user.mfaSecret) {
    res.status(400).json({ error: "MFA Setup has not been initiated." });
    return;
  }

  const isValid = verifyTOTP(code, user.mfaSecret);
  if (!isValid) {
    res.status(400).json({ error: "Verification code is invalid. Please double check your authenticator clock." });
    return;
  }

  const { plain, hashed } = generateRecoveryCodes();

  db.updateUser(user.id, {
    mfaEnabled: true,
    mfaRecoveryCodes: hashed,
  });

  // Mark current session as MFA verified
  if (req.session) {
    db.updateSession(req.session.id, { mfaVerified: true });
  }

  db.logSecurityEvent(user.id, user.email, "MFA_ENABLED", "SUCCESS", req.ip || "", req.headers["user-agent"] || "");

  res.json({
    message: "Two-factor authentication is now active.",
    recoveryCodes: plain, // ONLY sent once to user
  });
});

// Disable 2FA
app.post("/api/security/mfa/disable", authenticate, (req: AuthRequest, res: Response): void => {
  const { password } = req.body;
  const user = req.user!;

  if (!password) {
    res.status(400).json({ error: "Password verification is required." });
    return;
  }

  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    db.logSecurityEvent(user.id, user.email, "MFA_DISABLE_FAILED_PASSWORD", "FAILURE", req.ip || "", req.headers["user-agent"] || "");
    res.status(401).json({ error: "Password incorrect." });
    return;
  }

  db.updateUser(user.id, {
    mfaEnabled: false,
    mfaSecret: undefined,
    mfaRecoveryCodes: [],
  });

  db.logSecurityEvent(user.id, user.email, "MFA_DISABLED", "SUCCESS", req.ip || "", req.headers["user-agent"] || "");
  res.json({ message: "Two-factor authentication has been disabled." });
});

// Change Password
app.post("/api/security/password/change", authenticate, (req: AuthRequest, res: Response): void => {
  const { currentPassword, newPassword } = req.body;
  const user = req.user!;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Both current and new passwords are required." });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters long." });
    return;
  }

  const hash = hashPassword(currentPassword, user.salt);
  if (hash !== user.passwordHash) {
    db.logSecurityEvent(user.id, user.email, "PASSWORD_CHANGE_FAILED", "FAILURE", req.ip || "", req.headers["user-agent"] || "");
    res.status(401).json({ error: "Current password incorrect." });
    return;
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(newPassword, salt);

  db.updateUser(user.id, {
    passwordHash,
    salt,
  });

  // Revoke other active sessions for user (OWASP)
  if (req.session) {
    const sessions = db.getSessions().filter((s) => s.userId === user.id && s.token !== req.session?.token);
    sessions.forEach((s) => db.deleteSession(s.token));
  }

  db.logSecurityEvent(user.id, user.email, "PASSWORD_CHANGED", "SUCCESS", req.ip || "", req.headers["user-agent"] || "");
  res.json({ message: "Password updated successfully." });
});

// Revoke all other sessions
app.post("/api/security/sessions/logout-all", authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  const currentToken = req.session!.token;

  const otherSessions = db.getSessions().filter((s) => s.userId === user.id && s.token !== currentToken);
  otherSessions.forEach((s) => db.deleteSession(s.token));

  db.logSecurityEvent(user.id, user.email, "SESSIONS_REVOKED_ALL", "SUCCESS", req.ip || "", req.headers["user-agent"] || "");
  res.json({ message: `Successfully logged out of all ${otherSessions.length} other devices.` });
});

// Fetch Security Logs
app.get("/api/security/logs", authenticate, (req: AuthRequest, res: Response): void => {
  const logs = db.getSecurityLogs(req.user!.id);
  res.json(logs.sort((a, b) => b.createdAt - a.createdAt));
});

// ==========================================
// 3. PROJECTS & FILE MANAGER APIS
// ==========================================

// Get user projects
app.get("/api/projects", authenticate, (req: AuthRequest, res: Response): void => {
  const projects = db.getProjects(req.user!.id);
  res.json(projects);
});

// Create project
app.post("/api/projects", (req: AuthRequest, res: Response): void => {
  // Let's authenticate inside to map correct types
  authenticate(req, res, () => {
    const user = req.user!;
    const { name, description, primaryLanguage } = req.body;

    if (!name || !primaryLanguage) {
      res.status(400).json({ error: "Project name and primary language are required." });
      return;
    }

    const projectId = "prj_" + crypto.randomBytes(16).toString("hex");

    const newProject: Project = {
      id: projectId,
      userId: user.id,
      name,
      description: description || "",
      primaryLanguage,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    db.createProject(newProject);

    // Bootstrap sensible language templates
    const langDef = LANGUAGES[primaryLanguage] || LANGUAGES.python;
    const filesToCreate: Array<{ name: string; path: string; content: string }> = [];

    // Sensible files layout per template
    if (primaryLanguage === "python") {
      filesToCreate.push(
        { name: "main.py", path: "main.py", content: `def main():\n    print("Hello, Universal Code Studio!")\n\nif __name__ == "__main__":\n    main()\n` },
        { name: "README.md", path: "README.md", content: `# ${name}\n${description || "A Python project."}\n` }
      );
    } else if (primaryLanguage === "javascript") {
      filesToCreate.push(
        { name: "index.js", path: "index.js", content: `console.log("Hello, Universal Code Studio!");\n` },
        { name: "README.md", path: "README.md", content: `# ${name}\n` }
      );
    } else if (primaryLanguage === "typescript") {
      filesToCreate.push(
        { name: "index.ts", path: "index.ts", content: `const greeting: string = "Hello from TypeScript!";\nconsole.log(greeting);\n` },
        { name: "README.md", path: "README.md", content: `# ${name}\n` }
      );
    } else if (primaryLanguage === "c") {
      filesToCreate.push(
        { name: "main.c", path: "main.c", content: `#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n` }
      );
    } else if (primaryLanguage === "cpp") {
      filesToCreate.push(
        { name: "main.cpp", path: "main.cpp", content: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n` }
      );
    } else if (primaryLanguage === "rust") {
      filesToCreate.push(
        { name: "main.rs", path: "src/main.rs", content: `fn main() {\n    println!("Hello, World!");\n}\n` }
      );
    } else if (primaryLanguage === "sql") {
      filesToCreate.push(
        { name: "query.sql", path: "query.sql", content: `-- Universal Database Queries\nCREATE TABLE IF NOT EXISTS users (\n    id INTEGER PRIMARY KEY,\n    name TEXT\n);\n\nINSERT INTO users (name) VALUES ('VoidX_404');\nSELECT * FROM users;\n` }
      );
    } else {
      // General Template
      filesToCreate.push({
        name: `main${langDef.extension}`,
        path: `main${langDef.extension}`,
        content: `// Hello World in ${langDef.name}\n`,
      });
    }

    filesToCreate.forEach((f) => {
      db.createFile({
        id: "fil_" + crypto.randomBytes(16).toString("hex"),
        projectId,
        name: f.name,
        path: f.path,
        language: primaryLanguage,
        content: f.content,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    res.status(201).json(newProject);
  });
});

// Rename/Edit Project
app.patch("/api/projects/:id", authenticate, (req: AuthRequest, res: Response): void => {
  const projectId = req.params.id;
  const project = db.getProjectById(projectId, req.user!.id);

  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return;
  }

  const { name, description } = req.body;
  db.updateProject(projectId, req.user!.id, { name, description });

  res.json({ message: "Project updated." });
});

// Delete Project
app.delete("/api/projects/:id", authenticate, (req: AuthRequest, res: Response): void => {
  const projectId = req.params.id;
  const project = db.getProjectById(projectId, req.user!.id);

  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return;
  }

  db.deleteProject(projectId, req.user!.id);
  res.json({ message: "Project deleted." });
});

// List Files for Project
app.get("/api/projects/:id/files", authenticate, (req: AuthRequest, res: Response): void => {
  const projectId = req.params.id;
  const project = db.getProjectById(projectId, req.user!.id);

  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return;
  }

  const files = db.getFilesByProject(projectId);
  res.json(files);
});

// Create File in Project
app.post("/api/projects/:id/files", authenticate, (req: AuthRequest, res: Response): void => {
  const projectId = req.params.id;
  const project = db.getProjectById(projectId, req.user!.id);

  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return;
  }

  const { name, path: filePath, content } = req.body;

  if (!name || !filePath) {
    res.status(400).json({ error: "File name and path are required." });
    return;
  }

  // Path Traversal Security: Prevent using "../" or similar inside file names
  const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const detectedLang = detectLanguageByExtension(normalizedPath);

  const existingFiles = db.getFilesByProject(projectId);
  if (existingFiles.some((f) => f.path.toLowerCase() === normalizedPath.toLowerCase())) {
    res.status(400).json({ error: "A file with this path already exists." });
    return;
  }

  const newFile: ProjectFile = {
    id: "fil_" + crypto.randomBytes(16).toString("hex"),
    projectId,
    name,
    path: normalizedPath,
    language: detectedLang,
    content: content || "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  db.createFile(newFile);
  res.status(201).json(newFile);
});

// Update/Edit File Content
app.patch("/api/projects/:id/files/:fileId", authenticate, (req: AuthRequest, res: Response): void => {
  const { id: projectId, fileId } = req.params;
  const project = db.getProjectById(projectId, req.user!.id);

  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return;
  }

  const file = db.getFileById(fileId, projectId);
  if (!file) {
    res.status(404).json({ error: "File not found." });
    return;
  }

  const { content, name, path: filePath } = req.body;
  const updates: Partial<ProjectFile> = {};

  if (content !== undefined) updates.content = content;
  if (name !== undefined) updates.name = name;
  if (filePath !== undefined) {
    updates.path = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, "");
    updates.language = detectLanguageByExtension(updates.path);
  }

  db.updateFile(fileId, projectId, updates);
  res.json({ message: "File saved successfully." });
});

// Delete File in Project
app.delete("/api/projects/:id/files/:fileId", authenticate, (req: AuthRequest, res: Response): void => {
  const { id: projectId, fileId } = req.params;
  const project = db.getProjectById(projectId, req.user!.id);

  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return;
  }

  const file = db.getFileById(fileId, projectId);
  if (!file) {
    res.status(404).json({ error: "File not found." });
    return;
  }

  db.deleteFile(fileId, projectId);
  res.json({ message: "File deleted successfully." });
});

// Project Export API
app.get("/api/projects/:id/export", authenticate, (req: AuthRequest, res: Response): void => {
  const projectId = req.params.id;
  const project = db.getProjectById(projectId, req.user!.id);

  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return;
  }

  const files = db.getFilesByProject(projectId);
  const exportPayload = {
    version: "1.0",
    project,
    files: files.map((f) => ({
      name: f.name,
      path: f.path,
      content: f.content,
      language: f.language,
    })),
  };

  res.setHeader("Content-Disposition", `attachment; filename="${project.name.replace(/\s+/g, "_")}_export.json"`);
  res.json(exportPayload);
});

// Project Import API
app.post("/api/projects/import", authenticate, (req: AuthRequest, res: Response): void => {
  const { name, description, primaryLanguage, files } = req.body;

  if (!name || !primaryLanguage || !Array.isArray(files)) {
    res.status(400).json({ error: "Invalid import format. Name, primary language and files are required." });
    return;
  }

  const projectId = "prj_" + crypto.randomBytes(16).toString("hex");

  const newProject: Project = {
    id: projectId,
    userId: req.user!.id,
    name,
    description: description || "Imported project.",
    primaryLanguage,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  db.createProject(newProject);

  files.forEach((f: any) => {
    db.createFile({
      id: "fil_" + crypto.randomBytes(16).toString("hex"),
      projectId,
      name: f.name || "unnamed",
      path: f.path || f.name || "main.py",
      language: f.language || primaryLanguage,
      content: f.content || "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  res.status(201).json(newProject);
});

// ==========================================
// 4. CODE RUNNER & AI SERVICES
// ==========================================

// Run code
app.post("/api/run", authenticate, async (req: AuthRequest, res: Response) => {
  const { projectId, fileId, code } = req.body;

  if (!projectId || !fileId || code === undefined) {
    res.status(400).json({ error: "ProjectId, FileId and Code are required to run." });
    return;
  }

  const project = db.getProjectById(projectId, req.user!.id);
  if (!project) {
    res.status(404).json({ error: "Project access denied." });
    return;
  }

  const file = db.getFileById(fileId, projectId);
  if (!file) {
    res.status(404).json({ error: "File not found." });
    return;
  }

  // Optional check to override code edits
  const executionCode = code;

  try {
    const result = await executeCode(projectId, fileId, file.name, file.language, executionCode);

    // Write to DB logs
    db.logExecution({
      id: "run_" + crypto.randomBytes(16).toString("hex"),
      projectId,
      fileId,
      fileName: file.name,
      language: file.language,
      status: result.status,
      executionTimeMs: result.executionTimeMs,
      exitCode: result.exitCode,
      output: result.output,
      createdAt: Date.now(),
    });

    res.json(result);
  } catch (err: any) {
    console.error("Execute code controller error:", err);
    res.status(500).json({ error: `Execution crashed on host: ${err.message}` });
  }
});

// Stop active process
app.post("/api/run/stop", authenticate, (req: AuthRequest, res: Response): void => {
  const { executionId } = req.body;
  if (!executionId) {
    res.status(400).json({ error: "ExecutionId is required." });
    return;
  }

  const stopped = stopExecution(executionId);
  res.json({ stopped, message: stopped ? "Execution aborted." : "No active processes found to stop." });
});

// Fetch Execution History
app.get("/api/projects/:id/runs", authenticate, (req: AuthRequest, res: Response): void => {
  const runs = db.getExecutionHistory(req.params.id);
  res.json(runs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 30));
});

// Explain Project static layout via Gemini
app.post("/api/projects/:id/explain", authenticate, async (req: AuthRequest, res: Response) => {
  const projectId = req.params.id;
  const project = db.getProjectById(projectId, req.user!.id);

  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return;
  }

  const files = db.getFilesByProject(projectId);
  try {
    const analysis = await explainProject(project.name, project.description, project.primaryLanguage, files);
    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ error: `AI Analysis failed: ${error.message}` });
  }
});

// Explain actual compile error via Gemini
app.post("/api/run/explain-error", authenticate, async (req: AuthRequest, res: Response) => {
  const { fileName, language, errorLog, codeContext } = req.body;

  if (!fileName || !errorLog) {
    res.status(400).json({ error: "FileName and ErrorLog are required." });
    return;
  }

  try {
    const suggestion = await explainError(fileName, language || "Python", errorLog, codeContext || "");
    res.json(suggestion);
  } catch (error: any) {
    res.status(500).json({ error: `Failed to generate suggestions: ${error.message}` });
  }
});

// ==========================================
// 5. VITE DEVELOPMENT MIDDLEWARE & STATIC SERVING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite dev server middleware to let Vite compile and serve client TSX code
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA catch-all routing
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Universal Code Studio] Server running securely on http://localhost:${PORT}`);
  });
}

startServer();
