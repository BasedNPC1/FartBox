/*
 * Arduino Motor Shield Control for Empire Mini G3 Solenoid
 * This sketch receives commands from a Python script via serial
 * and controls the motor shield accordingly.
 * 
 * Commands:
 * F,speed - Run motor forward at specified speed (0-255)
 * B,speed - Run motor backward at specified speed (0-255)
 * S - Stop the motor
 */

// Motor shield pin definitions
const int DIR_PIN = 7;     // Direction control
const int BRAKE_PIN = 9;   // Brake control
const int PWM_PIN = 6;     // PWM speed control

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  
  // Initialize pins for motor control
  pinMode(DIR_PIN, OUTPUT);
  pinMode(BRAKE_PIN, OUTPUT);
  pinMode(PWM_PIN, OUTPUT);
  
  // Initial state: motor stopped
  digitalWrite(BRAKE_PIN, HIGH);  // Engage brake
  analogWrite(PWM_PIN, 0);        // No power
  
  Serial.println("Arduino Motor Shield Control Ready");
  Serial.println("DIR_PIN: " + String(DIR_PIN) + ", BRAKE_PIN: " + String(BRAKE_PIN) + ", PWM_PIN: " + String(PWM_PIN));
}

void loop() {
  // Check if data is available to read
  if (Serial.available() > 0) {
    // Read the incoming command
    String command = Serial.readStringUntil('\n');
    command.trim();  // Remove any whitespace
    
    // Process the command
    if (command.startsWith("F")) {
      // Forward command
      int speed = 255;  // Default to full speed
      
      // Check if speed is specified
      int commaIndex = command.indexOf(',');
      if (commaIndex != -1) {
        speed = command.substring(commaIndex + 1).toInt();
        // Ensure speed is within valid range
        speed = constrain(speed, 0, 255);
      }
      
      // Run motor forward
      digitalWrite(DIR_PIN, HIGH);    // Set direction forward
      digitalWrite(BRAKE_PIN, LOW);   // Disengage brake
      analogWrite(PWM_PIN, speed);    // Set speed
      
      Serial.println("Running forward at speed " + String(speed));
    }
    else if (command.startsWith("B")) {
      // Backward command
      int speed = 255;  // Default to full speed
      
      // Check if speed is specified
      int commaIndex = command.indexOf(',');
      if (commaIndex != -1) {
        speed = command.substring(commaIndex + 1).toInt();
        // Ensure speed is within valid range
        speed = constrain(speed, 0, 255);
      }
      
      // Run motor backward
      digitalWrite(DIR_PIN, LOW);     // Set direction backward
      digitalWrite(BRAKE_PIN, LOW);   // Disengage brake
      analogWrite(PWM_PIN, speed);    // Set speed
      
      Serial.println("Running backward at speed " + String(speed));
    }
    else if (command.startsWith("S")) {
      // Stop command
      digitalWrite(BRAKE_PIN, HIGH);  // Engage brake
      analogWrite(PWM_PIN, 0);        // No power
      
      Serial.println("Motor stopped");
    }
    else {
      // Unknown command
      Serial.println("Unknown command: " + command);
    }
  }
}
