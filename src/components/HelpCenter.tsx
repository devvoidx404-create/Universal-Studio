import React, { useState } from "react";
import { HelpCircle, ChevronLeft, BookOpen, Shield, ShieldCheck, Mail, Send } from "lucide-react";

interface HelpCenterProps {
  onBack: () => void;
}

type HelpTab = "faq" | "about" | "security" | "legal" | "support";

export default function HelpCenter({ onBack }: HelpCenterProps) {
  const [activeTab, setActiveTab] = useState<HelpTab>("faq");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSent, setSupportSent] = useState(false);

  // FAQ contents
  const faqs = [
    {
      q: "What is Universal Code Studio?",
      a: "Universal Code Studio is a professional, browser-based development suite that consolidates code editing, isolated sandbox execution, problems/linter diagnostics, and project management under a unified, high-contrast workspace. Created, developed, and designed by VoidX_404.",
    },
    {
      q: "Which languages are supported?",
      a: "The IDE currently supports 20 major programming languages: Python, JavaScript, TypeScript, C, C++, Java, C#, Go, Rust, PHP, Kotlin, Swift, Dart, Ruby, R, Lua, Perl, Bash, SQL, and Fortran. More languages will be introduced in the future through an upcoming plugin adapter marketplace.",
    },
    {
      q: "How does code execution work?",
      a: "Code is executed within container-isolated execution environments. For languages natively supported on the workspace backend (Python, JavaScript, TypeScript, and Bash), code is executed locally in custom worker processes with strict resource, timeout, and buffer boundaries. For other languages, compilation is routed securely to high-fidelity isolated compiler sandboxes backed by the server-side Gemini Cloud Execution engine.",
    },
    {
      q: "Is my code secure?",
      a: "Yes. Arbitrary user code is treated as strictly untrusted and never executes with root privileges or host filesystem access. We enforce process timeouts, CPU constraints, and output/error buffers to protect against resource exhaustion, loop-bombs, path traversals, or malicious command injections.",
    },
    {
      q: "How is my account protected?",
      a: "Your developer profile is secured using cryptographically strong PBKDF2-HMAC-SHA512 password hashing, secure rate-limited login endpoints, automated session invalidation on password updates, and standard compliant Time-Based One-Time Password (TOTP) Multi-Factor Authentication (2FA) compatible with apps like Google Authenticator or 1Password.",
    },
    {
      q: "Does the platform support debugging?",
      a: "Yes, the debugger panel provides a standard control interface (Step Over, Step Into, Step Out, Continue, Breakpoints, and Diagnostics Console) which integrates with underlying debugger adapters for supported languages.",
    },
    {
      q: "Can I create multiple projects?",
      a: "Yes, developers can create, manage, and isolate multiple projects directly from their Dashboard. Each project possesses its own file hierarchies and separate isolated execution metrics.",
    },
    {
      q: "Can I export or import my projects?",
      a: "Yes. From the IDE files panel, you can download your entire project. It will be exported as a standard JSON payload containing all file structures and source files, allowing you to import it seamlessly onto another account.",
    },
    {
      q: "How is user data stored?",
      a: "All developer profiles, hashed credentials, project trees, source files, active sessions, and security audit logs are stored securely in a server-side storage layer. We never hard-code credentials or API secrets in our source code.",
    },
  ];

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setSupportSent(true);
    setSupportMessage("");
    setTimeout(() => setSupportSent(false), 5000);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white p-6 md:p-8 selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header className="max-w-5xl mx-auto flex items-center gap-4 border-b border-gray-800 pb-5 mb-8">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-gray-800 rounded-lg transition text-gray-400 hover:text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2 uppercase">
            <HelpCircle className="w-5 h-5 text-blue-500" /> Support & Documentation
          </h1>
          <p className="text-xs text-gray-500 font-mono">Resource base for developers in Universal Code Studio</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <aside className="md:col-span-1 flex flex-col gap-1">
          {[
            { id: "faq", label: "FAQ Base", icon: HelpCircle },
            { id: "about", label: "About App", icon: BookOpen },
            { id: "security", label: "Security Practices", icon: Shield },
            { id: "legal", label: "Legal Policies", icon: ShieldCheck },
            { id: "support", label: "Contact Support", icon: Mail },
          ].map((tab) => {
            const IconComp = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as HelpTab)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-left transition ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-800/50 text-gray-400 hover:text-white"
                }`}
              >
                <IconComp className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </aside>

        {/* Content Box */}
        <section className="md:col-span-3 bg-[#121216] border border-gray-800 rounded-xl p-6 min-h-[450px]">
          {/* FAQ PANEL */}
          {activeTab === "faq" && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-white border-b border-gray-800 pb-3 flex items-center gap-2">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div key={index} className="space-y-1 bg-[#1C1C22]/50 p-4 border border-gray-800/50 rounded-xl">
                    <h4 className="text-sm font-bold text-blue-400 font-mono">Q: {faq.q}</h4>
                    <p className="text-xs text-gray-300 leading-relaxed pl-5">A: {faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABOUT APP */}
          {activeTab === "about" && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-white border-b border-gray-800 pb-3">About Universal Code Studio</h2>
              <p className="text-xs text-gray-300 leading-relaxed font-mono">
                Universal Code Studio is a highly optimized, professional browser-based multi-language development environment designed to provide clean workspace isolation, sandboxed execution adaptivity, error diagnostics, and deep code static analysis under a strict Blue, White, and Black high-contrast developer theme.
              </p>
              <div className="bg-[#1C1C22] border border-gray-800 p-4 rounded-xl space-y-2 text-xs font-mono">
                <p><span className="text-gray-500">PROJECT_NAME:</span> Universal Code Studio</p>
                <p><span className="text-gray-500">BUILD_VERSION:</span> 1.0.0 (Release-Ready)</p>
                <p><span className="text-gray-500">DEVELOPER:</span> VoidX_404</p>
                <p><span className="text-gray-500">TARGETS:</span> Mobile, Tablet, Desktop (Adaptive Panels)</p>
                <p><span className="text-gray-500">EXTENSIBILITY:</span> Future plugin-adapter system supports 50+ languages</p>
              </div>
              <p className="text-[11px] text-gray-500">
                Created, developed, designed, and built by <span className="text-gray-300">VoidX_404</span>.
              </p>
            </div>
          )}

          {/* SECURITY PRACTICES */}
          {activeTab === "security" && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-white border-b border-gray-800 pb-3">Security & Sandboxing</h2>
              <p className="text-xs text-gray-300 leading-relaxed font-mono">
                Our application implements defensive-grade infrastructure layers to isolate untrusted code and protect developer profiles:
              </p>
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-[#1C1C22]/80 border border-gray-800 rounded-lg">
                  <h4 className="font-bold text-blue-400 text-xs mb-1">Process Isolation Bypass Protection</h4>
                  <p className="text-gray-400 text-[11px]">
                    Arbitrary user code is executed strictly using Node child-processes that completely bypass Shell expansion, eliminating prompt command injections. Files are bound inside ephemeral sandbox folders which are atomically deleted immediately after execution completes.
                  </p>
                </div>
                <div className="p-3 bg-[#1C1C22]/80 border border-gray-800 rounded-lg">
                  <h4 className="font-bold text-blue-400 text-xs mb-1">Resource Hardening Ceilings</h4>
                  <p className="text-gray-400 text-[11px]">
                    To mitigate fork bombs, loop freezes, or disk/memory flooding, we enforce a strict 5-second CPU thread limit and a 64KB maximum buffer output ceiling on all stdout and stderr captures.
                  </p>
                </div>
                <div className="p-3 bg-[#1C1C22]/80 border border-gray-800 rounded-lg">
                  <h4 className="font-bold text-blue-400 text-xs mb-1">Data Separation & Encryption</h4>
                  <p className="text-gray-400 text-[11px]">
                    Developer credentials and passwords are never visible, logged, or serialized in plaintext. Sessions are verified using cryptographically random 256-bit signatures, and 2FA secrets are evaluated locally with standard RFC 6238 TOTP logic.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* LEGAL POLICIES */}
          {activeTab === "legal" && (
            <div className="space-y-6 overflow-y-auto max-h-[500px] pr-2 font-mono text-xs leading-relaxed">
              <div>
                <h3 className="text-sm font-bold text-blue-400 uppercase border-b border-gray-800 pb-1 mb-2">Terms of Service</h3>
                <p className="text-gray-400 text-[11px]">
                  By utilizing Universal Code Studio, you agree to execute only benign, developer-focused code. You are strictly forbidden from attempting privilege escalations, network scans, database attacks, brute-forces, or host resource exhaustions. Universal Code Studio reserves the right to terminate access keys for abusive runtime behaviors.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-blue-400 uppercase border-b border-gray-800 pb-1 mb-2">Privacy Policy</h3>
                <p className="text-gray-400 text-[11px]">
                  We collect user emails solely for profile identification and session authorization. Code compiled in sandboxes is stored transiently on local filesystems for compiling and immediately destroyed on thread closure. We do not sell developer code, metadata, or activity records to third-party tracking networks.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-blue-400 uppercase border-b border-gray-800 pb-1 mb-2">Cookie & Session Policy</h3>
                <p className="text-gray-400 text-[11px]">
                  We use cookies and secure local storage headers solely for preserving authenticated session tokens and editor workspace preferences (such as custom font sizes or themes). We do not implement non-functional tracking cookies or profiling scripts.
                </p>
              </div>
            </div>
          )}

          {/* CONTACT SUPPORT */}
          {activeTab === "support" && (
            <div className="space-y-4 font-mono">
              <h2 className="text-base font-bold text-white border-b border-gray-800 pb-3 flex items-center gap-2">
                Developer Contact Support
              </h2>
              <p className="text-xs text-gray-300">
                Encountering compilation or sandbox isolation failures? Submit a ticket directly. Our sandbox environment simulates support receipt instantly.
              </p>

              {supportSent ? (
                <div className="p-4 bg-blue-950/30 border border-blue-900/40 rounded-xl text-center space-y-2">
                  <span className="text-xs font-bold text-blue-400 block">Support Ticket Recieved (Simulation)</span>
                  <p className="text-[11px] text-gray-400">
                    Your request was recorded under Ticket ID #UCS-{Math.floor(1000 + Math.random() * 9000)}. Our operators will audit your workspace reports immediately.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSupportSubmit} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="block text-gray-400 uppercase text-[10px]">Describe the Issue</label>
                    <textarea
                      required
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="Enter details about your compiler settings or account status..."
                      rows={5}
                      className="w-full bg-[#1C1C22] border border-gray-800 p-3 rounded-xl text-white focus:outline-none focus:border-blue-500 font-sans"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-1.5 transition"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit Support Ticket
                  </button>
                </form>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
