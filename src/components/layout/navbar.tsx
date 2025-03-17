'use client';

import Link from 'next/link'

import Image from 'next/image'

interface NavItem {
  label: string
  href: string
}






export function Navbar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-6 sm:px-8 sm:pt-12">
      <nav className="relative flex h-14 sm:h-20 items-center justify-center sm:justify-between rounded-tr-[24px] sm:rounded-tr-[36px] bg-black/80 px-4 sm:px-8 backdrop-blur-sm [box-shadow:0_0_6px_rgba(243,100,46,0.5)]">
        <Link href="/" className="hidden sm:flex items-center">
          <Image
            src="/load_fuzz.svg"
            alt="FUZZ"
            width={120}
            height={80}
            className="hidden sm:block h-14 w-14 md:h-20 md:w-20"
          />
        </Link>

        <div className="flex items-center gap-4 sm:gap-4 md:gap-8 pr-0 sm:pr-4 md:pr-8">
          <Link
            href="/voice-test"
            className="font-minecraft text-sm sm:text-base text-green-500 transition-colors hover:text-white"
          >
            VOICE
          </Link>
          <Link
            href="/narrator-test"
            className="font-minecraft text-sm sm:text-base text-yellow-500 transition-colors hover:text-white"
          >
            NARRATOR
          </Link>
          <Link
            href="https://dexscreener.com/base/0xd8d268919a5cd51348f49b61671ad8209ecf859b"
            target="_blank"
            rel="noopener noreferrer"
            className="font-minecraft text-sm sm:text-base text-[#F3642E] transition-colors hover:text-white"
          >
            DEX
          </Link>
          <Link
href="https://fuzz-ai.gitbook.io/fuzz-ai-docs"            className="font-minecraft text-sm sm:text-base text-[#F3642E] transition-colors hover:text-white"
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
              className="h-5 w-5 sm:h-6 sm:w-6"
            />
          </Link>
          <Link
            href="https://x.com/fuzzai_agent"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/80 transition-colors hover:text-white"
          >
            <Image
              src="/x.svg"
              alt="X (Twitter)"
              width={24}
              height={24}
              className="h-5 w-5 sm:h-6 sm:w-6"
            />
          </Link>
          <Link
            href="https://fuzz-ai.gitbook.io/fuzz-ai-docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/80 transition-colors hover:text-white"
          >
          
          </Link>
        </div>
      </nav>
    </div>
  )
} 