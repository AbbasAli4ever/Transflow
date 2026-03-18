"use client";

import React, { useEffect, useState } from "react";
import { HiOutlineClock } from "react-icons/hi2";

interface RateLimitBannerProps {
  onRetry?: () => void;
}

const COOLDOWN_SECONDS = 30;

export default function RateLimitBanner({ onRetry }: RateLimitBannerProps) {
  const [secondsLeft, setSecondsLeft] = useState(COOLDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const canRetry = secondsLeft <= 0;

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40">
        <HiOutlineClock className="w-7 h-7 text-amber-600 dark:text-amber-400" />
      </div>

      <div className="text-center">
        <h3 className="text-base font-semibold text-amber-800 dark:text-amber-300">
          Server is cooling down
        </h3>
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1 max-w-sm">
          Too many requests were sent in a short period. The server has
          temporarily paused new requests. Please wait a moment before trying
          again.
        </p>
      </div>

      {!canRetry ? (
        <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
          <span>Retry available in</span>
          <span className="tabular-nums font-bold">{secondsLeft}s</span>
        </div>
      ) : (
        <button
          onClick={onRetry}
          className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
