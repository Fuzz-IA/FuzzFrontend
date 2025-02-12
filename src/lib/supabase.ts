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
}

export interface Prompt {
  id: number
  wallet_address: string
  message: string
  short_description: string
  is_agent_a: boolean
  created_at: string
  prompt_id: number
  votes_count: number
}

export async function savePromptSubmission(data: PromptSubmission) {
  const { error } = await supabase
    .from('prompt_submissions')
    .insert([{ ...data, votes_count: 0 }])
  
  if (error) throw error
  return true
}

export async function incrementVoteCount(promptId: number) {
  const { data, error } = await supabase
    .rpc('increment_votes_count', { row_id: promptId })
  
  if (error) throw error
  return data
}

export async function getPrompts(isAgentA: boolean): Promise<Prompt[]> {
  const { data, error } = await supabase
    .from('prompt_submissions')
    .select('*')
    .eq('is_agent_a', isAgentA)
    .eq('available', true)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
} 