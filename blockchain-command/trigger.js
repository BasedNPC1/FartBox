// trigger.js - Monitors Solana transactions and triggers the solenoid when transactions are detected
const { SerialPort } = require('serialport');
const { Connection, PublicKey } = require('@solana/web3.js');
const { ReadlineParser } = require('@serialport/parser-readline');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Configuration
const CONTRACT_ADDRESS = '6cPCHGuxD4G7k69R9UwWDUUGHDJMpZuRWDpd26Mqpump'; // Hardcoded contract address
const HELIUS_RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=ad13694f-03a7-404e-90d8-3456707ed63a';
const BAUD_RATE = 9600;

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
  console.log(`Platform: ${os.platform()} (${os.arch()})`);
  
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
