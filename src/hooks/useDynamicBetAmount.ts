import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { BATTLE_ABI, BATTLE_ADDRESS } from '@/lib/contracts/battle-abi';
import { queryKeys } from '@/lib/query-keys';
import { DynamicBetAmounts } from '@/types/battle';
import { useNetworkSwitch } from '@/hooks/useNetworkSwitch';

export async function fetchDynamicBetAmounts(): Promise<DynamicBetAmounts> {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const contract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, provider);

  const [sideARatio, sideBRatio, costForSideA, costForSideB] = await contract.getMarketInfo();


  const ratioA = Number(sideARatio);  
  const ratioB = Number(sideBRatio);
  const BASE_AMOUNT = 2000;
  const RATIO_PRECISION = 10000;

  const calculateDynamicAmount = (ratio: number) => {
    if (ratio > RATIO_PRECISION / 2) {  
      const excess = ratio - (RATIO_PRECISION / 2);
      return BASE_AMOUNT + (BASE_AMOUNT * excess * excess) / (RATIO_PRECISION * 100);
    } else {
      return BASE_AMOUNT - (BASE_AMOUNT * (RATIO_PRECISION / 2 - ratio)) / (RATIO_PRECISION * 2);
    }
  };

  return {
    sideARatio: ratioA / 100,  
    sideBRatio: ratioB / 100,  // Solo para display
    costForSideA: calculateDynamicAmount(ratioA).toString(),
    costForSideB: calculateDynamicAmount(ratioB).toString()
  };
}

export function useDynamicBetAmount(isAgentA?: boolean) {
  const { switchToBaseSepolia } = useNetworkSwitch();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.battle.dynamicBets,
    queryFn: async () => {
      const networkSwitched = await switchToBaseSepolia();
      if (!networkSwitched) {
        throw new Error('Network switch failed');
      }
      return fetchDynamicBetAmounts();
    },
    staleTime: 30000,
    enabled: typeof window !== 'undefined' && !!window.ethereum,
  });

  if (isAgentA === undefined) {
    return { data, isLoading };
  }

  return {
    amount: isAgentA ? data?.costForSideA : data?.costForSideB,
    ratio: isAgentA ? data?.sideARatio : data?.sideBRatio,
    isLoading
  };
}