'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { formatEther } from 'viem';

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
    // First check if the amount is a valid number
    const numAmount = Number(amount);
    if (isNaN(numAmount)) {
      console.error('Invalid amount:', amount);
      return '0';
    }
    
    // Format the number to 4 decimal places
    return numAmount.toFixed(4);
  } catch (error) {
    console.error('Error formatting amount:', error);
    return '0';
  }
}

export function BetActivityFeed({ maxItems = 5 }: BetActivityProps) {
  const [bets, setBets] = useState<Bet[]>([]);

  useEffect(() => {
    // Initial fetch
    const fetchBets = async () => {
      const { data } = await supabase
        .from('bets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(maxItems);

      if (data) {
        setBets(data as Bet[]);
      }
    };

    fetchBets();

    // Real-time subscription
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
          setBets((currentBets) => {
            const newBet = payload.new as Bet;
            const updatedBets = [newBet, ...currentBets].slice(0, maxItems);
            return updatedBets;
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [maxItems]);

  return (
    <div className="w-full max-w-sm bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border border-primary/20 rounded-lg shadow-xl p-4">
      <h3 className="text-lg font-semibold mb-4 text-primary">Recent Bets</h3>
      <div className="space-y-2">
        {bets.map((bet) => (
          <div
            key={bet.id}
            className={`p-3 rounded-lg ${
              bet.is_agent_a ? 'bg-orange-500/20' : 'bg-red-500/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    bet.is_agent_a ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm font-medium">
                  {bet.wallet_address.slice(0, 6)}...{bet.wallet_address.slice(-4)}
                </span>
              </div>
              <span className="text-sm font-bold">
                {formatAmount(bet.amount)} FUZZ
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Bet on {bet.is_agent_a ? 'Trump' : 'Xi'}</span>
              <a
                href={`https://sepolia.etherscan.io/tx/${bet.transaction_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                View TX
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 