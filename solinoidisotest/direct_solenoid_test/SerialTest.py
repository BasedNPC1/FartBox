#!/usr/bin/env python3
"""
Direct Solenoid Test for Empire Mini G3
This script will control the solenoid through the Arduino motor shield
via serial communication
"""

# Import pyserial as serial
try:
    import serial
except ImportError:
    print("Error: pyserial module not found.")
    print("Please install it using: pip install pyserial")
    exit(1)
    
import time
import sys

# Configuration
SERIAL_PORT = '/dev/tty.usbmodem21401'  # Update this to match your Arduino's port
BAUD_RATE = 9600

def main():
    print("Empire Mini G3 Solenoid Control")
    print("-------------------------------")
    print("This script sends commands to control the solenoid.")
    print("Available commands:")
    print("  't' - Toggle solenoid (start/stop)")
    print("  'f' - Forward burst (100ms)")
    print("  'b' - Backward burst (100ms)")
    print("  'd' - Direction toggle test (1 toggle)")
    print("  's' - Stop solenoid")
    print("  'q' - Quit this program")
    print()
    
    try:
        # Connect to Arduino
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        print(f"Connected to Arduino on {SERIAL_PORT}")
        time.sleep(2)  # Wait for Arduino to reset after connection
        
        # Read and print any initial messages from Arduino
        read_arduino_output(ser)
        
        # Main command loop
        while True:
            # Get command from user
            command = input("\nEnter command (or 'q' to quit): ").strip().lower()
            
            if command == 'q':
                print("Quitting...")
                break
            
            if len(command) != 1:
                print("Please enter a single letter command.")
                continue
            
            # Send command to Arduino
            ser.write(f"{command}\n".encode())
            print(f"Sent command: '{command}'")
            
            # Wait for and print response
            time.sleep(0.1)  # Give Arduino time to respond
            read_arduino_output(ser)
        
    except Exception as e:
        print(f"Error: {e}")
        return
    except KeyboardInterrupt:
        print("\nProgram interrupted by user")
    finally:
        # Make sure to close the connection
        if 'ser' in locals() and ser.is_open:
            ser.close()
            print("Connection to Arduino closed")

def read_arduino_output(ser):
    """Read and print all available output from the Arduino"""
    while ser.in_waiting:
        line = ser.readline().decode('utf-8').strip()
        if line:
            print(f"Arduino: {line}")

if __name__ == "__main__":
    main()
