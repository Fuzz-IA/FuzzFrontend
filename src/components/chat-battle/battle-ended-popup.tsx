import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, X, ExternalLink, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import {BattleEndedPopupProps} from '@/types/battle';
export function BattleEndedPopup({ onClose }: BattleEndedPopupProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const winnerName = 'Donald Trump';
  const winnerImage = '/trumpProfile.svg';
  
  const transactionLink = "https://basescan.org/tx/0x9d2d21a3e6b551ed698fa2a6861e3188f3cf2c5664e0d881bdad1d091832983f";

  const openTransaction = () => {
    window.open(transactionLink, '_blank');
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <Card className="relative w-[90%] max-w-[480px] bg-black border-2 border-[#F3642E] p-8 shadow-xl">
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
        
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-minecraft text-white">GAME OVER</h2>
          
          <div className="pt-2 pb-6">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                  <Trophy className="h-12 w-12 text-yellow-500" />
                </div>
                <div className="h-24 w-24 rounded-full border-4 border-[#F3642E] overflow-hidden bg-gradient-to-b from-[#F3642E]/20 to-black p-1">
                  <Image 
                    src={winnerImage} 
                    alt={winnerName}
                    width={96}
                    height={96}
                    className="rounded-full object-cover aspect-square"
                  />
                </div>
              </div>
            </div>
            
            <h3 className="font-minecraft text-xl text-[#F3642E] mb-2">
              {winnerName} Wins!
            </h3>
            
            <p className="text-sm text-white/70 max-w-[360px] mx-auto mt-4">
              The battle has ended! All bets have been settled and the prize pool has been distributed to the supporters of {winnerName}.
            </p>
          </div>
          
          <div className="flex flex-col space-y-3">
            <Button 
              onClick={openTransaction}
              className="bg-black hover:bg-black/90 text-[#F3642E] border border-[#F3642E] font-minecraft px-8 py-6 h-auto flex items-center justify-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View Transaction
            </Button>
            
            <Button 
              onClick={handleClose}
              className="bg-[#F3642E] hover:bg-[#F3642E]/90 text-white font-minecraft px-8 py-6 h-auto flex items-center justify-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Go to the Conversation
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}