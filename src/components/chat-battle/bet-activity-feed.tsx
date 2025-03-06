'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { CHAMPION1, CHAMPION2, CHAMPION1_NAME, CHAMPION2_NAME } from '@/lib/constants';

interface Bet {
  id: string;
  created_at: string;
  amount: string;
  wallet_address: string;
  transaction_hash: string;
  is_agent_a: boolean;
}

interface BetActivityProps {
  maxItems?: number;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

function formatAmount(amount: string): string {
  try {
    const numAmount = Number(amount);
    if (isNaN(numAmount)) {
      return '0';
    }
    return numAmount.toFixed(2);
  } catch (error) {
    return '0';
  }
}

function BetItem({ bet }: { bet: Bet }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        transition: {
          duration: 0.3,
        }
      }}
      exit={{ 
        opacity: 0, 
        y: -20,
        transition: {
          duration: 0.2,
        }
      }}
      className={`
        flex items-center gap-3 text-sm px-4 py-1.5 rounded-md whitespace-nowrap
        ${bet.is_agent_a 
          ? 'bg-gradient-to-r from-orange-500/20 via-orange-400/10 to-orange-500/20 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.3)]' 
          : 'bg-gradient-to-r from-red-500/20 via-red-400/10 to-red-500/20 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
        }
        backdrop-blur-sm
      `}
    >
      <motion.div 
        className={`w-2 h-2 rounded-full ${bet.is_agent_a ? 'bg-orange-500' : 'bg-red-500'}`}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [1, 0.8, 1]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <span className={`font-bold ${bet.is_agent_a ? 'text-orange-500' : 'text-red-500'}`}>
        {formatAmount(bet.amount)} FUZZ
      </span>
      <span className="text-muted-foreground">by</span>
      <a
        href={`https://sepolia.etherscan.io/tx/${bet.transaction_hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`
          font-mono text-xs transition-colors
          ${bet.is_agent_a 
            ? 'text-orange-200 hover:text-orange-400' 
            : 'text-red-200 hover:text-red-400'
          }
        `}
      >
        {bet.wallet_address.slice(0, 4)}...{bet.wallet_address.slice(-4)}
      </a>
    </motion.div>
  );
}

function BetTicker({ bets, label, colorClass }: { bets: Bet[], label: string, colorClass: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (bets.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((current) => (current + 1) % bets.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [bets.length]);

  return (
    <div className="flex items-center gap-3 min-w-[350px]">
      <motion.span 
        className={`${colorClass} font-minecraft text-base shrink-0`}
        animate={{
          scale: [1, 1.05, 1],
          opacity: [1, 0.8, 1]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {label}:
      </motion.span>
      <div className="relative h-8 flex-1">
        <AnimatePresence mode="popLayout">
          {bets[currentIndex] && (
            <div className="absolute w-full" key={bets[currentIndex].id}>
              <BetItem bet={bets[currentIndex]} />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function BetActivityFeed({ maxItems = 5 }: BetActivityProps) {
  const [champion1Bets, setChampion1Bets] = useState<Bet[]>([]);
  const [champion2Bets, setChampion2Bets] = useState<Bet[]>([]);

  useEffect(() => {
    const fetchBets = async () => {
      const { data: champion1Data } = await supabase
        .from('bets')
        .select('*')
        .eq('is_agent_a', true)
        .order('created_at', { ascending: false })
        .limit(maxItems);

      const { data: champion2Data } = await supabase
        .from('bets')
        .select('*')
        .eq('is_agent_a', false)
        .order('created_at', { ascending: false })
        .limit(maxItems);

      if (champion1Data) setChampion1Bets(champion1Data as Bet[]);
      if (champion2Data) setChampion2Bets(champion2Data as Bet[]);
    };

    fetchBets();

    // Subscribe to new bets
    const subscription = supabase
      .channel('bets_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bets',
        },
        (payload) => {
          const newBet = payload.new as Bet;
          if (newBet.is_agent_a) {
            setChampion1Bets((current) => [newBet, ...current].slice(0, maxItems));
          } else {
            setChampion2Bets((current) => [newBet, ...current].slice(0, maxItems));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [maxItems]);

  return (
    <div className="flex items-center justify-center gap-6">
      <BetTicker 
        bets={champion1Bets} 
        label={CHAMPION1_NAME} 
        colorClass="text-orange-500" 
      />
      <BetTicker 
        bets={champion2Bets} 
        label={CHAMPION2_NAME} 
        colorClass="text-red-500" 
      />
    </div>
  );
} 