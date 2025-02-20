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
    <div className="flex items-center justify-end gap-4 p-4 border-b border-[#F3642E]/20">
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="bg-[#F3642E]/10 hover:bg-[#F3642E]/20 text-[#F3642E]"
          onClick={() => window.open('https://twitter.com/fuzzai_xyz', '_blank')}
          aria-label="Twitter"
        >
          <XIcon className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="bg-[#F3642E]/10 hover:bg-[#F3642E]/20 text-[#F3642E]"
          onClick={() => window.open('https://t.me/fuzzai_xyz', '_blank')}
          aria-label="Telegram"
        >
          <TelegramIcon className="h-5 w-5" />
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
  );
} 