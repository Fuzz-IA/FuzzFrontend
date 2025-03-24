import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { BATTLE_ABI, BATTLE_ADDRESS, TOKEN_ABI, TOKEN_ADDRESS } from '@/lib/contracts/battle-abi';
import { useNetworkSwitch } from '@/hooks/useNetworkSwitch';
import { queryKeys } from '@/lib/query-keys';
import { 
  BattleContractData, 
  BattleDataHookResult, 
  MintTokensHookResult,
  Message 
} from '@/types/battle';
import { contractToast } from '@/lib/utils';
import { fetchDynamicBetAmounts } from './useDynamicBetAmount';
import { apiClient } from '@/lib/api';
import { AGENT_IDS, CHAMPION1, CHAMPION2, CHAMPION1_NAME, CHAMPION2_NAME } from '@/lib/constants';

interface AgentMemory {
  agentId: string;
  content: {
    scores?: {
      trump: number;
      xi: number;
    };
    text?: string;
  } | string;
  createdAt: number;
}

interface BattleScores {
  [CHAMPION1]: number;
  [CHAMPION2]: number;
}

async function fetchBattleData(): Promise<BattleContractData> {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('No ethereum provider found');
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const contract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, provider);

  // Get messages from both agents
  const [roomId1, roomId2] = await Promise.all([
    apiClient.stringToUuid(`default-room-${AGENT_IDS.AGENT1_ID}`),
    apiClient.stringToUuid(`default-room-${AGENT_IDS.AGENT2_ID}`)
  ]);
  
  const [response1, response2] = await Promise.all([
    apiClient.getAgentMemories(AGENT_IDS.AGENT1_ID, roomId1),
    apiClient.getAgentMemories(AGENT_IDS.AGENT2_ID, roomId2)
  ]);

  // Combine and sort all messages
  const allMemories = [
    ...(response1?.memories || []),
    ...(response2?.memories || [])
  ].sort((a, b) => b.createdAt - a.createdAt);

  // console.log('All memories:', allMemories);

  if (!allMemories || allMemories.length === 0) {
    // console.log('No memories found in responses');
    return {
      totalPool: '0',
      agentA: {
        name: CHAMPION1_NAME,
        address: '',
        total: '0'
      },
      agentB: {
        name: CHAMPION2_NAME,
        address: '',
        total: '0'
      },
      gameEnded: false,
      currentGameId: 0,
      marketInfo: await fetchDynamicBetAmounts(),
      scores: { 
        [CHAMPION1]: 0, 
        [CHAMPION2]: 0 
      }
    };
  }

  // Try to find the last message with a score
  const messagesWithScores = allMemories
    .filter((memory: AgentMemory) => {
      const messageText = typeof memory.content === 'string' 
        ? memory.content 
        : memory.content?.text || JSON.stringify(memory.content);
      return messageText.includes(`[${CHAMPION1_NAME}`) && messageText.includes(CHAMPION2_NAME);
    });

  // console.log('Messages with scores:', messagesWithScores);

  let scores: BattleScores = { 
    [CHAMPION1]: 0, 
    [CHAMPION2]: 0 
  };
  
  if (messagesWithScores.length > 0) {
    const lastMessage = messagesWithScores[0];
    const messageText = typeof lastMessage.content === 'string' 
      ? lastMessage.content 
      : lastMessage.content?.text || JSON.stringify(lastMessage.content);
    
    // console.log('Processing message text:', messageText);
    
    const extractedScores = extractScores(messageText);
    if (extractedScores) {
      // console.log('Score match found:', extractedScores);
      scores = extractedScores;
    }
  }

  // console.log('Final parsed scores:', scores);

  // Validate scores
  if (typeof scores[CHAMPION1] !== 'number' || typeof scores[CHAMPION2] !== 'number' || 
      isNaN(scores[CHAMPION1]) || isNaN(scores[CHAMPION2])) {
    scores = { 
      [CHAMPION1]: 0, 
      [CHAMPION2]: 0 
    };
  }

  const [
    total,
    agentAAddress,
    agentBAddress,
    totalA,
    totalB,
    gameEnded,
    currentGameId
  ] = await Promise.all([
    contract.getTotalAcumulated(),
    contract.agentA(),
    contract.agentB(),
    contract.totalAgentA(),
    contract.totalAgentB(),
    contract.gameEnded(),
    contract.currentGameId()
  ]);

  const marketInfo = await fetchDynamicBetAmounts();

  return {
    totalPool: ethers.utils.formatEther(total),
    agentA: {
      name: CHAMPION1_NAME,
      address: agentAAddress,
      total: ethers.utils.formatEther(totalA)
    },
    agentB: {
      name: CHAMPION2_NAME,
      address: agentBAddress,
      total: ethers.utils.formatEther(totalB)
    },
    gameEnded,
    currentGameId: Number(currentGameId),
    marketInfo,
    scores
  };
}

export function useBattleData(): BattleDataHookResult {
  const { switchToBaseMainnet } = useNetworkSwitch();

  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: queryKeys.battle.gameInfo,
    queryFn: async () => {
      const networkSwitched = await switchToBaseMainnet();
      if (!networkSwitched) {
        throw new Error('Network switch failed');
      }
      return fetchBattleData();
    },
    staleTime: 5000,
    refetchInterval: 10000,
    retry: 2,
    enabled: typeof window !== 'undefined' && !!window.ethereum,
  });

  return {
    data,
    isLoading,
    error: error as Error | null,
    refetch: async () => { await refetch(); }
  };
}

export function useMintTokens(): MintTokensHookResult {
  const queryClient = useQueryClient();
  const { switchToBaseMainnet } = useNetworkSwitch();

  const { 
    mutateAsync: mint, 
    isPending: isLoading,
    error 
  } = useMutation({
    mutationFn: async () => {
      const networkSwitched = await switchToBaseMainnet();
      if (!networkSwitched) {
        throw new Error('Network switch failed');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);

      const tx = await contract.mint();
      await tx.wait();
    },
    onSuccess: () => {
      contractToast.success('Tokens minted successfully!');
      queryClient.invalidateQueries({ queryKey: queryKeys.user.balance });
    },
    onError: (error) => {
      console.error('Mint error:', error);
      contractToast.error('Failed to mint tokens');
    }
  });

  return {
    mint,
    isLoading,
    error: error as Error | null
  };
}

function extractScores(messageText: string): BattleScores | null {
  if (!messageText) return null;
  
  // Verificar si el mensaje contiene puntuaciones
  if (!messageText.includes(`[${CHAMPION1_NAME}`) && !messageText.includes(CHAMPION2_NAME)) {
    return null;
  }
  
  // Inicializar puntuaciones
  let scores = { 
    [CHAMPION1]: 0, 
    [CHAMPION2]: 0 
  };
  
  // Extraer puntuaciones del texto
  // Actualizar la expresión regular para que coincida con el nuevo formato [Putin X | Zelensky Y]
  const scoreMatch = messageText.match(new RegExp(`\\[${CHAMPION1_NAME}\\s*(\\d+)\\s*\\|\\s*${CHAMPION2_NAME}\\s*(\\d+)\\]`));
  
  if (scoreMatch && scoreMatch.length === 3) {
    scores = {
      [CHAMPION1]: parseInt(scoreMatch[1]),
      [CHAMPION2]: parseInt(scoreMatch[2])
    };
  }
  
  // Intentar también con el formato antiguo por compatibilidad
  if (scores[CHAMPION1] === 0 && scores[CHAMPION2] === 0) {
    const oldFormatMatch = messageText.match(/\[Trump\s*(\d+)\s*\|\s*Xi\s*(\d+)\]/);
    if (oldFormatMatch && oldFormatMatch.length === 3) {
      scores = {
        [CHAMPION1]: parseInt(oldFormatMatch[1]),
        [CHAMPION2]: parseInt(oldFormatMatch[2])
      };
    }
  }
  
  // Validar puntuaciones
  if (typeof scores[CHAMPION1] !== 'number' || typeof scores[CHAMPION2] !== 'number' ||
      isNaN(scores[CHAMPION1]) || isNaN(scores[CHAMPION2])) {
    scores = { 
      [CHAMPION1]: 0, 
      [CHAMPION2]: 0 
    };
  }
  
  return scores;
}

const mockData: BattleContractData = {
  totalPool: '1000',
  agentA: {
    name: CHAMPION1_NAME,
    address: '0x123',
    total: '500'
  },
  agentB: {
    name: CHAMPION2_NAME,
    address: '0x456',
    total: '500'
  },
  gameEnded: false,
  currentGameId: 1,
  marketInfo: {
    sideARatio: 0.5,
    sideBRatio: 0.5,
    costForSideA: '10',
    costForSideB: '10',
    rawSideARatio: 50,
    rawSideBRatio: 50
  },
  scores: { 
    [CHAMPION1]: 0, 
    [CHAMPION2]: 0 
  }
};