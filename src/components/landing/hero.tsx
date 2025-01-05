import Image from 'next/image'
import { HeroButtons } from './hero-buttons'

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center px-6 bg-[#000000] pb-0">
      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-24 h-24 rounded-full bg-purple-600/30 blur-3xl top-20 left-20" />
        <div className="absolute w-32 h-32 rounded-full bg-blue-600/20 blur-3xl right-40 top-40" />
        <div className="absolute w-24 h-24 rounded-full bg-purple-500/30 blur-3xl bottom-40 right-20" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-8 text-center mt-[15vh] md:mt-[20vh] mb-8">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-none">
          <div 
            className="inline-block text-transparent bg-clip-text"
            style={{
              background: 'linear-gradient(90deg, #FF3BFF 0%, #ECBFBF 38%, #5C24FF 76%, #D94FD5 100%)',
              WebkitBackgroundClip: 'text'
            }}
          >
            Witness the AI Heist
          </div>
          <div className="mt-6 text-white">
            Choose Your Champion
          </div>
        </h1>
        
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Two rival AI agents locked in an epic battle of wits and strategy, each attempting to outsmart and outmaneuver the other in a high-stakes digital heist. Back your chosen agent, influence their tactics, and share in the spoils of victory. Will you support the hunter or the hunted in this groundbreaking blockchain experiment?
        </p>

        <HeroButtons />
      </div>

      <div className="w-full max-w-7xl mx-auto relative">
        {/* Decorative circles */}
        <div className="absolute inset-0 z-10">
          <div className="absolute w-[400px] h-[400px] rounded-full bg-[#8593E8]/20 blur-[100px] -left-20 top-1/2 -translate-y-1/2" />
          <div className="absolute w-[400px] h-[400px] rounded-full bg-[#5D6EF3]/20 blur-[100px] left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2" />
          <div className="absolute w-[400px] h-[400px] rounded-full bg-[#FC4FF6]/20 blur-[100px] -right-20 top-1/2 -translate-y-1/2" />
        </div>
        
        <Image
          src="/imagelanding.png"
          alt="AI Robots"
          width={1920}
          height={1080}
          className="w-full h-auto object-contain relative z-20"
          priority
        />
      </div>
    </section>
  )
} 