'use client'

import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { BATTLE_ADDRESS, BATTLE_ABI } from '@/lib/contracts/battle-abi'

function getNextBattleTime() {
  const now = new Date()
  const nextHour = new Date(now)
  nextHour.setHours(now.getHours() + 1, 0, 0, 0)
  return nextHour.getTime()
}

function TotalAccumulated() {
  const [total, setTotal] = useState<string>('0')

  useEffect(() => {
    async function fetchTotal() {
      try {
        if (typeof window.ethereum !== 'undefined') {
          const provider = new ethers.providers.Web3Provider(window.ethereum)
          const contract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, provider)
          const totalAccumulated = await contract.getTotalAcumulated()
          // Convert from wei to ETH and format to 4 decimal places
          const formattedTotal = ethers.utils.formatEther(totalAccumulated)
          setTotal(Number(formattedTotal).toFixed(1))
        }
      } catch (error) {
        console.error('Error fetching total:', error)
      }
    }

    fetchTotal()
    // Refresh every 30 seconds
    const interval = setInterval(fetchTotal, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="text-lg text-muted-foreground mt-2">
      Total accumulated: <span className="font-mono text-white">{total} FUZZ</span>
    </div>
  )
}

export function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime()
      const target = getNextBattleTime()
      const difference = target - now

      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col items-center">
      <div className="text-lg text-muted-foreground">
        Next battle in <span className="font-mono text-white">{timeLeft}</span>
      </div>
      <TotalAccumulated />
    </div>
  )
} 