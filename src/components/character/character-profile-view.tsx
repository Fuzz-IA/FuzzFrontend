'use client';

import { useEffect, useState } from 'react';
import { generateBioLoreKnowledge } from '@/lib/openai';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';

interface CharacterProfileViewProps {
  characterId: string;
}

export function CharacterProfileView({ characterId }: CharacterProfileViewProps) {
  const [character, setCharacter] = useState<any>(null);
  const [profile, setProfile] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const response = await fetch(`https://c99689e91cc8.ngrok.app/agents/${characterId}`);
        const data = await response.json();
        setCharacter(data.character);
        
        // Generate the profile using OpenAI
        const generatedProfile = await generateBioLoreKnowledge(data.character);
        setProfile(generatedProfile);
      } catch (error) {
        console.error('Error fetching character data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [characterId]);

  if (isLoading || !character) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  const formatName = (name: string) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start space-x-4 mb-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={`/agents/${character.name}.jpg`} alt={formatName(character.name)} />
            <AvatarFallback>{character.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">{formatName(character.name)}</h2>
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

        {/* Generated Profile */}
        <ScrollArea className="h-[600px] pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{profile}</ReactMarkdown>
          </div>

          {/* Additional Context */}
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

            <section>
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
        </ScrollArea>
      </div>
    </Card>
  );
} 