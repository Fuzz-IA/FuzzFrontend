import { useQuery } from '@tanstack/react-query'; 
import {ethers} from 'ethers';
import { BATTLE_ADDRESS, BATTLE_ABI } from '@/lib/contracts/battle-abi';
import {queryKeys} from '@/lib/query-keys';

export function useBattleTotals(isAgentA: boolean) {
  return useQuery({
    queryKey: [...queryKeys.battle.totals,isAgentA],
    queryFn: async () => {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('No ethereum provider found');
      }
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, provider);
      
      const total = isAgentA ? await contract.totalAgentA() : await contract.totalAgentB();
      const formattedTotal = ethers.utils.formatEther(total);
      return Number(formattedTotal).toFixed(1);
    },
    staleTime: 30000,
    refetchInterval : 30000,
    retry: 2,
    enabled: typeof window !== 'undefined' && !!window.ethereum,
  
  })
}