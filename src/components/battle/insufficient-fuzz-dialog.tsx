'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";

interface InsufficientFuzzDialogProps {
  isOpen: boolean;
  onClose: () => void;
  requiredAmount: string;
  currentBalance: string;
}

export function InsufficientFuzzDialog({ 
  isOpen, 
  onClose, 
  requiredAmount,
  currentBalance 
}: InsufficientFuzzDialogProps) {
  const handleBuyFuzz = () => {
    // TODO: Implement buy FUZZ functionality
    window.open('https://app.uniswap.org/swap?outputCurrency=0xab9AFF6f259787300bBB16DD1fa0c622426Aa169&chain=base/', '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Coins className="h-5 w-5" />
            Insufficient FUZZ Balance
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Required Amount:</span>
              <span className="font-mono font-medium">{requiredAmount} FUZZ</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Your Balance:</span>
              <span className="font-mono font-medium">{currentBalance} FUZZ</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Missing:</span>
              <span className="font-mono font-medium text-destructive">
                {(Number(requiredAmount) - Number(currentBalance)).toFixed(2)} FUZZ
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={handleBuyFuzz}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Buy FUZZ on Uniswap
            </Button>
            <Button 
              onClick={onClose}
              variant="outline" 
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 