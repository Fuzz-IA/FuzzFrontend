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
  selectedChain: ChampionType
  isSupport?: boolean
}

export interface VotePromptDialogProps {
  selectedChampion: 'trump' | 'xi';
  onClose: () => void;
}

export interface ParticipantData {
  participants: Participant[];
  total: number;
}

export interface Participant {
  address: string;
  contributionA: string;
  contributionB: string;
}

export interface AgentInfo {
  name: string;
  address: string;
  total: string;
}


export interface BattleScores {
  trump: number;
  xi: number;
}

export interface MintTokensHookResult {
  mint: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export interface BattleSidebarProps {
  selectedChampion: ChampionType;
  onChampionSelect: (champion: ChampionType) => void;
}

export type ChampionType = 'trump' | 'xi' | 'info';

export interface BattleActionsProps {
  selectedChampion: Exclude<ChampionType, 'info'>;
}

export interface ScoreBarsProps {
  scores: BattleScores;
}

export interface BattleDataHookResult {
  data: BattleContractData | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface PromptSubmission {
  message: string;
  selectedChampion: ChampionType;
}

export interface UsePromptSubmissionResult {
  submitPrompt: (data: PromptSubmission) => Promise<void>;
  isLoading: boolean;
  isImproving: boolean;
  improveText: (text: string) => Promise<string>;
}

export interface BattleContractData {
  totalPool: string;
  agentA: AgentInfo;
  agentB: AgentInfo;
  gameEnded: boolean;
  currentGameId: number;
  marketInfo: DynamicBetAmounts;
  scores: BattleScores;
}

export interface AgentInfo {
  name: string;
  address: string;
  total: string;
}

export interface DynamicBetAmounts {
  sideARatio: number;
  sideBRatio: number;
  costForSideA: string;
  costForSideB: string;
}

export interface UseTokenBalanceProps {
  tokenAddress: string;
  enabled?: boolean;
}

export interface BattleEndedPopupProps {
  onClose: () => void;
}