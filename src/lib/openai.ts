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