'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { CHAMPION1_NAME, CHAMPION2_NAME, AGENTS_INFO, AGENT_IDS } from '@/lib/constants';
import Image from 'next/image';

interface CountdownBannerProps {
  onClose: () => void;
}

export function CountdownBanner({ onClose }: CountdownBannerProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  
  // 1pm local time
  const targetDate = new Date();
  targetDate.setHours(13, 0, 0, 0); // 1:00:00 PM
  targetDate.setMinutes(0);
  targetDate.setSeconds(0);
  targetDate.setMilliseconds(0);
  
  // Si la batalla ya ha comenzado, cerrar el banner inmediatamente
  useEffect(() => {
    const now = new Date();
    if (now >= targetDate) {
      setHasStarted(true);
      onClose(); // Cerrar el banner automáticamente
    }
  }, [onClose, targetDate]);
  
  // If it's already past 1pm today, set for tomorrow
  if (targetDate.getTime() < Date.now()) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  useEffect(() => {
    function updateCountdown() {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft('The battle has started!');
        setHasStarted(true);
        // Auto-close the banner when the battle starts
        onClose();
        return;
      }

      setHasStarted(false);
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      // Add leading zeros for better readability
      const formattedHours = hours.toString().padStart(2, '0');
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const formattedSeconds = seconds.toString().padStart(2, '0');

      setTimeLeft(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`);
    }

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-gradient-to-r from-orange-600/80 to-red-600/80 rounded-lg shadow-sm p-2 mb-3 relative"
    >
      <div className="flex items-center justify-center gap-2">
        <div className="flex items-center gap-1">
          <div className="relative h-5 w-5 rounded-full overflow-hidden border border-white/50">
            <Image 
              src={AGENTS_INFO[AGENT_IDS.AGENT1_ID].avatar} 
              alt={CHAMPION1_NAME}
              fill
              className="object-cover"
            />
          </div>
          <span className="text-white text-xs">{CHAMPION1_NAME}</span>
        </div>

        <span className="text-white text-xs">vs</span>

        <div className="flex items-center gap-1">
          <span className="text-white text-xs">{CHAMPION2_NAME}</span>
          <div className="relative h-5 w-5 rounded-full overflow-hidden border border-white/50">
            <Image 
              src={AGENTS_INFO[AGENT_IDS.AGENT2_ID].avatar} 
              alt={CHAMPION2_NAME}
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>

      <div className="text-center mt-1 flex items-center justify-center gap-1">
        <Clock className="h-3 w-3 text-white" />
        <span className="text-white text-xs">
          Battle starts at 1:00 PM ({timeLeft})
        </span>
      </div>
    </motion.div>
  );
} 