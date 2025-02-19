import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { BATTLE_ABI, BATTLE_ADDRESS } from '@/lib/contracts/battle-abi';
import { ParticipantData, Participant } from "@/types/battle";
import { queryKeys } from '@/lib/query-keys';

export const useBattleParticipants = () => {
  return useQuery<ParticipantData>({
    queryKey: queryKeys.battle.participants,
    queryFn: async () => {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('No ethereum provider found');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, provider);

      const currentGameId = await contract.currentGameId();
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(currentBlock - 10000, 0);

      const eventFilter = {
        address: BATTLE_ADDRESS,
        fromBlock,
        toBlock: currentBlock,
        topics: [
          [
            ethers.utils.id("SimpleBet(address,bool,uint256,uint256)"),
            ethers.utils.id("PromptBet(address,bool,uint256,uint256,uint256)"),
            ethers.utils.id("PromptVote(address,uint256,uint256)")
          ]
        ]
      };

      const logs = await provider.getLogs(eventFilter);
      const uniqueAddresses = new Set<string>();

      logs.forEach(log => {
        const parsedLog = contract.interface.parseLog(log);
        if (parsedLog.args.gameId?.toString() === currentGameId.toString()) {
          uniqueAddresses.add(parsedLog.args.user || parsedLog.args[0]);
        }
      });

      const participantsData: Participant[] = await Promise.all(
        Array.from(uniqueAddresses).map(async (address) => {
          const [forA, forB] = await contract.getUserContribution(
            address,
            currentGameId
          );

          return {
            address,
            contributionA: ethers.utils.formatEther(forA),
            contributionB: ethers.utils.formatEther(forB)
          };
        })
      );

      const filteredParticipants = participantsData
        .filter(p => Number(p.contributionA) > 0 || Number(p.contributionB) > 0);

      return {
        participants: filteredParticipants,
        total: filteredParticipants.length
      };
    },
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 2,
  });
};