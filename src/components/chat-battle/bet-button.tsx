'use client';


import { useState } from 'react';
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

interface BetButtonProps {
  selectedChampion: 'trump' | 'xi';
}

export function BetButton({ selectedChampion }: BetButtonProps) {
  const [betAmount, setBetAmount] = useState('');
  const [showBetDialog, setShowBetDialog] = useState(false);
  const [isBetting, setIsBetting] = useState(false);
  const { login, authenticated } = usePrivy();
  const { switchToBaseSepolia } = useNetworkSwitch();

  // Helper function to capitalize champion name
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
  
  const handleBet = async () => {
    if (!authenticated) {
      contractToast.wallet.notConnected();
      login();
      return;
    }

  
  if (typeof window.ethereum === 'undefined') {
    contractToast.wallet.notInstalled();
    return
  }
  
  try{
    const networkSwitched = await switchToBaseSepolia();
          if (!networkSwitched) return;
          
    const allowanceApproved = await checkAndApproveAllowance();
    if (!allowanceApproved) return;
    
    setIsBetting(true);
    contractToast.loading(`Placing bet of ${betAmount} FUZZ on ${displayName}...`);
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const battleContract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, signer);
    const amountInWei = ethers.utils.parseEther(betAmount);
    
    const tx = await battleContract.betOnAgent(selectedChampion === 'trump', amountInWei);
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
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Available Balance:</span>
                <span className="font-mono text-sm">{Number(tokenBalance).toFixed(2)} FUZZ</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bet Amount:</span>
                <span className="font-mono text-sm">{Number(betAmount || '0').toFixed(2)} FUZZ</span>
              </div>
            </div>

            <div className="space-y-4">
              <Slider
                defaultValue={[0]}
                max={Number(tokenBalance)}
                step={0.1}
                value={[Number(betAmount || 0)]}
                onValueChange={handleSliderChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 FUZZ</span>
                <span>{Number(tokenBalance).toFixed(2)} FUZZ</span>
              </div>
            </div>

            <Button 
                          onClick={handleBet} 
                          disabled={
                            !betAmount || 
                            isCheckingAllowance || 
                            isBetting || 
                            Number(betAmount) > Number(tokenBalance)
                          }
                          className="w-full"
                        >
                          {!authenticated ? 'Connect Wallet' : 
                                         isCheckingAllowance ? 'Checking Allowance...' : 
                                         isBetting ? 'Betting...' : 
                                         Number(betAmount) > Number(tokenBalance) ? 'Insufficient Balance' :
                                         `Bet ${Number(betAmount).toFixed(2)} FUZZ for ${displayName}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}