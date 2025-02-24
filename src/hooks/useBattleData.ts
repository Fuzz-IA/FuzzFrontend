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
import { AGENT_IDS } from '@/lib/constants';

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

  console.log('All memories:', allMemories);

  if (!allMemories || allMemories.length === 0) {
    console.log('No memories found in responses');
    return {
      totalPool: '0',
      agentA: {
        name: 'Trump',
        address: '',
        total: '0'
      },
      agentB: {
        name: 'Xi',
        address: '',
        total: '0'
      },
      gameEnded: false,
      currentGameId: 0,
      marketInfo: await fetchDynamicBetAmounts(),
      scores: { trump: 0, xi: 0 }
    };
  }

  // Try to find the last message with a score
  const messagesWithScores = allMemories
    .filter((memory: AgentMemory) => {
      const messageText = typeof memory.content === 'string' 
        ? memory.content 
        : memory.content?.text || JSON.stringify(memory.content);
      return messageText.includes('[Trump') && messageText.includes('Xi');
    });

  console.log('Messages with scores:', messagesWithScores);

  let scores = { trump: 0, xi: 0 };
  
  if (messagesWithScores.length > 0) {
    const lastMessage = messagesWithScores[0];
    const messageText = typeof lastMessage.content === 'string' 
      ? lastMessage.content 
      : lastMessage.content?.text || JSON.stringify(lastMessage.content);
    
    console.log('Processing message text:', messageText);
    
    const scoreMatch = messageText.match(/\[Trump\s*(\d+)\s*\|\s*Xi\s*(\d+)\]/);
    if (scoreMatch) {
      console.log('Score match found:', scoreMatch);
      scores = {
        trump: parseInt(scoreMatch[1]),
        xi: parseInt(scoreMatch[2])
      };
    }
  }

  console.log('Final parsed scores:', scores);

  // Validate scores
  if (typeof scores.trump !== 'number' || typeof scores.xi !== 'number' || 
      isNaN(scores.trump) || isNaN(scores.xi)) {
    scores = { trump: 0, xi: 0 };
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
      name: 'Trump',
      address: agentAAddress,
      total: ethers.utils.formatEther(totalA)
    },
    agentB: {
      name: 'Xi',
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
  const { switchToBaseSepolia } = useNetworkSwitch();

  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: queryKeys.battle.gameInfo,
    queryFn: async () => {
      const networkSwitched = await switchToBaseSepolia();
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
  const { switchToBaseSepolia } = useNetworkSwitch();

  const { 
    mutateAsync: mint, 
    isPending: isLoading,
    error 
  } = useMutation({
    mutationFn: async () => {
      const networkSwitched = await switchToBaseSepolia();
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