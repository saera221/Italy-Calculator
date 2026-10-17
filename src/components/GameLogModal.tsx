import React, { useState } from 'react';
import { X, Share2, History, Check } from 'lucide-react';

export interface LogEntry {
  id: string;
  roundNumber?: number;
  team: 1 | 2;
  teamName: string;
  value: number;
  source: string;
  time: string;
}

interface GameLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameLog: LogEntry[];
  team1Name: string;
  team2Name: string;
  score1: number;
  score2: number;
  winLimit: number;
  onClearLog: () => void;
  isDark?: boolean;
}

export const GameLogModal: React.FC<GameLogModalProps> = ({
  isOpen,
  onClose,
  gameLog,
  team1Name,
  team2Name,
  score1,
  score2,
  winLimit,
  onClearLog,
  isDark = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'columns' | 'timeline'>('columns');

  if (!isOpen) return null;

  const team1Entries = [...gameLog].filter((entry) => entry.team === 1).reverse();
  const team2Entries = [...gameLog].filter((entry) => entry.team === 2).reverse();

  const handleShare = async () => {
    const text = `Italy Game Scorecard\n${team1Name}: ${score1} pts\n${team2Name}: ${score2} pts\nTarget: ${winLimit}\nTracked with Italy Game Calculator`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Italy Game Scorecard',
          text,
        });
        return;
      } catch {
        // fallback
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameLogTitle"
    >
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors ${
        isDark 
          ? 'bg-[#0d1424] border border-slate-700/80 text-slate-200' 
          : 'bg-white border border-slate-200 text-slate-800'
      }`}>
        {/* Header */}
        <div className={`px-5 py-4 flex items-center justify-between shrink-0 border-b ${
          isDark 
            ? 'bg-slate-900/95 border-slate-800 text-white' 
            : 'bg-slate-50 border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center gap-2">
            <History className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            <div>
              <h3 id="gameLogTitle" className={`font-bold text-lg leading-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Game History / Log
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {team1Name}: <strong className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>{score1}</strong> · {team2Name}: <strong className={isDark ? 'text-sky-400' : 'text-sky-600'}>{score2}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white' 
                : 'bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-900'
            }`}
            aria-label="Close history"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls Bar */}
        <div className={`px-5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 ${
          isDark 
            ? 'bg-slate-900/80 border-slate-800' 
            : 'bg-slate-100/90 border-slate-200'
        }`}>
          <div className={`flex items-center p-0.5 rounded-lg text-xs font-medium border ${
            isDark 
              ? 'bg-slate-950/80 text-slate-400 border-slate-800' 
              : 'bg-white text-slate-600 border-slate-300'
          }`}>
            <button
              onClick={() => setActiveTab('columns')}
              className={`px-3 py-1 rounded-md transition ${
                activeTab === 'columns' 
                  ? (isDark ? 'bg-slate-800 text-amber-400 shadow-xs font-semibold' : 'bg-slate-100 text-amber-700 shadow-xs font-semibold')
                  : (isDark ? 'hover:text-slate-200' : 'hover:text-slate-900')
              }`}
            >
              Columns
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-1 rounded-md transition ${
                activeTab === 'timeline' 
                  ? (isDark ? 'bg-slate-800 text-amber-400 shadow-xs font-semibold' : 'bg-slate-100 text-amber-700 shadow-xs font-semibold')
                  : (isDark ? 'hover:text-slate-200' : 'hover:text-slate-900')
              }`}
            >
              Timeline
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleShare}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition active:scale-95 border ${
                isDark 
                  ? 'text-amber-400 bg-amber-950/40 border-amber-500/40 hover:bg-amber-900/50' 
                  : 'text-amber-800 bg-amber-50 border-amber-300 hover:bg-amber-100'
              }`}
              title="Share Scorecard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 min-h-[220px]">
          {gameLog.length === 0 ? (
            <div className={`py-12 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <History className={`w-10 h-10 mx-auto mb-2 stroke-1 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
              <p className="text-sm font-medium">No history yet.</p>
              <p className="text-xs mt-1">Scores and rounds will appear here as they are added.</p>
            </div>
          ) : activeTab === 'columns' ? (
            <div className="grid grid-cols-2 gap-3 items-stretch">
              {/* Column Team 1 (Emerald) */}
              <div className={`border rounded-xl overflow-hidden shadow-sm flex flex-col ${
                isDark 
                  ? 'border-emerald-500/40 bg-[#0a1712]' 
                  : 'border-emerald-300 bg-white'
              }`}>
                <div className={`font-black text-center text-xs py-2 px-2 border-b truncate ${
                  isDark 
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30' 
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}>
                  {team1Name} ({score1})
                </div>
                <div className={`p-2 space-y-1.5 flex-1 divide-y ${
                  isDark ? 'divide-emerald-950/50' : 'divide-emerald-100'
                }`}>
                  {team1Entries.length === 0 ? (
                    <div className={`text-center py-6 text-xs ${isDark ? 'text-emerald-500/40' : 'text-emerald-400'}`}>No points yet</div>
                  ) : (
                    team1Entries.map((entry) => (
                      <div key={entry.id} className="pt-1.5 first:pt-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-black text-sm ${
                            entry.value >= 0 
                              ? (isDark ? 'text-emerald-400' : 'text-emerald-700')
                              : (isDark ? 'text-rose-400' : 'text-rose-600')
                          }`}>
                            {entry.value > 0 ? `+${entry.value}` : entry.value}
                          </span>
                          <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{entry.time}</span>
                        </div>
                        <div className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{entry.source}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column Team 2 (Sapphire) */}
              <div className={`border rounded-xl overflow-hidden shadow-sm flex flex-col ${
                isDark 
                  ? 'border-sky-500/40 bg-[#081322]' 
                  : 'border-sky-300 bg-white'
              }`}>
                <div className={`font-black text-center text-xs py-2 px-2 border-b truncate ${
                  isDark 
                    ? 'bg-sky-950 text-sky-300 border-sky-500/30' 
                    : 'bg-sky-50 text-sky-800 border-sky-200'
                }`}>
                  {team2Name} ({score2})
                </div>
                <div className={`p-2 space-y-1.5 flex-1 divide-y ${
                  isDark ? 'divide-sky-950/50' : 'divide-sky-100'
                }`}>
                  {team2Entries.length === 0 ? (
                    <div className={`text-center py-6 text-xs ${isDark ? 'text-sky-500/40' : 'text-sky-400'}`}>No points yet</div>
                  ) : (
                    team2Entries.map((entry) => (
                      <div key={entry.id} className="pt-1.5 first:pt-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-sm ${
                            entry.value >= 0 
                              ? (isDark ? 'text-sky-400' : 'text-sky-700')
                              : (isDark ? 'text-rose-400' : 'text-rose-600')
                          }`}>
                            {entry.value > 0 ? `+${entry.value}` : entry.value}
                          </span>
                          <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{entry.time}</span>
                        </div>
                        <div className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{entry.source}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {[...gameLog].reverse().map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border shadow-2xs transition ${
                    isDark 
                      ? 'border-slate-800 bg-slate-900/80 hover:bg-slate-800/90' 
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${entry.team === 1 ? 'bg-emerald-500' : 'bg-sky-500'}`}
                    />
                    <div>
                      <span className={`font-semibold text-xs ${isDark ? 'text-slate-200' : 'text-slate-850'}`}>{entry.teamName}</span>
                      <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{entry.source}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold text-sm ${
                      entry.value >= 0 
                        ? (isDark ? 'text-emerald-400' : 'text-emerald-700')
                        : (isDark ? 'text-rose-400' : 'text-rose-600')
                    }`}>
                      {entry.value > 0 ? `+${entry.value}` : entry.value}
                    </span>
                    <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{entry.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t flex items-center justify-between shrink-0 ${
          isDark 
            ? 'bg-slate-900 border-slate-800' 
            : 'bg-slate-50 border-slate-200'
        }`}>
          {gameLog.length > 0 ? (
            <button
              onClick={() => {
                if (window.confirm('Do you want to clear the entire match history log?')) {
                  onClearLog();
                }
              }}
              className="text-xs text-rose-500 hover:text-rose-600 font-medium transition"
            >
              Clear Log
            </button>
          ) : <div />}
          <button
            onClick={onClose}
            className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition ${
              isDark 
                ? 'text-slate-200 bg-slate-800 border border-slate-700 hover:bg-slate-700' 
                : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-100'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
