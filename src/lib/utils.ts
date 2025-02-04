import { toast } from "@/hooks/use-toast"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Smart contract interaction toast notifications
export const contractToast = {
  loading: (message: string) => {
    return toast({
      title: "Transaction in Progress",
      description: message,
      duration: 10000,
    })
  },

  success: (message: string) => {
    return toast({
      title: "Success!",
      description: message,
      duration: 5000,
      className: "bg-green-50 dark:bg-green-900",
    })
  },

  error: (error: any) => {
    const message = error?.reason || error?.message || "An unexpected error occurred"
    return toast({
      title: "Error",
      description: message,
      duration: 7000,
      variant: "destructive",
    })
  },

  info: (message: string) => {
    return toast({
      title: "Info",
      description: message,
      duration: 5000,
    })
  },

  wallet: {
    notConnected: () => {
      return toast({
        title: "Wallet Required",
        description: "Please connect your wallet to continue",
        duration: 5000,
      })
    },
    
    wrongNetwork: (requiredNetwork: string) => {
      return toast({
        title: "Wrong Network",
        description: `Please switch to ${requiredNetwork} to continue`,
        duration: 5000,
        variant: "destructive",
      })
    },

    notInstalled: () => {
      return toast({
        title: "Wallet Not Found",
        description: "Please install MetaMask or another Web3 wallet",
        duration: 5000,
        variant: "destructive",
      })
    }
  }
}
