'use client';

import { Button } from "@/components/ui/button"
import { PlayerAttributes } from "@/types/battle"
import { usePrivy } from "@privy-io/react-auth"
import { ThumbsUp } from "lucide-react"

interface Prompt {
  id: string
  content: string
  votes: number
}

interface VotePromptDialogProps {
  player: PlayerAttributes
  onVote: (promptId: string) => Promise<void>
}

export function VotePromptDialog({ player, onVote }: VotePromptDialogProps) {
  // Mock prompts - replace with real data from your API/contract
  const prompts: Prompt[] = [
    { id: '1', content: 'Make the AI more aggressive in its trading strategy', votes: 5 },
    { id: '2', content: 'Focus on defensive positions to protect assets', votes: 3 },
    { id: '3', content: 'Implement a hybrid approach balancing risk and reward', votes: 7 },
  ]

  const { authenticated } = usePrivy()

  const handleVote = async (promptId: string) => {
    if (!authenticated) {
      alert('Please connect your wallet to vote')
      return
    }
    await onVote(promptId)
  }

  return (
    <div className="flex flex-col h-[60vh] overflow-y-auto p-4 space-y-4">
      {prompts.map((prompt) => (
        <div
          key={prompt.id}
          className={`p-4 rounded-lg border-2 ${player.style.borderColor} bg-black/40 backdrop-blur-xl`}
        >
          <p className={`mb-4 ${player.style.textColor}`}>{prompt.content}</p>
          <div className="flex items-center justify-between">
            <span className={`${player.style.lightTextColor}`}>
              {prompt.votes} votes
            </span>
            <Button
              onClick={() => handleVote(prompt.id)}
              className={`${player.style.borderColor} ${player.style.textColor} hover:opacity-90 bg-black/40 backdrop-blur-xl border-2`}
              variant="outline"
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Vote
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
} 