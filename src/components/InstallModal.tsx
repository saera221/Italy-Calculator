import React from 'react';
import { Download, Share, PlusSquare, CheckCircle, WifiOff, Smartphone, X } from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  onInstall: () => Promise<boolean>;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  isOpen,
  onClose,
  isIOS,
  isInstallable,
  isInstalled,
  onInstall,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-title"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center p-1.5 border border-white/20">
              <img src="/icon.svg" alt="App Icon" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 id="install-title" className="font-bold text-lg leading-tight">
                Install App
              </h3>
              <p className="text-xs text-blue-100">Pro Score Tracker · 100% Offline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-sm">
          {isInstalled ? (
            <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold text-sm">App is already installed!</p>
                <p className="text-xs text-emerald-700">You can launch it directly from your home screen or app drawer.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-900">
                <WifiOff className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold">Works Offline:</span> Once installed, keep track of match scores without needing internet or mobile data.
                </div>
              </div>

              {isInstallable && (
                <div className="pt-1">
                  <button
                    onClick={async () => {
                      const success = await onInstall();
                      if (success) onClose();
                    }}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md flex items-center justify-center gap-2 transition active:scale-98"
                  >
                    <Download className="w-5 h-5" />
                    Install Now
                  </button>
                </div>
              )}

              {isIOS ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2 font-semibold text-slate-800 text-xs uppercase tracking-wider">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    Install on iPhone / iPad:
                  </div>
                  <ol className="text-xs space-y-2 text-slate-600 list-decimal pl-4 leading-relaxed">
                    <li>
                      Tap the <Share className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" /> <strong>Share</strong> button in Safari toolbar.
                    </li>
                    <li>
                      Scroll down and tap <PlusSquare className="w-3.5 h-3.5 inline text-slate-800 mx-0.5" /> <strong>"Add to Home Screen"</strong>.
                    </li>
                    <li>
                      Tap <strong>"Add"</strong> in the top right corner.
                    </li>
                  </ol>
                </div>
              ) : !isInstallable && !isInstalled ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">To install on Android / Chrome:</p>
                  <p>
                    Open your browser menu (<strong>⋮</strong>) and tap <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.
                  </p>
                </div>
              ) : null}
            </div>
          )}

          <div className="border-t border-slate-100 pt-3 text-xs text-slate-500 space-y-1">
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              Full offline capability &amp; standalone app window
            </p>
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              Scores and match history saved automatically in local storage
            </p>
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              Easy Undo, Redo, and Backspace controls
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
