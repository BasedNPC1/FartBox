# Setting Up FartBox on NVIDIA Jetson AGX Orin

This guide will help you set up and run the FartBox project on your NVIDIA Jetson AGX Orin developer kit.

## Prerequisites

1. NVIDIA Jetson AGX Orin with JetPack installed
2. Arduino connected via USB
3. Empire Mini paintball gun solenoids connected to the Arduino

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/BasedNPC1/FartBox.git
cd FartBox
```

### 2. Set Up Node.js

Install Node.js on your Jetson:

```bash
sudo apt update
sudo apt install -y nodejs npm
```

Verify installation:

```bash
node --version
npm --version
```

### 3. Install Project Dependencies

Navigate to the blockchain-command directory and install dependencies:

```bash
cd blockchain-command
npm install
```

### 4. Arduino Serial Port Permissions

On Linux systems like the Jetson, you need proper permissions to access serial ports. Add your user to the dialout group:

```bash
sudo usermod -a -G dialout $USER
```

**Important**: You'll need to log out and log back in for this change to take effect.

You can also temporarily give permission to the serial port:

```bash
sudo chmod 666 /dev/ttyACM0  # Replace with your actual port
```

### 5. Running the Application

Start the blockchain monitoring application:

```bash
npm start
```

## Troubleshooting

### Serial Port Issues

If you encounter serial port permission issues:

1. Check available serial ports:
   ```bash
   ls -l /dev/tty*
   ```

2. Identify your Arduino port (usually /dev/ttyACM0 or /dev/ttyUSB0)

3. Verify the port exists and has proper permissions:
   ```bash
   ls -l /dev/ttyACM0
   ```

4. If you're still having issues, try running the application with sudo (not recommended for production):
   ```bash
   sudo node trigger.js
   ```

### Node.js Version Issues

If you encounter compatibility issues with Node.js, you may need to install a specific version using NVM:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
source ~/.bashrc
nvm install 16  # Install Node.js v16
nvm use 16      # Use Node.js v16
```

## Monitoring and Logs

To monitor the application and see logs in real-time:

```bash
npm start > fartbox.log 2>&1 &
tail -f fartbox.log
```

## Running on Startup

To make the application run on startup, create a systemd service:

```bash
sudo nano /etc/systemd/system/fartbox.service
```

Add the following content:

```
[Unit]
Description=FartBox Blockchain Monitor
After=network.target

[Service]
User=<your-username>
WorkingDirectory=/home/<your-username>/FartBox/blockchain-command
ExecStart=/usr/bin/node trigger.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable fartbox.service
sudo systemctl start fartbox.service
```

Check status:

```bash
sudo systemctl status fartbox.service
```
