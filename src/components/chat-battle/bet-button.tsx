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

interface BetButtonProps {
  selectedChampion: 'trump' | 'xi';
}

export function BetButton({ selectedChampion }: BetButtonProps) {
  const { data: dynamicData, isLoading: isLoadingDynamicAmount } = useDynamicBetAmount();

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
    <div className="flex flex-col gap-4">
      <Button 
        onClick={() => authenticated ? setShowBetDialog(true) : login()}
        disabled={isCheckingAllowance || isBetting}
        variant="outline"
        className="w-full"
      >
        {!authenticated ? 'Connect Wallet' : 
                 isCheckingAllowance ? 'Checking Allowance...' : 
                 isBetting ? 'Betting...' : 
                 `Bet for ${displayName}`}
      </Button>

      <Dialog open={showBetDialog} onOpenChange={setShowBetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place your bet for {displayName}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                <pre>
                  {JSON.stringify({
                    dynamicData,
                    minBetAmount,
                    betAmount,
                    isLoading: isLoadingDynamicAmount
                  }, null, 2)}
                </pre>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Available Balance:</span>
                <span className="font-mono text-sm">{Number(tokenBalance).toFixed(2)} FUZZ</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bet Amount:</span>
                <span className="font-mono text-sm">{Number(betAmount || '0').toFixed(2)} FUZZ</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Minimum Bet:</span>
                <span className="font-mono text-sm">
                  {isLoadingDynamicAmount 
                    ? 'Loading...' 
                    : `${minBetAmount} FUZZ`}
                </span>
              </div>
              {dynamicData && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Market Ratio:</span>
                  <span className="font-mono text-sm">
                    {(selectedChampion === 'trump' 
                      ? dynamicData.sideARatio 
                      : dynamicData.sideBRatio).toFixed(2)}%
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Slider
                defaultValue={[Number(minBetAmount || 0)]}
                min={Number(minBetAmount || 0)}
                max={Number(tokenBalance)}
                step={0.1}
                value={[Number(betAmount || 0)]}
                onValueChange={handleSliderChange}
                className="w-full"
                disabled={isLoadingDynamicAmount}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{minBetAmount} FUZZ</span>
                <span>{Number(tokenBalance).toFixed(2)} FUZZ</span>
              </div>
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
              className="w-full"
            >
              {!authenticated ? 'Connect Wallet' : 
               isLoadingDynamicAmount ? 'Loading minimum bet...' :
               isCheckingAllowance ? 'Checking Allowance...' : 
               isBetting ? 'Betting...' : 
               Number(betAmount) > Number(tokenBalance) ? 'Insufficient Balance' :
               Number(betAmount) < Number(minBetAmount) ? `Minimum bet is ${minBetAmount} FUZZ` :
               `Bet ${betAmount} FUZZ for ${displayName}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}