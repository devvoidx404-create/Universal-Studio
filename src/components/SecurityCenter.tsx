import React, { useState, useEffect } from "react";
import { Shield, ShieldAlert, ShieldCheck, Key, Lock, Laptop, Terminal, ChevronLeft, RefreshCw, Copy, Check } from "lucide-react";
import { SessionRecord, SecurityLog } from "../types";

interface SecurityCenterProps {
  token: string;
  onBack: () => void;
}

export default function SecurityCenter({ token, onBack }: SecurityCenterProps) {
  // Config state
  const [securityData, setSecurityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Password updating
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 2FA setups
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaQr, setMfaQr] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisableForm, setShowDisableForm] = useState(false);

  // Clipboards
  const [copiedCodes, setCopiedCodes] = useState(false);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/security/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSecurityData(data);
      } else {
        setError("Failed to fetch security credentials.");
      }
    } catch (e) {
      setError("Network connection failure.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, [token]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPasswordLoading(true);

    try {
      const res = await fetch("/api/security/password/change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || "Password changed successfully. Other devices logged out.");
        setCurrentPassword("");
        setNewPassword("");
        fetchSecurityData();
      } else {
        setError(data.error || "Password change failed.");
      }
    } catch (e) {
      setError("Network error.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogoutAllOther = async () => {
    if (!confirm("Are you sure you want to log out of all other active sessions and devices?")) return;

    try {
      const res = await fetch("/api/security/sessions/logout-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        fetchSecurityData();
      } else {
        setError(data.error || "Session revocation failed.");
      }
    } catch (e) {
      setError("Network error.");
    }
  };

  const handleEnableMfaInit = async () => {
    setError(null);
    setMfaLoading(true);

    try {
      const res = await fetch("/api/security/mfa/enable", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMfaSecret(data.secret);
        setMfaQr(data.qrUrlSimulated);
      } else {
        setError(data.error || "MFA initialization failed.");
      }
    } catch (e) {
      setError("Network error.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleEnableMfaConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMfaLoading(true);

    try {
      const res = await fetch("/api/security/mfa/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: otpCode }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        setRecoveryCodes(data.recoveryCodes);
        setMfaSecret(null);
        setMfaQr(null);
        setOtpCode("");
        fetchSecurityData();
      } else {
        setError(data.error || "Invalid verification code.");
      }
    } catch (e) {
      setError("Network error.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMfaLoading(true);

    try {
      const res = await fetch("/api/security/mfa/disable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: disablePassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        setDisablePassword("");
        setShowDisableForm(false);
        fetchSecurityData();
      } else {
        setError(data.error || "Password incorrect.");
      }
    } catch (e) {
      setError("Network error.");
    } finally {
      setMfaLoading(false);
    }
  };

  const copyCodesToClipboard = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white p-6 md:p-8 selection:bg-blue-600 selection:text-white">
      {/* Back button header */}
      <header className="max-w-5xl mx-auto flex items-center gap-4 border-b border-gray-800 pb-5 mb-8">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-gray-800 rounded-lg transition text-gray-400 hover:text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2 uppercase">
            <Shield className="w-5 h-5 text-blue-500" /> Security Operations Center
          </h1>
          <p className="text-xs text-gray-500 font-mono">Defense-in-depth authorization & session auditing</p>
        </div>
      </header>

      {loading ? (
        <div className="max-w-5xl mx-auto text-center py-20 font-mono text-gray-500">
          Syncing cryptographic credentials...
        </div>
      ) : (
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Messages Alert */}
          {error && (
            <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-lg text-xs font-mono text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-blue-950/30 border border-blue-800/50 rounded-lg text-xs font-mono text-blue-400">
              {success}
            </div>
          )}

          {/* Core Grid: MFA & Password on Left, Session list & History Logs on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* TWO-FACTOR AUTH (2FA/MFA) */}
              <div className="bg-[#121216] border border-gray-800 rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                      {securityData?.mfaEnabled ? (
                        <ShieldCheck className="w-5 h-5 text-green-500" />
                      ) : (
                        <ShieldAlert className="w-5 h-5 text-amber-500" />
                      )}
                      Two-Factor Authentication (2FA)
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Protect your workspace with secure TOTP authenticator profiles.
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      securityData?.mfaEnabled
                        ? "bg-green-500/10 border border-green-500/20 text-green-400"
                        : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                    }`}
                  >
                    {securityData?.mfaEnabled ? "ACTIVE" : "DISABLED"}
                  </span>
                </div>

                {/* 2FA SETUP FLOW */}
                {!securityData?.mfaEnabled && !mfaSecret && (
                  <button
                    onClick={handleEnableMfaInit}
                    disabled={mfaLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 font-semibold text-xs rounded-lg transition"
                  >
                    {mfaLoading ? "Initializing..." : "Setup Authenticator App"}
                  </button>
                )}

                {/* MFA QR/Code confirmation form */}
                {mfaSecret && (
                  <div className="bg-[#1C1C22] border border-gray-800 p-4 rounded-xl space-y-4 font-mono">
                    <p className="text-xs text-blue-400">
                      Scan the QR Code configuration below, or manually enter the key into your authenticator app (Google Authenticator, Duo, or 1Password).
                    </p>

                    <div className="p-3 bg-black border border-gray-900 rounded text-center">
                      <span className="text-[10px] text-gray-500 uppercase block mb-1">MFA Secret Manual Key</span>
                      <span className="text-sm font-bold tracking-widest text-white select-all">{mfaSecret}</span>
                    </div>

                    <div className="p-3 bg-black border border-gray-900 rounded text-[10px] text-gray-400 break-all">
                      <span className="text-gray-500 uppercase block mb-1">Simulated Authenticator QR URL</span>
                      {mfaQr}
                    </div>

                    <form onSubmit={handleEnableMfaConfirm} className="space-y-2">
                      <label className="block text-[11px] text-gray-400 uppercase">Verification Code</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="000000"
                          className="w-full bg-[#0A0A0C] border border-gray-800 rounded px-3 py-1.5 text-center font-bold tracking-widest text-white focus:outline-none focus:border-blue-500 text-sm"
                        />
                        <button
                          type="submit"
                          disabled={mfaLoading}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-xs font-semibold rounded transition"
                        >
                          Confirm
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Single-use Recovery Codes emit (displayed once) */}
                {recoveryCodes.length > 0 && (
                  <div className="bg-blue-950/10 border border-blue-900/40 p-4 rounded-xl space-y-3 font-mono">
                    <p className="text-xs text-blue-400 font-bold">
                      ⚠️ CRITICAL: Save Your Backup Recovery Codes!
                    </p>
                    <p className="text-[10px] text-gray-400">
                      These codes are shown only once. If you lose access to your authenticator application, each code can be consumed once to log back into Code Studio.
                    </p>
                    <div className="grid grid-cols-2 gap-2 bg-black/40 border border-gray-900 p-3 rounded text-center text-xs text-white">
                      {recoveryCodes.map((code, idx) => (
                        <div key={idx} className="tracking-wider py-1 font-bold">
                          {code}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={copyCodesToClipboard}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-xs font-semibold rounded flex items-center gap-1 transition"
                    >
                      {copiedCodes ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCodes ? "Copied!" : "Copy Codes"}
                    </button>
                  </div>
                )}

                {/* 2FA DISABLE FORM */}
                {securityData?.mfaEnabled && (
                  <div className="space-y-2">
                    {!showDisableForm ? (
                      <button
                        onClick={() => setShowDisableForm(true)}
                        className="px-4 py-2 bg-red-950/20 border border-red-900/30 text-red-400 font-semibold text-xs rounded-lg hover:bg-red-950/60 transition"
                      >
                        Disable 2FA
                      </button>
                    ) : (
                      <form onSubmit={handleDisableMfa} className="bg-[#1C1C22] border border-gray-800 p-4 rounded-xl space-y-3 font-mono">
                        <label className="block text-[11px] text-gray-400 uppercase">
                          Enter Password to Disable 2FA
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            required
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                            placeholder="Password"
                            className="w-full bg-[#0A0A0C] border border-gray-800 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="submit"
                            disabled={mfaLoading}
                            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-xs font-semibold rounded text-white transition"
                          >
                            Disable
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDisableForm(false);
                            setDisablePassword("");
                          }}
                          className="text-[10px] text-gray-500 hover:text-white"
                        >
                          Cancel
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* CHANGE PASSWORD */}
              <div className="bg-[#121216] border border-gray-800 rounded-xl p-6">
                <h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2 mb-1">
                  <Lock className="w-5 h-5 text-blue-500" /> Update Security Credentials
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Change password securely. All other active user sessions will be forcefully invalidated.
                </p>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono text-gray-400 uppercase">Current Password</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-[#1C1C22] border border-gray-800 px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono text-gray-400 uppercase">New Password (Min 8 Chars)</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#1C1C22] border border-gray-800 px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition"
                      placeholder="••••••••"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-semibold rounded-lg transition"
                  >
                    {passwordLoading ? "Saving..." : "Change Password"}
                  </button>
                </form>
              </div>
            </div>

            {/* RIGHT COLUMN: SESSION AUDIT & AUDIT LOGS */}
            <div className="space-y-6">
              {/* ACTIVE SESSION LIST */}
              <div className="bg-[#121216] border border-gray-800 rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                      <Laptop className="w-5 h-5 text-blue-500" /> Active Session Registry
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Auditing logged-in devices currently holding active tokens.
                    </p>
                  </div>
                  {securityData?.sessionsCount > 1 && (
                    <button
                      onClick={handleLogoutAllOther}
                      className="text-xs text-red-400 hover:underline font-semibold"
                    >
                      Logout Other Devices
                    </button>
                  )}
                </div>

                <div className="space-y-3 font-mono">
                  {securityData?.activeSessions?.map((s: SessionRecord) => (
                    <div
                      key={s.id}
                      className="p-3 bg-[#1C1C22] border border-gray-800 rounded-lg flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white font-bold">{s.ipAddress}</span>
                          {s.isCurrent && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded">
                              CURRENT
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 truncate max-w-sm" title={s.userAgent}>
                          {s.userAgent}
                        </p>
                        <p className="text-[9px] text-gray-500">
                          Started {new Date(s.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* COMPREHENSIVE SECURITY LOG PANEL */}
              <div className="bg-[#121216] border border-gray-800 rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                      <Terminal className="w-5 h-5 text-blue-500" /> Security Log Audit
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Immutable history of authentication states and key security events.
                    </p>
                  </div>
                  <button
                    onClick={fetchSecurityData}
                    className="p-1 text-gray-500 hover:text-white rounded hover:bg-gray-800 transition"
                    title="Refresh Log"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2.5 font-mono pr-2">
                  {securityData?.securityLogs?.map((log: SecurityLog) => (
                    <div
                      key={log.id}
                      className="p-2.5 bg-[#1C1C22]/60 hover:bg-[#1C1C22] border border-gray-800/50 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div>
                        <span className="text-xs text-gray-200 font-bold uppercase block tracking-wide">
                          {log.event.replace(/_/g, " ")}
                        </span>
                        <div className="flex gap-2 text-[9px] text-gray-500 mt-0.5">
                          <span>IP: {log.ipAddress}</span>
                          <span>•</span>
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded self-start sm:self-auto border ${
                          log.status === "SUCCESS"
                            ? "bg-green-500/10 border-green-500/20 text-green-500"
                            : log.status === "FAILURE"
                            ? "bg-red-500/10 border-red-500/20 text-red-400"
                            : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
