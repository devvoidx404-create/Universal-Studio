import { X, Sliders, Type, Check, RefreshCw } from "lucide-react";
import { EditorSettings } from "../types";

interface SettingsModalProps {
  settings: EditorSettings;
  onUpdate: (settings: EditorSettings) => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, onUpdate, onClose }: SettingsModalProps) {
  const handleToggle = (key: keyof EditorSettings) => {
    onUpdate({
      ...settings,
      [key]: !settings[key],
    });
  };

  const handleSelectNumber = (key: "fontSize" | "tabSize", val: number) => {
    onUpdate({
      ...settings,
      [key]: val,
    });
  };

  const resetToDefault = () => {
    onUpdate({
      fontSize: 14,
      tabSize: 4,
      wordWrap: true,
      autoCloseBrackets: true,
      autoCloseQuotes: true,
      minimap: false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" id="settings-modal-backdrop">
      <div className="w-full max-w-md bg-[#121216] border border-gray-800 rounded-xl shadow-2xl flex flex-col font-sans overflow-hidden" id="settings-dialog">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#1A1A22]/40">
          <h3 className="text-sm font-bold tracking-wide uppercase flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-500" /> Editor Preferences
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-5 text-xs font-mono">
          {/* Font size */}
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <span className="font-bold text-gray-200 uppercase tracking-wide block">Editor Font Size</span>
              <span className="text-[10px] text-gray-500 font-sans block">Scale the workspace text rendering size</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#1C1C22] p-1 border border-gray-800 rounded-lg">
              {[12, 14, 16, 18].map((size) => (
                <button
                  key={size}
                  onClick={() => handleSelectNumber("fontSize", size)}
                  className={`px-2.5 py-1 font-bold text-[10px] rounded transition ${
                    settings.fontSize === size
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          {/* Tab Sizing */}
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <span className="font-bold text-gray-200 uppercase tracking-wide block">Tab Spacing</span>
              <span className="text-[10px] text-gray-500 font-sans block">Define the character indentation width</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#1C1C22] p-1 border border-gray-800 rounded-lg">
              {[2, 4, 8].map((size) => (
                <button
                  key={size}
                  onClick={() => handleSelectNumber("tabSize", size)}
                  className={`px-3 py-1 font-bold text-[10px] rounded transition ${
                    settings.tabSize === size
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Word wrap */}
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <span className="font-bold text-gray-200 uppercase tracking-wide block">Word Wrap</span>
              <span className="text-[10px] text-gray-500 font-sans block">Truncate overflow lines on screen edge</span>
            </div>
            <button
              onClick={() => handleToggle("wordWrap")}
              className={`w-10 h-5 rounded-full p-0.5 transition duration-200 focus:outline-none ${
                settings.wordWrap ? "bg-blue-600" : "bg-gray-800"
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-md transform transition duration-200 ${
                  settings.wordWrap ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Auto bracket closures */}
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <span className="font-bold text-gray-200 uppercase tracking-wide block">Auto-Close Brackets</span>
              <span className="text-[10px] text-gray-500 font-sans block">Inject matching parentheses automatically</span>
            </div>
            <button
              onClick={() => handleToggle("autoCloseBrackets")}
              className={`w-10 h-5 rounded-full p-0.5 transition duration-200 focus:outline-none ${
                settings.autoCloseBrackets ? "bg-blue-600" : "bg-gray-800"
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-md transform transition duration-200 ${
                  settings.autoCloseBrackets ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Auto Close Quotes */}
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <span className="font-bold text-gray-200 uppercase tracking-wide block">Auto-Close Quotes</span>
              <span className="text-[10px] text-gray-500 font-sans block">Inject matching quotes automatically</span>
            </div>
            <button
              onClick={() => handleToggle("autoCloseQuotes")}
              className={`w-10 h-5 rounded-full p-0.5 transition duration-200 focus:outline-none ${
                settings.autoCloseQuotes ? "bg-blue-600" : "bg-gray-800"
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-md transform transition duration-200 ${
                  settings.autoCloseQuotes ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Minimap rendering */}
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <span className="font-bold text-gray-200 uppercase tracking-wide block">Visual Minimap</span>
              <span className="text-[10px] text-gray-500 font-sans block">Display code visual outline map scrollbar</span>
            </div>
            <button
              onClick={() => handleToggle("minimap")}
              className={`w-10 h-5 rounded-full p-0.5 transition duration-200 focus:outline-none ${
                settings.minimap ? "bg-blue-600" : "bg-gray-800"
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-md transform transition duration-200 ${
                  settings.minimap ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer controls */}
        <div className="p-4 border-t border-gray-800 flex justify-between items-center bg-[#1A1A22]/30">
          <button
            onClick={resetToDefault}
            className="text-[10px] font-bold text-gray-400 hover:text-white flex items-center gap-1 transition"
          >
            <RefreshCw className="w-3 h-3" /> Reset Defaults
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-xs font-semibold rounded-lg text-white transition flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" /> Close Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
