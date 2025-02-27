'use client';

import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { BattleSidebar } from '@/components/chat-battle/battle-sidebar';
import { ChatArea } from '@/components/chat-battle/chat-area';
import { BattleEndedPopup } from '@/components/chat-battle/battle-ended-popup';

export default function ChatBattlePage() {
  const [selectedChampion, setSelectedChampion] = useState<'trump' | 'xi' | 'info'>('info');
  const [showEndPopup, setShowEndPopup] = useState(true);

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
          <ChatArea selectedChampion={selectedChampion} />
        </div>
      </SidebarProvider>
    </div>
  );
}