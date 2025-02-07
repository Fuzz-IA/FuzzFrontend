'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface CharacterProfileProps {
  name: string;
  bio: string[];
  adjectives: string[];
  lore: string[];
  topics: string[];
  style: {
    all: string[];
  };
  messageExamples: Array<Array<{
    user: string;
    content: {
      text: string;
    };
  }>>;
  knowledge: string[];
  postExamples: string[];
}

export function CharacterProfileCard({
  name,
  bio,
  adjectives,
  lore,
  topics,
  style,
  messageExamples,
  knowledge,
  postExamples,
}: CharacterProfileProps) {
  const formatName = (name: string) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <Card className="w-full max-w-4xl mx-auto bg-card">
      <CardHeader>
        <CardTitle className="text-3xl font-bold">{formatName(name)}</CardTitle>
        <CardDescription className="text-lg">AI Character Profile</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[800px] pr-4">
          <div className="space-y-6">
            {/* Core Identity */}
            <section>
              <h3 className="text-xl font-semibold mb-3">Core Identity</h3>
              <div className="space-y-2">
                {bio.slice(0, 3).map((trait, i) => (
                  <p key={i} className="text-muted-foreground">{trait}</p>
                ))}
              </div>
            </section>

            <Separator />

            {/* Key Characteristics */}
            <section>
              <h3 className="text-xl font-semibold mb-3">Key Characteristics</h3>
              <div className="flex flex-wrap gap-2">
                {adjectives.slice(0, 8).map((adj, i) => (
                  <Badge key={i} variant="secondary">{adj}</Badge>
                ))}
              </div>
            </section>

            <Separator />

            {/* Fundamental Beliefs */}
            <section>
              <h3 className="text-xl font-semibold mb-3">Fundamental Beliefs & Values</h3>
              <div className="space-y-2">
                {lore.slice(0, 5).map((belief, i) => (
                  <p key={i} className="text-muted-foreground">{belief}</p>
                ))}
              </div>
            </section>

            <Separator />

            {/* Areas of Expertise */}
            <section>
              <h3 className="text-xl font-semibold mb-3">Areas of Expertise</h3>
              <div className="flex flex-wrap gap-2">
                {topics.map((topic, i) => (
                  <Badge key={i} variant="outline">{topic}</Badge>
                ))}
              </div>
            </section>

            <Separator />

            {/* Communication Style */}
            <section>
              <h3 className="text-xl font-semibold mb-3">Communication Style</h3>
              <div className="space-y-2">
                {style.all.slice(0, 5).map((style, i) => (
                  <p key={i} className="text-muted-foreground">{style}</p>
                ))}
              </div>
            </section>

            <Separator />

            {/* Notable Quotes */}
            <section>
              <h3 className="text-xl font-semibold mb-3">Notable Quotes</h3>
              <div className="space-y-4">
                {messageExamples.slice(0, 3).map((example, i) => (
                  <blockquote key={i} className="border-l-4 border-primary pl-4 italic">
                    "{example[1].content.text}"
                  </blockquote>
                ))}
              </div>
            </section>

            <Separator />

            {/* Key Policies */}
            <section>
              <h3 className="text-xl font-semibold mb-3">Key Policy Positions & Priorities</h3>
              <div className="space-y-2">
                {knowledge.slice(0, 5).map((item, i) => (
                  <p key={i} className="text-muted-foreground">{item}</p>
                ))}
              </div>
            </section>

            <Separator />

            {/* Public Messages */}
            <section>
              <h3 className="text-xl font-semibold mb-3">Public Messaging Examples</h3>
              <div className="space-y-4">
                {postExamples.slice(0, 3).map((post, i) => (
                  <div key={i} className="bg-muted p-4 rounded-lg">
                    <p className="italic">{post}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 