/*
 * Stop Solenoid
 * This sketch stops all solenoid activity by setting all control pins to safe states
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
  
  // Stop the solenoid
  digitalWrite(BRAKE_PIN, HIGH);  // Engage brake
  analogWrite(PWM_PIN, 0);        // No power
  
  Serial.println("Solenoid stopped!");
}

void loop() {
  // Do nothing - just keep the solenoid stopped
  delay(1000);
}
