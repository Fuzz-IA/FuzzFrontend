'use client'

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Wand2 } from "lucide-react";
import { usePromptSubmission } from '@/hooks/usePromptSubmission';
import { CHAMPION1, CHAMPION2, CHAMPION1_NAME, CHAMPION2_NAME, AGENT_IDS } from '@/lib/constants';
import { ChampionType } from '@/types/battle';
import { getLatestPrompt } from '@/lib/supabase';
import { Prompt } from '@/lib/supabase';

interface ChatInputProps {
  selectedChampion: ChampionType;
  onMessageSent?: () => void;
  countdownActive?: boolean;
}

export function ChatInput({ selectedChampion, onMessageSent, countdownActive = false }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { submitPrompt, isLoading, isImproving, improveText } = usePromptSubmission();
  
  // Remove countdown functionality and always set battle as started
  const battleHasStarted = true;

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
    if (!input.trim() || isLoading || selectedChampion === 'info' || !battleHasStarted) return;

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
    isImproving;

  return (
    <div className="border-t border-[#F3642E]/20 bg-black/50 pt-2 px-2">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder={
              selectedChampion === 'info' 
                ? 'Select your champion first...' 
                : `Submit a prompt for ${selectedChampion === CHAMPION1 ? CHAMPION1_NAME : CHAMPION2_NAME}...`
            }
            disabled={isLoading || selectedChampion === 'info'}
            className="flex-1 rounded-lg border border-[#F3642E]/20 bg-black/50 px-4 py-2 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#F3642E] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleImproveText}
            disabled={!input.trim() || isImproving || isLoading || selectedChampion === 'info'}
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
          <div className="text-xs text-[#F3642E]/60 text-center mt-1">
            You are typing...
          </div>
        )}
      </div>
    </div>
  );
}