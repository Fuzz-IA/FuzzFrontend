'use client';

import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { BattleSidebar } from '@/components/chat-battle/battle-sidebar';
import { ChatArea } from '@/components/chat-battle/chat-area';
import { ThemeToggle } from '@/components/theme-toggle';

export default function ChatBattlePage() {
  const [selectedChain, setSelectedChain] = useState<'solana' | 'base' | 'info'>('info');

  return (
    <div className="flex h-[calc(100vh-72px)] bg-background">
      <SidebarProvider defaultOpen>
        <BattleSidebar 
          selectedChain={selectedChain} 
          onChainSelect={setSelectedChain} 
        />
        <div className="flex flex-col flex-1">
      
          <ChatArea selectedChain={selectedChain} />
        </div>
      </SidebarProvider>
    </div>
  );
}
