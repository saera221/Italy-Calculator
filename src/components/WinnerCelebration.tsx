import React from 'react';
import { Trophy, Sparkles, RotateCcw } from 'lucide-react';

interface WinnerCelebrationProps {
  isOpen: boolean;
  winnerTeamName: string;
  winnerScore: number;
  loserTeamName: string;
  loserScore: number;
  onClose: () => void;
  onNewGame: () => void;
  isDark?: boolean;
}

export const WinnerCelebration: React.FC<WinnerCelebrationProps> = ({
  isOpen,
  winnerTeamName,
  winnerScore,
  loserTeamName,
  loserScore,
  onClose,
  onNewGame,
  isDark = true,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in zoom-in-95 duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="winner-title"
    >
      <div className={`relative w-full max-w-sm rounded-3xl p-6 text-center overflow-hidden transition-colors ${
        isDark 
          ? 'bg-gradient-to-b from-[#10192e] to-[#090d18] shadow-2xl border-2 border-amber-500/60 text-slate-100 shadow-[0_0_50px_rgba(245,158,11,0.25)]' 
          : 'bg-gradient-to-b from-amber-50/90 to-white shadow-2xl border-2 border-amber-400 text-slate-800'
      }`}>
        {/* Decorative sparkles */}
        <div className="absolute top-3 left-3 text-amber-500 animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="absolute top-3 right-3 text-amber-500 animate-pulse delay-150">
          <Sparkles className="w-5 h-5" />
        </div>

        {/* Trophy icon */}
        <div className="relative mx-auto w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-400/40 mb-3">
          <Trophy className="w-10 h-10 text-amber-950 stroke-[2.2]" />
        </div>

        <p className={`text-xs uppercase tracking-widest font-black mb-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
          MATCH WINNER!
        </p>
        <h2 id="winner-title" className={`text-2xl font-black leading-tight mb-2 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {winnerTeamName} Wins!
        </h2>

        {/* Score comparison pill */}
        <div className={`my-4 p-3 rounded-2xl shadow-inner inline-block w-full border ${
          isDark 
            ? 'bg-slate-900/90 border-slate-700/80' 
            : 'bg-white border-amber-200'
        }`}>
          <div className={`grid grid-cols-2 divide-x text-center ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
            <div className="px-2">
              <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{winnerTeamName}</p>
              <p className={`text-2xl font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{winnerScore}</p>
            </div>
            <div className="px-2">
              <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{loserTeamName}</p>
              <p className={`text-2xl font-black ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{loserScore}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <button
            onClick={onNewGame}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:brightness-110 text-white font-black rounded-xl shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2 transition active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            New Match
          </button>

          <button
            onClick={onClose}
            className={`w-full py-2 px-4 text-xs font-semibold rounded-xl border transition ${
              isDark 
                ? 'text-slate-300 hover:text-white bg-slate-800 border-slate-700' 
                : 'text-slate-700 hover:text-slate-900 bg-white border-slate-300'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
