import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import {
  Play,
  Pause,
  RotateCcw,
  Users,
  Clock,
  Sparkles,
  Zap,
  FastForward,
  ChevronDown,
  UserPlus,
} from 'lucide-react';

export const SimulationBar: React.FC = () => {
  const {
    isActive,
    setIsActive,
    isRunning,
    togglePlayPause,
    speed,
    setSpeed,
    currentDay,
    elapsedSeconds,
    gameTimeFormatted,
    dayProgressPercent,
    activeWaitingCount,
    isQueueOpen,
    setIsQueueOpen,
    resetCurrentDay,
    spawnManualClient,
  } = useSimulation();

  const realMinutes = Math.floor(elapsedSeconds / 60);
  const realSeconds = elapsedSeconds % 60;
  const realTimerStr = `${realMinutes.toString().padStart(2, '0')}:${realSeconds.toString().padStart(2, '0')}`;

  if (!isActive) {
    return (
      <div className="bg-gradient-to-r from-emerald-900/10 via-teal-900/10 to-sky-900/10 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-sky-950/40 border-b border-emerald-500/20 px-6 py-2 flex items-center justify-between text-xs transition-colors">
        <div className="flex items-center gap-2 text-slate-700 dark:text-emerald-300">
          <span className="p-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
            🎮
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Тест-драйв CRM: Симуляция живых клиентов
          </span>
          <span className="text-slate-500 dark:text-slate-400 hidden md:inline">
            • 1 игровой день за 15 реальных минут • Проверка аренды, магазина и СТО без лишних данных в базе
          </span>
        </div>

        <button
          onClick={togglePlayPause}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-sm shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-all text-xs"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          Запустить симуляцию (15 мин)
        </button>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white border-b border-emerald-500/30 px-6 py-2 text-xs shadow-md transition-all shrink-0">
      {/* Top micro progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 transition-all duration-1000 ease-linear shadow-xs shadow-emerald-400"
          style={{ width: `${dayProgressPercent}%` }}
        />
      </div>

      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Clock, Day & Progress */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg font-black text-xs">
            <span>ДЕНЬ {currentDay}</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-bold bg-black/40 px-2.5 py-1 rounded-lg border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-sm font-black">{gameTimeFormatted}</span>
            <span className="text-[10px] text-slate-400">(09:00 - 21:00)</span>
          </div>

          <div className="text-[11px] text-slate-300 hidden sm:flex items-center gap-1">
            <span className="text-slate-400">Таймер дня:</span>
            <span className="font-mono font-semibold text-slate-100">
              {realTimerStr}
            </span>
            <span className="text-slate-500">/ 15:00</span>
          </div>
        </div>

        {/* Center: Play/Pause/Speed Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={togglePlayPause}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold transition-all shadow-sm ${
              isRunning
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title={isRunning ? 'Поставить день на паузу' : 'Продолжить рабочий день'}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                Пауза
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Старт
              </>
            )}
          </button>

          <button
            onClick={() => setSpeed(speed === 1 ? 2 : 1)}
            className={`px-2 py-1.5 rounded-xl font-mono font-bold text-xs border transition-all ${
              speed === 2
                ? 'bg-sky-500/30 text-sky-300 border-sky-400/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Переключить скорость симуляции (1x = 15 мин, 2x = 7.5 мин)"
          >
            {speed}x
          </button>

          <button
            onClick={resetCurrentDay}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Сбросить текущий день на 09:00"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={spawnManualClient}
            className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition text-[11px]"
            title="Пригласить нового клиента к стойке прямо сейчас"
          >
            <UserPlus className="w-3 h-3 text-emerald-400" />
            + Клиент
          </button>
        </div>

        {/* Right: Client Queue Drawer Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQueueOpen(!isQueueOpen)}
            className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold transition-all text-xs ${
              activeWaitingCount > 0
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Очередь у стойки</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeWaitingCount > 0 ? 'bg-white text-emerald-800' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {activeWaitingCount}
            </span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('Остановить симуляцию и закрыть панель тест-драйва?')) {
                setIsActive(false);
              }
            }}
            className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded hover:bg-slate-800"
            title="Выключить режим симуляции"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};
