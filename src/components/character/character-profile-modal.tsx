'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CharacterProfileCard } from "./character-profile-card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CharacterProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export function CharacterProfileModal({
  isOpen,
  onClose,
  character,
}: CharacterProfileModalProps) {
  const formatName = (name: string) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="space-y-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={`/agents/${character.name}.jpg`} alt={formatName(character.name)} />
              <AvatarFallback>{character.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-2xl font-bold">
                {formatName(character.name)}
              </DialogTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                {character.adjectives.slice(0, 5).map((adj, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {adj}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-10rem)] pr-4">
          <div className="space-y-6">
            {/* Core Identity */}
            <section>
              <h3 className="text-xl font-semibold mb-3">Core Identity</h3>
              <div className="space-y-2">
                {character.bio.slice(0, 5).map((trait, i) => (
                  <p key={i} className="text-muted-foreground">{trait}</p>
                ))}
              </div>
            </section>

            {/* Key Beliefs */}
            <section>
              <h3 className="text-xl font-semibold mb-3">Key Beliefs & Values</h3>
              <div className="space-y-2">
                {character.lore.slice(0, 5).map((belief, i) => (
                  <p key={i} className="text-muted-foreground">{belief}</p>
                ))}
              </div>
            </section>

            {/* Areas of Expertise */}
            <section>
              <h3 className="text-xl font-semibold mb-3">Areas of Expertise</h3>
              <div className="flex flex-wrap gap-2">
                {character.topics.map((topic, i) => (
                  <Badge key={i} variant="outline">{topic}</Badge>
                ))}
              </div>
            </section>

            {/* Communication Style */}
            <section>
              <h3 className="text-xl font-semibold mb-3">Communication Style</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">General Style</h4>
                  <div className="space-y-2">
                    {character.style.all.slice(0, 4).map((style, i) => (
                      <p key={i} className="text-sm text-muted-foreground">{style}</p>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Chat Style</h4>
                  <div className="space-y-2">
                    {character.style.chat.slice(0, 4).map((style, i) => (
                      <p key={i} className="text-sm text-muted-foreground">{style}</p>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Notable Quotes */}
            <section>
              <h3 className="text-xl font-semibold mb-3">Notable Quotes</h3>
              <div className="space-y-4">
                {character.messageExamples.slice(0, 3).map((example, i) => (
                  <blockquote key={i} className="border-l-4 border-primary pl-4 italic">
                    "{example[1].content.text}"
                  </blockquote>
                ))}
              </div>
            </section>

            {/* Knowledge & Expertise */}
            <section>
              <h3 className="text-xl font-semibold mb-3">Knowledge & Understanding</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {character.knowledge.slice(0, 6).map((item, i) => (
                  <div key={i} className="bg-muted p-3 rounded-lg">
                    <p className="text-sm">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Public Messages */}
            <section>
              <h3 className="text-xl font-semibold mb-3">Public Statements</h3>
              <div className="space-y-4">
                {character.postExamples.slice(0, 3).map((post, i) => (
                  <div key={i} className="bg-muted p-4 rounded-lg">
                    <p className="italic">{post}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 