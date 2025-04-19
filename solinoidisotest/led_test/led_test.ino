/*
 * Arduino LED Test
 * This sketch receives simple commands from Python to control the built-in LED
 * Commands:
 * ON - Turn the built-in LED on
 * OFF - Turn the built-in LED off
 */

// Use the built-in LED
const int LED_PIN = LED_BUILTIN;  // Usually pin 13 on most Arduino boards

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  
  // Initialize LED pin
  pinMode(LED_PIN, OUTPUT);
  
  // Initial state: LED off
  digitalWrite(LED_PIN, LOW);
  
  Serial.println("Arduino LED Test Ready");
}

void loop() {
  // Check if data is available to read
  if (Serial.available() > 0) {
    // Read the incoming command
    String command = Serial.readStringUntil('\n');
    command.trim();  // Remove any whitespace
    
    // Process the command
    if (command == "ON") {
      // Turn LED on
      digitalWrite(LED_PIN, HIGH);
      Serial.println("LED turned ON");
    }
    else if (command == "OFF") {
      // Turn LED off
      digitalWrite(LED_PIN, LOW);
      Serial.println("LED turned OFF");
    }
    else {
      // Unknown command
      Serial.println("Unknown command: " + command);
    }
  }
}
