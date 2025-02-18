import Image from 'next/image'
import Link from 'next/link'

export function Hero() {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/fondoFUZZ.mp4" type="video/mp4" />
      </video>

      {/* Content Overlay */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center">
        <h1 className="font-minecraft text-3xl text-white mb-[-40px]">
          Advancing AI Agent Security Research
        </h1>
        <Image
          src="/Fuzz_logo.svg"
          alt="FUZZ"
          width={695}
          height={263}
          className="mb-0"
          priority
        />
        <Link
          href="/chat-battle"
          className="mt-8 rounded-full bg-white px-8 py-3 font-minecraft text-[#F3642E] transition-all hover:bg-[#FF6B2C]"
        >
          GO TO BATTLE
        </Link>

        {/* Backed By Section */}
        <div className="absolute bottom-8 flex items-center gap-4 text-white/80">
          <span className="font-minecraft text-md text-[#F3642E]">Backed By</span>
          <div className="h-[28px] w-[2px] bg-[#F3642E] mx-2" />

          <div className="flex items-center gap-4">
            
          <Image
              src="/virtual.svg"
              alt="Virtual"
              width={40}
              height={40}
              className="opacity-80 hover:opacity-100 transition-opacity"
            />
            <Image
              src="/agentstarter.svg"
              alt="AgentStarter"
              width={120}
              height={30}
              className="opacity-80 hover:opacity-100 transition-opacity"
            />
           
          </div>
        </div>
      </div>
    </div>
  )
} 