import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Clock, Home, Play, Pause } from 'lucide-react';
import Animated3DLogo from '../../components/common/Animated3DLogo';

export const PublicNotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  // 15-second countdown timer for auto-redirecting to /
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, navigate]);

  const progressPercent = ((15 - secondsLeft) / 15) * 100;

  const handleImmediateRedirect = () => {
    navigate('/');
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8 text-center animate-fadeIn bg-gradient-to-b from-emerald-50/60 via-white to-amber-50/40 text-gray-800">
      <div className="max-w-md w-full mx-auto flex flex-col items-center space-y-5">
        
        {/* 1. Light Theme 3D Animated Logo */}
        <Animated3DLogo mode="public" size="md" />

        {/* 2. 404 NOT FOUND Badge & Clean Friendly Message */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black uppercase tracking-wider font-mono shadow-2xs">
            <AlertCircle className="w-3.5 h-3.5 text-emerald-700" />
            <span>404 NOT FOUND</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
            Page Not Found
          </h1>

          <p className="text-sm sm:text-base font-semibold text-gray-700">
            Please check the URL or try another URL.
          </p>

          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            The page you are looking for does not exist or may have been moved.
          </p>
        </div>

        {/* 3. 15-Second Auto-Redirect Timer Card */}
        <div className="w-full max-w-sm bg-white border-2 border-emerald-200/90 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping shrink-0" />
              <span className="font-extrabold text-gray-700 uppercase tracking-wider text-[11px] font-mono">
                {isPaused ? 'Redirect Paused' : 'Redirecting in'}
              </span>
            </div>

            <div className="flex items-center gap-1 font-mono font-black text-xs text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>{secondsLeft}s</span>
            </div>
          </div>

          {/* Smooth Progress Bar */}
          <div className="space-y-1">
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200 p-0.5">
              <div
                style={{ width: `${progressPercent}%` }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-1000 ease-linear shadow-xs"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium">
              <span>Redirect destination: <strong className="text-emerald-900">Storefront (/)</strong></span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pause</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleImmediateRedirect}
              className="px-4 py-2 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Go to Home</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PublicNotFoundPage;
