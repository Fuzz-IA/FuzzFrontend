import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { BATTLE_ABI, BATTLE_ADDRESS } from '@/lib/contracts/battle-abi';
import { Participant } from "@/types/battle";

export const useBattleParticipants = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchParticipants = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (typeof window.ethereum !== 'undefined') {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const contract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, provider);

          const currentGameId = await contract.currentGameId();
          const uniqueAddresses = new Set<string>();

          const currentBlock = await provider.getBlockNumber();
          const fromBlock = Math.max(0, currentBlock - 100000);

          const [simpleBets, promptBets, promptVotes] = await Promise.all([
            contract.queryFilter(contract.filters.SimpleBet(), fromBlock, currentBlock),
            contract.queryFilter(contract.filters.PromptBet(), fromBlock, currentBlock),
            contract.queryFilter(contract.filters.PromptVote(), fromBlock, currentBlock)
          ]);

          const eventAddresses = [
            ...simpleBets
              .filter(event => event.args?.gameId.toString() === currentGameId.toString())
              .map(event => event.args?.user),
            ...promptBets
              .filter(event => event.args?.gameId.toString() === currentGameId.toString())
              .map(event => event.args?.user),
            ...promptVotes
              .filter(event => event.args?.gameId.toString() === currentGameId.toString())
              .map(event => event.args?.user)
          ].filter(Boolean);

          const participantsData = await Promise.all(
            Array.from(new Set(eventAddresses)).map(async (address) => {
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

          const sortedParticipants = participantsData
            .filter(p => Number(p.contributionA) > 0 || Number(p.contributionB) > 0)
            .sort((a, b) => {
              const totalA = Number(a.contributionA) + Number(a.contributionB);
              const totalB = Number(b.contributionA) + Number(b.contributionB);
              return totalB - totalA;
            });

          setParticipants(sortedParticipants);
        }
      } catch (err) {
        setError(err as Error);
        // Solo log el error, no mostrar toast para operaciones de lectura
        console.error('Error fetching participants:', err);
      } finally {
        setIsLoading(false);
      }
    };

  useEffect(() => {
    fetchParticipants();
    const interval = setInterval(fetchParticipants, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    participants,
    isLoading,
    error,
    refresh: fetchParticipants
  };
};