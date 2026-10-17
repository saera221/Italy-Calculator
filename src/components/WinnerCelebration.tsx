import React from 'react';
import { Trophy, Sparkles, RotateCcw, X } from 'lucide-react';

interface WinnerCelebrationProps {
  isOpen: boolean;
  winnerTeamName: string;
  winnerScore: number;
  loserTeamName: string;
  loserScore: number;
  onClose: () => void;
  onNewGame: () => void;
}

export const WinnerCelebration: React.FC<WinnerCelebrationProps> = ({
  isOpen,
  winnerTeamName,
  winnerScore,
  loserTeamName,
  loserScore,
  onClose,
  onNewGame,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in zoom-in-95 duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="winner-title"
    >
      <div className="relative w-full max-w-sm bg-gradient-to-b from-amber-50 to-white rounded-3xl shadow-2xl border-2 border-amber-400 p-6 text-center text-slate-800 overflow-hidden">
        {/* Decorative sparkles */}
        <div className="absolute top-3 left-3 text-amber-400 animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="absolute top-3 right-3 text-amber-400 animate-pulse delay-150">
          <Sparkles className="w-5 h-5" />
        </div>

        {/* Trophy icon */}
        <div className="relative mx-auto w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-300/50 mb-3">
          <Trophy className="w-10 h-10 text-amber-950 stroke-[2.2]" />
        </div>

        <p className="text-xs uppercase tracking-widest font-black text-amber-600 mb-1">
          MATCH WINNER!
        </p>
        <h2 id="winner-title" className="text-2xl font-black text-slate-900 leading-tight mb-2 truncate">
          {winnerTeamName} Wins!
        </h2>

        {/* Score comparison pill */}
        <div className="my-4 p-3 bg-white/80 border border-amber-200 rounded-2xl shadow-xs inline-block w-full">
          <div className="grid grid-cols-2 divide-x divide-slate-100 text-center">
            <div className="px-2">
              <p className="text-xs text-slate-500 truncate">{winnerTeamName}</p>
              <p className="text-2xl font-black text-emerald-600">{winnerScore}</p>
            </div>
            <div className="px-2">
              <p className="text-xs text-slate-500 truncate">{loserTeamName}</p>
              <p className="text-2xl font-black text-slate-500">{loserScore}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <button
            onClick={onNewGame}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            New Match
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 px-4 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
