import React from 'react';
import { X, BookOpen, Check, AlertCircle } from 'lucide-react';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GameRulesModal: React.FC<GameRulesModalProps> = ({ isOpen, onClose }) => {
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
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-700 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-emerald-200" />
            <h3 id="rulesTitle" className="font-bold text-lg">
              Game Rules
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Close rules"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Rules Content in English */}
        <div className="p-5 overflow-y-auto space-y-3.5 text-sm leading-relaxed">
          <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-3.5 space-y-1.5">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
              <Check className="w-4 h-4 text-emerald-600" /> 1. Match Structure
            </div>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
              <li>The game is played between 2 teams. In each round, one team bids.</li>
              <li>Each round consists of 13 total cards / tricks.</li>
              <li>The sum of cards taken by both teams must always equal exactly 13.</li>
            </ul>
          </div>

          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-slate-50/60">
            <div className="font-bold text-blue-900 flex items-center gap-1.5 text-sm">
              <Check className="w-4 h-4 text-blue-600" /> 2. Bidding Rules (Bid 7–10)
            </div>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="p-2.5 rounded-lg bg-white border border-slate-200">
                <strong className="text-blue-700">Bid 7–9:</strong> If the bidding team takes cards equal to or greater than their bid, they score <strong>+Bid points</strong>. If they fail to meet the bid, they lose <strong>−Bid points</strong>.
                <div className="text-[11px] text-slate-500 mt-1">Example: A bid of 8 with 8+ cards gives +8 pts; 7 cards gives −8 pts.</div>
              </li>
              <li className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200">
                <strong className="text-amber-800">Bid 10 (Special Bid):</strong> Taking 10 or more cards awards a bonus <strong>+13 points</strong>! Failing to take 10 cards results in <strong>−10 points</strong>.
              </li>
            </ul>
          </div>

          <div className="border border-slate-200 rounded-xl p-3.5 space-y-1.5 bg-slate-50/60">
            <div className="font-bold text-purple-900 flex items-center gap-1.5 text-sm">
              <Check className="w-4 h-4 text-purple-600" /> 3. Opponent Team Points
            </div>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
              <li>If the opponent team takes <strong>5 or more cards</strong>: they score <strong>+5 points</strong>.</li>
              <li>If the opponent team takes fewer than 5 cards: they receive <strong>−5 points</strong>.</li>
            </ul>
          </div>

          <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-3.5 space-y-1.5">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
              <AlertCircle className="w-4 h-4 text-emerald-700" /> 4. Winning & Tie-Breaker
            </div>
            <p className="text-xs text-slate-700">
              The first team to reach or exceed the <strong>Win Limit (default 50)</strong> wins the match.
            </p>
            <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-emerald-200 mt-1">
              <strong>Tie-breaker:</strong> If both teams reach the Win Limit in the same round, the <strong>bidding team</strong> wins the match!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-end shrink-0">
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
