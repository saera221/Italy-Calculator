/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  WifiOff,
} from 'lucide-react';
import { usePWAInstall } from './hooks/usePWAInstall';
import { playTapSound, playRoundAddSound, playWinCelebration, triggerHaptic, playAlertSound } from './utils/audio';
import { GameRulesModal } from './components/GameRulesModal';
import { GameLogModal, LogEntry } from './components/GameLogModal';
import { WinnerCelebration } from './components/WinnerCelebration';
import { InstallModal } from './components/InstallModal';

interface Move {
  team: 1 | 2;
  value: number;
}

export interface RoundRecord {
  id: string;
  roundNumber: number;
  bidTeam: 1 | 2;
  bidValue: number;
  bidCards: number;
  oppCards: number;
  score1Delta: number;
  score2Delta: number;
  score1Before: number;
  score2Before: number;
  score1After: number;
  score2After: number;
  logEntryIds: string[];
  logEntries: LogEntry[];
  summary: string;
}

export default function App() {
  const { isInstallable, isInstalled, isIOS, isOnline, install } = usePWAInstall();

  // Team names
  const [name1, setName1] = useState(() => localStorage.getItem('name1') || 'Team 1');
  const [name2, setName2] = useState(() => localStorage.getItem('name2') || 'Team 2');

  // Scores & History
  const [score1, setScore1] = useState<number>(() => Number(localStorage.getItem('score1')) || 0);
  const [score2, setScore2] = useState<number>(() => Number(localStorage.getItem('score2')) || 0);
  const [history1, setHistory1] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('history1') || '[]');
    } catch {
      return [];
    }
  });
  const [history2, setHistory2] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('history2') || '[]');
    } catch {
      return [];
    }
  });

  // Moves & Game Log
  const [gameLog, setGameLog] = useState<LogEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('gameLog') || '[]');
    } catch {
      return [];
    }
  });
  const [moves, setMoves] = useState<Move[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('moves') || '[]');
    } catch {
      return [];
    }
  });
  const [redoStack, setRedoStack] = useState<Move[]>([]);

  // Full-round atomic history for accurate 1-round undo/redo and branching
  const [roundHistory, setRoundHistory] = useState<RoundRecord[]>(() => {
    try {
      const saved = localStorage.getItem('roundHistory');
      if (saved) return JSON.parse(saved);
      // Migration: if history1 and history2 already exist
      const h1: number[] = JSON.parse(localStorage.getItem('history1') || '[]');
      const h2: number[] = JSON.parse(localStorage.getItem('history2') || '[]');
      const len = Math.min(h1.length, h2.length);
      const migrated: RoundRecord[] = [];
      let s1 = 0;
      let s2 = 0;
      for (let i = 0; i < len; i++) {
        const s1Before = s1;
        const s2Before = s2;
        s1 += h1[i];
        s2 += h2[i];
        migrated.push({
          id: `round-migrated-${i + 1}`,
          roundNumber: i + 1,
          bidTeam: 1,
          bidValue: 7,
          bidCards: 7,
          oppCards: 6,
          score1Delta: h1[i],
          score2Delta: h2[i],
          score1Before: s1Before,
          score2Before: s2Before,
          score1After: s1,
          score2After: s2,
          logEntryIds: [],
          logEntries: [],
          summary: `Round ${i + 1}`,
        });
      }
      return migrated;
    } catch {
      return [];
    }
  });
  const [roundRedoStack, setRoundRedoStack] = useState<RoundRecord[]>([]);

  // Round Calculator State
  const [bidTeam, setBidTeam] = useState<1 | 2 | null>(null);
  const [teamSelectError, setTeamSelectError] = useState(false);
  const selectErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bidValue, setBidValue] = useState<number>(7);
  const [bidCards, setBidCards] = useState<number>(7);
  const oppCards = Math.max(0, 13 - bidCards);

  // Win Limit & Game State
  const [winLimit, setWinLimit] = useState<number>(() => {
    const saved = localStorage.getItem('winLimit');
    const n = Number(saved);
    return saved && !isNaN(n) && n > 0 ? n : 50;
  });
  const [winLimitText, setWinLimitText] = useState<string>(() => {
    const saved = localStorage.getItem('winLimit');
    const n = Number(saved);
    return saved && !isNaN(n) && n > 0 ? String(n) : '50';
  });
  const [gameOver, setGameOver] = useState(false);
  const [winnerTeam, setWinnerTeam] = useState<1 | 2 | null>(null);
  const [roundMessage, setRoundMessage] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);

  const handleWinLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d+$/.test(val)) {
      setWinLimitText(val);
      if (val !== '') {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num > 0) {
          setWinLimit(num);
        }
      }
    }
  };

  const handleWinLimitBlur = () => {
    if (winLimitText.trim() === '' || parseInt(winLimitText, 10) <= 0) {
      setWinLimit(50);
      setWinLimitText('50');
    } else {
      const num = parseInt(winLimitText, 10);
      setWinLimit(num);
      setWinLimitText(String(num));
    }
  };

  // Modals
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isWinnerOpen, setIsWinnerOpen] = useState(false);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('name1', name1);
    localStorage.setItem('name2', name2);
    localStorage.setItem('score1', String(score1));
    localStorage.setItem('score2', String(score2));
    localStorage.setItem('history1', JSON.stringify(history1));
    localStorage.setItem('history2', JSON.stringify(history2));
    localStorage.setItem('roundHistory', JSON.stringify(roundHistory));
    localStorage.setItem('gameLog', JSON.stringify(gameLog));
    localStorage.setItem('moves', JSON.stringify(moves));
    localStorage.setItem('winLimit', String(winLimit));
  }, [name1, name2, score1, score2, history1, history2, roundHistory, gameLog, moves, winLimit]);

  // Only update bidValue when slider changes - do NOT touch bidCards
  const chooseBid = (val: number) => {
    const clamped = Math.max(7, Math.min(10, val || 7));
    setBidValue(clamped);
  };

  const stepNumber = (delta: number) => {
    triggerHaptic(15);
    playTapSound(isMuted);
    const next = Math.max(0, Math.min(13, bidCards + delta));
    setBidCards(next);
  };

  // Check winner logic
  const checkWinner = (preferredWinner: 1 | 2 | null = null, s1 = score1, s2 = score2) => {
    const team1Won = s1 >= winLimit;
    const team2Won = s2 >= winLimit;

    if (!team1Won && !team2Won) {
      setWinnerTeam(null);
      setGameOver(false);
      return;
    }

    // If both teams cross Win Limit in the same round, the bidding team wins.
    let winner: 1 | 2 = 1;
    if (team1Won && team2Won && (preferredWinner === 1 || preferredWinner === 2)) {
      winner = preferredWinner;
    } else {
      winner = team1Won ? 1 : 2;
    }

    setWinnerTeam(winner);
    setGameOver(true);
    setIsWinnerOpen(true);
    playWinCelebration(isMuted);
    triggerHaptic([100, 50, 100, 50, 200]);
  };

  // Calculate & Add Round
  const calculateRound = () => {
    if (gameOver) {
      triggerHaptic(25);
      playTapSound(isMuted);
      setRoundMessage('Match over — press Reset to start a new match.');
      return;
    }

    if (!bidTeam) {
      // Vibrate phone with multi-pulse error pattern
      triggerHaptic([60, 50, 60, 50, 100]);
      playAlertSound(isMuted);
      setTeamSelectError(true);
      setRoundMessage('⚠️ Select a team first');

      if (selectErrorTimeoutRef.current) {
        clearTimeout(selectErrorTimeoutRef.current);
      }
      selectErrorTimeoutRef.current = setTimeout(() => {
        setTeamSelectError(false);
      }, 2500);
      return;
    }

    triggerHaptic(25);
    playTapSound(isMuted);
    setTeamSelectError(false);

    if (!Number.isInteger(bidValue) || bidValue < 7 || bidValue > 10) {
      setRoundMessage('Enter a bid between 7 and 10.');
      return;
    }

    if (bidCards < 0 || bidCards > 13 || oppCards < 0 || oppCards > 13) {
      setRoundMessage('Enter card counts between 0 and 13.');
      return;
    }

    // Bids 7–9 score the bid amount; bid 10 is the special case (+13 / −10).
    const bidPoints = bidCards >= bidValue ? (bidValue === 10 ? 13 : bidValue) : -bidValue;
    const oppPoints = oppCards >= 5 ? 5 : -5;
    const opponentTeam: 1 | 2 = bidTeam === 1 ? 2 : 1;

    const bidderName = bidTeam === 1 ? name1 : name2;
    const oppName = opponentTeam === 1 ? name1 : name2;

    const score1Delta = bidTeam === 1 ? bidPoints : oppPoints;
    const score2Delta = bidTeam === 2 ? bidPoints : oppPoints;

    const nextScore1 = score1 + score1Delta;
    const nextScore2 = score2 + score2Delta;

    const currentRoundNum = roundHistory.length + 1;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const log1Id = `${Date.now()}-1`;
    const log2Id = `${Date.now()}-2`;

    const newLogEntries: LogEntry[] = [
      {
        id: log1Id,
        roundNumber: currentRoundNum,
        team: bidTeam,
        teamName: bidderName,
        value: bidPoints,
        source: `Round ${currentRoundNum}: Bid ${bidValue} (${bidCards} cards)`,
        time: now,
      },
      {
        id: log2Id,
        roundNumber: currentRoundNum,
        team: opponentTeam,
        teamName: oppName,
        value: oppPoints,
        source: `Round ${currentRoundNum}: Opponent (${oppCards} cards)`,
        time: now,
      },
    ];

    const summary = `${bidderName}: ${bidPoints > 0 ? '+' : ''}${bidPoints} | ${oppName}: ${oppPoints > 0 ? '+' : ''}${oppPoints}`;

    const newRound: RoundRecord = {
      id: `${Date.now()}-${currentRoundNum}`,
      roundNumber: currentRoundNum,
      bidTeam,
      bidValue,
      bidCards,
      oppCards,
      score1Delta,
      score2Delta,
      score1Before: score1,
      score2Before: score2,
      score1After: nextScore1,
      score2After: nextScore2,
      logEntryIds: [log1Id, log2Id],
      logEntries: newLogEntries,
      summary,
    };

    // Full 1-round history update:
    // If undo was performed and user enters a new round without redoing,
    // the newly entered round appends to current state and redo stack is cleared.
    setRoundHistory((prev) => [...prev, newRound]);
    setRoundRedoStack([]); // Clears redo stack when new round is entered after undo!

    const newMoves: Move[] = [
      { team: bidTeam, value: bidPoints },
      { team: opponentTeam, value: oppPoints },
    ];
    setMoves((prev) => [...prev, ...newMoves]);
    setRedoStack([]);

    setGameLog((prev) => [...prev, ...newLogEntries]);

    setScore1(nextScore1);
    setScore2(nextScore2);

    setHistory1((prev) => [...prev, score1Delta]);
    setHistory2((prev) => [...prev, score2Delta]);

    playRoundAddSound(bidPoints > 0, isMuted);
    setRoundMessage(summary);

    checkWinner(bidTeam, nextScore1, nextScore2);
    // Reset bidding team so both buttons return to unselected state!
    setBidTeam(null);
  };

  // Full 1 Round Undo
  const handleUndo = () => {
    triggerHaptic(25);
    playTapSound(isMuted);

    if (roundHistory.length === 0) return;

    const lastRound = roundHistory[roundHistory.length - 1];

    // Pop 1 full round from roundHistory into roundRedoStack
    setRoundHistory((prev) => prev.slice(0, -1));
    setRoundRedoStack((prev) => [...prev, lastRound]);

    // Keep legacy moves in sync
    setMoves((prev) => prev.slice(0, -2));
    setRedoStack((prev) => [
      ...prev,
      { team: lastRound.bidTeam === 1 ? 2 : 1, value: lastRound.bidTeam === 1 ? lastRound.score2Delta : lastRound.score1Delta },
      { team: lastRound.bidTeam, value: lastRound.bidTeam === 1 ? lastRound.score1Delta : lastRound.score2Delta },
    ]);

    // Revert both teams' scores atomically to exact values before this round
    setScore1(lastRound.score1Before);
    setScore2(lastRound.score2Before);

    // Revert 1 entry from each team's score history
    setHistory1((prev) => prev.slice(0, -1));
    setHistory2((prev) => prev.slice(0, -1));

    // Remove this round's log entries from gameLog
    const removeIds = new Set(lastRound.logEntryIds);
    setGameLog((prev) => prev.filter((entry) => !removeIds.has(entry.id)));

    // Revert game over if it was won this round
    setGameOver(false);
    setWinnerTeam(null);
    setIsWinnerOpen(false);

    setRoundMessage(`Undid Round ${lastRound.roundNumber}`);
  };

  // Full 1 Round Redo
  const handleRedo = () => {
    triggerHaptic(25);
    playTapSound(isMuted);

    if (roundRedoStack.length === 0) return;

    const roundToRestore = roundRedoStack[roundRedoStack.length - 1];

    // Pop from redo stack and restore to roundHistory
    setRoundRedoStack((prev) => prev.slice(0, -1));
    setRoundHistory((prev) => [...prev, roundToRestore]);

    // Keep legacy moves in sync
    setRedoStack((prev) => prev.slice(0, -2));
    setMoves((prev) => [
      ...prev,
      { team: roundToRestore.bidTeam, value: roundToRestore.bidTeam === 1 ? roundToRestore.score1Delta : roundToRestore.score2Delta },
      { team: roundToRestore.bidTeam === 1 ? 2 : 1, value: roundToRestore.bidTeam === 1 ? roundToRestore.score2Delta : roundToRestore.score1Delta },
    ]);

    // Restore scores atomically
    setScore1(roundToRestore.score1After);
    setScore2(roundToRestore.score2After);

    // Restore one score entry to each team's score history
    setHistory1((prev) => [...prev, roundToRestore.score1Delta]);
    setHistory2((prev) => [...prev, roundToRestore.score2Delta]);

    // Restore log entries
    setGameLog((prev) => [...prev, ...roundToRestore.logEntries]);

    // Check winner
    checkWinner(roundToRestore.bidTeam, roundToRestore.score1After, roundToRestore.score2After);

    setRoundMessage(`Redid Round ${roundToRestore.roundNumber}`);
  };

  // Reset Game
  const handleResetGame = () => {
    triggerHaptic(40);
    playTapSound(isMuted);

    setName1('Team 1');
    setName2('Team 2');
    setBidTeam(null);
    setTeamSelectError(false);
    setBidValue(7);
    setBidCards(7);

    setScore1(0);
    setScore2(0);
    setHistory1([]);
    setHistory2([]);
    setRoundHistory([]);
    setRoundRedoStack([]);
    setMoves([]);
    setRedoStack([]);
    setGameLog([]);
    setGameOver(false);
    setWinnerTeam(null);
    setIsWinnerOpen(false);
    setRoundMessage('Game has been reset.');
    setTimeout(() => {
      setRoundMessage('');
    }, 2500);
  };

  return (
    <div className="w-full h-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-gradient-to-r from-[#dfe9f3] to-white text-slate-900 flex flex-col justify-between items-center select-none font-sans antialiased p-1.5 sm:p-2 pb-safe pt-safe">
      {/* Top Bar with Rules, Audio & History */}
      <header className="w-full max-w-[720px] flex items-center justify-between gap-1.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              triggerHaptic(15);
              setIsRulesOpen(true);
            }}
            className="bg-[#15803d] hover:bg-green-800 text-white font-bold px-3 py-1.5 rounded-md text-xs shadow-xs active:scale-95 transition flex items-center gap-1"
          >
            <span>📖</span>
            <span>Game Rules</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {!isOnline && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold"
              title="Working offline"
            >
              <WifiOff className="w-3 h-3 text-amber-700" />
              Offline
            </span>
          )}

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-7 h-7 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center justify-center transition active:scale-95 shadow-xs"
            aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-[#1d4ed8]" />}
          </button>

          {/* History Button placed where Install App was */}
          <button
            onClick={() => {
              triggerHaptic(15);
              setIsLogOpen(true);
            }}
            className="bg-[#1d4ed8] hover:bg-blue-800 text-white font-bold px-3 py-1.5 rounded-md text-xs shadow-xs active:scale-95 transition flex items-center gap-1"
          >
            <span>📜</span>
            <span>History</span>
          </button>
        </div>
      </header>

      {/* Main App Title: Smaller and moved higher up */}
      <div className="w-full max-w-[720px] text-center shrink-0 mt-0.5 mb-1">
        <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-slate-700 m-0">
          Italy Game calculator
        </h2>
      </div>

      {/* Container: Team Cards (Exact height for 6 pairs / 12 scores with zero scrolling) */}
      <div className="w-full max-w-[720px] grid grid-cols-2 gap-2 sm:gap-3 shrink-0">
        {/* Team 1 Card */}
        <div
          id="team1"
          onClick={() => {
            triggerHaptic(15);
            setTeamSelectError(false);
            setBidTeam((prev) => (prev === 1 ? null : 1));
          }}
          className={`cursor-pointer rounded-xl p-2 text-center transition-all bg-white shadow-xs flex flex-col justify-between border-2 min-h-[216px] h-[218px] sm:h-[224px] ${
            winnerTeam === 1 ? 'bg-emerald-50 border-green-600 ring-4 ring-green-400' : 'border-slate-800'
          }`}
          role="button"
          tabIndex={0}
          aria-label={`Select ${name1}`}
        >
          <div className="shrink-0">
            <input
              id="name1"
              value={name1}
              onChange={(e) => setName1(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full font-bold text-center text-xs sm:text-sm text-slate-900 border-b border-slate-300 focus:border-blue-600 bg-transparent py-0.5 outline-hidden leading-tight"
              placeholder="Team 1"
            />
          </div>

          {/* 6 Pairs (12 scores) history grid - zero scroll, fits all 6 rows together in pairs */}
          <div id="history1" className="grid grid-cols-2 gap-x-1.5 gap-y-1 my-1 text-xs font-semibold h-[134px] content-start items-center text-slate-800">
            {history1.length === 0 ? (
              <div className="col-span-2 h-full flex items-center justify-center text-[11px] text-slate-400">
                No scores yet
              </div>
            ) : (
              (() => {
                const scores = history1.slice(-12);
                const needsPlaceholder = scores.length % 2 !== 0 && scores.length < 12;
                return (
                  <>
                    {scores.map((val, idx) => (
                      <span
                        key={idx}
                        className={`h-[18px] px-1 rounded text-[11px] font-bold flex items-center justify-center leading-none ${
                          val > 0
                            ? 'text-green-800 bg-green-100 border border-green-200'
                            : 'text-red-800 bg-red-100 border border-red-200'
                        }`}
                      >
                        {val > 0 ? `+${val}` : val}
                      </span>
                    ))}
                    {needsPlaceholder && (
                      <span
                        className="h-[18px] px-1 rounded text-[11px] font-semibold text-slate-300 border border-dashed border-slate-200 bg-slate-50/40 flex items-center justify-center leading-none"
                        title="Round in progress"
                      >
                        —
                      </span>
                    )}
                  </>
                );
              })()
            )}
          </div>

          <div className="shrink-0 pt-1 pb-0.5 border-t border-slate-200 flex items-baseline justify-center gap-1.5">
            <h2 id="score1" className="text-2xl sm:text-3xl font-black text-slate-900 my-0 leading-none">
              {score1}
            </h2>
            {/* Onion skin preview of current set bid */}
            {bidTeam === 1 && (
              <span
                className="text-xs font-normal text-slate-500 opacity-55 select-none tracking-tight leading-none"
                title={`Current Bid: ${bidValue}`}
              >
                {bidValue === 10 ? '(+13/−10)' : `(±${bidValue})`}
              </span>
            )}
          </div>
        </div>

        {/* Team 2 Card */}
        <div
          id="team2"
          onClick={() => {
            triggerHaptic(15);
            setTeamSelectError(false);
            setBidTeam((prev) => (prev === 2 ? null : 2));
          }}
          className={`cursor-pointer rounded-xl p-2 text-center transition-all bg-white shadow-xs flex flex-col justify-between border-2 min-h-[216px] h-[218px] sm:h-[224px] ${
            winnerTeam === 2 ? 'bg-emerald-50 border-green-600 ring-4 ring-green-400' : 'border-slate-800'
          }`}
          role="button"
          tabIndex={0}
          aria-label={`Select ${name2}`}
        >
          <div className="shrink-0">
            <input
              id="name2"
              value={name2}
              onChange={(e) => setName2(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full font-bold text-center text-xs sm:text-sm text-slate-900 border-b border-slate-300 focus:border-blue-600 bg-transparent py-0.5 outline-hidden leading-tight"
              placeholder="Team 2"
            />
          </div>

          {/* 6 Pairs (12 scores) history grid - zero scroll, fits all 6 rows together in pairs */}
          <div id="history2" className="grid grid-cols-2 gap-x-1.5 gap-y-1 my-1 text-xs font-semibold h-[134px] content-start items-center text-slate-800">
            {history2.length === 0 ? (
              <div className="col-span-2 h-full flex items-center justify-center text-[11px] text-slate-400">
                No scores yet
              </div>
            ) : (
              (() => {
                const scores = history2.slice(-12);
                const needsPlaceholder = scores.length % 2 !== 0 && scores.length < 12;
                return (
                  <>
                    {scores.map((val, idx) => (
                      <span
                        key={idx}
                        className={`h-[18px] px-1 rounded text-[11px] font-bold flex items-center justify-center leading-none ${
                          val > 0
                            ? 'text-green-800 bg-green-100 border border-green-200'
                            : 'text-red-800 bg-red-100 border border-red-200'
                        }`}
                      >
                        {val > 0 ? `+${val}` : val}
                      </span>
                    ))}
                    {needsPlaceholder && (
                      <span
                        className="h-[18px] px-1 rounded text-[11px] font-semibold text-slate-300 border border-dashed border-slate-200 bg-slate-50/40 flex items-center justify-center leading-none"
                        title="Round in progress"
                      >
                        —
                      </span>
                    )}
                  </>
                );
              })()
            )}
          </div>

          <div className="shrink-0 pt-1 pb-0.5 border-t border-slate-200 flex items-baseline justify-center gap-1.5">
            <h2 id="score2" className="text-2xl sm:text-3xl font-black text-slate-900 my-0 leading-none">
              {score2}
            </h2>
            {/* Onion skin preview of current set bid */}
            {bidTeam === 2 && (
              <span
                className="text-xs font-normal text-slate-500 opacity-55 select-none tracking-tight leading-none"
                title={`Current Bid: ${bidValue}`}
              >
                {bidValue === 10 ? '(+13/−10)' : `(±${bidValue})`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls Section (Compact, perfectly fitting into one frame) */}
      <div className="w-full max-w-[520px] mx-auto flex flex-col justify-between gap-1.5 shrink-0 my-0.5">
        {/* Win Limit */}
        {/* Win Limit (Centered with label above input box) */}
        <div className="flex flex-col items-center justify-center gap-0.5">
          <label htmlFor="winLimit" className="text-[11px] sm:text-xs font-bold text-slate-800 tracking-tight text-center">
            Win Limit
          </label>
          <input
            id="winLimit"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={winLimitText}
            onChange={handleWinLimitChange}
            onBlur={handleWinLimitBlur}
            placeholder="50"
            className="w-16 h-7 text-center font-bold text-sm border border-slate-400 rounded-md bg-white text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Round Point Calculator */}
        <section className="round-panel bg-white/95 rounded-[10px] p-2 border border-[#b9c6d4] shadow-xs flex flex-col gap-1.5">
          <h3 className="text-xs font-bold text-center text-slate-900 m-0 leading-tight">
            Round Point Calculator
          </h3>

          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {/* Box 1: Bidding Team */}
            <div>
              <label className="text-[11px] sm:text-xs font-bold text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis h-4 flex items-center">
                Bidding Team
              </label>
              <div
                className={`h-[62px] flex gap-1 mt-1 items-stretch ${
                  teamSelectError && !bidTeam ? 'animate-vibrate-shake' : ''
                }`}
              >
                <button
                  type="button"
                  id="bidTeamBtn1"
                  onClick={() => {
                    triggerHaptic(15);
                    setTeamSelectError(false);
                    setBidTeam(bidTeam === 1 ? null : 1);
                  }}
                  className={`flex-1 h-full py-1 px-1.5 rounded-md font-bold text-xs border transition-all flex flex-col items-center justify-center leading-tight ${
                    bidTeam === 1
                      ? 'bg-[#15803d] text-white border-[#166534] ring-2 ring-green-300 shadow-xs'
                      : teamSelectError
                      ? 'bg-red-50 text-red-950 border-2 border-red-500 ring-2 ring-red-400 shadow-md animate-red-glow scale-[1.02]'
                      : 'bg-[#d1d5db] text-slate-800 border-slate-400 hover:bg-slate-300'
                  }`}
                  aria-label={`Select ${name1 || 'Team 1'}`}
                >
                  <span className="truncate max-w-full text-xs font-bold">{name1 || 'Team 1'}</span>
                  <span
                    className={`text-[9px] font-normal transition-colors ${
                      bidTeam === 1
                        ? 'opacity-90'
                        : teamSelectError
                        ? 'text-red-700 font-bold underline'
                        : 'opacity-90'
                    }`}
                  >
                    {bidTeam === 1 ? 'Selected' : teamSelectError ? 'Tap to Select' : 'Select'}
                  </span>
                </button>
                <button
                  type="button"
                  id="bidTeamBtn2"
                  onClick={() => {
                    triggerHaptic(15);
                    setTeamSelectError(false);
                    setBidTeam(bidTeam === 2 ? null : 2);
                  }}
                  className={`flex-1 h-full py-1 px-1.5 rounded-md font-bold text-xs border transition-all flex flex-col items-center justify-center leading-tight ${
                    bidTeam === 2
                      ? 'bg-[#15803d] text-white border-[#166534] ring-2 ring-green-300 shadow-xs'
                      : teamSelectError
                      ? 'bg-red-50 text-red-950 border-2 border-red-500 ring-2 ring-red-400 shadow-md animate-red-glow scale-[1.02]'
                      : 'bg-[#d1d5db] text-slate-800 border-slate-400 hover:bg-slate-300'
                  }`}
                  aria-label={`Select ${name2 || 'Team 2'}`}
                >
                  <span className="truncate max-w-full text-xs font-bold">{name2 || 'Team 2'}</span>
                  <span
                    className={`text-[9px] font-normal transition-colors ${
                      bidTeam === 2
                        ? 'opacity-90'
                        : teamSelectError
                        ? 'text-red-700 font-bold underline'
                        : 'opacity-90'
                    }`}
                  >
                    {bidTeam === 2 ? 'Selected' : teamSelectError ? 'Tap to Select' : 'Select'}
                  </span>
                </button>
              </div>
            </div>

            {/* Box 2: Bid Level (7–10) with horizontal slider */}
            <div>
              <label className="text-[11px] sm:text-xs font-bold text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis h-4 flex items-center">
                Bid Level (7–10)
              </label>
              <div className="h-[62px] bg-white border border-[#9aa7b5] rounded-md px-1.5 py-1 shadow-2xs flex flex-col justify-between mt-1">
                <output id="bidSliderValue" className="block text-center text-lg font-extrabold text-[#1d4ed8] leading-none">
                  {bidValue}
                </output>
                <input
                  id="bidSlider"
                  type="range"
                  min={7}
                  max={10}
                  step={1}
                  value={bidValue}
                  onChange={(e) => chooseBid(Number(e.target.value))}
                  className="w-full h-4 accent-[#1d4ed8] cursor-pointer touch-pan-y"
                  aria-label="Bid level"
                />
                <div className="flex justify-between px-0.5 text-[10px] font-bold text-slate-600 leading-none">
                  <span>7</span>
                  <span>8</span>
                  <span>9</span>
                  <span>10</span>
                </div>
              </div>
            </div>

            {/* Box 3: Bidder Cards */}
            <div>
              <label className="text-[11px] sm:text-xs font-bold text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis h-4 flex items-center">
                Bidder Cards
              </label>
              <div className="grid grid-cols-[34px_minmax(0,1fr)_34px] gap-1 items-stretch h-8 mt-1">
                <button
                  type="button"
                  onClick={() => stepNumber(-1)}
                  className="h-full bg-[#1d4ed8] hover:bg-blue-800 text-white font-bold text-lg rounded-md flex items-center justify-center transition active:scale-95 leading-none"
                  aria-label="Decrease bidding team cards"
                >
                  −
                </button>
                <input
                  id="bidCards"
                  type="text"
                  value={bidCards}
                  readOnly
                  className="h-full w-full text-center font-bold text-sm bg-white border border-[#9aa7b5] rounded-md outline-hidden text-slate-900"
                  aria-label="Cards taken by bidding team"
                />
                <button
                  type="button"
                  onClick={() => stepNumber(1)}
                  className="h-full bg-[#1d4ed8] hover:bg-blue-800 text-white font-bold text-lg rounded-md flex items-center justify-center transition active:scale-95 leading-none"
                  aria-label="Increase bidding team cards"
                >
                  +
                </button>
              </div>
            </div>

            {/* Box 4: Opponent Cards */}
            <div>
              <label className="text-[11px] sm:text-xs font-bold text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis h-4 flex items-center">
                Opponent Cards
              </label>
              <div className="h-8 mt-1">
                <input
                  id="oppCards"
                  type="text"
                  value={oppCards}
                  readOnly
                  className="w-full h-full text-center font-bold text-sm bg-slate-100 border border-[#9aa7b5] rounded-md outline-hidden text-slate-800"
                  aria-label="Opponent cards calculated automatically"
                />
              </div>
            </div>
          </div>

          {/* Calculate Button */}
          <button
            onClick={calculateRound}
            className="w-full h-8 py-1 px-3 bg-[#155eab] hover:bg-blue-800 text-white font-bold text-xs rounded-md shadow-xs transition active:scale-98"
          >
            Calculate &amp; Add Round
          </button>

          {/* Status Message Container (Fixed reservation to avoid height changes) */}
          <div className="h-4 flex items-center justify-center overflow-hidden">
            {roundMessage && (
              <div
                id="roundMessage"
                role="status"
                aria-live="polite"
                className={`text-center font-bold text-[11px] px-2 py-0.5 rounded border truncate w-full ${
                  teamSelectError
                    ? 'text-red-800 bg-red-50 border-red-300 ring-1 ring-red-200'
                    : 'text-blue-900 bg-blue-50 border-blue-200'
                }`}
              >
                {roundMessage}
              </div>
            )}
          </div>
        </section>

        {/* Action Bar (Undo, Redo, Reset) */}
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={roundHistory.length === 0}
            className={`w-12 h-8 flex items-center justify-center rounded-md border shadow-2xs transition active:scale-95 ${
              roundHistory.length === 0
                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe] hover:bg-blue-100'
            }`}
            aria-label="Undo 1 Round"
            title="Undo 1 Round"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 14 4 9l5-5M4 9h9a7 7 0 0 1 0 14h-2" />
            </svg>
          </button>

          <button
            onClick={handleRedo}
            disabled={roundRedoStack.length === 0}
            className={`w-12 h-8 flex items-center justify-center rounded-md border shadow-2xs transition active:scale-95 ${
              roundRedoStack.length === 0
                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0] hover:bg-green-100'
            }`}
            aria-label="Redo 1 Round"
            title="Redo 1 Round"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 14 5-5-5-5m5 5h-9a7 7 0 0 0 0 14h2" />
            </svg>
          </button>

          <button
            onClick={handleResetGame}
            className="w-12 h-8 flex items-center justify-center rounded-md border shadow-2xs bg-[#fff7ed] text-[#c2410c] border-[#fed7aa] hover:bg-orange-100 transition active:scale-95"
            aria-label="Reset"
            title="Reset"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7v5h-5M4 17v-5h5" />
              <path d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Modals */}
      <GameRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      <GameLogModal
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        gameLog={gameLog}
        team1Name={name1}
        team2Name={name2}
        score1={score1}
        score2={score2}
        winLimit={winLimit}
        onClearLog={() => setGameLog([])}
      />
      <WinnerCelebration
        isOpen={isWinnerOpen}
        winnerTeamName={winnerTeam === 1 ? name1 : name2}
        winnerScore={winnerTeam === 1 ? score1 : score2}
        loserTeamName={winnerTeam === 1 ? name2 : name1}
        loserScore={winnerTeam === 1 ? score2 : score1}
        onClose={() => setIsWinnerOpen(false)}
        onNewGame={() => {
          setIsWinnerOpen(false);
          handleResetGame();
        }}
      />
      <InstallModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
        isIOS={isIOS}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        onInstall={install}
      />
    </div>
  );
}
