import React, { useState } from "react";
import { Shield, Key, Mail, Lock, UserPlus, LogIn, ArrowLeft, User, Sparkles } from "lucide-react";

interface AuthPageProps {
  onLoginSuccess: (token: string, user: any) => void;
}

type AuthScreen = "login" | "register" | "verify" | "otp" | "forgot" | "reset";

export default function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [screen, setScreen] = useState<AuthScreen>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Sandbox simulation helps
  const [simulationCode, setSimulationCode] = useState<string | null>(null);
  const [simulationToken, setSimulationToken] = useState<string | null>(null);

  // Error/Success alerts
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 2FA login state
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [isRecoveryCode, setIsRecoveryCode] = useState(false);

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed.");
      } else {
        setSuccess(data.message);
        if (data.verificationCodeSimulation) {
          setSimulationCode(data.verificationCodeSimulation);
        }
        setScreen("verify");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed.");
      } else {
        setSuccess(data.message);
        setSimulationCode(null);
        setScreen("login");
      }
    } catch (err) {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed.");
      } else if (data.mfaRequired) {
        setTempToken(data.tempToken);
        setSuccess("MFA authentication code required.");
        setScreen("otp");
      } else {
        onLoginSuccess(data.token, data.user);
      }
    } catch (err) {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Guest access failed.");
      } else {
        onLoginSuccess(data.token, data.user);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tempToken,
          code: otpCode,
          isRecovery: isRecoveryCode,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "MFA validation failed.");
      } else {
        onLoginSuccess(data.token, data.user);
      }
    } catch (err) {
      setError("MFA server connection error.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Request failed.");
      } else {
        setSuccess(data.message);
        if (data.resetTokenSimulation) {
          setSimulationToken(data.resetTokenSimulation);
        }
      }
    } catch (err) {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: simulationToken, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Password reset failed.");
      } else {
        setSuccess(data.message);
        setSimulationToken(null);
        setScreen("login");
      }
    } catch (err) {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex flex-col items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
      {/* Branding Header */}
      <div className="mb-8 text-center" id="brand-header">
        <div className="inline-flex items-center justify-center p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl mb-3 text-blue-500">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-sans uppercase">
          Universal <span className="text-blue-500">Code Studio</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1 max-w-sm">
          Professional Multi-Language Integrated Development Workspace
        </p>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md bg-[#121216] border border-gray-800 rounded-xl shadow-2xl p-6 md:p-8" id="auth-box">
        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-400 font-mono" id="error-alert">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-blue-950/40 border border-blue-800/60 rounded-lg text-xs text-blue-400 font-mono" id="success-alert">
            {success}
          </div>
        )}

        {/* 1. LOGIN SCREEN */}
        {screen === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <LogIn className="w-4 h-4 text-blue-500" /> Authenticate User
            </h2>

            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono uppercase">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-[#1C1C22] border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition font-mono"
                  placeholder="name@domain.com"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs text-gray-400 font-mono uppercase">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setScreen("forgot");
                  }}
                  className="text-xs text-blue-500 hover:underline focus:outline-none"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-[#1C1C22] border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition font-mono"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg text-sm transition focus:outline-none disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "Authenticating..." : "Sign In to Arena"}
            </button>

            <div className="relative my-4 flex py-1 items-center">
              <div className="flex-grow border-t border-gray-800/60"></div>
              <span className="flex-shrink mx-3 text-[10px] text-gray-500 font-mono uppercase tracking-widest">or</span>
              <div className="flex-grow border-t border-gray-800/60"></div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 bg-blue-950/10 border border-blue-950/30 rounded-lg text-left my-2">
              <input
                id="privacy-checkbox"
                type="checkbox"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-gray-800 bg-[#16161B] text-blue-500 focus:ring-blue-500/20 focus:ring-offset-0 focus:outline-none cursor-pointer shrink-0"
              />
              <label htmlFor="privacy-checkbox" className="text-[10px] text-gray-400 leading-normal select-none cursor-pointer">
                I accept the <button type="button" onClick={() => setShowPrivacyModal(true)} className="text-blue-500 hover:underline font-semibold font-mono">Universal Privacy Policy</button> to unlock immediate guest sandboxing.
              </label>
            </div>

            <button
              type="button"
              disabled={loading || !acceptPrivacy}
              onClick={handleGuestLogin}
              className="w-full py-2.5 bg-[#16161B] hover:bg-[#1E1E24] active:bg-[#121216] border border-blue-900/30 hover:border-blue-800/50 text-blue-400 hover:text-blue-300 font-semibold rounded-lg text-sm transition focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm font-mono uppercase tracking-wide text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" /> Instant Guest Access
            </button>

            <div className="text-center pt-3">
              <p className="text-xs text-gray-500">
                New developer?{" "}
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setScreen("register");
                  }}
                  className="text-blue-500 hover:underline font-semibold"
                >
                  Create Code Account
                </button>
              </p>
            </div>
          </form>
        )}

        {/* 2. REGISTER SCREEN */}
        {screen === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-500" /> Register Workspace
            </h2>

            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono uppercase">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-[#1C1C22] border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition font-mono"
                  placeholder="name@domain.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono uppercase">Password (Min 8 Chars)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-[#1C1C22] border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition font-mono"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg text-sm transition focus:outline-none disabled:opacity-50"
            >
              {loading ? "Creating Profile..." : "Register Account"}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  resetMessages();
                  setScreen("login");
                }}
                className="text-xs text-blue-500 hover:underline flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3 h-3" /> Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* 3. EMAIL VERIFICATION SCREEN */}
        {screen === "verify" && (
          <form onSubmit={handleVerify} className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-500" /> Verify Account
            </h2>
            <p className="text-xs text-gray-400">
              An authorization code has been generated to verify your workspace access. Enter it below to complete registration.
            </p>

            {simulationCode ? (
              <div className="p-3.5 bg-blue-950/20 border border-blue-900/40 rounded-lg text-center space-y-2">
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-mono tracking-wider">🔒 Sandbox Simulation Bypass</span>
                  <span className="text-2xl font-bold tracking-widest text-blue-400 font-mono">{simulationCode}</span>
                </div>
                <p className="text-[10px] text-gray-400 leading-normal">
                  No email credentials are set in your environment. The system bypassed SMTP and displayed the simulated code above so you can continue testing instantly.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-lg text-xs text-emerald-400 space-y-1">
                <p className="font-semibold">📬 Actual Email Transmitted!</p>
                <p className="text-gray-400 leading-relaxed text-[11px]">
                  An actual email containing your code has been dispatched to <strong className="text-white font-mono">{email}</strong> via your configured mailer service. Please inspect your Inbox or Spam folders.
                </p>
              </div>
            )}

            {/* Email configuration helper instructions */}
            <div className="p-3 bg-gray-900/40 border border-gray-800 rounded-lg space-y-1.5 text-[11px] text-gray-400">
              <p className="font-semibold text-gray-300 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
                💡 Want to send actual emails?
              </p>
              <p className="leading-relaxed">
                Configure your own transactional email delivery by adding one of these environment variables in the AI Studio Settings menu:
              </p>
              <ul className="list-disc list-inside space-y-1 font-mono text-[10px] text-blue-400 pl-1">
                <li><code className="text-gray-300">RESEND_API_KEY</code> (Resend API key)</li>
                <li><code className="text-gray-300">SMTP_HOST</code>, <code className="text-gray-300">SMTP_PORT</code>, <code className="text-gray-300">SMTP_USER</code>, <code className="text-gray-300">SMTP_PASS</code></li>
              </ul>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono uppercase">Verification Code</label>
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#1C1C22] border border-gray-800 rounded-lg text-lg text-center font-bold tracking-widest text-white focus:outline-none focus:border-blue-500 transition font-mono"
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg text-sm transition focus:outline-none"
            >
              Verify & Activate Account
            </button>
          </form>
        )}

        {/* 4. MFA 2FA INTERCEPTION SCREEN */}
        {screen === "otp" && (
          <form onSubmit={handleMfaVerify} className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" /> Multi-Factor 2FA
            </h2>
            <p className="text-xs text-gray-400">
              Two-Factor Authentication is active. Enter the 6-digit verification code from your Google Authenticator app or a backup recovery code.
            </p>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs text-gray-400 font-mono uppercase">
                  {isRecoveryCode ? "8-Character Recovery Code" : "6-Digit Authenticator Code"}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsRecoveryCode(!isRecoveryCode);
                    setOtpCode("");
                  }}
                  className="text-xs text-blue-500 hover:underline"
                >
                  Use {isRecoveryCode ? "Standard OTP" : "Backup Recovery Code"}
                </button>
              </div>

              <input
                type="text"
                required
                maxLength={isRecoveryCode ? 8 : 6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#1C1C22] border border-gray-800 rounded-lg text-lg text-center font-bold tracking-widest text-white focus:outline-none focus:border-blue-500 transition font-mono"
                placeholder={isRecoveryCode ? "a1b2c3d4" : "000000"}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition focus:outline-none"
            >
              Verify Code
            </button>

            <button
              type="button"
              onClick={() => {
                resetMessages();
                setScreen("login");
              }}
              className="w-full py-2 text-xs text-gray-500 hover:underline"
            >
              Cancel Login
            </button>
          </form>
        )}

        {/* 5. FORGOT PASSWORD SCREEN */}
        {screen === "forgot" && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-500" /> Forgot Password
            </h2>
            <p className="text-xs text-gray-400">
              Lost your access keys? Enter your developer account email. We will generate a simulated reset authorization link.
            </p>

            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono uppercase">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[#1C1C22] border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition font-mono"
                placeholder="name@domain.com"
              />
            </div>

            {simulationToken && (
              <div className="p-3 bg-blue-950/20 border border-blue-900/40 rounded-lg text-center space-y-2">
                <span className="text-xs text-gray-500 block uppercase">Sandbox Reset Token Simulated</span>
                <span className="text-xs font-mono font-bold text-blue-400 break-all select-all block">{simulationToken}</span>
                <button
                  type="button"
                  onClick={() => setScreen("reset")}
                  className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition"
                >
                  Proceed to Reset Screen
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition focus:outline-none"
            >
              Send Reset Authorization
            </button>

            <button
              type="button"
              onClick={() => {
                resetMessages();
                setScreen("login");
              }}
              className="w-full py-2 text-xs text-gray-500 hover:underline flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Return to Login
            </button>
          </form>
        )}

        {/* 6. RESET PASSWORD SCREEN */}
        {screen === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-500" /> Create New Password
            </h2>
            <p className="text-xs text-gray-400">
              Create a strong password of at least 8 characters. Any old browser sessions will be forcefully revoked.
            </p>

            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono uppercase">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#1C1C22] border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition font-mono"
                placeholder="Min 8 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition focus:outline-none"
            >
              Reset & Save Password
            </button>
          </form>
        )}
      </div>

      {/* Attribution footer */}
      <div className="mt-8 text-xs text-gray-600 font-mono text-center">
        Created, developed, designed, and built by <span className="text-gray-400">VoidX_404</span>
      </div>

      {/* Universal Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0E0E12] border border-blue-900/30 rounded-xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500 animate-pulse" /> Universal Code Studio - Privacy Policy
              </h3>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="text-gray-400 hover:text-white transition text-xs font-mono"
              >
                CLOSE
              </button>
            </div>
            
            <div className="overflow-y-auto py-4 space-y-4 text-xs text-gray-400 leading-relaxed pr-1 font-sans">
              <div>
                <h4 className="text-white font-semibold font-mono text-[11px] uppercase tracking-wide mb-1">
                  1. Powerful Compute Sandboxing Policy
                </h4>
                <p>
                  Universal Code Studio is a fully integrated, sandboxed development container. It is engineered to host, compile, and execute the absolute most powerful programming commands, full-stack servers, microservices, advanced scripting routines, and custom <strong>game development loops</strong>. Anything that can be achieved in native system environments is fully validated and executed inside your container isolation layer.
                </p>
              </div>

              <div>
                <h4 className="text-white font-semibold font-mono text-[11px] uppercase tracking-wide mb-1">
                  2. Privacy, Ephemerality & Data Integrity
                </h4>
                <p>
                  Your source code, file structures, execution histories, and private keys belong 100% to you. We strictly monitor and enforce zero-telemetry guidelines:
                </p>
                <ul className="list-disc pl-4 mt-1.5 space-y-1">
                  <li><strong>Zero Logging of Active Code:</strong> Your typed inputs, files, and running terminals are executed in your direct sandboxed memory block.</li>
                  <li><strong>Security Audited Operations:</strong> System actions, file alterations, and security configurations are written directly to your private workspace database to guarantee offline traceability.</li>
                  <li><strong>MFA and Encryption:</strong> All account configurations, recovery keys, and workspace sessions are encrypted locally using PBKDF2-SHA512 algorithms.</li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-semibold font-mono text-[11px] uppercase tracking-wide mb-1">
                  3. Secure Guest Isolation
                </h4>
                <p>
                  Guest IDs are dynamically provisioned in memory. All files, folders, and outputs generated during your guest session are privately compartmentalized under your guest identifier. Upon logging out, your ephemeral session tokens are permanently and securely wiped.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-4 flex justify-between items-center gap-3 shrink-0">
              <div className="text-[10px] text-gray-500 font-mono">
                VoidX_404 Security Core v3.1
              </div>
              <button
                onClick={() => {
                  setAcceptPrivacy(true);
                  setShowPrivacyModal(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-mono uppercase text-xs font-bold rounded-lg transition"
              >
                Accept and Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
