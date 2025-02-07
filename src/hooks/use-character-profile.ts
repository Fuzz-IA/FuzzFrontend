'use client';

import { useState } from 'react';

interface CharacterData {
  id: string;
  character: {
    name: string;
    bio: string[];
    lore: string[];
    knowledge: string[];
    messageExamples: Array<Array<{
      user: string;
      content: {
        text: string;
      };
    }>>;
    postExamples: string[];
    topics: string[];
    style: {
      all: string[];
      chat: string[];
      post: string[];
    };
    adjectives: string[];
  };
}

export function useCharacterProfile() {
  const [isOpen, setIsOpen] = useState(false);
  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCharacter = async (characterId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`https://c99689e91cc8.ngrok.app/agents/${characterId}`);
      if (!response.ok) throw new Error('Failed to fetch character');
      const data = await response.json();
      setCharacter(data);
      setIsOpen(true);
    } catch (error) {
      console.error('Error fetching character:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onClose = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    onClose,
    character: character?.character,
    isLoading,
    fetchCharacter,
  };
} 