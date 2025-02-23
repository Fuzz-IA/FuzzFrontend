import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
if (!process.env.NEXT_PUBLIC_SUPABASE_KEY) throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_KEY')

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

export interface PromptSubmission {
  wallet_address: string
  message: string
  short_description: string
  is_agent_a: boolean
  prompt_id: number
  votes_count?: number
  game_id?: number
}

export interface Prompt {
  id: number
  wallet_address: string
  message: string
  short_description: string
  is_agent_a: boolean
  created_at: string
  prompt_id: number
  game_id: number
  votes_count: number
}

export interface BetSubmission {
  wallet_address: string
  amount: number
  is_agent_a: boolean
}


export async function disableAllPrompts() {
  const { data, error } = await supabase
    .rpc('disable_all_prompts')
  
  if (error) throw error
  return true
}

export async function savePromptSubmission(data: Omit<PromptSubmission, 'game_id' | 'votes_count'>) {
  const currentGameId = await getCurrentGameId()
  const { error } = await supabase
    .from('prompt_submissions')
    .insert([{ 
      ...data, 
      votes_count: 0,
      game_id: currentGameId
    }])
  
  if (error) throw error
  return true
}

export async function incrementVoteCount(promptId: number) {
  const { data, error } = await supabase
    .rpc('increment_votes_count', { row_id: promptId })
  
  if (error) throw error
  return data
}

export async function getCurrentGameId(): Promise<number> {
  const { data, error } = await supabase
    .from('prompt_submissions')
    .select('game_id')
    .order('game_id', { ascending: false })
    .limit(1)
  
  if (error) throw error
  if (!data || data.length === 0) return 1 // Default to game 1 if no prompts exist
  
  return data[0].game_id
}

export async function getPrompts(isAgentA: boolean): Promise<Prompt[]> {
  const currentGameId = await getCurrentGameId()

  const { data, error } = await supabase
    .from('prompt_submissions')
    .select('*')
    .eq('is_agent_a', isAgentA)
    .eq('available', true)
    .eq('game_id', currentGameId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
} 

export async function saveBet(data: BetSubmission) {
  const currentGameId = await getCurrentGameId()
  const { error } = await supabase
    .from('bets')
    .insert([{ 
      ...data, 
      game_id: currentGameId,
      bet_time: new Date().toISOString()
    }])
  
  if (error) throw error
  return true
} 

export async function getLatestPrompt(isAgentA: boolean): Promise<Prompt | null> {
  const currentGameId = await getCurrentGameId();

  const { data, error } = await supabase
    .from('prompt_submissions')
    .select('*')
    .eq('is_agent_a', isAgentA)
    .eq('game_id', currentGameId)
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
} 