// trigger.js - Monitors Solana transactions and triggers the solenoid when transactions are detected
const { SerialPort } = require('serialport');
const { Connection, PublicKey } = require('@solana/web3.js');

// Configuration
const CONTRACT_ADDRESS = '6cPCHGuxD4G7k69R9UwWDUUGHDJMpZuRWDpd26Mqpump'; // Hardcoded contract address
const HELIUS_RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=ad13694f-03a7-404e-90d8-3456707ed63a';
const SERIAL_PORT = '/dev/tty.usbmodem21401'; // Update this to match your Arduino's port
const BAUD_RATE = 9600;

// Initialize Solana connection
const connection = new Connection(HELIUS_RPC_URL);
const contractPubkey = new PublicKey(CONTRACT_ADDRESS);

// Track last transaction to avoid duplicates
let lastTransactionSignature = null;
let serialPort = null;

// Function to setup serial port connection
async function setupSerialPort() {
  try {
    console.log(`Connecting to Arduino on ${SERIAL_PORT}...`);
    
    serialPort = new SerialPort({ 
      path: SERIAL_PORT, 
      baudRate: BAUD_RATE,
      autoOpen: true
    });

    serialPort.on('open', () => {
      console.log('Serial port connection established');
    });

    serialPort.on('data', (data) => {
      console.log(`Arduino: ${data.toString().trim()}`);
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

  console.log('Triggering solenoid...');
  
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

// Function to poll for transactions
async function pollTransactions() {
  try {
    // Get recent transactions for the account with minimal data to reduce response time
    const transactions = await connection.getSignaturesForAddress(
      contractPubkey, 
      { 
        limit: 3,  // Reduced limit to get faster responses
        commitment: 'confirmed' // Use 'confirmed' instead of 'finalized' for faster confirmation
      }
    );
    
    if (transactions.length > 0 && transactions[0].signature !== lastTransactionSignature) {
      // New transaction detected
      const newSignature = transactions[0].signature;
      console.log(`New transaction detected: ${newSignature}`);
      console.log({
        timestamp: new Date().toISOString(),
        signature: newSignature,
        contractAddress: CONTRACT_ADDRESS
      });
      
      // Update last signature before triggering to prevent duplicate triggers
      lastTransactionSignature = newSignature;
      
      // Trigger the solenoid immediately
      await triggerSolenoid();
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
        
        // Trigger the solenoid immediately on account change
        await triggerSolenoid();
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
  console.log(`Serial Port: ${SERIAL_PORT}`);
  
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
    process.exit(0);
  });
}

// Start the application
main().catch(console.error);
