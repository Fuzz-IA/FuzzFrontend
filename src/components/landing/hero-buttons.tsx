import Link from 'next/link'
import { Volume2, Mic } from 'lucide-react'

export function HeroButtons() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
      <Link
        href="/battle"
        className="px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:opacity-90 transition-opacity"
      >
       Battle
      </Link>
      
      <Link
        href="/voice-test"
        className="px-8 py-3 rounded-full bg-gradient-to-r from-green-600 to-emerald-500 text-white font-medium hover:opacity-90 transition-opacity flex items-center"
      >
        <Volume2 className="mr-2 h-4 w-4" />
        Voice Test
      </Link>
      
      <Link
        href="/narrator-test"
        className="px-8 py-3 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-medium hover:opacity-90 transition-opacity flex items-center"
      >
        <Mic className="mr-2 h-4 w-4" />
        Narrator
      </Link>
      
      {/* <Link
        href="/ecosystems"
        className="px-8 py-3 rounded-full bg-transparent border border-gray-700 text-white font-medium hover:bg-white/5 transition-colors"
      >
        
      </Link> */}
    </div>
  )
} 

