'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

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
      console.error('Invalid amount:', amount);
      return '0';
    }
    return numAmount.toFixed(2);
  } catch (error) {
    console.error('Error formatting amount:', error);
    return '0';
  }
}

function BetItem({ bet }: { bet: Bet }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-1.5 h-1.5 rounded-full ${bet.is_agent_a ? 'bg-orange-500' : 'bg-red-500'}`} />
      <span className="font-medium">{formatAmount(bet.amount)} FUZZ</span>
      <span className="text-muted-foreground">by</span>
      <a
        href={`https://sepolia.etherscan.io/tx/${bet.transaction_hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-xs hover:text-primary transition-colors"
      >
        {bet.wallet_address.slice(0, 4)}...{bet.wallet_address.slice(-4)}
      </a>
    </div>
  );
}

export function BetActivityFeed({ maxItems = 1 }: BetActivityProps) {
  const [trumpBets, setTrumpBets] = useState<Bet[]>([]);
  const [xiBets, setXiBets] = useState<Bet[]>([]);

  useEffect(() => {
    const fetchBets = async () => {
      const { data: trumpData } = await supabase
        .from('bets')
        .select('*')
        .eq('is_agent_a', true)
        .order('created_at', { ascending: false })
        .limit(maxItems);

      const { data: xiData } = await supabase
        .from('bets')
        .select('*')
        .eq('is_agent_a', false)
        .order('created_at', { ascending: false })
        .limit(maxItems);

      if (trumpData) setTrumpBets(trumpData as Bet[]);
      if (xiData) setXiBets(xiData as Bet[]);
    };

    fetchBets();

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
            setTrumpBets((current) => [newBet, ...current].slice(0, maxItems));
          } else {
            setXiBets((current) => [newBet, ...current].slice(0, maxItems));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [maxItems]);

  return (
    <div className="flex items-center gap-8">
      <div className="flex items-center gap-2">
        <span className="text-orange-500 font-minecraft">Trump:</span>
        {trumpBets[0] ? (
          <BetItem bet={trumpBets[0]} />
        ) : (
          <span className="text-sm text-muted-foreground">No bets yet</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-red-500 font-minecraft">Xi:</span>
        {xiBets[0] ? (
          <BetItem bet={xiBets[0]} />
        ) : (
          <span className="text-sm text-muted-foreground">No bets yet</span>
        )}
      </div>
    </div>
  );
} 