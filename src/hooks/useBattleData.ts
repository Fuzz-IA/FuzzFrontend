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
  };
  createdAt: number;
}

async function fetchBattleData(): Promise<BattleContractData> {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('No ethereum provider found');
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const contract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, provider);

  // Get the last message from Fuzz to get current scores
  const roomId = await apiClient.stringToUuid(`default-room-${AGENT_IDS.AGENT3_ID}`);
  const response = await apiClient.getAgentMemories(AGENT_IDS.AGENT3_ID, roomId);
  const lastFuzzMessage = response?.memories
    ?.filter((memory: AgentMemory) => memory.agentId === AGENT_IDS.AGENT3_ID)
    ?.sort((a: AgentMemory, b: AgentMemory) => b.createdAt - a.createdAt)
    ?.[0];

  const scores = lastFuzzMessage?.content?.scores || { trump: 1, xi: 1 };

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
    staleTime: 30000,
    refetchInterval: 60000,
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