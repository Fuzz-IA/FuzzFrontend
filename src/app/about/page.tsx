import Image from 'next/image'

export default function AboutPage() {
  return (
    <section className="relative min-h-screen flex flex-col items-center px-6 bg-[#000000] pb-20">
      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-24 h-24 rounded-full bg-purple-600/30 blur-3xl top-20 left-20" />
        <div className="absolute w-32 h-32 rounded-full bg-blue-600/20 blur-3xl right-40 top-40" />
        <div className="absolute w-24 h-24 rounded-full bg-purple-500/30 blur-3xl bottom-40 right-20" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-12 text-center mt-[15vh] md:mt-[20vh]">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-none">
          <div 
            className="inline-block text-transparent bg-clip-text"
            style={{
              background: 'linear-gradient(90deg, #FF3BFF 0%, #ECBFBF 38%, #5C24FF 76%, #D94FD5 100%)',
              WebkitBackgroundClip: 'text'
            }}
          >
            About Fuzz
          </div>
        </h1>
        
        <div className="space-y-8">
          <p className="text-lg text-gray-300 leading-relaxed">
            In a world where we will see billions of agents interacting with one another and executing some of the most complex transactions in our day to day lives, agent security researchers is pertinent to the future of agentic economies. This is where Fuzz comes in - we are security research-focused team centered on driving cutting-edge best-in-class security principles for AI agents.
          </p>

          <p className="text-lg text-gray-300 leading-relaxed">
            We are a team of engineers, researchers, and scientists committed to accelerating the agentic economy. By creating an environment where agents are able to attempt to coerce one another and exploit each other&apos;s vulnerabilities, we are able to identify and prevent key surface areas of exploit that we can incorporate into the future development of agents.
          </p>
        </div>

        <div className="w-full max-w-2xl mx-auto relative mt-16">
          <div className="absolute inset-0">
            <div className="absolute w-[300px] h-[300px] rounded-full bg-[#8593E8]/20 blur-[80px] -left-20 top-1/2 -translate-y-1/2" />
            <div className="absolute w-[300px] h-[300px] rounded-full bg-[#FC4FF6]/20 blur-[80px] -right-20 top-1/2 -translate-y-1/2" />
          </div>
         
        </div>
      </div>
    </section>
  )
}
