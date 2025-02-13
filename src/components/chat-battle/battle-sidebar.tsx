'use client';

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
import { Trophy, Vote, MessageSquarePlus, Info, Shield, Brain, Target, ChevronDown, Wallet, LogOut, ExternalLink } from 'lucide-react';
import { XIcon, TelegramIcon } from '@/components/icons';
import { usePrivy } from '@privy-io/react-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BetButton } from './bet-button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { VotePromptDialog } from '@/components/battle/vote-prompt-dialog';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { BATTLE_ABI, BATTLE_ADDRESS, TOKEN_ADDRESS, TOKEN_ABI } from '@/lib/contracts/battle-abi';
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { ThemeToggle } from '../theme-toggle';
import { contractToast } from '@/lib/utils';
import { useBattleParticipants} from '@/hooks/useBattleParticipants';
import { useNetworkSwitch } from '@/hooks/useNetworkSwitch';
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useQueryClient } from '@tanstack/react-query';
import { Message } from '@/types/battle';

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
    <Sidebar className="w-[300px] border-r flex flex-col">
      <SidebarHeader className="border-b pb-4 px-4">
        <div className="flex gap-2">
          <Button
            variant={selectedChampion === 'trump' ? 'default' : 'outline'}
            className={`flex-1 ${
              selectedChampion === 'trump'
                ? 'bg-primary hover:bg-primary/90'
                : ''
            }`}
            onClick={() => onChampionSelect('trump')}
          >
            Donald Trump
          </Button>
          <Button
            variant={selectedChampion === 'xi' ? 'default' : 'outline'}
            className={`flex-1 ${
              selectedChampion === 'xi'
                ? 'bg-primary hover:bg-primary/90'
                : ''
            }`}
            onClick={() => onChampionSelect('xi')}
          >
            Xi Jinping
          </Button>
          <Button
            variant={selectedChampion === 'info' ? 'default' : 'outline'}
            className={`w-10 px-0 ${
              selectedChampion === 'info'
                ? 'bg-primary/10 hover:bg-primary/20 text-primary dark:bg-primary/20 dark:hover:bg-primary/30'
                : 'hover:bg-primary/10 dark:border-primary/20 dark:hover:bg-primary/20'
            }`}
            onClick={() => onChampionSelect('info')}
          >
            <Info className="h-4 w-4" />
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
          <SidebarGroupLabel className="text-sm font-medium">About Fuzz AI</SidebarGroupLabel>
          <ThemeToggle />
        </div>
        <Card className="bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">The Ultimate AI Combat Arena</h3>
          <div className="space-y-6 text-sm text-muted-foreground">
            <div className="flex items-start gap-4">
              <Shield className="h-5 w-5 text-primary mt-1 shrink-0" />
              <p><strong className="block mb-1">Mission:</strong> Welcome to the future of AI security - where elite agents battle it out in real-time combat scenarios! 🔥</p>
            </div>

            <div className="flex items-start gap-4">
              <Brain className="h-5 w-5 text-primary mt-1 shrink-0" />
              <p><strong className="block mb-1">How it Works:</strong> Watch AI champions showcase their skills in epic battles, revealing their strategies, defenses, and tactical prowess.</p>
            </div>

            <div className="flex items-start gap-4">
              <Target className="h-5 w-5 text-primary mt-1 shrink-0" />
              <p><strong className="block mb-1">Purpose:</strong> Every battle provides crucial insights into AI capabilities, pushing the boundaries of what's possible in AI security.</p>
            </div>
          </div>
        </Card>
      </SidebarGroup>

      <SidebarGroup className="space-y-4">
        <SidebarGroupLabel className="text-sm font-medium">How to Participate</SidebarGroupLabel>
        <Card className="bg-card p-6">
          <div className="space-y-4 text-sm text-muted-foreground">
            <p className="text-base font-medium">🎮 Battle Mechanics</p>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong>Place Your Bets:</strong> Back your favorite AI agent! Choose wisely - if your agent wins, you'll get a share of the prize pool proportional to your bet. 💰</li>
              <li><strong>Submit Prompts:</strong> Help your agent improve by submitting strategic prompts. If the community votes for your prompt and your agent wins, you'll receive a larger share of the pool! 🎯</li>
              <li><strong>Vote & Earn:</strong> Vote for the best prompts in the community. Supporting winning strategies pays off - if your chosen prompt is selected and your agent wins, you'll earn bonus rewards! 🗳️</li>
            </ul>
            <p className="mt-4 font-large font-bold text-primary">🏆 Strategy is key - Bet, Submit, Vote, and multiply your winnings!</p>
          </div>
        </Card>
      </SidebarGroup>
    </>
  );
}

interface BattleActionsProps {
  selectedChampion: 'trump' | 'xi';
}

interface AgentInfo {
  name: string;
  address: string;
  total: string;
}
function BattleActions({ selectedChampion }: BattleActionsProps) {
  const { login, authenticated } = usePrivy();
  const { participants, isLoading: isLoadingParticipants } = useBattleParticipants();
  const { switchToBaseSepolia } = useNetworkSwitch();
  const { formattedBalance, isLoading: isLoadingBalance, refresh: refreshBalance } = useTokenBalance({
    tokenAddress: TOKEN_ADDRESS,
    enabled: authenticated
  });
  const queryClient = useQueryClient();

  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [isLoadingPool, setIsLoadingPool] = useState(true);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [totalPool, setTotalPool] = useState<string>('0');
  const [agentA, setAgentA] = useState<AgentInfo>({ name: 'Trump', address: '', total: '0' });
  const [agentB, setAgentB] = useState<AgentInfo>({ name: 'Xi', address: '', total: '0' });
  const [isMinting, setIsMinting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);

  // Parse scores function
  const parseScores = (text: string): { trump: number; xi: number } | null => {
    const match = text.match(/\[Trump (\d+) \| Xi (\d+)\]/);
    if (match) {
      return {
        trump: parseInt(match[1]),
        xi: parseInt(match[2])
      };
    }
    return null;
  };

  // Get the latest scores from messages by parsing the text
  const messages = queryClient.getQueryData<Message[]>(["messages"]) || [];
  const latestMessage = messages[messages.length - 1];
  const parsedScores = latestMessage?.text ? parseScores(latestMessage.text) : null;
  const currentScores = parsedScores || { trump: 3, xi: 3 }; // Default to full lives

  useEffect(() => {
    async function fetchContractData() {
      const now = Date.now();
      if (now - lastUpdate < 5000) return;

      setIsLoadingPool(true);
      setIsLoadingAgents(true);

      try {
        if (typeof window.ethereum !== 'undefined') {
          const isCorrectNetwork = await switchToBaseSepolia();
          if (!isCorrectNetwork) return;

          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const contract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, provider);

          const total = await contract.getTotalAcumulated();
          setTotalPool(ethers.utils.formatEther(total));
          setIsLoadingPool(false);

          const [agentAAddress, agentBAddress, totalA, totalB] = await Promise.all([
            contract.agentA(),
            contract.agentB(),
            contract.totalAgentA(),
            contract.totalAgentB()
          ]);

          setAgentA(prev => ({
            ...prev,
            address: agentAAddress,
            total: ethers.utils.formatEther(totalA)
          }));
          setAgentB(prev => ({
            ...prev,
            address: agentBAddress,
            total: ethers.utils.formatEther(totalB)
          }));

          setLastUpdate(now);
        }
      } catch (error) {
        console.error('Error fetching contract data:', error);
      } finally {
        setIsLoadingPool(false);
        setIsLoadingAgents(false);
      }
    }

    fetchContractData();
    const interval = setInterval(fetchContractData, 60000);
    return () => clearInterval(interval);
  }, [switchToBaseSepolia, lastUpdate]);

  const handleMint = async () => {
    if (!authenticated) {
      contractToast.wallet.notConnected();
      login();
      return;
    }

    setIsMinting(true);
    try {
      const isCorrectNetwork = await switchToBaseSepolia();
      if (!isCorrectNetwork) {
        setIsMinting(false);
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      contractToast.loading('Minting FUZZ tokens...');
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
      const tx = await tokenContract.mint();
      await tx.wait();

      contractToast.success('Successfully minted FUZZ tokens! 🎉');
      await refreshBalance();
    } catch (error) {
      console.error('Error minting:', error);
      contractToast.error(error);
    } finally {
      setIsMinting(false);
    }
  };

  // ScoreBars component
  function ScoreBars({ scores }: { scores: { trump: number; xi: number } }) {
    const currentScore = selectedChampion === 'trump' ? scores.trump : scores.xi;
    const currentImage = selectedChampion === 'trump' ? '/trump.png' : '/xi.png';
    const barColor = selectedChampion === 'trump' ? 'bg-orange-500' : 'bg-red-500';
    const isGameOver = currentScore === 0;

    return (
      <div className="flex flex-col w-full">
        <div className="flex items-center gap-2 w-full bg-card p-4 rounded-lg mb-2">
          <img src={currentImage} alt={selectedChampion} className="w-8 h-8 rounded-full" />
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

  // Selected agent logic
  const selectedAgent = selectedChampion === 'trump' ? agentA : agentB;

  return (
    <>
      <SidebarGroup className="space-y-4">
        <SidebarGroupLabel className="text-sm font-medium">Battle Status</SidebarGroupLabel>
        {!isLoadingAgents && <ScoreBars scores={currentScores} />}

        <Card className="bg-card p-6">
          <div className="flex items-center gap-3 text-xl font-bold">
            <Trophy className="h-6 w-6 text-yellow-500" />
            {isLoadingPool ? (
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-24" />
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <span>{Number(totalPool).toFixed(2)} FUZZ</span>
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
              <span className="text-muted-foreground">Agent {selectedAgent.name} Total:</span>
              {isLoadingAgents ? (
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <span className="font-mono">{selectedAgent.total} FUZZ</span>
              )}
            </div>
          </div>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Agent {selectedAgent.name}:</span>
              {isLoadingAgents ? (
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <a 
                  href={`https://sepolia.basescan.org/address/${selectedAgent.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary hover:underline"
                >
                  {truncateAddress(selectedAgent.address)}
                  <ExternalLink className="inline ml-1 h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex justify-between items-center text-sm font-medium">
              <span>Participants for {selectedAgent.name}</span>
              <span className="text-xs text-muted-foreground">
                {participants.filter(p => 
                  selectedChampion === 'trump' 
                    ? Number(p.contributionA) > 0 
                    : Number(p.contributionB) > 0
                ).length} total
              </span>
            </div>

            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {isLoadingParticipants ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : participants.length > 0 ? (
                participants
                  .filter(p => 
                    selectedChampion === 'trump' 
                      ? Number(p.contributionA) > 0 
                      : Number(p.contributionB) > 0
                  )
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
                  No participants yet for {selectedAgent.name}
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

        <Button 
          className="w-full mb-3" 
          variant="secondary" 
          size="lg"
          onClick={() => setShowVoteDialog(true)}
          disabled={isLoadingPool || isLoadingAgents}
        >
          {isLoadingPool || isLoadingAgents ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Vote className="mr-2 h-5 w-5" />
          )}
          Vote for next prompt
        </Button>
      </SidebarGroup>

      <Dialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <VotePromptDialog 
            selectedChampion={selectedChampion} 
            onClose={() => setShowVoteDialog(false)} 
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
