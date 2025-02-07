'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { generateBioLoreKnowledge } from "@/lib/openai";
import ReactMarkdown from "react-markdown";

interface ClickableAgentAvatarProps {
  agentId: string;
  avatar?: string | null;
  name: string;
  color?: string;
  initials?: string;
}

export function ClickableAgentAvatar({ agentId, avatar, name, color, initials }: ClickableAgentAvatarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [character, setCharacter] = useState<any>(null);
  const [profile, setProfile] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    try {
      setIsLoading(true);
      setIsOpen(true);
      
      // Solo cargar los datos si no se han cargado antes
      if (!character) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/agents/${agentId}`);
        const data = await response.json();
        setCharacter(data.character);
        
        // Generar el perfil usando OpenAI
        const generatedProfile = await generateBioLoreKnowledge(data.character);
        setProfile(generatedProfile);
      }
    } catch (error) {
      console.error('Error loading character profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Avatar clickeable */}
      <button
        onClick={handleClick}
        className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden ${!avatar ? color : ''} text-white flex items-center justify-center font-medium text-sm border-2 border-primary/20 transition-all hover:scale-105 hover:border-primary/40`}
      >
        {avatar ? (
          <img 
            src={avatar} 
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {/* Modal del perfil */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-2xl font-bold">Character Profile</DialogTitle>
          </DialogHeader>
          
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px] p-6">
              <div className="animate-pulse text-muted-foreground">Loading profile...</div>
            </div>
          ) : character ? (
            <div className="px-6">
              {/* Header */}
              <div className="flex items-start space-x-4 mb-6">
                <div className={`w-20 h-20 rounded-lg overflow-hidden ${!avatar ? color : ''} text-white flex items-center justify-center font-medium text-lg border-2 border-primary/20`}>
                  {avatar ? (
                    <img 
                      src={avatar} 
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{name}</h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {character.adjectives.slice(0, 5).map((adj: string, i: number) => (
                      <Badge key={i} variant="secondary">
                        {adj}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Contenido del perfil */}
              <ScrollArea className="h-[calc(90vh-16rem)] pr-4">
                <div className="space-y-6 pb-8">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{profile}</ReactMarkdown>
                  </div>

                  {/* Información adicional */}
                  <div className="mt-8 space-y-6">
                    <section>
                      <h3 className="text-lg font-semibold mb-3">Notable Quotes</h3>
                      <div className="space-y-4">
                        {character.messageExamples.slice(0, 3).map((example: any, i: number) => (
                          <blockquote key={i} className="border-l-4 border-primary pl-4 italic">
                            {example[1].content.text}
                          </blockquote>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-lg font-semibold mb-3">Areas of Focus</h3>
                      <div className="flex flex-wrap gap-2">
                        {character.topics.map((topic: string, i: number) => (
                          <Badge key={i} variant="outline">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </section>

                    <section className="mb-6">
                      <h3 className="text-lg font-semibold mb-3">Public Statements</h3>
                      <div className="space-y-4">
                        {character.postExamples.slice(0, 3).map((post: string, i: number) => (
                          <div key={i} className="bg-muted p-4 rounded-lg">
                            <p className="italic">{post}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="text-center text-muted-foreground p-6">
              Failed to load profile
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 