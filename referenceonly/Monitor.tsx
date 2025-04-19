'use client'

import { useState, useEffect } from 'react'
import { BiScan, BiCoin } from 'react-icons/bi'
import { HiChevronDown } from 'react-icons/hi'
import { MdOutlineAccountBalanceWallet, MdPowerSettingsNew } from 'react-icons/md'
import { FiCopy } from 'react-icons/fi'
import { FaExternalLinkAlt } from 'react-icons/fa'
import { useToken } from '@/contexts/TokenContext'

interface Transaction {
  timestamp: number
  walletAddress: string
  amount: number
  type: 'BUY' | 'SELL'
  signature: string
}

export const Monitor = () => {
  const { tokenAddress, isMonitorActive, setIsMonitorActive } = useToken()
  const [isExpanded, setIsExpanded] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [currentTime, setCurrentTime] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)

  // Handle monitor activation/deactivation
  useEffect(() => {
    if (isMonitorActive && tokenAddress && !ws) {
      // Connect to WebSocket - using port 8888 instead of 8080
      const newWs = new WebSocket('ws://localhost:8888')
      
      newWs.onopen = () => {
        console.log('Connected to monitor websocket')
        setIsConnected(true)
        // Send token address to backend
        newWs.send(JSON.stringify({ 
          type: 'START_MONITOR', 
          data: { tokenAddress } 
        }))
      }

      newWs.onmessage = (event) => {
        try {
          const tx = JSON.parse(event.data)
          setTransactions(prev => {
            const newTx: Transaction = {
              timestamp: Date.now(),
              walletAddress: tx.walletAddress,
              amount: Math.abs(tx.amount),
              type: tx.type as 'BUY' | 'SELL',
              signature: tx.signature
            }
            return [newTx, ...prev].slice(0, 10)
          })
        } catch (error) {
          console.error('Error processing transaction:', error)
        }
      }

      newWs.onclose = () => {
        console.log('Disconnected from monitor websocket')
        setIsConnected(false)
        setWs(null)
      }

      newWs.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
        setWs(null)
      }

      setWs(newWs)
    } else if (!isMonitorActive && ws) {
      // Send stop monitoring message before closing
      ws.send(JSON.stringify({ 
        type: 'STOP_MONITOR' 
      }))
      ws.close()
      setWs(null)
      setIsConnected(false)
    }

    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [isMonitorActive, tokenAddress])

  // Update time
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString())
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const toggleMonitor = () => {
    if (!tokenAddress) {
      alert('Please enter a token address first')
      return
    }
    setIsMonitorActive(!isMonitorActive)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-800">
      <div className="w-full bg-[#232323] px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-200 font-medium">Monitor</span>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMonitor}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              isMonitorActive ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'
            }`}
          >
            <MdPowerSettingsNew size={20} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hover:bg-[#2a2a2a] p-2 rounded-lg transition-colors duration-200"
          >
            <HiChevronDown 
              className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
              size={20}
            />
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4 space-y-3">
          {!tokenAddress ? (
            <div className="text-gray-400 text-sm text-center py-2">
              Please enter a token address to start monitoring
            </div>
          ) : !isMonitorActive ? (
            <div className="text-gray-400 text-sm text-center py-2">
              Click the power button to start monitoring
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-2">
              Waiting for transactions...
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.signature} className="bg-[#232323] rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                      tx.type === 'BUY' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {tx.type === 'BUY' ? '🟢 BUY' : '🔴 SELL'}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {new Date(tx.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${tx.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.amount.toFixed(4)} SOL
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 text-sm font-mono">
                      {tx.walletAddress.slice(0, 8)}...{tx.walletAddress.slice(-4)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(tx.walletAddress)}
                      className="text-gray-500 hover:text-gray-300 transition-colors"
                      title="Copy wallet address"
                    >
                      <FiCopy size={14} />
                    </button>
                    <a
                      href={`https://solscan.io/account/${tx.walletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-300 transition-colors"
                      title="View on Solscan"
                    >
                      <FaExternalLinkAlt size={14} />
                    </a>
                  </div>
                  <a
                    href={`https://solscan.io/tx/${tx.signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-gray-300 text-xs flex items-center gap-1 transition-colors"
                  >
                    <span>TX</span>
                    <FaExternalLinkAlt size={12} />
                  </a>
                </div>
              </div>
            ))
          )}
          <div className="text-gray-400 text-xs text-right flex items-center justify-end gap-2">
            <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            <span>{currentTime}</span>
          </div>
        </div>
      )}
    </div>
  )
} 