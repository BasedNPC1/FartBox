#!/usr/bin/env python3

import serial
import time

# Configuration
SERIAL_PORT = '/dev/tty.usbmodem21101'  # Updated to match your Arduino's port
BAUD_RATE = 9600

# Arduino pin definitions (matching your Arduino code)
DIR_PIN = 7   # Direction control pin
BRAKE_PIN = 9  # Brake control pin
PWM_PIN = 6   # PWM speed control pin

class ArduinoMotorShield:
    def __init__(self, port=SERIAL_PORT, baud_rate=BAUD_RATE):
        try:
            self.serial = serial.Serial(port, baud_rate, timeout=1)
            print(f"Connected to Arduino on {port}")
            time.sleep(2)  # Wait for Arduino to reset after connection
        except serial.SerialException as e:
            print(f"Error connecting to Arduino: {e}")
            raise
    
    def send_command(self, command):
        """Send a command to the Arduino"""
        try:
            self.serial.write(f"{command}\n".encode())
            time.sleep(0.1)  # Give Arduino time to process
            response = self.serial.readline().decode().strip()
            print(f"Arduino response: {response}")
            return response
        except Exception as e:
            print(f"Error sending command: {e}")
            return None
    
    def forward(self, speed=255):
        """Run motor forward at specified speed (0-255)"""
        command = f"F,{speed}"
        return self.send_command(command)
    
    def backward(self, speed=255):
        """Run motor backward at specified speed (0-255)"""
        command = f"B,{speed}"
        return self.send_command(command)
    
    def stop(self):
        """Stop the motor"""
        command = "S"
        return self.send_command(command)
    
    def close(self):
        """Close the serial connection"""
        if hasattr(self, 'serial') and self.serial.is_open:
            self.serial.close()
            print("Connection to Arduino closed")

def main():
    # First, upload the Arduino code to your Arduino board
    print("Make sure you've uploaded the Arduino code to your board first!")
    print("\nThis script will control the Empire Mini G3 solenoid using the Arduino Motor Shield")
    print("It will run the solenoid in a pattern to emulate a fart sound")
    
    try:
        # Connect to Arduino
        arduino = ArduinoMotorShield()
        print("Connected to Arduino successfully!")
        
        # Run continuously until interrupted
        print("\nRunning continuously. Press Ctrl+C to stop.")
        
        cycle_count = 0
        while True:
            cycle_count += 1
            print(f"\nCycle {cycle_count}:")
            
            # Fart pattern: quick bursts with varying timing
            # First burst - longer
            print("Burst 1 - Forward")
            arduino.forward(255)  # Full power
            time.sleep(0.1)       # 100ms burst
            
            # Brief pause
            arduino.stop()
            time.sleep(0.1)       # 100ms pause
            
            # Second burst - shorter
            print("Burst 2 - Forward")
            arduino.forward(255)  # Full power
            time.sleep(0.15)      # 150ms burst
            
            # Brief pause
            arduino.stop()
            time.sleep(0.05)      # 50ms pause
            
            # Third burst - very short
            print("Burst 3 - Forward")
            arduino.forward(255)  # Full power
            time.sleep(0.1)       # 100ms burst
            
            # Stop and pause between fart sequences
            arduino.stop()
            print("Pausing between sequences...")
            time.sleep(5)         # 5 second pause between fart sequences
            
    except KeyboardInterrupt:
        print("\nProgram interrupted by user")
    except Exception as e:
        print(f"\nError during test: {e}")
    finally:
        # Make sure to close the connection
        if 'arduino' in locals():
            arduino.stop()
            arduino.close()

if __name__ == "__main__":
    main()
