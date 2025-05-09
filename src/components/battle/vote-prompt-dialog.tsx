'use client'; 

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { BATTLE_ABI, BATTLE_ADDRESS, TOKEN_ADDRESS, BETTING_AMOUNT } from '@/lib/contracts/battle-abi';
import { getPrompts, Prompt, incrementVoteCount } from '@/lib/supabase';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Vote, Coins } from "lucide-react";
import { contractToast } from '@/lib/utils';
import { VotePromptDialogProps} from "@/types/battle"
import { useTokenAllowance } from "@/hooks/useTokenAllowance";
import { useNetworkSwitch } from "@/hooks/useNetworkSwitch";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useInvalidations } from '@/hooks/useInvalidations';
import { InsufficientFuzzDialog } from './insufficient-fuzz-dialog';
import { CHAMPION1, CHAMPION2, CHAMPION1_NAME, CHAMPION2_NAME } from '@/lib/constants';

function truncateAddress(address: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function VotePromptDialog({ selectedChampion, onClose }: VotePromptDialogProps) {
  const { switchToBaseMainnet } = useNetworkSwitch();
  const { invalidateAll } = useInvalidations();
  const { 
    formattedBalance: tokenBalance 
  } = useTokenBalance({ 
    tokenAddress: TOKEN_ADDRESS 
  });

  const { checkAndApproveAllowance, isCheckingAllowance } = useTokenAllowance({
    spenderAddress: BATTLE_ADDRESS,
    requiredAmount: BETTING_AMOUNT
  });

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [showInsufficientFuzzDialog, setShowInsufficientFuzzDialog] = useState(false);
  const { login, authenticated } = usePrivy();

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setIsLoading(true);
      const promptsData = await getPrompts(selectedChampion === CHAMPION1);
      setPrompts(promptsData);
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (promptId: number) => {
    if (!authenticated) {
      contractToast.wallet.notConnected();
      login();
      return;
    }

    // Check if user has enough FUZZ - Convert both to same unit (wei)
    const userBalanceInWei = ethers.utils.parseEther(tokenBalance || '0');
    if (userBalanceInWei.lt(BETTING_AMOUNT)) {
      setShowInsufficientFuzzDialog(true);
      return;
    }

    setIsVoting(true);

    try {
      const networkSwitched = await switchToBaseMainnet();
      if (!networkSwitched) return;

      const allowanceApproved = await checkAndApproveAllowance();
      if (!allowanceApproved) return;

      contractToast.loading('Submitting vote...');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const battleContract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, signer);
      const tx = await battleContract.voteForPrompt(promptId, BETTING_AMOUNT);
      await tx.wait();

      // Increment vote count in Supabase
      await incrementVoteCount(promptId);

      contractToast.success('Vote submitted successfully! 🎉');

      invalidateAll();
      onClose();
    } catch (error) {
      console.error('Error voting:', error);
      contractToast.error(error);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vote for {selectedChampion === CHAMPION1 ? CHAMPION1_NAME : CHAMPION2_NAME} Prompts</DialogTitle>
          <DialogDescription>
            Select a prompt to vote for. Your vote will help determine which prompt gets sent to the AI.
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm text-muted-foreground mb-4">
          Available Balance: {Number(tokenBalance).toFixed(2)} FUZZ
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : prompts.length > 0 ? (
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4 pr-4">
              {prompts.map((prompt) => (
                <Card key={prompt.id} className="p-4">
                  <CardHeader className="p-0">
                    <CardTitle className="text-base">{prompt.short_description}</CardTitle>
                    <CardDescription className="text-xs truncate">
                      by {truncateAddress(prompt.wallet_address)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 mt-4">
                    <p className="text-sm text-muted-foreground">{prompt.message}</p>
                  </CardContent>
                  <CardFooter className="p-0 mt-4">
                    <Button 
                      onClick={() => handleVote(prompt.prompt_id)} 
                      disabled={isVoting || isCheckingAllowance}
                      className={`w-full ${ethers.utils.parseEther(tokenBalance || '0').lt(BETTING_AMOUNT) ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                    >
                      {isVoting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Voting...
                        </>
                      ) : ethers.utils.parseEther(tokenBalance || '0').lt(BETTING_AMOUNT) ? (
                        <>
                          <Coins className="mr-2 h-4 w-4" />
                          Insufficient FUZZ Balance
                        </>
                      ) : (
                        <>
                          <Vote className="mr-2 h-4 w-4" />
                          Vote ({ethers.utils.formatEther(BETTING_AMOUNT)} FUZZ)
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No prompts available for voting
          </div>
        )}
      </DialogContent>

      <InsufficientFuzzDialog
        isOpen={showInsufficientFuzzDialog}
        onClose={() => setShowInsufficientFuzzDialog(false)}
        requiredAmount={ethers.utils.formatEther(BETTING_AMOUNT)}
        currentBalance={tokenBalance}
      />
    </>
  );
}