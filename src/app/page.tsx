import { Hero } from "@/components/landing/hero";
import { Header } from "@/components/layout/header";


export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Header />
      <Hero />
    </main>
  )
} 