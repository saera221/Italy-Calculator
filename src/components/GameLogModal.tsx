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
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'columns' | 'timeline'>('columns');

  if (!isOpen) return null;

  const team1Entries = [...gameLog].filter((entry) => entry.team === 1).reverse();
  const team2Entries = [...gameLog].filter((entry) => entry.team === 2).reverse();

  const handleShare = async () => {
    const text = `Italy Game Scorecard\n${team1Name}: ${score1} pts\n${team2Name}: ${score2} pts\nTarget: ${winLimit}\nTracked with Pro Score Tracker`;

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
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-200" />
            <div>
              <h3 id="gameLogTitle" className="font-bold text-lg leading-tight">
                Game History / Log
              </h3>
              <p className="text-xs text-blue-200">
                {team1Name}: <strong className="text-white">{score1}</strong> · {team2Name}: <strong className="text-white">{score2}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Close history"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls Bar */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium text-slate-700">
            <button
              onClick={() => setActiveTab('columns')}
              className={`px-3 py-1 rounded-md transition ${activeTab === 'columns' ? 'bg-white text-blue-900 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
            >
              Columns
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-1 rounded-md transition ${activeTab === 'timeline' ? 'bg-white text-blue-900 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
            >
              Timeline
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleShare}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition active:scale-95"
              title="Share Scorecard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 min-h-[220px]">
          {gameLog.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <History className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
              <p className="text-sm font-medium">No history yet.</p>
              <p className="text-xs text-slate-400 mt-1">Scores and rounds will appear here as they are added.</p>
            </div>
          ) : activeTab === 'columns' ? (
            <div className="grid grid-cols-2 gap-3 items-stretch">
              {/* Column Team 1 */}
              <div className="border border-blue-200 rounded-xl overflow-hidden bg-white shadow-xs flex flex-col">
                <div className="bg-blue-50 text-blue-900 font-bold text-center text-xs py-2 px-2 border-b border-blue-200 truncate">
                  {team1Name} ({score1})
                </div>
                <div className="p-2 space-y-1.5 flex-1 divide-y divide-slate-100">
                  {team1Entries.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">No points yet</div>
                  ) : (
                    team1Entries.map((entry) => (
                      <div key={entry.id} className="pt-1.5 first:pt-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-sm ${entry.value >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {entry.value > 0 ? `+${entry.value}` : entry.value}
                          </span>
                          <span className="text-[10px] text-slate-400">{entry.time}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 truncate">{entry.source}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column Team 2 */}
              <div className="border border-emerald-200 rounded-xl overflow-hidden bg-white shadow-xs flex flex-col">
                <div className="bg-emerald-50 text-emerald-900 font-bold text-center text-xs py-2 px-2 border-b border-emerald-200 truncate">
                  {team2Name} ({score2})
                </div>
                <div className="p-2 space-y-1.5 flex-1 divide-y divide-slate-100">
                  {team2Entries.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">No points yet</div>
                  ) : (
                    team2Entries.map((entry) => (
                      <div key={entry.id} className="pt-1.5 first:pt-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-sm ${entry.value >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {entry.value > 0 ? `+${entry.value}` : entry.value}
                          </span>
                          <span className="text-[10px] text-slate-400">{entry.time}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 truncate">{entry.source}</div>
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
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white shadow-2xs hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${entry.team === 1 ? 'bg-blue-600' : 'bg-emerald-600'}`}
                    />
                    <div>
                      <span className="font-semibold text-xs text-slate-800">{entry.teamName}</span>
                      <p className="text-[11px] text-slate-500">{entry.source}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold text-sm ${entry.value >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {entry.value > 0 ? `+${entry.value}` : entry.value}
                    </span>
                    <p className="text-[10px] text-slate-400">{entry.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          {gameLog.length > 0 ? (
            <button
              onClick={() => {
                if (window.confirm('Do you want to clear the entire match history log?')) {
                  onClearLog();
                }
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium transition"
            >
              Clear Log
            </button>
          ) : <div />}
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
