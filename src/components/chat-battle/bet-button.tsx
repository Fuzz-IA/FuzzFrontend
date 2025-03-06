'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent,DialogTitle } from '@/components/ui/dialog';
import { usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { BATTLE_ABI, BATTLE_ADDRESS, TOKEN_ADDRESS } from '@/lib/contracts/battle-abi';
import { contractToast } from '@/lib/utils';
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useTokenAllowance } from '@/hooks/useTokenAllowance';
import { useNetworkSwitch } from '@/hooks/useNetworkSwitch';
import { useDynamicBetAmount } from '@/hooks/useDynamicBetAmount';
import { useInvalidations } from '@/hooks/useInvalidations';
import { X } from 'lucide-react';
import { saveBet } from '@/lib/supabase';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { CHAMPION1, CHAMPION2, CHAMPION1_NAME, CHAMPION2_NAME } from '@/lib/constants';
import { ChampionType, mapToOriginalChampion } from '@/types/battle';

interface BetButtonProps {
  selectedChampion: Exclude<ChampionType, 'info'>;
}

export function BetButton({ selectedChampion: initialChampion }: BetButtonProps) {
  const { data: dynamicData, isLoading: isLoadingDynamicAmount } = useDynamicBetAmount();
  const { invalidateAll } = useInvalidations();
  const [selectedChampion, setSelectedChampion] = useState<Exclude<ChampionType, 'info'>>(initialChampion);
  const [gameEnded, setGameEnded] = useState(false);

  const minBetAmount = useMemo(() => {
    if (!dynamicData) return '0';
    const baseAmount = selectedChampion === CHAMPION1
      ? dynamicData.costForSideA 
      : dynamicData.costForSideB;
    return baseAmount;
  }, [dynamicData, selectedChampion]);

  const [betAmount, setBetAmount] = useState('');
  const [showBetDialog, setShowBetDialog] = useState(false);
  const [isBetting, setIsBetting] = useState(false);
  const { login, authenticated } = usePrivy();
  const { switchToBaseMainnet } = useNetworkSwitch();

  const displayName = selectedChampion === CHAMPION1 ? CHAMPION1_NAME : CHAMPION2_NAME;

  const {
    formattedBalance: tokenBalance
  } = useTokenBalance({
    tokenAddress: TOKEN_ADDRESS
  });

  const { checkAndApproveAllowance, isCheckingAllowance } = useTokenAllowance({
    spenderAddress: BATTLE_ADDRESS,
    requiredAmount: ethers.utils.parseEther(betAmount || '0')
  });

  useEffect(() => {
    if (minBetAmount) setBetAmount(minBetAmount);
  }, [minBetAmount]);

  // Determinar si el campeón seleccionado es el agente A (antes 'trump')
  const isAgentA = mapToOriginalChampion(selectedChampion) === 'trump';

  const handleBet = async () => {
    if (!authenticated) {
      contractToast.wallet.notConnected();
      login();
      return;
    }

    if (!minBetAmount || typeof window.ethereum === 'undefined') {
      contractToast.error(minBetAmount ? 'Wallet not installed' : 'Dynamic bet amount not loaded');
      return;
    }

    try {
      const networkSwitched = await switchToBaseMainnet();
      if (!networkSwitched) return;

      const minAmountInWei = ethers.utils.parseEther(minBetAmount);
      const betAmountInWei = ethers.utils.parseEther(betAmount);

      if (betAmountInWei.lt(minAmountInWei)) {
        contractToast.error(`Minimum bet amount is ${minBetAmount} FUZZ`);
        return;
      }

      const allowanceApproved = await checkAndApproveAllowance();
      if (!allowanceApproved) return;

      setIsBetting(true);
      contractToast.loading(`Placing bet of ${betAmount} FUZZ on ${displayName}...`);

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const battleContract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, signer);

      const tx = await battleContract.betOnAgent(isAgentA, betAmountInWei);
      await tx.wait();

      const walletAddress = await signer.getAddress();
      await saveBet({
        wallet_address: walletAddress,
        amount: Number(betAmount),
        is_agent_a: isAgentA
      });

      contractToast.success(`Successfully bet ${betAmount} FUZZ on ${displayName}!`);

      invalidateAll();

      setShowBetDialog(false);
      setBetAmount('');
    } catch (error: any) {
      if (error?.error?.body?.includes('Game has ended')) {
        setGameEnded(true);
        contractToast.error('This game has ended. Please wait for the next round.');
      } else {
        console.error('Error:', error);
        contractToast.error(error);
      }
    } finally {
      setIsBetting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 mt-4">
      <Button 
        onClick={() => authenticated ? setShowBetDialog(true) : login()}
        disabled={isCheckingAllowance || isBetting || gameEnded}
        variant="outline"
        className="w-full bg-[#F3642E] text-black font-minecraft hover:bg-[#E88B5D]/90 hover:text-black text-lg"
      >
        {!authenticated ? 'Connect Wallet' : 
         gameEnded ? 'Game has ended' :
         isCheckingAllowance ? 'Checking Allowance...' : 
         isBetting ? 'Betting...' : 
         `Bet for ${displayName} Agent`}
      </Button>

      {gameEnded && (
        <div className="text-sm text-[#F3642E] text-center">
          This game has ended. Please wait for the next round.
        </div>
      )}

      <Dialog open={showBetDialog && !gameEnded} onOpenChange={setShowBetDialog}>
        <DialogContent className="bg-black text-[#F3642E] p-6 rounded-lg">
          <div className="flex justify-between items-center">
            <VisuallyHidden>
              <DialogTitle className="text-2xl font-minecraft">Bet</DialogTitle>
            </VisuallyHidden>
            <button onClick={() => setShowBetDialog(false)} className="text-[#F3642E] hover:opacity-80">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              className={`flex-1 py-2 px-4 rounded-md ${
                selectedChampion === CHAMPION1 
                  ? 'bg-[#F3642E] text-black' 
                  : 'bg-black text-[#F3642E]'
              }`}
              onClick={() => setSelectedChampion(CHAMPION1)}
            >
              {CHAMPION1_NAME}
            </button>
            <button
              className={`flex-1 py-2 px-4 rounded-md ${
                selectedChampion === CHAMPION2 
                  ? 'bg-[#F3642E] text-black' 
                  : 'bg-black text-[#F3642E]'
              }`}
              onClick={() => setSelectedChampion(CHAMPION2)}
            >
              {CHAMPION2_NAME}
            </button>
          </div>

          <div className="mt-8">
            <div className="flex justify-between items-center">
              <span className="text-xl font-minecraft">Amount</span>
              <span className="text-sm opacity-80">Minimum: {minBetAmount} FUZZ</span>
            </div>

            <div className="relative mt-4">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-minecraft text-[#F3642E] ">FUZZ</div>
              <input
                type="number"
                value={isLoadingDynamicAmount ? '' : (betAmount || minBetAmount || '0')}
                onChange={(e) => {
                  const value = e.target.value;
                  setBetAmount(value === '' ? minBetAmount || '0' : value);
                }}
                className="w-full bg-transparent text-4xl font-minecraft pl-28 focus:outline-none text-[#F3642E]"
                placeholder={isLoadingDynamicAmount ? 'Loading...' : '0'}
                min={minBetAmount || '0'}
              />
            </div>

            <div className="flex gap-2 mt-6">
              {[100, 500, 1000, 5000].map((amount) => (
                <Button 
                  key={amount}
                  onClick={() => setBetAmount((prev) => (Number(prev) + amount).toString())}
                  variant="outline" 
                  className="flex-1 bg-black text-[#F3642E] hover:bg-[#F3642E] hover:text-black border-none"
                >
                  +{amount} FUZZ
                </Button>
              ))}
            </div>

            <Button 
              onClick={handleBet}
              disabled={
                !betAmount || 
                !minBetAmount ||
                isCheckingAllowance || 
                isBetting || 
                Number(betAmount) > Number(tokenBalance) ||
                Number(betAmount) < Number(minBetAmount)
              }
              className="w-full mt-6 bg-[#F3642E] text-black hover:bg-[#F3642E]/90 font-minecraft rounded-lg"
            >
              {`Bet for ${displayName}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}