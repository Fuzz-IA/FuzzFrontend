
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Trophy, MessageSquarePlus, Info, Shield, Brain, Target, ChevronDown, Wallet, LogOut, ExternalLink } from 'lucide-react';
import { XIcon, TelegramIcon } from '@/components/icons';
import { usePrivy } from '@privy-io/react-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BetButton } from './bet-button';
import {  TOKEN_ADDRESS } from '@/lib/contracts/battle-abi';
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { ThemeToggle } from '../theme-toggle';
import { contractToast } from '@/lib/utils';
import { useBattleParticipants} from '@/hooks/useBattleParticipants';
import { useTokenBalance } from "@/hooks/useTokenBalance";

import Image from 'next/image';
import { useBattleData } from '@/hooks/useBattleData';
import { useMintTokens}from '@/hooks/useBattleData';

interface BattleSidebarProps {
  selectedChampion: 'trump' | 'xi' | 'info';
  onChampionSelect: (champion: 'trump' | 'xi' | 'info') => void;
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
          <ThemeToggle />
        </div>
        <div className="flex gap-3">
          <Button
            variant={selectedChampion === 'trump' ? 'default' : 'outline'}
            className={`flex-1 font-minecraft text-base h-[64px] whitespace-pre-line ${
              selectedChampion === 'trump'
                ? 'bg-[#F3642E] hover:bg-[#F3642E]/90 text-white'
                : 'bg-black border-[#F3642E] hover:bg-[#F3642E]/10 text-white'
            }`}
            onClick={() => onChampionSelect('trump')}
          >
            Donald{'\n'}Trump
          </Button>
          <Button
            variant={selectedChampion === 'xi' ? 'default' : 'outline'}
            className={`flex-1 font-minecraft text-base h-[64px] whitespace-pre-line ${
              selectedChampion === 'xi'
                ? 'bg-[#F3642E] hover:bg-[#F3642E]/90 text-white'
                : 'bg-black border-[#F3642E] hover:bg-[#F3642E]/10 text-white'
            }`}
            onClick={() => onChampionSelect('xi')}
          >
            Xi{'\n'}Jinping
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-4 flex-1">
        {selectedChampion === 'info' ? (
          <BattleInfo />
        ) : (
          <BattleActions selectedChampion={selectedChampion} />
        )}
      </SidebarContent>
      <SidebarFooter className="border-t p-4 space-y-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary dark:bg-primary/20 dark:hover:bg-primary/30"
            onClick={() => window.open('https://twitter.com/fuzzai_xyz', '_blank')}
            aria-label="Twitter"
          >
            <XIcon className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary dark:bg-primary/20 dark:hover:bg-primary/30"
            onClick={() => window.open('https://t.me/fuzzai_xyz', '_blank')}
            aria-label="Telegram"
          >
            <TelegramIcon className="h-5 w-5" />
          </Button>
        </div>
        {authenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary dark:bg-primary/20 dark:hover:bg-primary/30 transition-colors font-medium">
              {displayName}
              <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[264px]">
              {user?.wallet?.address && (
                <DropdownMenuItem className="cursor-pointer" onClick={() => window.open(`https://etherscan.io/address/${user?.wallet?.address}`, '_blank')}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  <span>View on Etherscan</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-500 focus:text-red-500">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Disconnect</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button 
            onClick={() => login()} 
            className="w-full bg-primary/10 hover:bg-primary/20 text-primary dark:bg-primary/20 dark:hover:bg-primary/30"
            size="lg"
          >
            <Wallet className="mr-2 h-5 w-5" />
            Connect Wallet
          </Button>
        )}
      </SidebarFooter>
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
              <p><strong className="block mb-1 ">Mission:</strong> Welcome to the future of AI security - where elite agents battle it out in real-time combat scenarios! 🔥</p>
            </div>

            <div className="flex items-start gap-4">
              <Brain className="h-5 w-5 text-[#F3642E] mt-1 shrink-0" />
              <p><strong className="block mb-1 ">How it Works:</strong> Watch AI champions showcase their skills in epic battles, revealing their strategies, defenses, and tactical prowess.</p>
            </div>

            <div className="flex items-start gap-4">
              <Target className="h-5 w-5 text-[#F3642E] mt-1 shrink-0" />
              <p><strong className="block mb-1 ">Purpose:</strong> Every battle provides crucial insights into AI capabilities, pushing the boundaries of what's possible in AI security.</p>
            </div>
          </div>
        </Card>
      </SidebarGroup>

      <SidebarGroup className="space-y-4">
        <SidebarGroupLabel className="text-sm font-minecraft text-[#F3642E]">How to Participate</SidebarGroupLabel>
        <Card className="bg-black/40 border-[#F3642E] p-6">
          <div className="space-y-4 text-sm text-white/80">
            <p className="text-base font-minecraft text-[#F3642E]">🎮 Battle Mechanics</p>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong className="">Place Your Bets:</strong> Back your favorite AI agent! Choose wisely - if your agent wins, you'll get a share of the prize pool proportional to your bet. 💰</li>
              <li><strong className="">Submit Prompts:</strong> Help your agent improve by submitting strategic prompts. If the community votes for your prompt and your agent wins, you'll receive a larger share of the pool! 🎯</li>
              <li><strong className="">Vote & Earn:</strong> Vote for the best prompts in the community. Supporting winning strategies pays off - if your chosen prompt is selected and your agent wins, you'll earn bonus rewards! 🗳️</li>
            </ul>
            <p className="mt-4 text-[#F3642E]">🏆 Strategy is key - Bet, Submit, Vote, and multiply your winnings!</p>
          </div>
        </Card>
      </SidebarGroup>
    </>
  );
}

interface BattleActionsProps {
  selectedChampion: 'trump' | 'xi';
}



function BattleActions({ selectedChampion }: BattleActionsProps) {
  const { login, authenticated, user } = usePrivy();
  const { data: battleData, isLoading: isLoadingBattleData } = useBattleData();
  const { mint, isLoading: isMinting } = useMintTokens();
  const { 
    data: participantsData, 
    isLoading: isLoadingParticipants,
    isFetching: isFetchingParticipants 
  } = useBattleParticipants();

  const { 
    formattedBalance, 
    isLoading: isLoadingBalance,
    refresh: refreshBalance 
  } = useTokenBalance({ 
    tokenAddress: TOKEN_ADDRESS,
    enabled: authenticated && !!user?.wallet?.address
  });

  const selectedAgent = selectedChampion === 'trump' 
    ? battleData?.agentA 
    : battleData?.agentB;

  const currentRatio = selectedChampion === 'trump' 
    ? battleData?.marketInfo.sideARatio 
    : battleData?.marketInfo.sideBRatio;

  const baseBetAmount = 2000; 
  const dynamicBetAmount = selectedChampion === 'trump'
    ? Number(battleData?.marketInfo.costForSideA || baseBetAmount)
    : Number(battleData?.marketInfo.costForSideB || baseBetAmount);

  const handleMint = async () => {
    if (!authenticated) {
      contractToast.wallet.notConnected();
      login();
      return;
    }

    try {
      await mint();
      refreshBalance();
    } catch (error) {
      console.error('Error minting:', error);
    }
  };

  function ScoreBars({ scores }: { scores: { trump: number; xi: number } }) {
    const currentScore = selectedChampion === 'trump' ? scores.trump : scores.xi;
    const currentImage = selectedChampion === 'trump' ? '/trump.png' : '/xi.png';
    const barColor = selectedChampion === 'trump' ? 'bg-orange-500' : 'bg-red-500';
    const isGameOver = currentScore === 0;

    return (
      <div className="flex flex-col w-full">
        <div className="flex items-center gap-2 w-full bg-card p-4 rounded-lg mb-2">
          <Image 
            src={currentImage} 
            alt={selectedChampion}
            width={32}
            height={32}
            className="rounded-full"
          />
          <div className="w-full">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${barColor} rounded-full transition-all duration-1000`}
                style={{ width: `${Math.max(0, Math.min(100, (currentScore / 3) * 100))}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground mt-1 block">{currentScore}/3 Lives</span>
          </div>
        </div>
        {isGameOver && (
          <div className="text-sm text-red-500 font-medium text-center mb-2">
            Game Over - {selectedChampion === 'trump' ? 'Trump' : 'Xi'} has lost!
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <SidebarGroup className="space-y-4">
        <SidebarGroupLabel className="text-sm font-medium">Battle Status</SidebarGroupLabel>
        {!isLoadingBattleData && battleData?.scores && (
          <ScoreBars scores={battleData.scores} />
        )}

        <Card className="bg-card p-6">
          <div className="flex items-center gap-3 text-xl font-bold">
            <Trophy className="h-6 w-6 text-yellow-500" />
            {isLoadingBattleData ? (
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-24" />
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <span>{Number(battleData?.totalPool || 0).toFixed(2)} FUZZ</span>
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
              <span className="text-muted-foreground">Agent {selectedAgent?.name} Total:</span>
              {isLoadingBattleData ? (
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <span className="font-mono">{selectedAgent?.total} FUZZ</span>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Market Ratio:</span>
              <span className="font-mono">{(currentRatio || 0).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Base Bet Amount:</span>
              <span className="font-mono">{baseBetAmount} FUZZ</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dynamic Bet Amount:</span>
              <span className="font-mono">{dynamicBetAmount.toFixed(2)} FUZZ</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {currentRatio > 50 ? (
                `Higher ratio increases required bet amount`
              ) : (
                `Lower ratio decreases required bet amount`
              )}
            </div>
          </div>

          <div className="mt-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Agent {selectedAgent?.name}:</span>
              {isLoadingBattleData ? (
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <a 
                  href={`https://sepolia.basescan.org/address/${selectedAgent?.address}`}
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

          <div className="mt-6 space-y-2">
            <div className="flex justify-between items-center text-sm font-medium">
              <span>Participants for {selectedAgent?.name}</span>
              <span className="text-xs text-muted-foreground">
                {participantsData?.participants?.filter(p => 
                  selectedChampion === 'trump' 
                    ? Number(p.contributionA) > 0 
                    : Number(p.contributionB) > 0
                )?.length || 0} total
              </span>
            </div>

            <div className="max-h-[200px] overflow-y-auto space-y-2 relative">
              {isFetchingParticipants && (
                <div className="absolute top-2 right-2">
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                </div>
              )}
              {isLoadingParticipants ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : participantsData?.participants?.length ? (
                participantsData.participants
                  .filter(p => {
                    return selectedChampion === 'trump' 
                      ? Number(p.contributionA) > 0 
                      : Number(p.contributionB) > 0;
                  })
                  .map((participant) => (
                    <div 
                      key={participant.address}
                      className="text-xs p-2 bg-muted/50 rounded-lg space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <a
                          href={`https://sepolia.basescan.org/address/${participant.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center"
                        >
                          {truncateAddress(participant.address)}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                        <span className="text-muted-foreground">
                          {Number(selectedChampion === 'trump' 
                            ? participant.contributionA 
                            : participant.contributionB
                          ).toFixed(2)} FUZZ
                        </span>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center text-sm text-muted-foreground py-4">
                  No participants yet for {selectedAgent?.name}
                </div>
              )}
            </div>
          </div>
        </Card>
      </SidebarGroup>

      <SidebarGroup className="space-y-4 mt-6">
        <Button
          className="w-full mb-3"
          variant="outline"
          onClick={handleMint}
          disabled={isMinting}
        >
          {isMinting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Minting...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Mint FUZZ Tokens
            </div>
          )}
        </Button>

        <BetButton selectedChampion={selectedChampion} />
      </SidebarGroup>
    </>
  );
}
