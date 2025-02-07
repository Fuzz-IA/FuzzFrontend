import OpenAI from 'openai';

if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) throw new Error('Missing env.NEXT_PUBLIC_OPENAI_API_KEY');

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export async function improveText(text: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: "You are an AI assistant that improves text prompts to make them more engaging, clear, and impactful. Keep the same core meaning but enhance the writing."
      },
      {
        role: "user",
        content: text
      }
    ],
    temperature: 0.7,
  });

  return response.choices[0].message.content || text;
}

export async function generateShortDescription(text: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: "Create a very short (max 10 words) description of the main idea in the text."
      },
      {
        role: "user",
        content: text
      }
    ],
    temperature: 0.5,
    max_tokens: 30,
  });

  return response.choices[0].message.content || "No description available";
} 


export async function generateBioLoreKnowledge(characterData: any): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: `You are an expert at analyzing and explaining character profiles. Your task is to create a comprehensive and engaging explanation of this character based on their data. Focus on:

1. Core Identity & Purpose: What defines this character at their core? What drives them?
2. Personality & Communication Style: How do they express themselves? What makes their communication unique?
3. Key Beliefs & Values: What fundamental principles guide them?
4. Areas of Expertise: What are they knowledgeable about?
5. Unique Characteristics: What makes them stand out?

Format the response in a clear, engaging way that helps users understand the character's essence. Use specific examples from their bio, lore, and communication style to illustrate points.`
      },
      {
        role: "user",
        content: JSON.stringify({
          bio: characterData.bio,
          lore: characterData.lore,
          knowledge: characterData.knowledge,
          style: characterData.style,
          adjectives: characterData.adjectives,
          messageExamples: characterData.messageExamples,
          postExamples: characterData.postExamples,
          topics: characterData.topics
        })
      }
    ],
    temperature: 0.7,
    max_tokens: 1500
  });

  return response.choices[0].message.content || "No profile available";
}

