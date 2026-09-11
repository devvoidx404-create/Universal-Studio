import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Monitor, Smartphone, X, Check } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Suppress when already installed or dismissed manually
  if (isInstalled || dismissed) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <div className="bg-[#16161B] border border-blue-900/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-black/40">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-950/40 border border-blue-800/30 flex items-center justify-center text-blue-400 shrink-0">
            <Monitor className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-white">Install Desktop App</h4>
            <p className="text-[11px] text-gray-400 leading-normal max-w-md mt-0.5">
              Launch Universal Code Studio instantly from your desktop taskbar. Fully compatible with persistent offline sandbox structures.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setDismissed(true)}
            className="p-2 text-gray-500 hover:text-gray-300 transition"
            title="Dismiss prompt"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={install}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-lg transition font-mono uppercase tracking-wide shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Install
          </button>
        </div>
      </div>
    );
  }

  // iOS Safari flow (beforeinstallprompt fallback)
  if (isIOS) {
    return (
      <>
        <div className="bg-[#16161B] border border-blue-900/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-950/40 border border-blue-800/30 flex items-center justify-center text-blue-400 shrink-0">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-white">Add to Home Screen</h4>
              <p className="text-[11px] text-gray-400 leading-normal max-w-md mt-0.5">
                Run this secure editor as a standalone application on your iOS device. Works completely offline.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setDismissed(true)}
              className="p-2 text-gray-500 hover:text-gray-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowIOSGuide(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition font-mono uppercase tracking-wide shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> Install on iOS
            </button>
          </div>
        </div>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl bg-[#121216] border border-gray-800 p-6 shadow-2xl relative">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-400" /> Install on iPhone / iPad
              </h3>
              <div className="mt-4 space-y-3 text-xs text-gray-400 leading-relaxed">
                <p>Follow these quick steps to add the app to your home screen:</p>
                <ol className="list-decimal pl-4 space-y-2">
                  <li>
                    Tap the <strong className="text-white">Share</strong> icon in the Safari toolbar (the square icon with an arrow pointing up).
                  </li>
                  <li>
                    Scroll down the actions menu and select <strong className="text-white">Add to Home Screen</strong>.
                  </li>
                  <li>
                    Verify the name of the workspace, then tap <strong className="text-white">Add</strong> at the top right of your screen.
                  </li>
                </ol>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-lg bg-gray-800 hover:bg-gray-700 py-2 text-xs font-bold text-white transition font-mono uppercase tracking-wider"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
