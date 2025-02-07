'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CharacterProfileModal } from "./character-profile-modal";
import { useCharacterProfile } from "@/hooks/use-character-profile";
import { Button } from "@/components/ui/button";

interface CharacterAvatarProps {
  characterId: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16'
};

export function CharacterAvatar({
  characterId,
  name,
  size = 'md',
  showName = false
}: CharacterAvatarProps) {
  const { isOpen, onClose, character, isLoading, fetchCharacter } = useCharacterProfile();

  const formatName = (name: string) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleClick = () => {
    fetchCharacter(characterId);
  };

  return (
    <>
      <Button
        variant="ghost"
        className="p-0 hover:bg-transparent"
        onClick={handleClick}
        disabled={isLoading}
      >
        <div className="flex items-center space-x-2">
          <Avatar className={sizeClasses[size]}>
            <AvatarImage src={`/agents/${name}.jpg`} alt={formatName(name)} />
            <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          {showName && (
            <span className="text-sm font-medium">{formatName(name)}</span>
          )}
        </div>
      </Button>

      {character && (
        <CharacterProfileModal
          isOpen={isOpen}
          onClose={onClose}
          character={character}
        />
      )}
    </>
  );
} 