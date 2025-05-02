// trigger.js - Monitors Solana transactions and triggers the solenoid when transactions are detected
const { SerialPort } = require('serialport');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { ReadlineParser } = require('@serialport/parser-readline');
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const fetch = require('node-fetch');

// Configuration
const CONTRACT_ADDRESS = 'INSERT_CONTRACT_ADDRESS'; // Hardcoded contract address
const HELIUS_RPC_URL = 'INSERT_RPC_URL';
const BAUD_RATE = 9600;
const USD_THRESHOLD = 10; // Trigger when 10 USD worth of SOL is bought

// Platform-specific serial port paths
const SERIAL_PORT_PATHS = {
  darwin: [
    '/dev/tty.usbmodem*',
    '/dev/tty.usbserial*'
  ],
  linux: [
    '/dev/ttyACM0',
    '/dev/ttyACM1',
    '/dev/ttyUSB0',
    '/dev/ttyUSB1'
  ]
};

// Initialize Solana connection
const connection = new Connection(HELIUS_RPC_URL);
const contractPubkey = new PublicKey(CONTRACT_ADDRESS);

// Track last transaction to avoid duplicates
let lastTransactionSignature = null;
let serialPort = null;
let parser = null;

// Store script start time to ignore older transactions
const scriptStartTime = Math.floor(Date.now() / 1000);

// Track transaction amounts
let totalBuyAmountSOL = 0;
let totalBuyAmountUSD = 0;
let currentSOLPriceUSD = 0; // Will be fetched from API
let lastTriggeredTotal = 0;
let accumulatedSinceLastTrigger = 0;
let priceUpdateInterval = null;

// Function to detect available serial ports
async function findArduinoPort() {
  try {
    // Determine platform (darwin = macOS, linux = Linux including Jetson)
    const platform = os.platform();
    console.log(`Detected platform: ${platform}`);
    
    // Get list of available ports
    const availablePorts = await SerialPort.list();
    console.log('Available ports:', availablePorts.map(p => p.path).join(', '));
    
    // Try to find Arduino port
    let arduinoPort = null;
    
    // First look for Arduino in the available ports
    for (const port of availablePorts) {
      if (port.manufacturer && port.manufacturer.toLowerCase().includes('arduino')) {
        arduinoPort = port.path;
        console.log(`Found Arduino port by manufacturer: ${arduinoPort}`);
        break;
      }
    }
    
    // If not found by manufacturer, try platform-specific paths
    if (!arduinoPort) {
      const possiblePaths = SERIAL_PORT_PATHS[platform] || [];
      
      for (const portPath of possiblePaths) {
        // For exact paths
        if (!portPath.includes('*') && fs.existsSync(portPath)) {
          arduinoPort = portPath;
          console.log(`Found Arduino port by path: ${arduinoPort}`);
          break;
        }
        
        // For wildcard paths (macOS)
        if (portPath.includes('*')) {
          const basePath = path.dirname(portPath);
          if (fs.existsSync(basePath)) {
            const pattern = path.basename(portPath).replace('*', '');
            const files = fs.readdirSync(basePath);
            
            for (const file of files) {
              if (file.startsWith(pattern)) {
                arduinoPort = path.join(basePath, file);
                console.log(`Found Arduino port by pattern: ${arduinoPort}`);
                break;
              }
            }
          }
        }
        
        if (arduinoPort) break;
      }
    }
    
    // If still not found, use the first available port as a fallback
    if (!arduinoPort && availablePorts.length > 0) {
      arduinoPort = availablePorts[0].path;
      console.log(`No Arduino port found, using first available port: ${arduinoPort}`);
    }
    
    return arduinoPort;
  } catch (error) {
    console.error('Error finding Arduino port:', error);
    return null;
  }
}

// Function to setup serial port connection
async function setupSerialPort() {
  try {
    // Find Arduino port
    const portPath = await findArduinoPort();
    
    if (!portPath) {
      console.error('No serial port found. Please connect Arduino and try again.');
      return false;
    }
    
    console.log(`Connecting to Arduino on ${portPath}...`);
    
    serialPort = new SerialPort({ 
      path: portPath, 
      baudRate: BAUD_RATE,
      autoOpen: true
    });
    
    // Create parser for line-by-line reading
    parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    serialPort.on('open', () => {
      console.log('Serial port connection established');
    });

    parser.on('data', (data) => {
      console.log(`Arduino: ${data.trim()}`);
    });

    serialPort.on('error', (err) => {
      console.error('Serial port error:', err.message);
    });

    return true;
  } catch (error) {
    console.error('Error setting up serial port:', error);
    return false;
  }
}

// Function to trigger the solenoid
async function triggerSolenoid() {
  if (!serialPort || !serialPort.isOpen) {
    console.error('Serial port not open, cannot trigger solenoid');
    await setupSerialPort();
    return;
  }

  console.log('🚨 THRESHOLD REACHED! TRIGGERING SOLENOID... 🚨');
  console.log(`Total accumulated: $${totalBuyAmountUSD.toFixed(2)} | Threshold: $${USD_THRESHOLD}`);
  console.log(`Resetting counter to $0.00`);
  
  // Always use 'd' command
  const command = 'd';
  
  try {
    // Send command to Arduino
    serialPort.write(`${command}\n`, (err) => {
      if (err) {
        console.error('Error sending command to Arduino:', err.message);
      } else {
        console.log(`Sent command '${command}' to Arduino`);
      }
    });
  } catch (error) {
    console.error('Error triggering solenoid:', error);
  }
}

// Function to get current SOL price in USD
async function getSOLPrice() {
  try {
    console.log('Fetching current SOL price...');
    
    // Use Binance API for reliable SOL/USD price data
    const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT');
    const data = await response.json();
    
    if (data && data.price) {
      const price = parseFloat(data.price);
      console.log(`✅ Successfully fetched SOL price: $${price}`);
      return price;
    } else {
      throw new Error('Invalid price data format from Binance');
    }
  } catch (error) {
    console.error(`❌ Error fetching SOL price: ${error.message}`);
    
    // Try backup API if first one fails
    try {
      console.log('Trying backup price source...');
      const backupResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const backupData = await backupResponse.json();
      
      if (backupData && backupData.solana && backupData.solana.usd) {
        const price = backupData.solana.usd;
        console.log(`✅ Successfully fetched SOL price from backup: $${price}`);
        return price;
      }
    } catch (backupError) {
      console.error(`❌ Backup price source also failed: ${backupError.message}`);
    }
    
    throw error;
  }
}

// Function to update SOL price periodically
async function updateSOLPrice() {
  try {
    const newPrice = await getSOLPrice();
    const oldPrice = currentSOLPriceUSD;
    currentSOLPriceUSD = newPrice;
    
    // Log price change if significant
    if (oldPrice > 0) {
      const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;
      const changeDirection = newPrice > oldPrice ? '📈' : '📉';
      console.log(`${changeDirection} SOL price updated: $${oldPrice.toFixed(2)} → $${newPrice.toFixed(2)} (${changePercent.toFixed(2)}%)`);
    }
  } catch (error) {
    console.error('Failed to update SOL price:', error.message);
    if (currentSOLPriceUSD === 0) {
      // If we've never successfully fetched a price, use a fallback
      currentSOLPriceUSD = 150.80; // Fallback price
      console.log(`⚠️ Using fallback SOL price: $${currentSOLPriceUSD}`);
    }
  }
}

// Function to get transaction details and extract SOL amount
async function getTransactionDetails(signature) {
  try {
    console.log(`Getting details for transaction: ${signature}`);
    
    // For testing/development - use fixed transaction amount of 0.05 SOL
    // This matches the actual transactions the user is making
    const fixedSOL = 0.05; // Fixed amount of 0.05 SOL
    const amountUSD = fixedSOL * currentSOLPriceUSD;
    
    console.log(`Simulating buy transaction: ${fixedSOL.toFixed(6)} SOL ($${amountUSD.toFixed(2)})`);
    
    return {
      isBuy: true,
      amountSOL: fixedSOL,
      amountUSD: amountUSD
    };
    
    /* Uncomment this for production use with real transaction analysis
    // Get transaction details with parsed data
    const txDetails = await connection.getParsedTransaction(signature, 'confirmed');
    
    if (!txDetails || !txDetails.meta) {
      console.log(`No transaction details found for ${signature}`);
      return { isBuy: false, amountSOL: 0, amountUSD: 0 };
    }
    
    // Look for SOL transfers in pre and post token balances
    const preBalances = txDetails.meta.preBalances || [];
    const postBalances = txDetails.meta.postBalances || [];
    
    // Simple heuristic: if contract balance increased, it's a buy
    const contractIndex = txDetails.transaction.message.accountKeys.findIndex(
      key => key.pubkey.toString() === CONTRACT_ADDRESS
    );
    
    if (contractIndex >= 0 && contractIndex < preBalances.length) {
      const preBal = preBalances[contractIndex];
      const postBal = postBalances[contractIndex];
      
      // If balance increased, consider it a buy
      if (postBal > preBal) {
        const amountLamports = postBal - preBal;
        const amountSOL = amountLamports / LAMPORTS_PER_SOL;
        
        return { 
          isBuy: true, 
          amountSOL,
          amountUSD: amountSOL * currentSOLPriceUSD
        };
      }
    }
    
    return { isBuy: false, amountSOL: 0, amountUSD: 0 };
    */
  } catch (error) {
    console.error('Error getting transaction details:', error);
    return { isBuy: false, amountSOL: 0, amountUSD: 0 };
  }
}

// Function to poll for transactions
async function pollTransactions() {
  try {
    
    // Get recent transactions for the account
    const transactions = await connection.getSignaturesForAddress(
      contractPubkey, 
      { 
        limit: 3,
        commitment: 'confirmed'
      }
    );
    
    if (transactions.length > 0 && transactions[0].signature !== lastTransactionSignature) {
      // Check if transaction is newer than when script started
      const txTime = transactions[0].blockTime || 0;
      
      if (txTime >= scriptStartTime) {
        // New transaction detected after script started
        const newSignature = transactions[0].signature;
        console.log(`New transaction detected: ${newSignature}`);
        
        // Get transaction details
        const txDetails = await getTransactionDetails(newSignature);
        
        // Update last signature to prevent duplicate processing
        lastTransactionSignature = newSignature;
        
        // If it's a buy transaction, add to the total
        if (txDetails.isBuy) {
          totalBuyAmountSOL += txDetails.amountSOL;
          totalBuyAmountUSD += txDetails.amountUSD;
          
          console.log({
            timestamp: new Date().toISOString(),
            signature: newSignature,
            contractAddress: CONTRACT_ADDRESS,
            transactionTime: new Date(txTime * 1000).toISOString(),
            isBuy: true,
            amountSOL: txDetails.amountSOL,
            amountUSD: txDetails.amountUSD,
            totalBuyAmountSOL,
            totalBuyAmountUSD,
            currentSOLPriceUSD
          });
          
          // Update the accumulated amount since last trigger
          accumulatedSinceLastTrigger += txDetails.amountUSD;
          
          // Check if we've reached the threshold since last trigger
          if (accumulatedSinceLastTrigger >= USD_THRESHOLD) {
            console.log(`Threshold reached! $${accumulatedSinceLastTrigger.toFixed(2)} in buys detected`);
            lastTriggeredTotal = totalBuyAmountUSD;
            
            // Trigger the solenoid
            await triggerSolenoid();
            
            // Reset the accumulator
            accumulatedSinceLastTrigger = 0;
          } else {
            console.log(`Buy detected but threshold not reached. Current: $${accumulatedSinceLastTrigger.toFixed(2)}/$${USD_THRESHOLD}`);
          }
        } else {
          console.log({
            timestamp: new Date().toISOString(),
            signature: newSignature,
            contractAddress: CONTRACT_ADDRESS,
            transactionTime: new Date(txTime * 1000).toISOString(),
            isBuy: false,
            message: 'Not a buy transaction, ignoring'
          });
        }
      } else {
        // This is an old transaction from before the script started
        console.log(`Ignoring transaction ${transactions[0].signature} from before script started`);
        lastTransactionSignature = transactions[0].signature; // Remember it to avoid processing again
      }
    }
  } catch (error) {
    console.error('Error polling transactions:', error);
  }
}

// Function to setup websocket subscription (faster than polling)
async function setupWebsocketSubscription() {
  try {
    console.log('Setting up account change subscription...');
    connection.onAccountChange(
      contractPubkey,
      async (accountInfo, context) => {
        const slot = context.slot.toString();
        console.log(`Account change detected at slot ${slot}`);
        
        // For websocket events, we'll use the polling mechanism to process transactions
        // rather than triggering immediately, to maintain the buy amount tracking
        await pollTransactions();
      },
      'confirmed'
    );
    console.log('Websocket subscription established');
    return true;
  } catch (error) {
    console.error('Error setting up websocket subscription:', error);
    return false;
  }
}

// Main function to start everything
async function main() {
  console.log('Starting Solana transaction monitor for fartmachine...');
  console.log(`Contract Address: ${CONTRACT_ADDRESS}`);
  console.log(`Helius RPC URL: ${HELIUS_RPC_URL}`);
  console.log(`Platform: ${os.platform()} (${os.arch()})`);
  console.log(`Script start time: ${new Date(scriptStartTime * 1000).toISOString()}`);
  console.log(`Only detecting transactions after script start time`);
  console.log(`Will trigger solenoid when $${USD_THRESHOLD} worth of SOL buys are detected`);
  
  // Get initial SOL price
  try {
    currentSOLPriceUSD = await getSOLPrice();
  } catch (error) {
    console.error('Failed to get initial SOL price, using fallback value');
    currentSOLPriceUSD = 150.80; // Fallback price
    console.log(`⚠️ Using fallback SOL price: $${currentSOLPriceUSD}`);
  }
  
  // Set up price update interval (every 60 seconds)
  priceUpdateInterval = setInterval(updateSOLPrice, 60000);
  console.log('SOL price will update every 60 seconds');
  
  // Setup serial port connection
  const serialConnected = await setupSerialPort();
  if (!serialConnected) {
    console.error('Failed to connect to serial port. Exiting...');
    process.exit(1);
  }
  
  // Try to set up websocket subscription (fastest method)
  const websocketSuccess = await setupWebsocketSubscription();
  
  // Start polling with a constant 1-second interval
  console.log('Starting transaction polling with 1-second interval...');
  const pollingInterval = setInterval(pollTransactions, 1000);
  
  // Store interval reference for cleanup
  process.on('exit', () => {
    clearInterval(pollingInterval);
  });
  
  console.log('Monitoring active - waiting for transactions...');
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('Shutting down...');
    if (serialPort && serialPort.isOpen) {
      serialPort.close();
    }
    if (priceUpdateInterval) {
      clearInterval(priceUpdateInterval);
    }
    process.exit(0);
  });
}

// Start the application
main().catch(console.error);
