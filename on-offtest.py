#!/usr/bin/env python3

import serial
import time

# Configuration
SERIAL_PORT = '/dev/tty.usbmodem21101'  # Updated to match your Arduino's port
BAUD_RATE = 9600

class ArduinoLEDTester:
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
            print(f"Arduino response: '{response}'")
            return response
        except Exception as e:
            print(f"Error sending command: {e}")
            return None
    
    def led_on(self):
        """Turn the built-in LED on"""
        command = "ON"
        return self.send_command(command)
    
    def led_off(self):
        """Turn the built-in LED off"""
        command = "OFF"
        return self.send_command(command)
    
    def close(self):
        """Close the serial connection"""
        if hasattr(self, 'serial') and self.serial.is_open:
            self.serial.close()
            print("Connection to Arduino closed")

def main():
    print("Arduino LED Test - This will verify communication with the Arduino")
    print("Make sure you've uploaded the LED test sketch to your Arduino first!")
    
    try:
        # Connect to Arduino
        arduino = ArduinoLEDTester()
        
        # Run test cycles
        cycles = 5
        print(f"\nRunning {cycles} test cycles...")
        
        for i in range(cycles):
            print(f"\nCycle {i+1}/{cycles}:")
            
            # Turn LED on
            print("Turning LED ON...")
            arduino.led_on()
            time.sleep(1)
            
            # Turn LED off
            print("Turning LED OFF...")
            arduino.led_off()
            time.sleep(1)
        
        print("\nTest completed successfully!")
    
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
    except Exception as e:
        print(f"\nError during test: {e}")
    finally:
        # Make sure to close the connection
        if 'arduino' in locals():
            arduino.close()

if __name__ == "__main__":
    main()
