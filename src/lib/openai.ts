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


export async function textShortRespon(text: any): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: "Create a concise and engaging summary (maximum 60 words) that captures the key points and main message of the text. Focus on clarity and impact while maintaining the core meaning."
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

// Track rate limit state
const rateLimitState = {
  isRateLimited: false,
  retryAfter: 0,
  lastErrorTime: 0,
  consecutiveErrors: 0
};

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Process messages with rate limit handling and fallbacks
 */
export async function batchProcessMessages(messages: Array<{id: string, content: string}>): Promise<Array<{id: string, shortSummary: string}>> {
  // Filter out messages that might be too short to need summarization
  const messagesToProcess = messages.filter(msg => msg.content.length > 100);
  
  if (messagesToProcess.length === 0) {
    return messages.map(msg => ({ id: msg.id, shortSummary: msg.content }));
  }
  
  // Process in smaller batches to avoid token limits (max 3 messages per batch - reduced from 5)
  const results: Array<{id: string, shortSummary: string}> = [];
  const batchSize = 3; // Reduced batch size to lower token usage
  
  for (let i = 0; i < messagesToProcess.length; i += batchSize) {
    const batch = messagesToProcess.slice(i, i + batchSize);
    let retryCount = 0;
    let success = false;
    
    // If we've recently hit a rate limit, add some delay before trying
    if (rateLimitState.isRateLimited) {
      const currentTime = Date.now();
      const timeElapsed = currentTime - rateLimitState.lastErrorTime;
      
      if (timeElapsed < rateLimitState.retryAfter) {
        // Wait until we can retry
        const waitTime = Math.max(2000, rateLimitState.retryAfter - timeElapsed);
        console.log(`Rate limited, waiting ${waitTime}ms before next request...`);
        await sleep(waitTime);
      }
      
      // Reset rate limit state
      rateLimitState.isRateLimited = false;
    }
    
    while (retryCount < 3 && !success) { // Attempt up to 3 retries
      try {
        // Try different models based on rate limit status
        let model = "gpt-4-turbo-preview";
        
        // If we've had consecutive errors, fall back to GPT-3.5
        if (rateLimitState.consecutiveErrors >= 2) {
          model = "gpt-3.5-turbo"; // Fallback to GPT-3.5 which has higher rate limits
          console.log("Falling back to GPT-3.5 due to rate limits");
        }
        
        const response = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content: `You are an assistant that summarizes messages concisely. 
For each message, create a summary of 60-70 words, that is a short version of the message.
IMPORTANT: You must return a valid JSON object with this exact structure:
{
  "summaries": [
    {"id": "message_id_1", "shortSummary": "Concise summary of message 1"},
    {"id": "message_id_2", "shortSummary": "Concise summary of message 2"}
  ]
}
Include all message IDs exactly as provided. Do not modify the IDs.`
            },
            {
              role: "user",
              content: JSON.stringify(batch.map(msg => ({ id: msg.id, content: msg.content })))
            }
          ],
          temperature: 0.5,
          response_format: { type: "json_object" },
          max_tokens: 800,
        });
        
        // Reset consecutive errors on success
        rateLimitState.consecutiveErrors = 0;
        success = true;
        
        // Process response
        const content = response.choices[0]?.message?.content;
        
        if (!content) {
          console.warn("Empty response from OpenAI");
          // Fall back to simple summaries
          batch.forEach(msg => {
            const shortText = msg.content.length > 80 
              ? msg.content.substring(0, 80) + "..." 
              : msg.content;
            results.push({ id: msg.id, shortSummary: shortText });
          });
          continue;
        }
        
        try {
          const parsedResponse = JSON.parse(content);
          
          if (Array.isArray(parsedResponse?.summaries)) {
            // Valid response structure
            results.push(...parsedResponse.summaries);
          } else {
            // Response may be JSON but not in our expected format
            console.warn("OpenAI response doesn't contain expected 'summaries' array:", content);
            
            // Check if response is in a different format we can still use
            if (typeof parsedResponse === 'object') {
              // Try to extract summaries from whatever format we received
              Object.entries(parsedResponse).forEach(([key, value]) => {
                if (typeof value === 'object' && value !== null && 'id' in value && 'shortSummary' in value) {
                  results.push(value as {id: string, shortSummary: string});
                }
              });
            }
            
            // If we couldn't extract anything, fall back to simple summaries
            if (results.length === i) {
              batch.forEach(msg => {
                results.push({ 
                  id: msg.id, 
                  shortSummary: msg.content.substring(0, 80) + "..." 
                });
              });
            }
          }
        } catch (parseError) {
          console.error("Error parsing OpenAI JSON response:", parseError);
          console.debug("Raw response:", content);
          
          // Fall back to simple summaries
          batch.forEach(msg => {
            results.push({ 
              id: msg.id, 
              shortSummary: msg.content.length > 80 
                ? msg.content.substring(0, 80) + "..." 
                : msg.content 
            });
          });
        }
      } catch (apiError: any) { // Using any for proper error type access
        const isRateLimit = apiError?.status === 429;
        
        if (isRateLimit) {
          // Extract retry time if available
          const retryAfter = apiError?.headers?.get('retry-after');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : (2000 * (retryCount + 1));
          
          console.warn(`Rate limit reached. Retrying in ${waitTime}ms...`);
          
          // Update rate limit state
          rateLimitState.isRateLimited = true;
          rateLimitState.retryAfter = waitTime;
          rateLimitState.lastErrorTime = Date.now();
          rateLimitState.consecutiveErrors++;
          
          // Wait before retrying
          await sleep(waitTime);
          retryCount++;
        } else {
          console.error("OpenAI API error:", apiError);
          rateLimitState.consecutiveErrors++;
          
          // Fall back to simple summaries if API call fails and not a rate limit error
          batch.forEach(msg => {
            results.push({ 
              id: msg.id, 
              shortSummary: msg.content.length > 80 
                ? msg.content.substring(0, 80) + "..." 
                : msg.content 
            });
          });
          
          break; // Exit retry loop for non-rate-limit errors
        }
      }
    }
    
    // If we've made several attempts and still failed, use fallback
    if (!success) {
      console.warn("All retry attempts failed, using fallback summaries");
      batch.forEach(msg => {
        results.push({ 
          id: msg.id, 
          shortSummary: msg.content.length > 80 
            ? msg.content.substring(0, 80) + "..." 
            : msg.content 
        });
      });
    }
    
    // Add some delay between batches to avoid rate limits
    if (i + batchSize < messagesToProcess.length) {
      await sleep(1000); // 1 second delay between batches
    }
  }
  
  // Add any messages that were too short to need processing
  const processedIds = new Set(results.map(r => r.id));
  messages.forEach(msg => {
    if (!processedIds.has(msg.id)) {
      results.push({ id: msg.id, shortSummary: msg.content });
    }
  });
  
  return results;
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

/**
 * Generates a humorous summary from a conversation
 * Includes error handling and fallbacks to alternative models
 */
export async function generateHumorousSummary(conversationText: string, agent1Name: string, agent2Name: string): Promise<{
  summary: string;
  model: string;
  attempts: number;
  error?: string;
}> {
  const prompt = `
    You are a very funny and sharp comedy commentator.
    Your job is to summarize this conversation between ${agent1Name} and ${agent2Name}
    in a humorous, sarcastic and slightly provocative way.
    
    Here's the conversation:
    ${conversationText}
    
    Make a humorous 1-2 paragraph summary as if you were a comedy show host.
    Include:
    - Sarcastic comments about both participants
    - Jokes about their points of view 
    - Some exaggerated and funny comparisons
    - Sharp observations about their arguments
    - Use a casual and dynamic tone
    - Include some humorous interjections like "Damn!", "Fuck yeah!", etc.
    
    Avoid any truly offensive or vulgar language, but be bold and funny.
  `;

  let retryCount = 0;
  const maxRetries = 3;
  
  // First, we check if we're in a rate limit state
  if (rateLimitState.isRateLimited) {
    const currentTime = Date.now();
    const timeElapsed = currentTime - rateLimitState.lastErrorTime;
    
    if (timeElapsed < rateLimitState.retryAfter) {
      // Wait until we can retry
      const waitTime = Math.max(2000, rateLimitState.retryAfter - timeElapsed);
      console.log(`Rate limited, waiting ${waitTime}ms before summary generation...`);
      await sleep(waitTime);
    }
    
    // Reset state
    rateLimitState.isRateLimited = false;
  }
  
  // Try different models in order
  const models = ['gpt-4', 'gpt-3.5-turbo'];
  
  // If we've had consecutive errors, start with less demanding models
  const startIndex = Math.min(rateLimitState.consecutiveErrors, models.length - 1);
  
  for (let i = startIndex; i < models.length; i++) {
    try {
      console.log(`Attempting to generate humorous summary with model: ${models[i]}`);
      
      const response = await openai.chat.completions.create({
        model: models[i],
        messages: [
          {
            role: "system",
            content: "You are a very funny, witty and sarcastic comedy commentator. Your task is to summarize conversations in a humorous and provocative way, without being offensive."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 500,
      });
      
      // Success! Reset consecutive error counter
      rateLimitState.consecutiveErrors = 0;
      
      const summary = response.choices[0].message.content || 
        "Sorry, I couldn't generate a humorous summary for some reason.";
      
      return {
        summary,
        model: models[i],
        attempts: i + 1
      };
    } catch (error: any) {
      console.error(`Error with model ${models[i]}:`, error);
      
      const isRateLimit = error?.status === 429;
      if (isRateLimit) {
        // Update rate limit state
        // Correcting how to access headers
        let retryAfter = 5000; // Default value in ms
        
        // Try to extract the header in different possible ways
        if (error?.headers && typeof error.headers.get === 'function') {
          // If error.headers is a Headers-like object with get method
          const headerValue = error.headers.get('retry-after');
          if (headerValue) retryAfter = parseInt(headerValue) * 1000;
        } else if (error?.headers && typeof error.headers === 'object') {
          // If error.headers is a plain object
          const headerValue = error.headers['retry-after'];
          if (headerValue) retryAfter = parseInt(headerValue) * 1000;
        }
        
        rateLimitState.isRateLimited = true;
        rateLimitState.retryAfter = retryAfter;
        rateLimitState.lastErrorTime = Date.now();
        rateLimitState.consecutiveErrors++;
        
        // If it's not the last model, continue with the next one
        if (i < models.length - 1) {
          console.log(`Rate limit with ${models[i]}, trying ${models[i+1]}...`);
          continue;
        }
        
        // If it's the last model, wait and retry
        if (retryCount < maxRetries) {
          retryCount++;
          await sleep(retryAfter);
          i--; // Retry with the same model
          continue;
        }
      }
      
      // For other types of errors, increment counter and continue with the next model
      rateLimitState.consecutiveErrors++;
      
      // If we're on the last model and we've exhausted retries, return emergency response
      if (i === models.length - 1 || retryCount >= maxRetries) {
        const errorMessage = error?.message || "Unknown error";
        
        // Locally generated emergency response
        const emergencySummary = `
          Well, well, well! Looks like technology isn't on our side today.
          I've tried several models to summarize this fascinating conversation between ${agent1Name} and ${agent2Name},
          but it seems even AI wants to take a break.
          
          Instead of a deep analysis, allow me to offer this humble apology with a touch of humor.
          Sometimes, even the best comedians have tough nights. Try again in a few minutes!
        `;
        
        return {
          summary: emergencySummary,
          model: "emergency-fallback",
          attempts: i + 1,
          error: errorMessage
        };
      }
    }
  }
  
  // This shouldn't be reached, but TypeScript needs a return here
  return {
    summary: "Could not generate a summary. Please try again later.",
    model: "error-fallback",
    attempts: models.length,
    error: "Unexpected end of function"
  };
}

