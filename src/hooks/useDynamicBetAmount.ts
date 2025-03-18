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
    costForSideB: calculateDynamicAmount(ratioB).toString(),
    rawSideARatio: ratioA,
    rawSideBRatio: ratioB
  };
}

export function calculatePotentialWinnings(betAmount: string, isAgentA: boolean, marketData: DynamicBetAmounts): string {
  if (!betAmount || !marketData) return '0';
  
  try {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) return '0';

    // Log market data for debugging
    console.log('Market Data:', {
      rawSideARatio: marketData.rawSideARatio,
      rawSideBRatio: marketData.rawSideBRatio,
      betAmount: amount,
      isAgentA
    });

    // Ensure we have non-zero ratio values
    if (!marketData.rawSideARatio || !marketData.rawSideBRatio || 
        marketData.rawSideARatio <= 0 || marketData.rawSideBRatio <= 0) {
      console.log('Invalid ratio values detected');
      return '0';
    }

    // Calculate total pool size and your contribution to it
    const sideA = marketData.rawSideARatio;
    const sideB = marketData.rawSideBRatio;
    
    // For a betting odds scenario, we use a simplified formula:
    // If you're betting on side with lower ratio, you get better odds
    let potentialWin = 0;
    
    if (isAgentA) {
      // Betting on side A
      const odds = sideB / sideA;
      potentialWin = amount + (amount * odds);
    } else {
      // Betting on side B
      const odds = sideA / sideB;
      potentialWin = amount + (amount * odds);
    }
    
    console.log('Calculated potential win:', potentialWin);
    
    // Ensure result is a valid number
    return isNaN(potentialWin) ? '0' : potentialWin.toFixed(2);
  } catch (error) {
    console.error("Error calculating potential winnings:", error);
    return '0';
  }
}

export function useDynamicBetAmount(isAgentA?: boolean) {
  const { switchToBaseMainnet } = useNetworkSwitch();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.battle.dynamicBets,
    queryFn: async () => {
      const networkSwitched = await switchToBaseMainnet();
      if (!networkSwitched) {
        throw new Error('Network switch failed');
      }
      return fetchDynamicBetAmounts();
    },
    staleTime: 30000,
    enabled: typeof window !== 'undefined' && !!window.ethereum,
  });

  const getPotentialWinnings = (betAmount: string, forAgentA: boolean = isAgentA === true) => {
    if (!data) return '0';
    return calculatePotentialWinnings(betAmount, forAgentA, data);
  };

  if (isAgentA === undefined) {
    return { data, isLoading, getPotentialWinnings };
  }

  return {
    amount: isAgentA ? data?.costForSideA : data?.costForSideB,
    ratio: isAgentA ? data?.sideARatio : data?.sideBRatio,
    isLoading,
    getPotentialWinnings
  };
}