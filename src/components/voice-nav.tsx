'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home, Volume2, Mic } from 'lucide-react';

export function VoiceNav() {
  const pathname = usePathname();
  
  const navItems = [
    { path: '/', label: 'Home', icon: <Home className="h-4 w-4 mr-2" /> },
    { path: '/voice-test', label: 'Voice Test', icon: <Volume2 className="h-4 w-4 mr-2" /> },
    { path: '/narrator-test', label: 'Narrator', icon: <Mic className="h-4 w-4 mr-2" /> }
  ];

  return (
    <div className="flex flex-wrap gap-2 justify-center mb-6">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link href={item.path} key={item.path}>
            <Button 
              variant={isActive ? "default" : "outline"}
              className={isActive ? "opacity-100" : "opacity-70 hover:opacity-100"}
              size="sm"
            >
              {item.icon}
              {item.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );
} 