'use client';

import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { BattleSidebar } from '@/components/chat-battle/battle-sidebar';
import { ChatArea } from '@/components/chat-battle/chat-area';
import { BattleEndedPopup } from '@/components/chat-battle/battle-ended-popup';
import { ChampionType } from '@/types/battle';
import { CountdownBanner } from '@/components/countdown-banner';
import { AnimatePresence } from 'framer-motion';
import { ChatHeader } from '@/components/chat-battle/chat-header';

export default function ChatBattlePage() {
  const [selectedChampion, setSelectedChampion] = useState<ChampionType>('info');
  const [showEndPopup, setShowEndPopup] = useState(true);
  const [showCountdown, setShowCountdown] = useState(true);

  // Verificar si la batalla ya ha comenzado
  useEffect(() => {
    const now = new Date();
    const targetDate = new Date();
    targetDate.setHours(13, 0, 0, 0); // 1:00:00 PM
    
    if (now >= targetDate) {
      setShowCountdown(false); // Ocultar el banner si la batalla ya ha comenzado
    }
  }, []);

  // Function to handle when the countdown ends
  const handleCountdownEnd = () => {
    setShowCountdown(false);
  };

  return (
    <div className="flex h-[calc(100vh-72px)] bg-background">
      {showEndPopup && (
        <BattleEndedPopup onClose={() => setShowEndPopup(false)} />
      )}
      
      <SidebarProvider defaultOpen>
        <BattleSidebar 
          selectedChampion={selectedChampion} 
          onChampionSelect={setSelectedChampion} 
        />
        <div className="flex flex-col flex-1">
          <ChatHeader />
          <div className="flex-1 overflow-hidden flex flex-col mx-4 ml-20 my-6 mt-4">
            <div className="rounded-lg border bg-background shadow-md border-[#F3642E] h-[calc(100vh-4rem)] flex flex-col">
              {/* Countdown banner inside chat area */}
              {/* <div className="px-3 pt-3">
                <AnimatePresence>
                  {showCountdown && (
                    <CountdownBanner onClose={handleCountdownEnd} />
                  )}
                </AnimatePresence>
              </div> */}
              
              <div className="flex-1 pt-6">
                <ChatArea 
                  selectedChampion={selectedChampion} 
                  showHeader={false} 
                  countdownActive={showCountdown}
                />
              </div>
            </div>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}