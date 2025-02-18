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
import Image from 'next/image'

interface NavItem {
  label: string
  href: string
}






export function Navbar() {
  return (
    <div className="fixed top-10 left-0 right-0 z-50 px-8 py-4">
      <nav className="relative flex h-20 items-center justify-between rounded-tr-[36px] bg-black/80 px-8 backdrop-blur-sm [box-shadow:0_0_6px_rgba(243,100,46,0.5)]">
        <Link href="/" className="flex items-center">
          <Image
            src="/load_fuzz.svg"
            alt="FUZZ"
            width={120}
            height={80}
            className="h-20 w-20"
          />
        </Link>

        <div className="flex items-center gap-8 pr-8">
          <Link
            href="/dex"
            className="font-minecraft text-[#F3642E] transition-colors hover:text-white"
          >
            DEX
          </Link>
          <Link
            href="/doc"
            className="font-minecraft text-[#F3642E] transition-colors hover:text-white"
          >
            DOC
          </Link>
          <Link
            href="https://t.me/fuzzai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/80 transition-colors hover:text-white"
          >
            <Image
              src="/telegram.svg"
              alt="Telegram"
              width={24}
              height={24}
              className="h-6 w-6"
            />
          </Link>
          <Link
            href="https://twitter.com/fuzzai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/80 transition-colors hover:text-white"
          >
            <Image
              src="/x.svg"
              alt="X (Twitter)"
              width={24}
              height={24}
              className="h-6 w-6"
            />
          </Link>
        </div>
      </nav>
    </div>
  )
} 