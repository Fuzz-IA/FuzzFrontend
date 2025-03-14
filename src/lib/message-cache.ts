import { supabase } from './supabase';
import { batchProcessMessages } from './openai';
import { tableExists } from './database-setup';

interface Message {
  id: string;
  content: string;
  text?: string;
  fromAgent: string;
  toAgent: string;
  createdAt: number;
  timestamp: number;
}

interface MessageWithSummary extends Message {
  shortSummary: string;
}

// Cache to avoid redundant API calls
const summaryCache = new Map<string, string>();

// Queue for messages waiting to be processed
const processingQueue: Array<Message> = [];
let isProcessingQueue = false;

// Cache stats for optimization
const cacheStats = {
  totalRequests: 0,
  cacheHits: 0,
  dbHits: 0,
  apiCalls: 0,
  lastRateLimitTime: 0,
  dbInsertSuccess: 0,
  dbInsertErrors: 0,
  queuedMessages: 0,
  processedFromQueue: 0
};

// Flag to track if the message_summaries table exists
let isTableVerified = false;

/**
 * Verify that the message_summaries table exists
 */
async function verifyMessageSummariesTable(): Promise<boolean> {
  if (isTableVerified) return true;
  
  isTableVerified = await tableExists('message_summaries');
  return isTableVerified;
}

/**
 * Store message summaries in database with proper error handling
 */
async function storeMessageSummaries(summaries: Array<{message_id: string, summary: string, created_at: string}>): Promise<boolean> {
  if (!await verifyMessageSummariesTable()) {
    return false;
  }
  
  if (summaries.length === 0) {
    return true;
  }
  
  try {
    // Insert into database with proper logging
    const { data, error } = await supabase
      .from('message_summaries')
      .upsert(summaries, { 
        onConflict: 'message_id',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error('Error storing message summaries:', error);
      cacheStats.dbInsertErrors++;
      return false;
    }
    
    cacheStats.dbInsertSuccess++;
    console.log(`Successfully stored ${summaries.length} message summaries.`);
    return true;
  } catch (error) {
    console.error('Exception storing message summaries:', error);
    cacheStats.dbInsertErrors++;
    return false;
  }
}

/**
 * Process the message queue in the background
 */
async function processQueue() {
  if (isProcessingQueue || processingQueue.length === 0) return;
  
  isProcessingQueue = true;
  console.log(`Starting background processing of ${processingQueue.length} queued messages`);
  
  try {
    // Process in small batches with delay between batches
    const batchSize = 3; // Process max 3 messages at a time
    
    while (processingQueue.length > 0) {
      // Take a batch from the queue
      const batch = processingQueue.splice(0, batchSize);
      cacheStats.queuedMessages = processingQueue.length;
      
      // Skip messages that are already in cache now (might have been processed by a direct request)
      const messagesToProcess = batch.filter(msg => !summaryCache.has(msg.id));
      
      if (messagesToProcess.length > 0) {
        console.log(`Processing ${messagesToProcess.length} messages from queue`);
        try {
          cacheStats.apiCalls++;
          
          // Process the messages with OpenAI
          const processedSummaries = await batchProcessMessages(
            messagesToProcess.map(msg => ({ 
              id: msg.id, 
              content: msg.text || msg.content || '' 
            }))
          );
          
          // Store in cache
          processedSummaries.forEach(item => {
            summaryCache.set(item.id, item.shortSummary);
          });
          
          cacheStats.processedFromQueue += messagesToProcess.length;
          
          // Store in database if verified
          if (isTableVerified) {
            const summariesToStore = processedSummaries.map(item => ({
              message_id: item.id,
              summary: item.shortSummary,
              created_at: new Date().toISOString()
            }));
            
            if (summariesToStore.length > 0) {
              storeMessageSummaries(summariesToStore).catch(error => {
                console.error('Failed to store queue summaries:', error);
              });
            }
          }
        } catch (error) {
          console.error('Error processing batch from queue:', error);
          
          // Put failed messages back in queue if it was a rate limit error
          const apiError = error as any;
          if (apiError?.status === 429) {
            // Wait before continuing
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Only requeue a max of 20 messages to avoid infinite queue
            if (processingQueue.length < 20) {
              processingQueue.push(...messagesToProcess);
              cacheStats.queuedMessages = processingQueue.length;
            }
          }
        }
      }
      
      // Add delay between batches to avoid rate limits
      if (processingQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  } finally {
    isProcessingQueue = false;
    console.log('Finished processing message queue');
  }
}

/**
 * Add messages to the processing queue
 */
function queueMessagesForProcessing(messages: Message[]) {
  // Only queue messages that are not already in cache
  const toQueue = messages.filter(msg => !summaryCache.has(msg.id));
  
  if (toQueue.length === 0) return;
  
  // Add to queue, prioritizing newer messages
  toQueue.sort((a, b) => b.createdAt - a.createdAt);
  
  // Limit queue size
  const maxQueueSize = 50;
  if (processingQueue.length + toQueue.length > maxQueueSize) {
    // Only add newest messages if queue would be too large
    const available = Math.max(0, maxQueueSize - processingQueue.length);
    processingQueue.push(...toQueue.slice(0, available));
  } else {
    processingQueue.push(...toQueue);
  }
  
  cacheStats.queuedMessages = processingQueue.length;
  
  // Start processing in background if not already running
  if (!isProcessingQueue) {
    setTimeout(() => processQueue(), 100);
  }
}

/**
 * Process messages and store summaries in Supabase
 */
export async function processChatMessages(messages: Message[]): Promise<MessageWithSummary[]> {
  try {
    cacheStats.totalRequests++;
    // First check if we already have summaries for these messages
    const messageIds = messages.map(msg => msg.id);
    
    // Check the cache first
    const cachedResults = new Map<string, string>();
    messageIds.forEach(id => {
      if (summaryCache.has(id)) {
        cachedResults.set(id, summaryCache.get(id) || '');
        cacheStats.cacheHits++;
      }
    });
    
    // Get the IDs of messages we still need to process
    const remainingIds = messageIds.filter(id => !cachedResults.has(id));
    
    if (remainingIds.length === 0) {
      // Return all messages with cached summaries
      return messages.map(msg => ({
        ...msg,
        shortSummary: cachedResults.get(msg.id) || msg.text || msg.content || ''
      }));
    }
    
    // If table is not yet verified, do it now
    await verifyMessageSummariesTable();
    
    try {
      // Check if we have summaries in the database
      if (isTableVerified) {
        const { data: storedSummaries, error } = await supabase
          .from('message_summaries')
          .select('message_id, summary')
          .in('message_id', remainingIds);
        
        if (!error && storedSummaries && storedSummaries.length > 0) {
          console.log(`Retrieved ${storedSummaries.length} summaries from database`);
          // Add database-stored summaries to both maps
          storedSummaries.forEach(item => {
            summaryCache.set(item.message_id, item.summary);
            cachedResults.set(item.message_id, item.summary);
            cacheStats.dbHits++;
          });
        }
      }
    } catch (dbError) {
      console.error('Error accessing Supabase:', dbError);
      // Continue processing without database summaries
    }
    
    // Get the messages we still need to process after checking the database
    const messagesToProcess = messages.filter(msg => 
      !cachedResults.has(msg.id)
    );
    
    // Strategy: Process a small batch immediately for responsive UI
    // and queue the rest for background processing
    const MAX_IMMEDIATE_PROCESSING = 5;
    
    if (messagesToProcess.length > 0) {
      // Split messages: some for immediate processing, the rest for queue
      const immediateMessages = messagesToProcess.slice(0, MAX_IMMEDIATE_PROCESSING);
      const queuedMessages = messagesToProcess.slice(MAX_IMMEDIATE_PROCESSING);
      
      // Queue the remaining messages for background processing
      if (queuedMessages.length > 0) {
        console.log(`Queueing ${queuedMessages.length} messages for background processing`);
        queueMessagesForProcessing(queuedMessages);
      }
      
      if (immediateMessages.length > 0) {
        try {
          cacheStats.apiCalls++;
          console.log(`Immediate processing of ${immediateMessages.length} messages`);
          
          // Process the immediate batch with OpenAI
          const processedSummaries = await batchProcessMessages(
            immediateMessages.map(msg => ({ 
              id: msg.id, 
              content: msg.text || msg.content || '' 
            }))
          );
          
          // Store new summaries in our maps
          processedSummaries.forEach(item => {
            summaryCache.set(item.id, item.shortSummary);
            cachedResults.set(item.id, item.shortSummary);
          });
          
          // Store in database if verified
          if (isTableVerified) {
            const summariesToStore = processedSummaries.map(item => ({
              message_id: item.id,
              summary: item.shortSummary,
              created_at: new Date().toISOString()
            }));
            
            if (summariesToStore.length > 0) {
              storeMessageSummaries(summariesToStore).catch(error => {
                console.error('Failed to store summaries:', error);
              });
            }
          }
        } catch (aiError: any) {
          console.error('Error processing messages with OpenAI:', aiError);
          
          // Check if it's a rate limit error
          if (aiError?.status === 429) {
            cacheStats.lastRateLimitTime = Date.now();
            
            // Add to queue if rate limited
            queueMessagesForProcessing(immediateMessages);
          }
          
          // Use fallback for messages that failed processing
          immediateMessages.forEach(msg => {
            const fallbackSummary = (msg.text || msg.content || '').length > 100
              ? (msg.text || msg.content || '').substring(0, 100) + '...'
              : (msg.text || msg.content || '');
            
            summaryCache.set(msg.id, fallbackSummary);
            cachedResults.set(msg.id, fallbackSummary);
          });
        }
      }
    }
    
    // For any messages we didn't process immediately, use placeholder summaries
    messagesToProcess.forEach(msg => {
      if (!cachedResults.has(msg.id)) {
        // Create a placeholder that indicates it's being processed
        const isQueued = processingQueue.some(qMsg => qMsg.id === msg.id);
        const fallbackSummary = isQueued 
          ? '⏳ Processing summary...' 
          : (msg.text || msg.content || '').length > 100
            ? (msg.text || msg.content || '').substring(0, 70) + '...'
            : (msg.text || msg.content || '');
        
        cachedResults.set(msg.id, fallbackSummary);
      }
    });
    
    // Return all messages with their summaries or placeholders
    return messages.map(msg => ({
      ...msg,
      shortSummary: cachedResults.get(msg.id) || msg.text || msg.content || ''
    }));
  } catch (generalError) {
    console.error('Unexpected error in processChatMessages:', generalError);
    // Return original messages without summaries as a last resort
    return messages.map(msg => ({
      ...msg,
      shortSummary: msg.text || msg.content || ''
    }));
  }
}

/**
 * Clear the in-memory cache
 */
export function clearSummaryCache() {
  summaryCache.clear();
  // Also clear the queue
  processingQueue.length = 0;
  cacheStats.queuedMessages = 0;
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  // Fix hit rate calculation
  // Hit rate should be a percentage of hits vs total lookups, not vs total requests
  const totalLookups = cacheStats.cacheHits + cacheStats.dbHits + cacheStats.apiCalls;
  const hitRate = totalLookups > 0 
    ? Math.round((cacheStats.cacheHits + cacheStats.dbHits) / totalLookups * 100)
    : 0;
    
  return {
    ...cacheStats,
    cacheSize: summaryCache.size,
    totalLookups,
    hitRate,
    isProcessingQueue,
    dbSuccessRate: cacheStats.dbInsertSuccess + cacheStats.dbInsertErrors > 0
      ? Math.round(cacheStats.dbInsertSuccess / (cacheStats.dbInsertSuccess + cacheStats.dbInsertErrors) * 100)
      : 0
  };
} 