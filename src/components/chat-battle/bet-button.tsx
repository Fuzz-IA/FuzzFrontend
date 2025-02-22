'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { BATTLE_ABI, BATTLE_ADDRESS, TOKEN_ADDRESS } from '@/lib/contracts/battle-abi';
import { Slider } from "@/components/ui/slider";
import { contractToast } from '@/lib/utils';
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useTokenAllowance } from '@/hooks/useTokenAllowance';
import { useNetworkSwitch } from '@/hooks/useNetworkSwitch';
import { useDynamicBetAmount } from '@/hooks/useDynamicBetAmount';
import { useMemo } from 'react';
import { X } from 'lucide-react';

interface BetButtonProps {
  selectedChampion: 'trump' | 'xi';
}

export function BetButton({ selectedChampion: initialChampion }: BetButtonProps) {
  const { data: dynamicData, isLoading: isLoadingDynamicAmount } = useDynamicBetAmount();
  const [selectedChampion, setSelectedChampion] = useState<'trump' | 'xi'>(initialChampion);

  const minBetAmount = useMemo(() => {
    if (!dynamicData) return '0';
    const baseAmount = selectedChampion === 'trump' 
      ? dynamicData.costForSideA 
      : dynamicData.costForSideB;
    return baseAmount;
  }, [dynamicData, selectedChampion]);

  const [betAmount, setBetAmount] = useState('');
  const [showBetDialog, setShowBetDialog] = useState(false);
  const [isBetting, setIsBetting] = useState(false);
  const { login, authenticated } = usePrivy();
  const { switchToBaseSepolia } = useNetworkSwitch();

  const displayName = selectedChampion === 'trump' ? 'Trump' : 'Xi';

  const {
    formattedBalance: tokenBalance,
    refresh: refreshBalance
  } = useTokenBalance({
    tokenAddress: TOKEN_ADDRESS
  });

  const {
    checkAndApproveAllowance,
    isCheckingAllowance
  } = useTokenAllowance({
    spenderAddress: BATTLE_ADDRESS,
    requiredAmount: ethers.utils.parseEther(betAmount || '0')
  });

  useEffect(() => {
    if (minBetAmount) {
      setBetAmount(minBetAmount);
    }
  }, [minBetAmount]);

  const handleBet = async () => {
    if (!authenticated) {
      contractToast.wallet.notConnected();
      login();
      return;
    }

    if (!minBetAmount) {
      contractToast.error('Dynamic bet amount not loaded');
      return;
    }

    if (typeof window.ethereum === 'undefined') {
      contractToast.wallet.notInstalled();
      return;
    }

    try {
      const networkSwitched = await switchToBaseSepolia();
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

      const tx = await battleContract.betOnAgent(
        selectedChampion === 'trump',
        betAmountInWei
      );
      await tx.wait();

      contractToast.success(`Successfully bet ${betAmount} FUZZ on ${displayName}!`);
      await refreshBalance();
      setShowBetDialog(false);
      setBetAmount('');
    } catch (error) {
      console.error('Error:', error);
      contractToast.error(error);
    } finally {
      setIsBetting(false);
    }
  };

  const handleSliderChange = (value: number[]) => {
    setBetAmount(value[0].toString());
  };

  return (
    <div className="flex flex-col gap-4 mt-4">
      <Button 
        onClick={() => authenticated ? setShowBetDialog(true) : login()}
        disabled={isCheckingAllowance || isBetting}
        variant="outline"
        className="w-full bg-[#F3642E] text-black font-minecraft hover:bg-[#E88B5D]/90 hover:text-black text-lg"
      >
        {!authenticated ? 'Connect Wallet' : 
                 isCheckingAllowance ? 'Checking Allowance...' : 
                 isBetting ? 'Betting...' : 
                 `Bet for ${displayName} Agent`}
      </Button>

      <Dialog open={showBetDialog} onOpenChange={setShowBetDialog}>
        <DialogContent className="bg-black text-[#F3642E] p-6 rounded-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-minecraft">Bet</h2>
            <button onClick={() => setShowBetDialog(false)} className="text-[#F3642E] hover:opacity-80">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex gap-4 mt-6">
            <button 
              onClick={() => {
                setSelectedChampion('trump');
                setBetAmount(dynamicData?.costForSideA || '0');
              }}
              className={`flex-1 py-4 rounded-lg font-minecraft ${
                selectedChampion === 'trump' 
                  ? 'bg-[#F3642E] text-black' 
                  : 'bg-black text-[#F3642E]'
              }`}
            >
              Trump
            </button>
            <button 
              onClick={() => {
                setSelectedChampion('xi');
                setBetAmount(dynamicData?.costForSideB || '0');
              }}
              className={`flex-1 py-4 rounded-lg font-minecraft ${
                selectedChampion === 'xi' 
                  ? 'bg-[#F3642E] text-black' 
                  : 'bg-black text-[#F3642E]'
              }`}
            >
              Xi Jinping
            </button>
          </div>

          <div className="mt-8">
            <div className="flex justify-between items-center">
              <span className="text-xl font-minecraft">Amount</span>
              <span className="text-sm opacity-80">Minimum: {minBetAmount} FUZZ</span>
            </div>
            
            <div className="relative mt-4">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-minecraft text-[#F3642E]">$</div>
              <input
                type="number"
                value={isLoadingDynamicAmount ? '' : (betAmount || minBetAmount || '0')}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setBetAmount(minBetAmount || '0');
                  } else {
                    setBetAmount(value);
                  }
                }}
                className="w-full bg-transparent text-4xl font-minecraft pl-8 focus:outline-none text-[#F3642E]"
                placeholder={isLoadingDynamicAmount ? 'Loading...' : '0'}
                min={minBetAmount || '0'}
              />
            </div>

            <div className="flex gap-2 mt-6">
              <Button 
                onClick={() => setBetAmount((prev) => (Number(prev) + 100).toString())}
                variant="outline" 
                className="flex-1 bg-black text-[#F3642E] hover:bg-[#F3642E] hover:text-black border-none"
              >
                +$100
              </Button>
              <Button 
                onClick={() => setBetAmount((prev) => (Number(prev) + 8347).toString())}
                variant="outline" 
                className="flex-1 bg-black text-[#F3642E] hover:bg-[#F3642E] hover:text-black border-none"
              >
                +$8347
              </Button>
              <Button 
                onClick={() => setBetAmount((prev) => (Number(prev) + 9747).toString())}
                variant="outline" 
                className="flex-1 bg-black text-[#F3642E] hover:bg-[#F3642E] hover:text-black border-none"
              >
                +$9747
              </Button>
              <Button 
                onClick={() => setBetAmount((prev) => (Number(prev) + 10000).toString())}
                variant="outline" 
                className="flex-1 bg-black text-[#F3642E] hover:bg-[#F3642E] hover:text-black border-none"
              >
                +$10000
              </Button>
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