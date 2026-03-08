import React, { useState, useEffect, useCallback } from 'react';

const PIN_KEY = 'attendance_app_pin';
const LOCK_ENABLED_KEY = 'attendance_app_lock_enabled';

export function getPinEnabled(): boolean {
  return localStorage.getItem(LOCK_ENABLED_KEY) === 'true';
}

export function getStoredPin(): string | null {
  return localStorage.getItem(PIN_KEY);
}

export function setStoredPin(pin: string) {
  localStorage.setItem(PIN_KEY, pin);
  localStorage.setItem(LOCK_ENABLED_KEY, 'true');
}

export function clearStoredPin() {
  localStorage.removeItem(PIN_KEY);
  localStorage.setItem(LOCK_ENABLED_KEY, 'false');
}

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleDigit = useCallback((digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      const stored = getStoredPin();
      if (newPin === stored) {
        setTimeout(() => onUnlock(), 150);
      } else {
        setShake(true);
        setError(true);
        setTimeout(() => {
          setPin('');
          setShake(false);
        }, 500);
      }
    }
  }, [pin, onUnlock]);

  const handleDelete = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  }, []);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background max-w-lg mx-auto px-8">
      <div className="mb-2">
        <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <p className="text-foreground font-semibold text-lg mb-1">잠금 해제</p>
      <p className="text-muted-foreground text-sm mb-8">비밀번호 4자리를 입력하세요</p>

      {/* PIN dots */}
      <div className={`flex gap-4 mb-8 ${shake ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-150 ${
              i < pin.length
                ? error ? 'bg-destructive scale-110' : 'bg-primary scale-110'
                : 'bg-muted border-2 border-border'
            }`}
          />
        ))}
      </div>

      {error && <p className="text-destructive text-xs font-medium mb-4">비밀번호가 틀렸습니다</p>}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
        {keys.map((key, i) => {
          if (key === '') return <div key={i} />;
          if (key === 'del') {
            return (
              <button
                key={i}
                onClick={handleDelete}
                className="aspect-square rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors active:scale-95"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.374-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
                </svg>
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => handleDigit(key)}
              className="aspect-square rounded-2xl flex items-center justify-center text-foreground text-2xl font-medium bg-card border border-border hover:bg-muted transition-colors active:scale-95 active:bg-primary/10"
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
