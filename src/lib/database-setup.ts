import { supabase } from './supabase';

/**
 * Verifies if a table exists in the database
 */
export async function tableExists(tableName: string): Promise<boolean> {
  try {
    // Check if the table exists by trying to select a single row
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    // If there's no error related to the table not existing, then the table exists
    if (!error || error.code !== '42P01') {
      console.log(`Table ${tableName} exists`);
      return true;
    }
    
    console.warn(`Table ${tableName} does not exist: ${error.message}`);
    return false;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

/**
 * Creates the message_summaries table if it doesn't exist
 */
export async function createMessageSummariesTable(): Promise<boolean> {
  // First check if the table already exists
  if (await tableExists('message_summaries')) {
    return true;
  }
  
  try {
    // Create the table using SQL
    const { error } = await supabase.rpc('create_message_summaries_table');
    
    if (error) {
      console.error('Failed to create message_summaries table:', error);
      return false;
    }
    
    console.log('Successfully created message_summaries table');
    return true;
  } catch (error) {
    console.error('Exception creating message_summaries table:', error);
    return false;
  }
}

/**
 * Initializes database tables and schema
 */
export async function initializeDatabase(): Promise<boolean> {
  try {
    // Check if tables exist and create them if needed
    const messageTableExists = await createMessageSummariesTable();
    
    return messageTableExists;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
} 