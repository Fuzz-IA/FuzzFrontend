'use client';

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, MonitorPlay, MessageSquarePlus, Vote } from "lucide-react"
import { Header } from "@/components/layout/header"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { ProposePromptDialog } from "@/components/battle/propose-prompt-dialog"
import { VotePromptDialog } from "@/components/battle/vote-prompt-dialog"
import { PlayerAttributes, BattleData } from "@/types/battle"
import { CountdownTimer } from "@/components/battle/countdown-timer"
import { ethers } from 'ethers'
import { BATTLE_ADDRESS, BATTLE_ABI } from '@/lib/contracts/battle-abi'

// Mock data - this would come from your API
const battleData: BattleData = {
  playerOne: {
    tokenCA: "Coming Soon",
    walletAddress: "Coming Soon",
    healthPoints: 100,
    traits: ["INCLUSIVE", "PROGRESSIVE", "EMPATHETIC"],
    status: "READY",
    style: {
      borderColor: "border-blue-500/20",
      textColor: "text-blue-400",
      lightTextColor: "text-blue-200",
      gradientFrom: "from-blue-500/10",
    }
  },
  playerTwo: {
    tokenCA: "Coming Soon",
    walletAddress: "Coming Soon",
    healthPoints: 100,
    traits: ["CONSERVATIVE", "TRADITIONAL", "PRINCIPLED"],
    status: "READY",
    style: {
      borderColor: "border-red-500/20",
      textColor: "text-red-400",
      lightTextColor: "text-red-200",
      gradientFrom: "from-red-500/10",
    }
  }
}

type DialogContent = 'propose' | 'vote' | 'support' | null;

function AgentTotals({ isAgentA, player }: { isAgentA: boolean, player: PlayerAttributes }) {
  const [total, setTotal] = useState<string>('0')

  useEffect(() => {
    async function fetchTotal() {
      try {
        if (typeof window.ethereum !== 'undefined') {
          const provider = new ethers.providers.Web3Provider(window.ethereum)
          const contract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, provider)
          
          // Call the appropriate contract function based on agent
          const total = isAgentA 
            ? await contract.totalAgentA()
            : await contract.totalAgentB()
            
          // Convert from wei to ETH and format to 1 decimal place
          const formattedTotal = ethers.utils.formatEther(total)
          setTotal(Number(formattedTotal).toFixed(1))
        }
      } catch (error) {
        console.error('Error fetching total:', error)
      }
    }

    fetchTotal()
    // Refresh every 30 seconds
    const interval = setInterval(fetchTotal, 30000)
    return () => clearInterval(interval)
  }, [isAgentA])

  return (
    <div className="flex justify-between">
      <span className={player.style.lightTextColor}>TOTAL POOL</span>
      <span className={`font-mono ${player.style.textColor}`}>{total} FUZZ</span>
    </div>
  )
}

function UserContributions({ isAgentA, player }: { isAgentA: boolean, player: PlayerAttributes }) {
  const [contribution, setContribution] = useState<string>('0')

  useEffect(() => {
    async function fetchContribution() {
      try {
        if (typeof window.ethereum !== 'undefined') {
          const provider = new ethers.providers.Web3Provider(window.ethereum)
          const contract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, provider)
          
          // Get the current user's address
          const accounts = await provider.listAccounts()
          if (accounts.length === 0) return
          
          const userAddress = accounts[0]
          
          // Call the appropriate contract function based on agent
          const contribution = isAgentA 
            ? await contract.userToAgentA(userAddress)
            : await contract.userToAgentB(userAddress)
            
          // Convert from wei to ETH and format to 1 decimal place
          const formattedContribution = ethers.utils.formatEther(contribution)
          setContribution(Number(formattedContribution).toFixed(1))
        }
      } catch (error) {
        console.error('Error fetching contribution:', error)
      }
    }

    fetchContribution()
    // Refresh every 30 seconds
    const interval = setInterval(fetchContribution, 30000)
    return () => clearInterval(interval)
  }, [isAgentA])

  return (
    <div className="flex justify-between">
      <span className={player.style.lightTextColor}>YOUR CONTRIBUTION</span>
      <span className={`font-mono ${player.style.textColor}`}>{contribution} FUZZ</span>
    </div>
  )
}

function PlayerCard({ player, title, isAgentA }: { player: PlayerAttributes, title: string, isAgentA: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<DialogContent>(null);

  const handlePromptSubmit = async (prompt: string) => {
    // Here you would interact with your smart contract
    console.log('Submitting prompt:', prompt);
  };

  const handleVote = async (promptId: string) => {
    // Here you would interact with your smart contract
    console.log('Voting for prompt:', promptId);
  };

  const handleSupport = async () => {
    // Here you would interact with your smart contract
    console.log('Supporting agent:', isAgentA);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setDialogContent(null);
    }
  };

  return (
    <Card className={`relative w-full max-w-md border-2 ${player.style.borderColor} bg-black/40 p-6 backdrop-blur-xl`}>
      <div className={`absolute inset-0 bg-gradient-to-b ${player.style.gradientFrom} via-transparent to-transparent`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-lg font-semibold ${player.style.textColor}`}>{title}</h2>
            <div className="flex items-center gap-2">
              <p className={`text-xl font-mono ${player.style.lightTextColor}`}>{player.tokenCA}</p>
              <button className={`${player.style.textColor} hover:opacity-80`}>
                <Copy className="h-4 w-4" />
              </button>
              <button className={`${player.style.textColor} hover:opacity-80`}>
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex justify-between">
            <span className={player.style.lightTextColor}>HEALTH POINTS</span>
            <span className="font-mono text-green-400">{player.healthPoints}</span>
          </div>
          
          <AgentTotals isAgentA={isAgentA} player={player} />
          <UserContributions isAgentA={isAgentA} player={player} />
          
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant="outline" 
              className={`border-${player.style.borderColor} bg-${player.style.gradientFrom} ${player.style.textColor}`}
            >
              <MonitorPlay className="mr-1 h-3 w-3" />
              {player.status}
            </Badge>
            {player.traits.map((trait) => (
              <Badge 
                key={trait}
                variant="outline" 
                className={`border-${player.style.borderColor} bg-${player.style.gradientFrom} ${player.style.textColor}`}
              >
                {trait}
              </Badge>
            ))}
          </div>

          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button 
                className={`w-full mt-4 ${player.style.borderColor} ${player.style.textColor} hover:opacity-90 bg-black/40 backdrop-blur-xl border-2`}
                variant="outline"
              >
                Join the Battle ⚔️
              </Button>
            </DialogTrigger>
            <DialogContent 
              className={`sm:max-w-[600px] bg-black/40 backdrop-blur-xl border-2 ${player.style.borderColor}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-b ${player.style.gradientFrom} via-transparent to-transparent -z-10`} />
              {dialogContent === null ? (
                <>
                  <DialogHeader>
                    <DialogTitle className={`text-center ${player.style.textColor}`}>Choose Your Action</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 mt-4">
                    <Button 
                      onClick={() => setDialogContent('propose')}
                      className={`w-full flex items-center justify-center gap-2 ${player.style.borderColor} ${player.style.textColor} hover:opacity-90 bg-black/40 backdrop-blur-xl border-2`}
                      variant="outline"
                    >
                      <MessageSquarePlus className="h-4 w-4" />
                      Propose a Prompt
                    </Button>
                    <Button 
                      onClick={() => setDialogContent('vote')}
                      className={`w-full flex items-center justify-center gap-2 ${player.style.borderColor} ${player.style.textColor} hover:opacity-90 bg-black/40 backdrop-blur-xl border-2`}
                      variant="outline"
                    >
                      <Vote className="h-4 w-4" />
                      Vote for a Prompt
                    </Button>
                    <Button 
                      onClick={() => setDialogContent('support')}
                      className={`w-full flex items-center justify-center gap-2 ${player.style.borderColor} ${player.style.textColor} hover:opacity-90 bg-black/40 backdrop-blur-xl border-2`}
                      variant="outline"
                    >
                      <MessageSquarePlus className="h-4 w-4" />
                      Support this Agent
                    </Button>
                  </div>
                </>
              ) : dialogContent === 'propose' ? (
                <>
                  <DialogHeader>
                    <div className="flex items-center">
                      <Button
                        onClick={() => setDialogContent(null)}
                        variant="ghost"
                        className={`${player.style.textColor} hover:opacity-80`}
                      >
                        ← Back
                      </Button>
                      <DialogTitle className={`flex-1 text-center ${player.style.textColor}`}>
                        Propose Your Prompt
                      </DialogTitle>
                    </div>
                  </DialogHeader>
                  <ProposePromptDialog player={player} onSubmit={handlePromptSubmit} isAgentA={isAgentA} />
                </>
              ) : dialogContent === 'support' ? (
                <>
                  <DialogHeader>
                    <div className="flex items-center">
                      <Button
                        onClick={() => setDialogContent(null)}
                        variant="ghost"
                        className={`${player.style.textColor} hover:opacity-80`}
                      >
                        ← Back
                      </Button>
                      <DialogTitle className={`flex-1 text-center ${player.style.textColor}`}>
                        Support this Agent
                      </DialogTitle>
                    </div>
                  </DialogHeader>
                  <ProposePromptDialog player={player} onSubmit={handleSupport} isAgentA={isAgentA} isSupport={true} />
                </>
              ) : (
                <>
                  <DialogHeader>
                    <div className="flex items-center">
                      <Button
                        onClick={() => setDialogContent(null)}
                        variant="ghost"
                        className={`${player.style.textColor} hover:opacity-80`}
                      >
                        ← Back
                      </Button>
                      <DialogTitle className={`flex-1 text-center ${player.style.textColor}`}>
                        Vote for a Prompt
                      </DialogTitle>
                    </div>
                  </DialogHeader>
                  <VotePromptDialog player={player} onVote={handleVote} isAgentA={isAgentA} />
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Card>
  )
}

export default function BattlePage() {
  return (
    <>
      <Header />
      <main className="relative min-h-screen overflow-hidden bg-black pt-20">
        {/* Background gradients */}
        <div className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>
        
        <div className="pointer-events-none absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
          <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" />
        </div>

        <div className="container flex min-h-screen flex-col items-center justify-center gap-8 py-8">
          <div className="space-y-4 text-center">
            <h1 className="bg-gradient-to-r from-orange-500 via-purple-500 to-blue-500 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl">
              Battle Arena
            </h1>
            <CountdownTimer />
            <p className="text-lg text-muted-foreground">
              Face off against other players in epic AI battles
            </p>
          </div>
          
          <div className="flex w-full flex-col items-center justify-center gap-8 lg:flex-row">
            <PlayerCard player={battleData.playerOne} title="Ethereum" isAgentA={true} />

            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-black/40 backdrop-blur-xl border-2 border-white/20">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-red-500/20 rounded-full blur-sm" />
              <span className="relative text-2xl font-bold bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent">
                VS
              </span>
            </div>

            <PlayerCard player={battleData.playerTwo} title="Solana" isAgentA={false} />
          </div>
        </div>
      </main>
    </>
  )
}
