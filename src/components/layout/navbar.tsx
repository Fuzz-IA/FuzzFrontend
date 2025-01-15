'use client';

import Link from 'next/link'
import { Github, Twitter } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'

interface NavItem {
  label: string
  href: string
}

const navItems: NavItem[] = [
  { label: 'Battle', href: '/battle' },
  { label: 'Dexscreener', href: '/' },
  { label: 'Roadmap', href: '/' },
  { label: 'Whitepaper', href: '/' },
]

export function Navbar() {
  const { login, authenticated } = usePrivy();

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
        <button 
          onClick={() => login()} 
          className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          {authenticated ? 'Connected' : 'Connect Wallet'}
        </button>
      </div>
    </nav>
  )
} 