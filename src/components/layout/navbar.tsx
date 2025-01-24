'use client';

import Link from 'next/link'
import { Github, Twitter, ChevronDown, Wallet, LogOut, ExternalLink } from 'lucide-react'
import { usePrivy, User } from '@privy-io/react-auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface NavItem {
  label: string
  href: string
}

interface ExtendedUser extends User {
  ens?: {
    name: string;
  };
}

const navItems: NavItem[] = [
  { label: 'Battle', href: '/battle' },
  { label: 'Learn', href: '/' },
  { label: 'Roadmap', href: '/' },
  { label: 'Dexscreener', href: '/' },
]

function truncateAddress(address: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function Navbar() {
  const { login, authenticated, user, logout } = usePrivy();
  const extendedUser = user as ExtendedUser;

  const displayName = extendedUser?.email?.address || 
                     extendedUser?.ens?.name || 
                     (extendedUser?.wallet?.address && truncateAddress(extendedUser.wallet.address)) || 
                     'Connected';

  return (
    <nav className="flex items-center justify-between w-full max-w-7xl mx-auto px-6">
      <Link href="/" className="text-xl font-semibold">
        <div className="flex items-center gap-2">
          <img src="/logoo.png" alt="Serendale Logo" className="h-12 w-12" />
        </div>
      </Link>
      
      <div className="hidden md:flex items-center gap-6">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="text-gray-300 hover:text-white transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <Link href="https://github.com" className="text-gray-300 hover:text-white">
          <Github className="h-5 w-5" />
        </Link>
        <Link href="https://twitter.com" className="text-gray-300 hover:text-white">
          <Twitter className="h-5 w-5" />
        </Link>
        <Link href="https://dexscreener.com" className="text-gray-300 hover:text-white">
          <img src="/dex.png" alt="Dexscreener" className="h-5 w-5" />
        </Link>
        
        {authenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-medium">
              {displayName}
              <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* <DropdownMenuItem onClick={openWalletSelector} className="cursor-pointer">
                <Wallet className="mr-2 h-4 w-4" />
                <span>Manage Wallets</span>
              </DropdownMenuItem> */}
              {extendedUser?.wallet?.address && (
                <DropdownMenuItem className="cursor-pointer" onClick={() => window.open(`https://etherscan.io/address/${extendedUser?.wallet?.address}`, '_blank')}>
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
          <button 
            onClick={() => login()} 
            className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-medium"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  )
} 