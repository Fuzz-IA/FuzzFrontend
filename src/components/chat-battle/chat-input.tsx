'use client'

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Wand2 } from "lucide-react";
import { usePromptSubmission } from '@/hooks/usePromptSubmission';

interface ChatInputProps {
  selectedChampion: 'trump' | 'xi' | 'info';
  onMessageSent?: () => void;
}

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  
  // Denver is UTC-7, so 7 AM MST = 14:00 UTC
  // February is 1 (zero-based month in JavaScript)
  const targetDate = new Date('2025-02-25T07:00:00-10:00');

  useEffect(() => {
    function updateCountdown() {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft('Battle has started!');
        setHasStarted(true);
        return;
      }

      setHasStarted(false);
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      // Add leading zeros for better readability
      const formattedHours = hours.toString().padStart(2, '0');
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const formattedSeconds = seconds.toString().padStart(2, '0');

      setTimeLeft(`${days}d ${formattedHours}h ${formattedMinutes}m ${formattedSeconds}s`);
    }

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    timeLeftText: !hasStarted && (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#F3642E]/20 via-[#F3642E]/10 to-[#F3642E]/20 animate-pulse"></div>
        <div className="relative bg-black/80 border-2 border-[#F3642E] rounded-lg p-6 mt-4">
          <div className="text-center">
            <div className="text-2xl font-minecraft text-[#F3642E] mb-2">
              🔥 COMING SOON 🔥
            </div>
            <div className="flex justify-center items-center gap-4 text-xl font-minecraft text-[#F3642E]">
              <div className="text-center">
                <div className="text-3xl">{timeLeft.split(' ')[0]}</div>
                <div className="text-sm text-white/60">DAYS</div>
              </div>
              <div className="text-2xl">:</div>
              <div className="text-center">
                <div className="text-3xl">{timeLeft.split(' ')[1]?.replace('h','')}</div>
                <div className="text-sm text-white/60">HOURS</div>
              </div>
              <div className="text-2xl">:</div>
              <div className="text-center">
                <div className="text-3xl">{timeLeft.split(' ')[2]?.replace('m','')}</div>
                <div className="text-sm text-white/60">MINUTES</div>
              </div>
              <div className="text-2xl">:</div>
              <div className="text-center">
                <div className="text-3xl">{timeLeft.split(' ')[3]?.replace('s','')}</div>
                <div className="text-sm text-white/60">SECONDS</div>
              </div>
            </div>
            <div className="text-sm text-white/80 mt-4">
              Launching February 25th, 2025 at 10:00 AM MST
            </div>
          </div>
        </div>
      </div>
    ),
    hasStarted: false
  };
}

export function ChatInput({ selectedChampion, onMessageSent }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { submitPrompt, isLoading, isImproving, improveText } = usePromptSubmission();
  const { timeLeftText, hasStarted } = CountdownTimer();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    handleTypingIndicator();
  };

  const handleTypingIndicator = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(true);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleImproveText = async () => {
    if (!input.trim() || isImproving) return;
    const improvedText = await improveText(input);
    setInput(improvedText);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || selectedChampion === 'info' || !hasStarted) return;

    try {
      await submitPrompt({
        message: input,
        selectedChampion
      });
      setInput('');
      onMessageSent?.();
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const isSubmitDisabled = 
    !input.trim() || 
    isLoading || 
    selectedChampion === 'info' ||
    isImproving ||
    !hasStarted;

  return (
    <div className="border-t border-[#F3642E]/20 bg-black/50 p-4 pbes-12">
      <form onSubmit={handleSubmit} className="flex gap-3 max-w-3xl mx-auto">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder={
            !hasStarted
              ? "Battle hasn't started yet..."
              : selectedChampion === 'info' 
                ? 'Select your champion first...' 
                : `Submit a prompt for ${selectedChampion === 'trump' ? 'Donald Trump' : 'Xi Jinping'}...`
          }
          disabled={isLoading || selectedChampion === 'info' || !hasStarted}
          className="flex-1 rounded-lg border border-[#F3642E]/20 bg-black/50 px-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#F3642E] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleImproveText}
          disabled={!input.trim() || isImproving || isLoading || selectedChampion === 'info' || !hasStarted}
          className="px-3 border-[#F3642E]/20 bg-black/50 hover:bg-[#F3642E]/10 hover:text-[#F3642E] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wand2 className={`h-5 w-5 ${isImproving ? 'animate-spin' : ''}`} />
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitDisabled}
          className="bg-[#F3642E] hover:bg-[#F3642E]/90 text-white px-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </div>
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </form>
      {isTyping && (
        <div className="text-sm text-[#F3642E]/60 text-center mt-2">
          You are typing...
        </div>
      )}
      {timeLeftText}
    </div>
  );
}