import React from 'react';
import { X, BookOpen, Check, AlertCircle } from 'lucide-react';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export const GameRulesModal: React.FC<GameRulesModalProps> = ({ isOpen, onClose, isDark = true }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rulesTitle"
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
          <div className="flex items-center gap-2.5">
            <BookOpen className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <h3 id="rulesTitle" className={`font-bold text-lg ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Game Rules
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white' 
                : 'bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-900'
            }`}
            aria-label="Close rules"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Rules Content */}
        <div className="p-5 overflow-y-auto space-y-3.5 text-sm leading-relaxed">
          <div className={`rounded-xl p-3.5 space-y-1.5 border ${
            isDark 
              ? 'bg-emerald-950/30 border-emerald-500/30' 
              : 'bg-emerald-50/70 border-emerald-200'
          }`}>
            <div className={`font-bold flex items-center gap-1.5 text-sm ${
              isDark ? 'text-emerald-300' : 'text-emerald-800'
            }`}>
              <Check className="w-4 h-4 text-emerald-500" /> 1. Match Structure
            </div>
            <ul className={`list-disc pl-5 space-y-1 text-xs ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}>
              <li>The game is played between 2 teams. In each round, one team bids.</li>
              <li>Each round consists of 13 total cards / tricks.</li>
              <li>The sum of cards taken by both teams must always equal exactly 13.</li>
            </ul>
          </div>

          <div className={`border rounded-xl p-3.5 space-y-2 ${
            isDark 
              ? 'border-sky-500/30 bg-slate-900/60' 
              : 'border-sky-200 bg-sky-50/50'
          }`}>
            <div className={`font-bold flex items-center gap-1.5 text-sm ${
              isDark ? 'text-sky-300' : 'text-sky-800'
            }`}>
              <Check className="w-4 h-4 text-sky-500" /> 2. Bidding Rules (Bid 7–10)
            </div>
            <ul className={`space-y-2 text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <li className={`p-2.5 rounded-lg border ${
                isDark 
                  ? 'bg-slate-800/80 border-slate-700' 
                  : 'bg-white border-sky-100 shadow-2xs'
              }`}>
                <strong className={isDark ? 'text-sky-300' : 'text-sky-700'}>Bid 7–9:</strong> If the bidding team takes cards equal to or greater than their bid, they score <strong className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>+Bid points</strong>. If they fail to meet the bid, they lose <strong className="text-rose-500">−Bid points</strong>.
                <div className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Example: A bid of 8 with 8+ cards gives +8 pts; 7 cards gives −8 pts.</div>
              </li>
              <li className={`p-2.5 rounded-lg border ${
                isDark 
                  ? 'bg-amber-950/40 border-amber-500/40' 
                  : 'bg-amber-50/80 border-amber-200 shadow-2xs'
              }`}>
                <strong className={isDark ? 'text-amber-300' : 'text-amber-700'}>Bid 10 (Special Bid):</strong> Taking 10 or more cards awards a bonus <strong className={isDark ? 'text-amber-400' : 'text-amber-600'}>+13 points</strong>! Failing to take 10 cards results in <strong className="text-rose-500">−10 points</strong>.
              </li>
            </ul>
          </div>

          <div className={`border rounded-xl p-3.5 space-y-1.5 ${
            isDark 
              ? 'border-indigo-500/30 bg-slate-900/60' 
              : 'border-indigo-200 bg-indigo-50/50'
          }`}>
            <div className={`font-bold flex items-center gap-1.5 text-sm ${
              isDark ? 'text-indigo-300' : 'text-indigo-800'
            }`}>
              <Check className="w-4 h-4 text-indigo-500" /> 3. Opponent Team Points
            </div>
            <ul className={`list-disc pl-5 space-y-1 text-xs ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}>
              <li>If the opponent team takes <strong>5 or more cards</strong>: they score <strong className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>+5 points</strong>.</li>
              <li>If the opponent team takes fewer than 5 cards: they receive <strong className="text-rose-500">−5 points</strong>.</li>
            </ul>
          </div>

          <div className={`border rounded-xl p-3.5 space-y-1.5 ${
            isDark 
              ? 'border-emerald-500/30 bg-emerald-950/20' 
              : 'border-emerald-200 bg-emerald-50/50'
          }`}>
            <div className={`font-bold flex items-center gap-1.5 text-sm ${
              isDark ? 'text-emerald-300' : 'text-emerald-800'
            }`}>
              <AlertCircle className="w-4 h-4 text-emerald-500" /> 4. Winning &amp; Tie-Breaker
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              The first team to reach or exceed the <strong>Win Limit (default 50)</strong> wins the match.
            </p>
            <p className={`text-xs p-2 rounded-lg border mt-1 ${
              isDark 
                ? 'text-slate-300 bg-slate-800/80 border-emerald-500/30' 
                : 'text-slate-700 bg-white border-emerald-200 shadow-2xs'
            }`}>
              <strong>Tie-breaker:</strong> If both teams reach the Win Limit in the same round, the <strong>bidding team</strong> wins the match!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t flex justify-end shrink-0 ${
          isDark 
            ? 'bg-slate-900 border-slate-800' 
            : 'bg-slate-50 border-slate-200'
        }`}>
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
