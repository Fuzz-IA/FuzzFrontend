import { ethers} from 'ethers'

export interface PlayerAttributes {
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

export interface BattleData {
  playerOne: PlayerAttributes
  playerTwo: PlayerAttributes
}

export interface Message {
  id: string;
  fromAgent: string;
  toAgent: string;
  content: string;
  timestamp: number;
  user?: string;
  createdAt: number;
  text?: string;
  isTyping?: boolean;
  scores?: {
    trump: number;
    xi: number;
  };
  role: 'user' | 'assistant';
}

export interface PromptBetEvent {
  event: string;
  args: {
    promptId: ethers.BigNumber;
    user: string;
    isAgentA: boolean;
    amount: ethers.BigNumber;
    gameId: ethers.BigNumber;
  }
}

export interface ProposePromptDialogProps {
  player: PlayerAttributes
  onSubmit: (prompt: string) => Promise<void>
  selectedChain: 'solana' | 'base' | 'info'
  isSupport?: boolean
}

export interface VotePromptDialogProps {
  selectedChampion: 'trump' | 'xi';
  onClose: () => void;
}

export interface Participant {
  address: string;
  contributionA: string;
  contributionB: string;
}