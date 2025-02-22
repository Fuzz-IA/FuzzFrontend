import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

export function useInvalidations() {
  const queryClient = useQueryClient();

  const invalidateAllBattleData = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.battle.gameInfo
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.battle.totals
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.battle.dynamicBets
    });
  };

  const invalidateUserData = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.user.balance
    });
  };

  const invalidateAll = () => {
    invalidateAllBattleData();
    invalidateUserData();
  };

  return {
    invalidateAllBattleData,
    invalidateUserData,
    invalidateAll
  };
}