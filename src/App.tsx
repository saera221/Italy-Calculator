/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  WifiOff,
  Sun,
  Moon,
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

  // Theme Mode ('dark' | 'simple') with automatic device detection
  const [themeMode, setThemeMode] = useState<'dark' | 'simple'>(() => {
    const saved = localStorage.getItem('italy_game_theme');
    if (saved === 'dark' || saved === 'simple') {
      return saved;
    }
    // Device automatic detection: if device dark mode is enabled, start in dark, otherwise default to simple
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'simple';
  });
  const isDark = themeMode === 'dark';

  const toggleTheme = () => {
    triggerHaptic(20);
    playTapSound();
    setThemeMode((prev) => {
      const next = prev === 'dark' ? 'simple' : 'dark';
      localStorage.setItem('italy_game_theme', next);
      return next;
    });
  };

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('simple-mode');
    } else {
      document.body.classList.add('simple-mode');
      document.body.classList.remove('dark-mode');
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', isDark ? '#080c14' : '#f1f5f9');
    }
  }, [isDark]);

  // Listen for device system theme changes if user has not explicitly set a preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('italy_game_theme');
      if (!saved) {
        setThemeMode(e.matches ? 'dark' : 'simple');
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

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
    <div className={`w-full min-h-[100dvh] overflow-y-auto overflow-x-hidden flex flex-col items-center justify-center select-none font-sans antialiased px-3 sm:px-4 pt-safe pb-safe transition-colors duration-200 ${
      isDark ? 'dark-luxury-canvas text-slate-100' : 'simple-canvas text-slate-800'
    }`}>
      {/* Centered compact container matching preview with comfortable space above and below */}
      <div className="w-full max-w-[480px] sm:max-w-[500px] flex flex-col items-center justify-center my-auto py-1 sm:py-2 gap-1.5 sm:gap-2">
        {/* Top Bar with Rules, Single Theme Toggle Button, Audio & History */}
        <header className="w-full flex items-center justify-between gap-1.5 shrink-0 py-0.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                triggerHaptic(15);
                setIsRulesOpen(true);
              }}
              className={`font-bold px-2.5 sm:px-3 py-1.5 rounded-xl text-xs active:scale-95 transition-all flex items-center gap-1.5 border shadow-xs ${
                isDark
                  ? 'bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/60 shadow-emerald-950/40'
                  : 'bg-white hover:bg-slate-50 text-emerald-700 border-emerald-300 shadow-slate-200'
              }`}
            >
              <span className="text-sm">📖</span>
              <span>Game Rules</span>
            </button>

            {/* Single button toggle between Dark Mode and Simple Mode */}
            <button
              onClick={toggleTheme}
              className={`font-bold px-2.5 sm:px-3 py-1.5 rounded-xl text-xs active:scale-95 transition-all flex items-center gap-1.5 border shadow-xs ${
                isDark
                  ? 'bg-slate-900/90 hover:bg-slate-800 text-amber-300 border-amber-500/30 hover:border-amber-500/60 shadow-amber-950/40'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-slate-200'
              }`}
              title={isDark ? 'Switch to Simple Mode' : 'Switch to Dark Mode'}
              aria-label={isDark ? 'Switch to Simple Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-300 fill-amber-300/20" />
                  <span>Simple</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-700 fill-slate-700/20" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {!isOnline && (
              <span
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-2xs border ${
                  isDark
                    ? 'bg-amber-950/80 text-amber-300 border-amber-600/50'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
                title="Working offline"
              >
                <WifiOff className="w-3 h-3 text-amber-500" />
                Offline
              </span>
            )}

            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`w-7 h-7 rounded-xl border flex items-center justify-center transition active:scale-95 shadow-xs ${
                isDark
                  ? 'bg-slate-900/90 border-slate-700/80 hover:border-slate-500 text-slate-300'
                  : 'bg-white border-slate-300 hover:border-slate-400 text-slate-600'
              }`}
              aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? (
                <VolumeX className={`w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              ) : (
                <Volume2 className={`w-3.5 h-3.5 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
              )}
            </button>

            {/* History Button */}
            <button
              onClick={() => {
                triggerHaptic(15);
                setIsLogOpen(true);
              }}
              className={`font-bold px-2.5 sm:px-3 py-1.5 rounded-xl text-xs active:scale-95 transition-all flex items-center gap-1.5 border shadow-xs ${
                isDark
                  ? 'bg-slate-900/90 hover:bg-slate-800 text-amber-400 border-amber-500/30 hover:border-amber-500/60 shadow-amber-950/40'
                  : 'bg-white hover:bg-slate-50 text-amber-700 border-amber-300 shadow-slate-200'
              }`}
            >
              <span className="text-sm">📜</span>
              <span>History</span>
            </button>
          </div>
        </header>

        {/* Main App Title */}
        <div className="w-full text-center shrink-0">
          <div className={`inline-flex items-center gap-2 px-3.5 py-0.5 rounded-full border ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 shadow-inner'
              : 'bg-white/90 border-slate-200 shadow-xs'
          }`}>
            <span className="text-[10px] text-amber-500">♠</span>
            <h2 className={`text-xs sm:text-[13px] font-black uppercase tracking-widest m-0 ${
              isDark ? 'text-slate-200' : 'text-slate-700'
            }`}>
              Italy Game Calculator
            </h2>
            <span className="text-[10px] text-rose-500">♥</span>
          </div>
        </div>

        {/* Container: Team Cards (Exact height for 6 pairs / 12 scores with zero scrolling) */}
        <div className="w-full grid grid-cols-2 gap-2 sm:gap-3 shrink-0">
          {/* Team 1 Card */}
          <div
            id="team1"
            onClick={() => {
              triggerHaptic(15);
              setTeamSelectError(false);
              setBidTeam((prev) => (prev === 1 ? null : 1));
            }}
            className={`cursor-pointer rounded-2xl p-2.5 text-center transition-all flex flex-col justify-between border-2 min-h-[216px] h-[218px] sm:h-[224px] ${
              isDark
                ? `bg-gradient-to-b from-[#0d1e18] to-[#07130f] shadow-lg ${
                    winnerTeam === 1
                      ? 'border-emerald-400 ring-4 ring-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.45)]'
                      : bidTeam === 1
                      ? 'border-emerald-400 ring-2 ring-emerald-500/70 shadow-[0_0_24px_rgba(16,185,129,0.3)]'
                      : 'border-emerald-500/40 hover:border-emerald-500/70 hover:shadow-emerald-950/50'
                  }`
                : `bg-white shadow-md ${
                    winnerTeam === 1
                      ? 'border-emerald-500 ring-4 ring-emerald-400 shadow-lg shadow-emerald-200'
                      : bidTeam === 1
                      ? 'border-emerald-500 ring-2 ring-emerald-400/80 shadow-md shadow-emerald-100 bg-emerald-50/20'
                      : 'border-emerald-300 hover:border-emerald-400'
                  }`
            }`}
            role="button"
            tabIndex={0}
            aria-label={`Select ${name1}`}
          >
            <div className="shrink-0 flex items-center justify-center gap-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isDark ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-emerald-500'}`}></span>
              <input
                id="name1"
                value={name1}
                onChange={(e) => setName1(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className={`w-full font-black text-center text-xs sm:text-sm py-0.5 outline-hidden leading-tight bg-transparent ${
                  isDark
                    ? 'text-emerald-300 border-b border-emerald-500/40 focus:border-emerald-400'
                    : 'text-emerald-800 border-b border-emerald-300 focus:border-emerald-600'
                }`}
                placeholder="Team 1"
              />
            </div>

            {/* 6 Pairs (12 scores) history grid - zero scroll, fits all 6 rows together in pairs */}
            <div id="history1" className={`grid grid-cols-2 gap-x-1.5 gap-y-1 my-1 text-xs font-semibold h-[134px] content-start items-center ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}>
              {history1.length === 0 ? (
                <div className={`col-span-2 h-full flex items-center justify-center text-[11px] font-semibold ${
                  isDark ? 'text-emerald-500/40' : 'text-slate-400'
                }`}>
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
                          className={`h-[18px] px-1 rounded-md text-[11px] font-black flex items-center justify-center leading-none shadow-2xs ${
                            isDark
                              ? val > 0
                                ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                                : 'text-rose-300 bg-rose-500/20 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.15)]'
                              : val > 0
                              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                              : 'text-rose-700 bg-rose-50 border border-rose-200'
                          }`}
                        >
                          {val > 0 ? `+${val}` : val}
                        </span>
                      ))}
                      {needsPlaceholder && (
                        <span
                          className={`h-[18px] px-1 rounded-md text-[11px] font-semibold border border-dashed flex items-center justify-center leading-none ${
                            isDark
                              ? 'text-emerald-500/40 border-emerald-500/30 bg-emerald-950/20'
                              : 'text-slate-400 border-slate-300 bg-slate-50'
                          }`}
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

            <div className={`shrink-0 pt-1 pb-0.5 border-t flex items-baseline justify-center gap-1.5 ${
              isDark ? 'border-emerald-500/30' : 'border-slate-100'
            }`}>
              <h2 id="score1" className={`text-2xl sm:text-3xl font-black my-0 leading-none ${
                isDark
                  ? 'text-white drop-shadow-[0_2px_12px_rgba(16,185,129,0.4)]'
                  : 'text-emerald-700'
              }`}>
                {score1}
              </h2>
              {/* Onion skin preview of current set bid */}
              {bidTeam === 1 && (
                <span
                  className={`text-xs font-bold select-none tracking-tight leading-none px-1.5 py-0.5 rounded-full border ${
                    isDark
                      ? 'text-emerald-300 bg-emerald-950/90 border-emerald-500/50'
                      : 'text-emerald-800 bg-emerald-100 border-emerald-300'
                  }`}
                  title={`Current Bid: ${bidValue}`}
                >
                  {bidValue === 10 ? '+13/−10' : `±${bidValue}`}
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
            className={`cursor-pointer rounded-2xl p-2.5 text-center transition-all flex flex-col justify-between border-2 min-h-[216px] h-[218px] sm:h-[224px] ${
              isDark
                ? `bg-gradient-to-b from-[#0e1b2d] to-[#070e1a] shadow-lg ${
                    winnerTeam === 2
                      ? 'border-sky-400 ring-4 ring-sky-400 shadow-[0_0_35px_rgba(56,189,248,0.45)]'
                      : bidTeam === 2
                      ? 'border-sky-400 ring-2 ring-sky-500/70 shadow-[0_0_24px_rgba(56,189,248,0.3)]'
                      : 'border-sky-500/40 hover:border-sky-500/70 hover:shadow-sky-950/50'
                  }`
                : `bg-white shadow-md ${
                    winnerTeam === 2
                      ? 'border-sky-500 ring-4 ring-sky-400 shadow-lg shadow-sky-200'
                      : bidTeam === 2
                      ? 'border-sky-500 ring-2 ring-sky-400/80 shadow-md shadow-sky-100 bg-sky-50/20'
                      : 'border-sky-300 hover:border-sky-400'
                  }`
            }`}
            role="button"
            tabIndex={0}
            aria-label={`Select ${name2}`}
          >
            <div className="shrink-0 flex items-center justify-center gap-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isDark ? 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]' : 'bg-sky-500'}`}></span>
              <input
                id="name2"
                value={name2}
                onChange={(e) => setName2(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className={`w-full font-black text-center text-xs sm:text-sm py-0.5 outline-hidden leading-tight bg-transparent ${
                  isDark
                    ? 'text-sky-300 border-b border-sky-500/40 focus:border-sky-400'
                    : 'text-sky-800 border-b border-sky-300 focus:border-sky-600'
                }`}
                placeholder="Team 2"
              />
            </div>

            {/* 6 Pairs (12 scores) history grid - zero scroll, fits all 6 rows together in pairs */}
            <div id="history2" className={`grid grid-cols-2 gap-x-1.5 gap-y-1 my-1 text-xs font-semibold h-[134px] content-start items-center ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}>
              {history2.length === 0 ? (
                <div className={`col-span-2 h-full flex items-center justify-center text-[11px] font-semibold ${
                  isDark ? 'text-sky-500/40' : 'text-slate-400'
                }`}>
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
                          className={`h-[18px] px-1 rounded-md text-[11px] font-black flex items-center justify-center leading-none shadow-2xs ${
                            isDark
                              ? val > 0
                                ? 'text-sky-300 bg-sky-500/20 border border-sky-500/40 shadow-[0_0_8px_rgba(56,189,248,0.15)]'
                                : 'text-rose-300 bg-rose-500/20 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.15)]'
                              : val > 0
                              ? 'text-sky-700 bg-sky-50 border border-sky-200'
                              : 'text-rose-700 bg-rose-50 border border-rose-200'
                          }`}
                        >
                          {val > 0 ? `+${val}` : val}
                        </span>
                      ))}
                      {needsPlaceholder && (
                        <span
                          className={`h-[18px] px-1 rounded-md text-[11px] font-semibold border border-dashed flex items-center justify-center leading-none ${
                            isDark
                              ? 'text-sky-500/40 border-sky-500/30 bg-sky-950/20'
                              : 'text-slate-400 border-slate-300 bg-slate-50'
                          }`}
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

            <div className={`shrink-0 pt-1 pb-0.5 border-t flex items-baseline justify-center gap-1.5 ${
              isDark ? 'border-sky-500/30' : 'border-slate-100'
            }`}>
              <h2 id="score2" className={`text-2xl sm:text-3xl font-black my-0 leading-none ${
                isDark
                  ? 'text-white drop-shadow-[0_2px_12px_rgba(56,189,248,0.4)]'
                  : 'text-sky-700'
              }`}>
                {score2}
              </h2>
              {/* Onion skin preview of current set bid */}
              {bidTeam === 2 && (
                <span
                  className={`text-xs font-bold select-none tracking-tight leading-none px-1.5 py-0.5 rounded-full border ${
                    isDark
                      ? 'text-sky-300 bg-sky-950/90 border-sky-500/50'
                      : 'text-sky-800 bg-sky-100 border-sky-300'
                  }`}
                  title={`Current Bid: ${bidValue}`}
                >
                  {bidValue === 10 ? '+13/−10' : `±${bidValue}`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Controls Section (Compact, perfectly fitting into one frame) */}
        <div className="w-full flex flex-col gap-1.5 shrink-0">
          {/* Win Limit */}
          <div className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-4 py-1 border shadow-xs ${
            isDark
              ? 'bg-slate-900/90 border-amber-500/30 shadow-amber-950/20'
              : 'bg-white border-amber-300 shadow-slate-200'
          }`}>
            <label htmlFor="winLimit" className={`text-[11px] sm:text-xs font-black tracking-wider uppercase text-center flex items-center gap-1 ${
              isDark ? 'text-amber-400' : 'text-amber-700'
            }`}>
              <span>🎯</span>
              <span>Win Limit</span>
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
              className={`w-16 h-7 text-center font-black text-sm border rounded-lg shadow-inner focus:outline-none focus:ring-2 ${
                isDark
                  ? 'border-amber-500/50 bg-[#090e18] text-amber-300 focus:ring-amber-400 focus:border-amber-400'
                  : 'border-amber-300 bg-amber-50/60 text-amber-900 focus:ring-amber-500 focus:border-amber-500'
              }`}
            />
          </div>

          {/* Round Point Calculator */}
          <section className={`round-panel rounded-2xl p-2.5 border flex flex-col gap-1.5 ${
            isDark
              ? 'bg-[#0d1424]/95 backdrop-blur-md border-slate-700/80 shadow-2xl'
              : 'bg-white border-slate-200/90 shadow-md text-slate-800'
          }`}>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[10px] text-amber-500">♠</span>
              <h3 className={`text-xs font-black text-center uppercase tracking-wider m-0 leading-tight ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}>
                Round Point Calculator
              </h3>
              <span className="text-[10px] text-rose-500">♥</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {/* Box 1: Bidding Team */}
              <div>
                <label className={`text-[11px] sm:text-xs font-black whitespace-nowrap overflow-hidden text-ellipsis h-4 flex items-center ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
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
                    className={`flex-1 h-full py-1 px-1.5 rounded-lg font-bold text-xs border transition-all flex flex-col items-center justify-center leading-tight ${
                      bidTeam === 1
                        ? 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white border-emerald-400 ring-2 ring-emerald-400/50 shadow-md'
                        : teamSelectError
                        ? isDark
                          ? 'bg-red-950/80 text-red-200 border-red-500 ring-2 ring-red-400 shadow-md animate-red-glow scale-[1.02]'
                          : 'bg-red-100 text-red-800 border-red-400 ring-2 ring-red-400 shadow-md animate-red-glow scale-[1.02]'
                        : isDark
                        ? 'bg-slate-800/80 text-emerald-400 border-slate-700 hover:border-emerald-500/40 hover:bg-slate-800'
                        : 'bg-slate-100 text-emerald-700 border-slate-300 hover:border-emerald-400 hover:bg-slate-200'
                    }`}
                    aria-label={`Select ${name1 || 'Team 1'}`}
                  >
                    <span className="truncate max-w-full text-xs font-black">{name1 || 'Team 1'}</span>
                    <span
                      className={`text-[9px] font-bold transition-colors ${
                        bidTeam === 1
                          ? 'text-emerald-100'
                          : teamSelectError
                          ? 'text-red-500 underline'
                          : isDark
                          ? 'text-emerald-500'
                          : 'text-emerald-600'
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
                    className={`flex-1 h-full py-1 px-1.5 rounded-lg font-bold text-xs border transition-all flex flex-col items-center justify-center leading-tight ${
                      bidTeam === 2
                        ? 'bg-gradient-to-br from-sky-600 to-blue-800 text-white border-sky-400 ring-2 ring-sky-400/50 shadow-md'
                        : teamSelectError
                        ? isDark
                          ? 'bg-red-950/80 text-red-200 border-red-500 ring-2 ring-red-400 shadow-md animate-red-glow scale-[1.02]'
                          : 'bg-red-100 text-red-800 border-red-400 ring-2 ring-red-400 shadow-md animate-red-glow scale-[1.02]'
                        : isDark
                        ? 'bg-slate-800/80 text-sky-400 border-slate-700 hover:border-sky-500/40 hover:bg-slate-800'
                        : 'bg-slate-100 text-sky-700 border-slate-300 hover:border-sky-400 hover:bg-slate-200'
                    }`}
                    aria-label={`Select ${name2 || 'Team 2'}`}
                  >
                    <span className="truncate max-w-full text-xs font-black">{name2 || 'Team 2'}</span>
                    <span
                      className={`text-[9px] font-bold transition-colors ${
                        bidTeam === 2
                          ? 'text-sky-100'
                          : teamSelectError
                          ? 'text-red-500 underline'
                          : isDark
                          ? 'text-sky-500'
                          : 'text-sky-600'
                      }`}
                    >
                      {bidTeam === 2 ? 'Selected' : teamSelectError ? 'Tap to Select' : 'Select'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Box 2: Bid Level (7–10) with horizontal slider */}
              <div>
                <label className={`text-[11px] sm:text-xs font-black whitespace-nowrap overflow-hidden text-ellipsis h-4 flex items-center ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Bid Level (7–10)
                </label>
                <div className={`h-[62px] border rounded-lg px-2 py-1 shadow-inner flex flex-col justify-between mt-1 ${
                  isDark
                    ? 'bg-[#090e18] border-slate-700'
                    : 'bg-slate-100 border-slate-300'
                }`}>
                  <output id="bidSliderValue" className={`block text-center text-lg font-black leading-none ${
                    isDark
                      ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                      : 'text-amber-600'
                  }`}>
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
                    className={`w-full h-4 cursor-pointer touch-pan-y ${isDark ? 'luxury-slider' : 'simple-slider'}`}
                    aria-label="Bid level"
                  />
                  <div className={`flex justify-between px-0.5 text-[10px] font-black leading-none ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <span>7</span>
                    <span>8</span>
                    <span>9</span>
                    <span>10</span>
                  </div>
                </div>
              </div>

              {/* Box 3: Bidder Cards */}
              <div>
                <label className={`text-[11px] sm:text-xs font-black whitespace-nowrap overflow-hidden text-ellipsis h-4 flex items-center ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Bidder Cards
                </label>
                <div className="grid grid-cols-[34px_minmax(0,1fr)_34px] gap-1 items-stretch h-8 mt-1">
                  <button
                    type="button"
                    onClick={() => stepNumber(-1)}
                    className={`h-full font-black text-lg rounded-lg border flex items-center justify-center transition active:scale-95 leading-none shadow-xs ${
                      isDark
                        ? 'bg-slate-800 hover:bg-slate-700 text-sky-400 border-slate-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-sky-700 border-slate-300'
                    }`}
                    aria-label="Decrease bidding team cards"
                  >
                    −
                  </button>
                  <input
                    id="bidCards"
                    type="text"
                    value={bidCards}
                    readOnly
                    className={`h-full w-full text-center font-black text-sm border rounded-lg outline-hidden shadow-inner ${
                      isDark
                        ? 'bg-[#090e18] border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-800'
                    }`}
                    aria-label="Cards taken by bidding team"
                  />
                  <button
                    type="button"
                    onClick={() => stepNumber(1)}
                    className={`h-full font-black text-lg rounded-lg border flex items-center justify-center transition active:scale-95 leading-none shadow-xs ${
                      isDark
                        ? 'bg-slate-800 hover:bg-slate-700 text-sky-400 border-slate-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-sky-700 border-slate-300'
                    }`}
                    aria-label="Increase bidding team cards"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Box 4: Opponent Cards */}
              <div>
                <label className={`text-[11px] sm:text-xs font-black whitespace-nowrap overflow-hidden text-ellipsis h-4 flex items-center ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Opponent Cards
                </label>
                <div className="h-8 mt-1">
                  <input
                    id="oppCards"
                    type="text"
                    value={oppCards}
                    readOnly
                    className={`w-full h-full text-center font-black text-sm border rounded-lg outline-hidden shadow-inner ${
                      isDark
                        ? 'bg-[#090e18] border-slate-700 text-amber-400'
                        : 'bg-amber-50/50 border-slate-300 text-amber-700'
                    }`}
                    aria-label="Opponent cards calculated automatically"
                  />
                </div>
              </div>
            </div>

            {/* Calculate Button */}
            <button
              onClick={calculateRound}
              className={`w-full h-8 py-1 px-3 font-black text-xs rounded-lg transition-all active:scale-[0.98] uppercase tracking-wider ${
                isDark
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:brightness-110 text-slate-950 shadow-lg shadow-teal-500/20 border border-teal-300/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 border border-emerald-500'
              }`}
            >
              Calculate &amp; Add Round
            </button>

            {/* Status Message Container */}
            <div className="h-4 flex items-center justify-center overflow-hidden">
              {roundMessage && (
                <div
                  id="roundMessage"
                  role="status"
                  aria-live="polite"
                  className={`text-center font-extrabold text-[11px] px-2 py-0.5 rounded-md border truncate w-full shadow-2xs ${
                    teamSelectError
                      ? isDark
                        ? 'text-red-200 bg-red-950/80 border-red-500/60 ring-1 ring-red-500/40'
                        : 'text-red-800 bg-red-100 border-red-300'
                      : isDark
                      ? 'text-sky-200 bg-sky-950/80 border-sky-500/60'
                      : 'text-sky-800 bg-sky-100 border-sky-300'
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
              className={`w-12 h-8 flex items-center justify-center rounded-lg border shadow-xs transition active:scale-95 ${
                roundHistory.length === 0
                  ? isDark
                    ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                  : isDark
                  ? 'bg-slate-800/90 text-sky-400 border-slate-700 hover:border-sky-500/40 hover:bg-slate-700 shadow-sky-950/50'
                  : 'bg-white text-sky-700 border-slate-300 hover:bg-slate-50 hover:border-sky-400 shadow-slate-200'
              }`}
              aria-label="Undo 1 Round"
              title="Undo 1 Round"
            >
              <svg className="w-4 h-4 stroke-[2.3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 14 4 9l5-5M4 9h9a7 7 0 0 1 0 14h-2" />
              </svg>
            </button>

            <button
              onClick={handleRedo}
              disabled={roundRedoStack.length === 0}
              className={`w-12 h-8 flex items-center justify-center rounded-lg border shadow-xs transition active:scale-95 ${
                roundRedoStack.length === 0
                  ? isDark
                    ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                  : isDark
                  ? 'bg-slate-800/90 text-emerald-400 border-slate-700 hover:border-emerald-500/40 hover:bg-slate-700 shadow-emerald-950/50'
                  : 'bg-white text-emerald-700 border-slate-300 hover:bg-slate-50 hover:border-emerald-400 shadow-slate-200'
              }`}
              aria-label="Redo 1 Round"
              title="Redo 1 Round"
            >
              <svg className="w-4 h-4 stroke-[2.3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 14 5-5-5-5m5 5h-9a7 7 0 0 0 0 14h2" />
              </svg>
            </button>

            <button
              onClick={handleResetGame}
              className={`w-12 h-8 flex items-center justify-center rounded-lg border shadow-xs transition active:scale-95 ${
                isDark
                  ? 'bg-slate-800/90 text-rose-400 border-slate-700 hover:border-rose-500/50 hover:bg-slate-700 shadow-rose-950/50'
                  : 'bg-white text-rose-600 border-slate-300 hover:bg-rose-50 hover:border-rose-300 shadow-slate-200'
              }`}
              aria-label="Reset"
              title="Reset"
            >
              <svg className="w-4 h-4 stroke-[2.3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7v5h-5M4 17v-5h5" />
                <path d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <GameRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} isDark={isDark} />
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
        isDark={isDark}
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
        isDark={isDark}
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
