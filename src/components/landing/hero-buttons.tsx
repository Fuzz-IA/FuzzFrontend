import Link from 'next/link'

export function HeroButtons() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
      <Link
        href="/battle"
        className="px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:opacity-90 transition-opacity"
      >
       Battle
      </Link>
      
      {/* <Link
        href="/ecosystems"
        className="px-8 py-3 rounded-full bg-transparent border border-gray-700 text-white font-medium hover:bg-white/5 transition-colors"
      >
        
      </Link> */}
    </div>
  )
} 

