'use client'

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Wand2 } from "lucide-react";
import { usePromptSubmission } from '@/hooks/usePromptSubmission';

interface ChatInputProps {
  selectedChampion: 'trump' | 'xi' | 'info';
  onMessageSent?: () => void;
}

export function ChatInput({ selectedChampion, onMessageSent }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { submitPrompt, isLoading, isImproving, improveText } = usePromptSubmission();

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
    if (!input.trim() || isLoading || selectedChampion === 'info') return;

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
    <div className="border-t border-[#F3642E]/20 bg-black/50 p-4 pbes-12">
      <form onSubmit={handleSubmit} className="flex gap-3 max-w-3xl mx-auto">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder={
            selectedChampion === 'info' 
              ? 'Select your champion first...' 
              : `Submit a prompt for ${selectedChampion === 'trump' ? 'Donald Trump' : 'Xi Jinping'}...`
          }
          disabled={isLoading || selectedChampion === 'info'}
          className="flex-1 rounded-lg border border-[#F3642E]/20 bg-black/50 px-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#F3642E] focus:border-transparent transition-all"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleImproveText}
          disabled={!input.trim() || isImproving || isLoading || selectedChampion === 'info'}
          className="px-3 border-[#F3642E]/20 bg-black/50 hover:bg-[#F3642E]/10 hover:text-[#F3642E]"
        >
          <Wand2 className={`h-5 w-5 ${isImproving ? 'animate-spin' : ''}`} />
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitDisabled}
          className="bg-[#F3642E] hover:bg-[#F3642E]/90 text-white px-6"
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
    </div>
  );
}