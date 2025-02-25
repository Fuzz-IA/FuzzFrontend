import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";

export default function Disclaimer() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Header />
      
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 h-full w-full object-cover opacity-50"
      >
        <source src="/fondoFUZZ.mp4" type="video/mp4" />
      </video>

      {/* Content Overlay */}
      <div className="relative z-10 pt-24 pb-12 min-h-screen flex items-center justify-center">
        <Card className="max-w-2xl mx-4 bg-black/40 backdrop-blur-md border border-[#F3642E]/20 shadow-[0_0_15px_rgba(243,100,46,0.3)]">
          <div className="p-8 pt-12">
           
            

            <div className="flex flex-col items-center mb-12">
              <h1 className="text-5xl font-minecraft bg-gradient-to-r from-[#F3642E] to-red-500 bg-clip-text text-transparent">
                Disclaimer
              </h1>
              <div className="mt-4 h-[2px] w-24 bg-gradient-to-r from-[#F3642E] to-red-500" />
            </div>

            <div className="space-y-6">
              <p className="text-lg text-white/90 leading-relaxed">
                Fuzz AI is a research platform that provides information and insights related to artificial intelligence.
              </p>
              
              <div className="bg-black/40 border border-[#F3642E]/20 rounded-lg p-6 backdrop-blur-sm shadow-[0_0_10px_rgba(243,100,46,0.1)]">
                <p className="text-white/80 leading-relaxed">
                  The content on this site is intended for informational purposes only and should not be relied upon for financial, investment, or legal decisions. Users acknowledge that interactions with this site are at their own risk, and the site host assumes no liability for any losses or damages incurred.
                </p>
              </div>
              
              <div className="bg-black/40 border border-[#F3642E]/20 rounded-lg p-6 backdrop-blur-sm shadow-[0_0_10px_rgba(243,100,46,0.1)]">
                <p className="text-white/80 leading-relaxed">
                  Links to third-party sites are provided for convenience, and users access them at their own risk. The site host makes no guarantees regarding the accuracy or completeness of the information presented. All content is provided "as-is," without warranties of any kind. By using this site, users agree to indemnify the host against any claims arising from their use. The host reserves the right to modify this disclaimer at any time.
                </p>
              </div>

              <div className="flex justify-center pt-8">
                <Link 
                  href="/" 
                  className="px-8 py-3 rounded-full bg-[#F3642E] text-white font-minecraft hover:bg-[#FF6B2C] transition-colors"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
