import { Navbar } from './navbar'

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 py-4 bg-black/80 backdrop-blur-sm">
      <Navbar />
    </header>
  )
} 