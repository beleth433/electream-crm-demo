import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { SimulatedClient, DaySummaryStats } from '../types/simulation';
import { getRandomClient } from '../data/simulationScenarios';
import { toast } from 'sonner';

interface SimulationContextType {
  isActive: boolean;
  setIsActive: (active: boolean) => void;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
  speed: 1 | 2;
  setSpeed: (speed: 1 | 2) => void;
  currentDay: number;
  elapsedSeconds: number; // 0 to 900 (15 min)
  gameTimeFormatted: string; // e.g. "09:45"
  dayProgressPercent: number; // 0 to 100%
  queue: SimulatedClient[];
  activeWaitingCount: number;
  isQueueOpen: boolean;
  setIsQueueOpen: (open: boolean) => void;
  selectedClient: SimulatedClient | null;
  setSelectedClient: (client: SimulatedClient | null) => void;
  daySummary: DaySummaryStats | null;
  setDaySummary: (summary: DaySummaryStats | null) => void;
  // Controls
  togglePlayPause: () => void;
  resetCurrentDay: () => void;
  startNextDay: () => void;
  serveClient: (clientId: string) => void;
  rejectClient: (clientId: string) => void;
  spawnManualClient: () => void;
}

const TOTAL_DAY_SECONDS = 900; // 15 minutes = 900 seconds
const START_HOUR = 9; // 09:00
const END_HOUR = 21; // 21:00 (12 working hours)

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [currentDay, setCurrentDay] = useState<number>(1);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [queue, setQueue] = useState<SimulatedClient[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [selectedClient, setSelectedClient] = useState<SimulatedClient | null>(null);
  const [daySummary, setDaySummary] = useState<DaySummaryStats | null>(null);

  const nextSpawnTimeRef = useRef<number>(20); // first client in 20 seconds

  // Format game time: 09:00 to 21:00 spread over 900 seconds
  const calculateGameTime = (seconds: number) => {
    const fraction = Math.min(1, Math.max(0, seconds / TOTAL_DAY_SECONDS));
    const totalWorkingMinutes = (END_HOUR - START_HOUR) * 60; // 720 minutes
    const passedMinutes = Math.floor(fraction * totalWorkingMinutes);
    const hour = START_HOUR + Math.floor(passedMinutes / 60);
    const minute = passedMinutes % 60;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const gameTimeFormatted = calculateGameTime(elapsedSeconds);
  const dayProgressPercent = Math.min(100, (elapsedSeconds / TOTAL_DAY_SECONDS) * 100);

  // Active unhandled clients in queue
  const activeWaitingCount = queue.filter((c) => c.status === 'WAITING').length;

  // Main Simulation Timer Tick
  useEffect(() => {
    if (!isActive || !isRunning) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + speed;

        // Check if day completed (900 seconds = 15 minutes)
        if (next >= TOTAL_DAY_SECONDS) {
          setIsRunning(false);
          // Calculate summary stats
          const total = queue.length;
          const served = queue.filter((c) => c.status === 'SERVED').length;
          const rejected = queue.filter((c) => c.status === 'REJECTED' || c.status === 'WAITING').length;
          const rentals = queue.filter((c) => c.requestType === 'RENTAL' && c.status === 'SERVED').length;
          const purchases = queue.filter((c) => c.requestType === 'BUY' && c.status === 'SERVED').length;
          const repairs = queue.filter((c) => c.requestType === 'REPAIR' && c.status === 'SERVED').length;
          const batterySwaps = queue.filter((c) => c.requestType === 'BATTERY_SWAP' && c.status === 'SERVED').length;

          setDaySummary({
            dayNumber: currentDay,
            totalClients: total,
            servedCount: served,
            rejectedCount: rejected,
            rentalsCount: rentals,
            purchasesCount: purchases,
            repairsCount: repairs,
            batterySwapsCount: batterySwaps,
          });

          toast.success(`🎉 Рабочий день ${currentDay} завершен (15 минут)!`);
          return TOTAL_DAY_SECONDS;
        }

        // Check if client should arrive
        if (next >= nextSpawnTimeRef.current) {
          const currentTimeStr = calculateGameTime(next);
          const newClient = getRandomClient(currentTimeStr);
          setQueue((q) => [newClient, ...q]);

          // Pick next spawn time (in 45 to 80 seconds)
          nextSpawnTimeRef.current = next + Math.floor(45 + Math.random() * 35);

          toast.info(`👤 ${newClient.name} (${newClient.company}): "${newClient.title}"`, {
            description: 'Новый клиент пришел к стойке',
            action: {
              label: 'Посмотреть',
              onClick: () => {
                setSelectedClient(newClient);
                setIsQueueOpen(true);
              },
            },
            duration: 6000,
          });
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isRunning, speed, currentDay, queue]);

  const togglePlayPause = () => {
    if (!isActive) {
      setIsActive(true);
      setIsRunning(true);
      toast.success('▶️ Симуляция клиентов запущена (1 день = 15 минут)');
      // If queue is empty, spawn an introductory first client quickly
      if (queue.length === 0) {
        nextSpawnTimeRef.current = 5;
      }
    } else {
      setIsRunning((prev) => !prev);
    }
  };

  const resetCurrentDay = () => {
    setElapsedSeconds(0);
    setQueue([]);
    setSelectedClient(null);
    nextSpawnTimeRef.current = 15;
    toast.info(`День ${currentDay} перезапущен с 09:00`);
  };

  const startNextDay = () => {
    setCurrentDay((d) => d + 1);
    setElapsedSeconds(0);
    setQueue([]);
    setSelectedClient(null);
    setDaySummary(null);
    nextSpawnTimeRef.current = 15;
    setIsRunning(true);
    toast.success(`🌅 Начался День ${currentDay + 1}! Время 09:00`);
  };

  const serveClient = (clientId: string) => {
    setQueue((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, status: 'SERVED' } : c))
    );
    toast.success('Клиент успешно обслужен!');
  };

  const rejectClient = (clientId: string) => {
    setQueue((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, status: 'REJECTED' } : c))
    );
    toast.warning('Запрос клиента отклонен (нет в наличии)');
  };

  const spawnManualClient = () => {
    const newClient = getRandomClient(gameTimeFormatted);
    setQueue((q) => [newClient, ...q]);
    setSelectedClient(newClient);
    setIsQueueOpen(true);
    toast.info(`Новый посетитель у стойки: ${newClient.name}`);
  };

  return (
    <SimulationContext.Provider
      value={{
        isActive,
        setIsActive,
        isRunning,
        setIsRunning,
        speed,
        setSpeed,
        currentDay,
        elapsedSeconds,
        gameTimeFormatted,
        dayProgressPercent,
        queue,
        activeWaitingCount,
        isQueueOpen,
        setIsQueueOpen,
        selectedClient,
        setSelectedClient,
        daySummary,
        setDaySummary,
        togglePlayPause,
        resetCurrentDay,
        startNextDay,
        serveClient,
        rejectClient,
        spawnManualClient,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
