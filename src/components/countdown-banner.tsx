'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Clock, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  }, [targetDate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-gradient-to-r from-orange-600/90 to-red-600/90 rounded-lg shadow-md p-3 mb-4 relative"
    >
      {/* <Button 
        variant="ghost" 
        size="icon" 
        onClick={onClose}
        className="absolute right-1 top-1 text-white hover:bg-white/20 h-6 w-6 p-1"
      >
        <X className="h-4 w-4" />
      </Button> */}

      <div className="flex items-center justify-center gap-3">
        <div className="flex items-center gap-1">
          <div className="relative h-7 w-7 rounded-full overflow-hidden border border-white/50">
            <Image 
              src={AGENTS_INFO[AGENT_IDS.AGENT1_ID].avatar} 
              alt={CHAMPION1_NAME}
              fill
              className="object-cover"
            />
          </div>
          <span className="font-bold text-white text-xs">{CHAMPION1_NAME}</span>
        </div>

        <span className="text-white text-xs">vs</span>

        <div className="flex items-center gap-1">
          <span className="font-bold text-white text-xs">{CHAMPION2_NAME}</span>
          <div className="relative h-7 w-7 rounded-full overflow-hidden border border-white/50">
            <Image 
              src={AGENTS_INFO[AGENT_IDS.AGENT2_ID].avatar} 
              alt={CHAMPION2_NAME}
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>

      <div className="text-center mt-1">
        <p className="text-xs text-white font-medium flex items-center justify-center gap-1">
          {hasStarted ? (
            <>
              <Flame className="h-3 w-3" />
              The Battle Has Started!
            </>
          ) : (
            <>
              <Clock className="h-3 w-3" />
              Battle starts in:
            </>
          )}
        </p>
        
        {!hasStarted ? (
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="bg-black/20 px-1.5 py-0.5 rounded text-white text-xs font-mono">{timeLeft.split(':')[0]}</span>
            <span className="text-white text-xs">:</span>
            <span className="bg-black/20 px-1.5 py-0.5 rounded text-white text-xs font-mono">{timeLeft.split(':')[1]}</span>
            <span className="text-white text-xs">:</span>
            <span className="bg-black/20 px-1.5 py-0.5 rounded text-white text-xs font-mono">{timeLeft.split(':')[2]}</span>
          </div>
        ) : (
          <Button 
            variant="outline" 
            size="sm"
            className="mt-1 bg-white text-red-600 hover:bg-white/90 border-none text-xs py-0 h-6"
            onClick={onClose}
          >
            Join Now!
          </Button>
        )}
        
        {!hasStarted && (
          <p className="text-xs text-white/80 mt-0.5">
            Today at 11:00 AM EST          </p>
        )}
      </div>
    </motion.div>
  );
} 