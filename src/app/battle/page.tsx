import { Metadata } from "next"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, MonitorPlay } from "lucide-react"
import { Header } from "@/components/layout/header"

export const metadata: Metadata = {
  title: "Battle Arena",
  description: "Face off against other players in the battle arena",
}

// Types for our battle data
interface PlayerAttributes {
  tokenCA: string
  walletAddress: string
  healthPoints: number
  traits: string[]
  status: "READY" | "WAITING" | "FIGHTING"
  style: {
    borderColor: string
    textColor: string
    lightTextColor: string
    gradientFrom: string
  }
}

interface BattleData {
  playerOne: PlayerAttributes
  playerTwo: PlayerAttributes
}

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

function PlayerCard({ player, title }: { player: PlayerAttributes, title: string }) {
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
            <p className="text-lg text-muted-foreground">
              Face off against other players in epic AI battles
            </p>
          </div>
          
          <div className="flex w-full flex-col items-center justify-center gap-8 lg:flex-row">
            <PlayerCard player={battleData.playerOne} title="Progressive" />

            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 via-purple-500 to-blue-500 text-2xl font-bold text-white shadow-lg">
              VS
            </div>

            <PlayerCard player={battleData.playerTwo} title="Traditional" />
          </div>
        </div>
      </main>
    </>
  )
}
