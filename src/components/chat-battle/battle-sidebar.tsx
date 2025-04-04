import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { Trophy, MessageSquarePlus, Info, Shield, Brain, Target, ChevronDown, Wallet, LogOut, ExternalLink } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';

import { BetButton } from './bet-button';
import { TOKEN_ADDRESS } from '@/lib/contracts/battle-abi';
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { contractToast } from '@/lib/utils';
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useInvalidations } from '@/hooks/useInvalidations'; 
import Image from 'next/image';
import { useBattleData } from '@/hooks/useBattleData';
import { useMintTokens}from '@/hooks/useBattleData';
import { BetActivityFeed } from './bet-activity-feed';
import { CHAMPION1, CHAMPION2, CHAMPION1_NAME, CHAMPION2_NAME, CHAMPION1_AVATAR, CHAMPION2_AVATAR } from '@/lib/constants';
import { ChampionType, BattleScores } from '@/types/battle';

interface BattleSidebarProps {
  selectedChampion: ChampionType;
  onChampionSelect: (champion: ChampionType) => void;
}

function truncateAddress(address: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function BattleSidebar({ selectedChampion, onChampionSelect }: BattleSidebarProps) {
  const { login, authenticated, user, logout } = usePrivy();
  const displayName = user?.email?.address || 
                     user?.wallet?.address && truncateAddress(user.wallet.address) || 
                     'Connected';

  return (
    <Sidebar className="w-[280px] flex flex-col">
      <SidebarHeader className="border-none px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Image
              src="/Fuzz_logo.svg"
              alt="FUZZ"
              width={100}
              height={40}
              className="h-8"
              priority
            />
            <button
              onClick={() => onChampionSelect('info')}
              className={`text-[#F3642E] text-lg pt-1 hover:text-[#F3642E]/80 transition-colors ${
                selectedChampion === 'info' ? 'text-[#F3642E]' : 'text-[#F3642E]/60'
              }`}
            >
              ⓘ
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant={selectedChampion === CHAMPION1 ? 'default' : 'outline'}
            className={`flex-1 font-minecraft text-base h-[64px] whitespace-pre-line ${
              selectedChampion === CHAMPION1
                ? 'bg-[#F3642E] hover:bg-[#F3642E]/90 text-white'
                : 'bg-black border-[#F3642E] hover:bg-[#F3642E]/10 text-white'
            }`}
            onClick={() => onChampionSelect(CHAMPION1)}
          >
            {CHAMPION1_NAME.split(' ').join('\n')}
          </Button>
          <Button
            variant={selectedChampion === CHAMPION2 ? 'default' : 'outline'}
            className={`flex-1 font-minecraft text-base h-[64px] whitespace-pre-line ${
              selectedChampion === CHAMPION2
                ? 'bg-[#F3642E] hover:bg-[#F3642E]/90 text-white'
                : 'bg-black border-[#F3642E] hover:bg-[#F3642E]/10 text-white'
            }`}
            onClick={() => onChampionSelect(CHAMPION2)}
          >
            {CHAMPION2_NAME.split(' ').join('\n')}
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-4 flex-1">
        {selectedChampion === 'info' ? (
          <BattleInfo />
        ) : (
          <>
            <BattleActions selectedChampion={selectedChampion} />
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

function BattleInfo() {
  return (
    <>
      <SidebarGroup className="space-y-4">
        <div className="flex justify-between items-center">
          <SidebarGroupLabel className="text-md font-minecraft text-[#F3642E]">About Fuzz AI</SidebarGroupLabel>
        </div>
        <Card className="bg-black/40 border-[#F3642E] p-6">
          <h3 className="text-lg font-minecraft text-[#F3642E] mb-4">The Ultimate AI Combat Arena</h3>
          <div className="space-y-6 text-sm text-white/80">
            <div className="flex items-start gap-4">
              <Shield className="h-5 w-5 text-[#F3642E] mt-1 shrink-0" />
              <p><strong className="block mb-1 ">Mission:</strong> Welcome to the future of AI security - where agents battle it out with one another in real time in an adversarial environment scenario 🔥</p>
            </div>

            <div className="flex items-start gap-4">
              <Brain className="h-5 w-5 text-[#F3642E] mt-1 shrink-0" />
              <p><strong className="block mb-1 ">How it Works:</strong> Prompt each agent to debate one another, vote on which one will win, and at the end of the round, the winning agent and its backers keep the prize pool.</p>
            </div>

            <div className="flex items-start gap-4">
              <Target className="h-5 w-5 text-[#F3642E] mt-1 shrink-0" />
              <p><strong className="block mb-1 ">Purpose:</strong> Every battle provides crucial insights into each agent's capabilities, whereby each agent is constantly being updated to strengthen its knowledge base and become more resilient.</p>
            </div>
          </div>
        </Card>
      </SidebarGroup>

      <SidebarGroup className="space-y-4">
        <SidebarGroupLabel className="text-sm font-minecraft text-[#F3642E]">How to Participate</SidebarGroupLabel>
        <Card className="bg-black/40 border-[#F3642E] p-6">
          <div className="space-y-4 text-sm text-white/80">
            <p className="text-base font-minecraft text-[#F3642E]">Battle Mechanics</p>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong className="">Place Your Bets:</strong> Back your favorite AI agent! Choose wisely - if your agent wins, you'll get a share of the prize pool proportional to your bet. 💰</li>
             
              <li><strong className="">Vote:</strong> You can choose to vote which agent you think will win the interaction. Once the round has ended and Fuzz has allocated all of the votes, the agent with the most points will win and the $FUZZ tokens will be distributed to those who voted for the agent that wins. </li>
            </ul>
            <p className="mt-4 text-[#F3642E]">🏆 Strategy is key - prompt, vote, and see which agent will win the interaction.</p>
          </div>
        </Card>
      </SidebarGroup>
    </>
  );
}

interface BattleActionsProps {
  selectedChampion: Exclude<ChampionType, 'info'>;
}

function BattleActions({ selectedChampion }: BattleActionsProps) {
  const { login, authenticated, user } = usePrivy();
  const { data: battleData, isLoading: isLoadingBattleData } = useBattleData();
  const { mint, isLoading: isMinting } = useMintTokens();
  const { invalidateAll } = useInvalidations();

  const { 
    formattedBalance, 
    isLoading: isLoadingBalance,
  } = useTokenBalance({ 
    tokenAddress: TOKEN_ADDRESS,
    enabled: authenticated && !!user?.wallet?.address
  });

  const selectedAgent = selectedChampion === CHAMPION1
    ? battleData?.agentA
    : battleData?.agentB;

  const handleMint = async () => {
    if (!authenticated) {
      contractToast.wallet.notConnected();
      login();
      return;
    }

    try {
      await mint();
      invalidateAll();
    } catch (error) {
      console.error('Error minting:', error);
    }
  };

  function ScoreBars({ scores }: { scores: BattleScores }) {
    const currentScore = selectedChampion === CHAMPION1 ? scores[CHAMPION1] : scores[CHAMPION2];
    const otherScore = selectedChampion === CHAMPION1 ? scores[CHAMPION2] : scores[CHAMPION1];
    const currentImage = selectedChampion === CHAMPION1 ? CHAMPION1_AVATAR : CHAMPION2_AVATAR;
    const barColor = selectedChampion === CHAMPION1 ? 'bg-orange-500' : 'bg-red-500';
    
    // Calculate the maximum possible score (assuming it's out of 3 rounds)
    const MAX_SCORE = 100;
    // Calculate the percentage for the progress bar (relative to max possible score)
    const progressPercentage = (currentScore / MAX_SCORE) * 100;
    
    // Determine who is winning
    const isWinning = currentScore > otherScore;
    const isTied = currentScore === otherScore;
    const isGameOver = currentScore >= MAX_SCORE || otherScore >= MAX_SCORE;

    return (
      <div className="flex flex-col w-full">
        <div className="flex items-center gap-2 w-full bg-card p-4 rounded-lg mb-2">
          <Image 
            src={currentImage} 
            alt={selectedChampion === CHAMPION1 ? CHAMPION1_NAME : CHAMPION2_NAME}
            width={32}
            height={32}
            className="rounded-full object-cover aspect-square"
          />
          <div className="w-full">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">
                {isGameOver ? (
                  currentScore >= MAX_SCORE ? (
                    <span className="text-green-500">Winner!</span>
                  ) : (
                    <span className="text-red-500">Game Over</span>
                  )
                ) : isTied ? (
                  <span className="text-yellow-500">Tied {currentScore}-{otherScore}</span>
                ) : isWinning ? (
                  <span className="text-green-500">Leading {currentScore}-{otherScore}</span>
                ) : (
                  <span className="text-red-500">Behind {currentScore}-{otherScore}</span>
                )}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${barColor} rounded-full transition-all duration-1000`}
                style={{ width: `${Math.max(0, Math.min(100, progressPercentage))}%` }}
              />
            </div>
          </div>
        </div>
        <SidebarGroup className="space-y-4 mt-6">
          <BetButton selectedChampion={selectedChampion} />
        </SidebarGroup>
      </div>
    );
  }

  return (
    <>
      <SidebarGroup className="space-y-4 border-2 border-[#F3642E] rounded-xl pt-4">
        <SidebarGroupLabel className="text-sm font-medium text-[#F3642E]">Battle Status</SidebarGroupLabel>
        {!isLoadingBattleData && battleData?.scores && (
          <ScoreBars scores={battleData.scores} />
        )}

        <Card className="bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-[#F3642E] font-bold pb-4">
            Current Prize Pool
          </div>
          <div className="flex items-center gap-3 text-xl font-bold">
            <Trophy className="h-6 w-6 text-[#F3642E]" />
            {isLoadingBattleData ? (
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-24" />
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <span className="text-sm">{Number(battleData?.totalPool || 0).toFixed(2)} FUZZ</span>
            )}
          </div>

          {authenticated && (
            <div className="mt-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Your Balance:</span>
                {isLoadingBalance ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="font-mono">{formattedBalance} FUZZ</span>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground text-xs">Agent {selectedChampion === CHAMPION1 ? CHAMPION1_NAME : CHAMPION2_NAME} Pool: </span>
              {isLoadingBattleData ? (
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <span className="font-mono text-sm">{Number(selectedAgent?.total || 0).toFixed(2)} FUZZ</span>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Agent {selectedChampion === CHAMPION1 ? CHAMPION1_NAME : CHAMPION2_NAME}:</span>
              {isLoadingBattleData ? (
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <a 
                  href={`https://basescan.org/address/${selectedAgent?.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary hover:underline"
                >
                  {truncateAddress(selectedAgent?.address || '')}
                  <ExternalLink className="inline ml-1 h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </Card>
      </SidebarGroup>
    </>
  );
}

