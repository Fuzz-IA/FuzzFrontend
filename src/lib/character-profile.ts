import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface CharacterVoice {
  model: string;
}

interface CharacterSettings {
  voice: CharacterVoice;
}

interface CharacterData {
  name: string;
  clients: string[];
  modelProvider: string;
  settings: CharacterSettings;
  plugins: string[];
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
  id: string;
  username: string;
}

export function generateCharacterProfile(character: CharacterData): string {
  const cn = (...inputs: ClassValue[]) => {
    return twMerge(clsx(inputs));
  };

  const formatList = (items: string[]): string => {
    return items.map(item => `• ${item}`).join("\n");
  };

  return `
# ${character.name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} - Character Profile

## Core Identity
${character.bio.slice(0, 3).map(trait => `- ${trait}`).join("\n")}

## Key Characteristics
${character.adjectives.slice(0, 8).map(adj => `- ${adj}`).join(" | ")}

## Fundamental Beliefs & Values
${character.lore.slice(0, 5).map(belief => `- ${belief}`).join("\n")}

## Areas of Expertise
${character.topics.map(topic => `- ${topic}`).join("\n")}

## Communication Style
${character.style.all.slice(0, 5).map(style => `- ${style}`).join("\n")}

## Notable Quotes
${character.messageExamples.slice(0, 3).map(example => 
  `> "${example[1].content.text}"`
).join("\n\n")}

## Key Policy Positions & Priorities
${character.knowledge.slice(0, 5).map(knowledge => `- ${knowledge}`).join("\n")}

## Public Messaging Examples
${character.postExamples.slice(0, 3).map(post => `> ${post}`).join("\n\n")}
`;
} 