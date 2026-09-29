"use client";

import React, { useState, useEffect } from "react";
import { Fugitive } from "@/lib/types";
import confetti from "canvas-confetti";
import { Trophy, Flame, RefreshCw, ArrowUp, ArrowDown, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";

interface BountyGameProps {
  fugitives: Fugitive[];
}

export default function BountyGame({ fugitives }: BountyGameProps) {
  // Filter fugitives who have positive bounty amounts for a fun game
  const bountyPool = React.useMemo(() => {
    return fugitives.filter((f) => f.reward_amount > 0);
  }, [fugitives]);

  const [currentFugitive, setCurrentFugitive] = useState<Fugitive | null>(null);
  const [nextFugitive, setNextFugitive] = useState<Fugitive | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Load high score from local storage
  useEffect(() => {
    const saved = localStorage.getItem("fbi_bounty_high_score");
    if (saved) {
      setBestStreak(parseInt(saved, 10));
    }
  }, []);

  // Pick a random fugitive distinct from a given one
  const getRandomFugitive = (excludeId?: string): Fugitive => {
    if (bountyPool.length === 0) return fugitives[0];
    const available = excludeId ? bountyPool.filter((f) => f.uid !== excludeId) : bountyPool;
    return available[Math.floor(Math.random() * available.length)];
  };

  // Start / restart game
  const initializeGame = () => {
    if (bountyPool.length < 2) return;
    const first = getRandomFugitive();
    let second = getRandomFugitive(first.uid);

    // Try to ensure they don't have identical amounts for an exciting first match
    let attempts = 0;
    while (second.reward_amount === first.reward_amount && attempts < 10) {
      second = getRandomFugitive(first.uid);
      attempts++;
    }

    setCurrentFugitive(first);
    setNextFugitive(second);
    setRevealed(false);
    setIsCorrect(null);
    setGameOver(false);
    setStreak(0);
  };

  useEffect(() => {
    if (bountyPool.length >= 2 && !currentFugitive) {
      initializeGame();
    }
  }, [bountyPool]);

  const handleGuess = (guess: "higher" | "lower") => {
    if (!currentFugitive || !nextFugitive || revealed) return;

    setRevealed(true);
    const correct =
      guess === "higher"
        ? nextFugitive.reward_amount >= currentFugitive.reward_amount
        : nextFugitive.reward_amount <= currentFugitive.reward_amount;

    setIsCorrect(correct);

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
        localStorage.setItem("fbi_bounty_high_score", newStreak.toString());
      }

      // Fire victory confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#10b981", "#fbbf24", "#3b82f6"],
      });

      // Move to next match after 1.8 seconds
      setTimeout(() => {
        setCurrentFugitive(nextFugitive);
        setNextFugitive(getRandomFugitive(nextFugitive.uid));
        setRevealed(false);
        setIsCorrect(null);
      }, 1800);
    } else {
      setGameOver(true);
    }
  };

  if (!currentFugitive || !nextFugitive) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center font-mono">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
        <p className="text-neutral-400">Loading FBI Most Wanted Bounty Pool...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center font-mono">
      {/* Game Scoreboard Header */}
      <div className="w-full flex items-center justify-between bg-neutral-900/80 border border-neutral-800 p-4 rounded-2xl mb-8 backdrop-blur shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest block">
              High Score
            </span>
            <span className="text-xl font-bold text-amber-400">{bestStreak}</span>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-sm font-bold text-neutral-200 uppercase tracking-widest flex items-center gap-2 justify-center">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            Higher or Lower: Bounty Edition
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Does the suspect on the right have a HIGHER or LOWER FBI reward?
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <Flame className="w-5 h-5" />
          </div>
          <div className="text-right">
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest block">
              Current Streak
            </span>
            <span className="text-xl font-bold text-white">{streak}</span>
          </div>
        </div>
      </div>

      {/* Versus Cards Container */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        {/* VS Central Badge */}
        <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-neutral-900 border-2 border-neutral-700 items-center justify-center text-xs font-black text-amber-400 shadow-2xl">
          VS
        </div>

        {/* LEFT FUGITIVE (Known Bounty) */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xl">
          <div className="relative aspect-[4/3] bg-neutral-950">
            <img
              src={currentFugitive.images[0]?.large || currentFugitive.images[0]?.thumb}
              alt={currentFugitive.title}
              className="w-full h-full object-cover object-top"
            />
            {currentFugitive.warning_message && (
              <div className="absolute top-3 left-3 right-3 bg-red-600/90 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider text-center">
                {currentFugitive.warning_message}
              </div>
            )}
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                {currentFugitive.poster_classification === "ten"
                  ? "Ten Most Wanted"
                  : currentFugitive.subjects[0] || "Wanted Fugitive"}
              </span>
              <h3 className="text-xl font-bold text-white mt-2 line-clamp-1">
                {currentFugitive.title}
              </h3>
              <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                {currentFugitive.description || "Wanted by the Federal Bureau of Investigation"}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800">
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest block">
                FBI Reward Bounty
              </span>
              <div className="text-3xl font-black text-amber-400 mt-1">
                {currentFugitive.reward_formatted}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT FUGITIVE (The Challenge) */}
        <div
          className={`bg-neutral-900/90 border rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xl transition-all ${
            revealed
              ? isCorrect
                ? "border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.3)]"
                : "border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.3)]"
              : "border-neutral-800 hover:border-neutral-700"
          }`}
        >
          <div className="relative aspect-[4/3] bg-neutral-950">
            <img
              src={nextFugitive.images[0]?.large || nextFugitive.images[0]?.thumb}
              alt={nextFugitive.title}
              className="w-full h-full object-cover object-top"
            />
            {nextFugitive.warning_message && (
              <div className="absolute top-3 left-3 right-3 bg-red-600/90 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider text-center">
                {nextFugitive.warning_message}
              </div>
            )}
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                {nextFugitive.poster_classification === "ten"
                  ? "Ten Most Wanted"
                  : nextFugitive.subjects[0] || "Wanted Fugitive"}
              </span>
              <h3 className="text-xl font-bold text-white mt-2 line-clamp-1">
                {nextFugitive.title}
              </h3>
              <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                {nextFugitive.description || "Wanted by the Federal Bureau of Investigation"}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800">
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest block">
                FBI Reward Bounty
              </span>

              {revealed ? (
                <div className="flex items-center justify-between mt-1">
                  <div
                    className={`text-3xl font-black ${
                      isCorrect ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {nextFugitive.reward_formatted}
                  </div>
                  {isCorrect ? (
                    <div className="flex items-center gap-1 text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-4 h-4" /> Correct
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-400 font-bold text-sm bg-red-500/10 px-2.5 py-1 rounded-lg">
                      <XCircle className="w-4 h-4" /> Busted!
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <button
                    onClick={() => handleGuess("higher")}
                    className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg"
                  >
                    <ArrowUp className="w-5 h-5" /> HIGHER
                  </button>
                  <button
                    onClick={() => handleGuess("lower")}
                    className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg"
                  >
                    <ArrowDown className="w-5 h-5" /> LOWER
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Game Over Modal / Card */}
      {gameOver && (
        <div className="mt-8 bg-neutral-900 border border-red-500/60 p-6 rounded-2xl text-center max-w-md w-full shadow-2xl animate-in fade-in duration-300">
          <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-3">
            <XCircle className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-white uppercase tracking-wider">
            Investigation Closed!
          </h3>
          <p className="text-sm text-neutral-400 mt-2">
            You achieved an investigation streak of{" "}
            <span className="text-amber-400 font-bold">{streak}</span> fugitives!
          </p>
          <button
            onClick={initializeGame}
            className="mt-5 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-amber-600 hover:opacity-90 active:scale-95 text-white font-bold py-3 px-6 rounded-xl transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Play Again
          </button>
        </div>
      )}
    </div>
  );
}
