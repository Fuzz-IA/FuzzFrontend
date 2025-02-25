'use client';

import { Button } from '@/components/ui/button';
import { XIcon, TelegramIcon } from '@/components/icons';
import { usePrivy } from '@privy-io/react-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, ExternalLink } from 'lucide-react';
import { BetActivityFeed } from './bet-activity-feed';
import Image from 'next/image';

function truncateAddress(address: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ChatHeader() {
  const { login, authenticated, user, logout } = usePrivy();
  const displayName = user?.email?.address || 
                     user?.wallet?.address && truncateAddress(user.wallet.address) || 
                     'Connected';

  return (
    <div className="border-b border-[#F3642E]/20">
      <div className="flex items-center justify-between p-4">
        <div className="flex-1 flex justify-center">
          <BetActivityFeed maxItems={3} />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="bg-[#F3642E]/10 hover:bg-[#F3642E]/20 text-[#F3642E]"
              onClick={() => window.open('https://x.com/fuzzai_agent', '_blank')}
              aria-label="Twitter"
            >
              <XIcon className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-[#F3642E]/10 hover:bg-[#F3642E]/20 text-[#F3642E]"
              onClick={() => window.open('https://t.me/fuzzai', '_blank')}
              aria-label="Telegram"
            >
              <TelegramIcon className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-[#F3642E]/10 hover:bg-[#F3642E]/20 text-[#F3642E]"
              onClick={() => window.open('https://app.uniswap.org/swap?outputCurrency=0xab9AFF6f259787300bBB16DD1fa0c622426Aa169&chain=base', '_blank')}
              aria-label="Buy on Uniswap"
            >
              <Image
                src="/uniswap-uni-logo.svg"
                alt="Uniswap"
                width={20}
                height={20}
                className="h-5 w-5"
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-[#F3642E]/10 hover:bg-[#F3642E]/20 text-[#F3642E]"
              onClick={() => window.open('https://fuzz-ai.gitbook.io/fuzz-ai-docs', '_blank')}
              aria-label="Documentation"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </Button>
          </div>

          {authenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#F3642E] hover:bg-[#F3642E]/90 text-white transition-colors font-minecraft">
                {displayName}
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[264px]">
                {user?.wallet?.address && (
                  <DropdownMenuItem className="cursor-pointer font-minecraft" onClick={() => window.open(`https://etherscan.io/address/${user?.wallet?.address}`, '_blank')}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    <span>View on Etherscan</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-500 focus:text-red-500 font-minecraft">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Disconnect</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              onClick={() => login()} 
              className="bg-[#F3642E] hover:bg-[#F3642E]/90 text-white font-minecraft"
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 