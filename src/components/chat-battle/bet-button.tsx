'use client';


import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { BATTLE_ABI, BATTLE_ADDRESS, TOKEN_ADDRESS } from '@/lib/contracts/battle-abi';
import { Slider } from "@/components/ui/slider";
import { contractToast } from '@/lib/utils';

interface BetButtonProps {
  selectedChain: 'solana' | 'base' | 'info';
}

export function BetButton({ selectedChain }: BetButtonProps) {
  const [betAmount, setBetAmount] = useState('');
  const [showBetDialog, setShowBetDialog] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isBetting, setIsBetting] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(true);
  const [tokenBalance, setTokenBalance] = useState('0');
  const { login, authenticated } = usePrivy();

  useEffect(() => {
    checkAllowance();
    checkBalance();
  }, [betAmount]);

  async function checkAllowance() {
    try {
      if (typeof window.ethereum !== 'undefined' && authenticated) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const tokenContract = new ethers.Contract(TOKEN_ADDRESS, [
          'function allowance(address owner, address spender) view returns (uint256)'
        ], provider);
        
        const userAddress = await signer.getAddress();
        const allowance = await tokenContract.allowance(userAddress, BATTLE_ADDRESS);
        const amountInWei = ethers.utils.parseEther(betAmount || '0');
        
        setNeedsApproval(allowance.lt(amountInWei));
      }
    } catch (error) {
      console.error('Error checking allowance:', error);
    }
  }

  async function checkBalance() {
    try {
      if (typeof window.ethereum !== 'undefined' && authenticated) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const tokenContract = new ethers.Contract(TOKEN_ADDRESS, [
          'function balanceOf(address account) view returns (uint256)'
        ], provider);
        
        const userAddress = await signer.getAddress();
        const balance = await tokenContract.balanceOf(userAddress);
        const formattedBalance = ethers.utils.formatEther(balance);
        setTokenBalance(formattedBalance);
      }
    } catch (error) {
      console.error('Error checking balance:', error);
    }
  }

  const handleBet = async () => {
    if (!authenticated) {
      contractToast.wallet.notConnected();
      login();
      return;
    }

    if (typeof window.ethereum === 'undefined') {
      contractToast.wallet.notInstalled();
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      if (needsApproval) {
        setIsApproving(true);
        contractToast.loading('Approving token spending...');
        
        const tokenContract = new ethers.Contract(TOKEN_ADDRESS, [
          'function approve(address spender, uint256 amount) returns (bool)'
        ], signer);

        const amountInWei = ethers.utils.parseEther(betAmount);
        const tx = await tokenContract.approve(BATTLE_ADDRESS, amountInWei);
        await tx.wait();
        
        contractToast.success('Token approval successful!');
        setIsApproving(false);
        setNeedsApproval(false);
      } else {
        setIsBetting(true);
        contractToast.loading(`Placing bet of ${betAmount} FUZZ on ${selectedChain}...`);
        
        const battleContract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, signer);
        const amountInWei = ethers.utils.parseEther(betAmount);
        const tx = await battleContract.betOnAgent(selectedChain === 'solana', amountInWei);
        await tx.wait();
        
        contractToast.success(`Successfully bet ${betAmount} FUZZ on ${selectedChain}!`);
        setIsBetting(false);
        setShowBetDialog(false);
        setBetAmount('');
      }
    } catch (error) {
      console.error('Error:', error);
      contractToast.error(error);
      setIsApproving(false);
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
        disabled={isApproving || isBetting}
        variant="outline"
        className="w-full"
      >
        {!authenticated ? 'Connect Wallet' : 
         isApproving ? 'Approving...' : 
         isBetting ? 'Betting...' : 
         needsApproval ? `Bet for ${selectedChain}`: 
         `Bet for ${selectedChain}`}
      </Button>

      <Dialog open={showBetDialog} onOpenChange={setShowBetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place your bet for {selectedChain}</DialogTitle>
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
              disabled={!betAmount || isApproving || isBetting || Number(betAmount) > Number(tokenBalance)}
              className="w-full"
            >
              {!authenticated ? 'Connect Wallet' : 
               isApproving ? 'Approving...' : 
               isBetting ? 'Betting...' : 
               needsApproval ? 'Approve Token' : 
               Number(betAmount) > Number(tokenBalance) ? 'Insufficient Balance' :
               `Bet ${Number(betAmount).toFixed(2)} FUZZ for ${selectedChain}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}