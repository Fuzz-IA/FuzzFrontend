'use client';


import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { BATTLE_ABI, BATTLE_ADDRESS, TOKEN_ADDRESS } from '@/lib/contracts/battle-abi';

interface BetButtonProps {
  selectedChain: 'solana' | 'base' | 'info';
}

export function BetButton({ selectedChain }: BetButtonProps) {
  const [betAmount, setBetAmount] = useState('');
  const [showBetDialog, setShowBetDialog] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isBetting, setIsBetting] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(true);
  const { login, authenticated } = usePrivy();

  useEffect(() => {
    checkAllowance();
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

  const handleBet = async () => {
    if (!authenticated) {
      login();
      return;
    }

    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask!');
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      if (needsApproval) {
        setIsApproving(true);
        const tokenContract = new ethers.Contract(TOKEN_ADDRESS, [
          'function approve(address spender, uint256 amount) returns (bool)'
        ], signer);

        const amountInWei = ethers.utils.parseEther(betAmount);
        const tx = await tokenContract.approve(BATTLE_ADDRESS, amountInWei);
        await tx.wait();
        setIsApproving(false);
        setNeedsApproval(false);
      } else {
        setIsBetting(true);
        const battleContract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, signer);
        const amountInWei = ethers.utils.parseEther(betAmount);
        const tx = await battleContract.betOnAgent(selectedChain === 'solana', amountInWei);
        await tx.wait();
        setIsBetting(false);
        setShowBetDialog(false);
        setBetAmount('');
      }
    } catch (error) {
      console.error('Error:', error);
      setIsApproving(false);
      setIsBetting(false);
    }
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
          <div className="flex flex-col gap-4">
            <Input
              type="number"
              placeholder="Enter amount to bet"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
            />
            <Button 
              onClick={handleBet} 
              disabled={!betAmount || isApproving || isBetting}
              className="w-full"
            >
              {!authenticated ? 'Connect Wallet' : 
               isApproving ? 'Approving...' : 
               isBetting ? 'Betting...' : 
               needsApproval ? 'Approve Token' : 
               `Bet for ${selectedChain}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}