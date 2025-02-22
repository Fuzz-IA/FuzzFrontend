import { useQuery, useMutation,useQueryClient } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { BATTLE_ABI, BATTLE_ADDRESS, TOKEN_ABI, TOKEN_ADDRESS } from '@/lib/contracts/battle-abi';
import { useNetworkSwitch } from '@/hooks/useNetworkSwitch';
import { queryKeys } from '@/lib/query-keys';
import { 
  BattleContractData, 
  BattleDataHookResult, 
  MintTokensHookResult 
} from '@/types/battle';
import { contractToast } from '@/lib/utils';
import { fetchDynamicBetAmounts } from './useDynamicBetAmount';

async function fetchBattleData(): Promise<BattleContractData> {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('No ethereum provider found');
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const contract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, provider);

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
    scores: {
      trump: 3,
      xi: 3
    }
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
  const { switchToBaseSepolia } = useNetworkSwitch();
  const queryClient = useQueryClient();

  const { 
    mutateAsync, 
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
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);

      contractToast.loading('Minting FUZZ tokens...');
      const tx = await tokenContract.mint();
      await tx.wait();

      contractToast.success('Successfully minted FUZZ tokens! 🎉');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.battle.gameInfo });
    },
    onError: (error) => {
      contractToast.error(error);
    }
  });

  return {
    mint: mutateAsync,
    isLoading,
    error: error as Error | null
  };
}