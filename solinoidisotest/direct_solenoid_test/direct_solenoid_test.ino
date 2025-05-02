/*
 * Direct Solenoid Test for Empire Mini G3
 * This sketch will directly control the solenoid through the motor shield
 * based on serial input commands
 */

// Motor shield pin definitions
const int DIR_PIN = 7;     // Direction control
const int BRAKE_PIN = 9;   // Brake control
const int PWM_PIN = 6;     // PWM speed control

// State variables
bool isRunning = false;    // Is the solenoid currently running

// Fart sound parameters
const int RAMP_UP_STEPS = 5;      // Number of steps to ramp up (quick)
const int FADE_OUT_STEPS = 5;    // Number of steps to fade out (gradual)
const int RAMP_UP_DELAY = 10;      // Milliseconds between ramp up steps
const int FADE_OUT_DELAY = 10;    // Milliseconds between fade out steps

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
  
  Serial.println("Direct Solenoid Test Starting");
  Serial.println("DIR_PIN: " + String(DIR_PIN) + ", BRAKE_PIN: " + String(BRAKE_PIN) + ", PWM_PIN: " + String(PWM_PIN));
  Serial.println("Available commands:");
  Serial.println("  't' - Toggle solenoid (start/stop)");
  Serial.println("  'f' - Forward burst (100ms)");
  Serial.println("  'b' - Backward burst (100ms)");
  Serial.println("  'd' - Direction toggle test (1 toggle)");
  Serial.println("  'p' - Fart pattern (quick ramp up, slow fade out)");
  Serial.println("  'c' - Cyclic test (on/off 16 times per second for 10 seconds)");
  Serial.println("  's' - Stop solenoid");
}

void loop() {
  // Check if data is available to read
  if (Serial.available() > 0) {
    // Read the incoming command
    char command = Serial.read();
    
    // Process the command
    switch(command) {
      case 't':
        // Toggle solenoid on/off
        if (isRunning) {
          stopSolenoid();
          isRunning = false;
        } else {
          Serial.println("Starting solenoid...");
          isRunning = true;
          // Start with forward motion
          forwardBurst();
        }
        break;
        
      case 'f':
        // Forward burst
        forwardBurst();
        break;
        
      case 'b':
        // Backward burst
        backwardBurst();
        break;
        
      case 'd':
        // Direction toggle test
        directionToggleTest();
        break;
        
      case 'p':
        // Fart pattern (quick ramp up, slow fade out)
        fartPattern();
        break;
        
      case 'c':
        // Cyclic test (on/off 16 times per second for 10 seconds)
        cyclicTest();
        break;
        
      case 's':
        // Stop solenoid
        stopSolenoid();
        isRunning = false;
        break;
        
      default:
        Serial.println("Unknown command. Available commands:");
        Serial.println("  't' - Toggle solenoid (start/stop)");
        Serial.println("  'f' - Forward burst (100ms)");
        Serial.println("  'b' - Backward burst (100ms)");
        Serial.println("  'd' - Direction toggle test (1 toggles)");
        Serial.println("  'p' - Fart pattern (quick ramp up, slow fade out)");
        Serial.println("  'c' - Cyclic test (on/off 16 times per second for 10 seconds)");
        Serial.println("  's' - Stop solenoid");
        break;
    }
  }
  
  // If the solenoid is running, continue the pattern
  if (isRunning) {
    // Forward motion
    forwardBurst();
    delay(100);  // Pause between bursts
    
    // Backward motion
    backwardBurst();
    delay(100);  // Pause between bursts
  }
}

// Function to run a forward burst
void forwardBurst() {
  Serial.println("Energizing solenoid (forward) at MAXIMUM power...");
  digitalWrite(DIR_PIN, HIGH);    // Set direction forward
  digitalWrite(BRAKE_PIN, LOW);   // Disengage brake
  analogWrite(PWM_PIN, 255);      // FULL power
  delay(100);                     // Run for 100 milliseconds
  stopSolenoid();
}

// Function to run a backward burst
void backwardBurst() {
  Serial.println("Energizing solenoid (backward) at MAXIMUM power...");
  digitalWrite(DIR_PIN, LOW);     // Set direction backward
  digitalWrite(BRAKE_PIN, LOW);   // Disengage brake
  analogWrite(PWM_PIN, 255);      // FULL power
  delay(100);                     // Run for 100 milliseconds
  stopSolenoid();
}

// Function to run the direction toggle test
void directionToggleTest() {
  Serial.println("Alternative test - toggling direction pin only...");
  digitalWrite(BRAKE_PIN, LOW);   // Disengage brake
  analogWrite(PWM_PIN, 255);      // FULL power
  
  // Toggle direction several times
  for (int i = 0; i < 1; i++) {
    Serial.println("Direction HIGH");
    digitalWrite(DIR_PIN, HIGH);
    delay(500);
    Serial.println("Direction LOW");
    digitalWrite(DIR_PIN, LOW);
    delay(100);
  }
  
  stopSolenoid();
}

// Function to stop the solenoid
void stopSolenoid() {
  Serial.println("Stopping solenoid...");
  digitalWrite(BRAKE_PIN, HIGH);  // Engage brake
  analogWrite(PWM_PIN, 0);        // No power
}

// Function to create a fart-like pattern with quick ramp up and slow fade out
void fartPattern() {
  Serial.println("Executing fart pattern...");
  
  // Set direction forward for the initial burst
  digitalWrite(DIR_PIN, HIGH);
  digitalWrite(BRAKE_PIN, LOW);   // Disengage brake
  
  // Quick ramp up (initial burst)
  Serial.println("Quick ramp up...");
  for (int i = 0; i < RAMP_UP_STEPS; i++) {
    int pwmValue = map(i, 0, RAMP_UP_STEPS-1, 100, 255); // Start at medium power and quickly reach full power
    analogWrite(PWM_PIN, pwmValue);
    delay(RAMP_UP_DELAY);
  }
  
  // Hold at full power briefly
  analogWrite(PWM_PIN, 255);
  delay(50);
  
  // Gradual fade out (trailing sound)
  Serial.println("Gradual fade out...");
  digitalWrite(DIR_PIN, !digitalRead(DIR_PIN));
  for (int i = 0; i < FADE_OUT_STEPS; i++) {
    int pwmValue = map(i, 0, FADE_OUT_STEPS-1, 255, 0); // Gradually decrease from full power to zero
    analogWrite(PWM_PIN, pwmValue);
    

    // Randomly toggle direction during fade-out for more realistic sound
    if (random(10) > 7) { // 20% chance to toggle direction
      // digitalWrite(DIR_PIN, !digitalRead(DIR_PIN));
      // Serial.println("Direction change during fade-out");
      
    }
    
    delay(FADE_OUT_DELAY * (i+1)); // Increasing delay as we fade out for more natural sound
  }
  
  // Stop the solenoid
  backwardBurst();
  stopSolenoid();
}

// Function to run a cyclic test (on/off 16 times per second for 10 seconds)
void cyclicTest() {
  Serial.println("Starting cyclic test - 16 cycles per second for 10 seconds...");
  
  // Run for 10 seconds (10 cycles at 1 cycle per second)
  for (int cycle = 0; cycle < 160; cycle++) {
    // Forward burst (like forwardBurst function)
    // Removed serial output to achieve higher speed
    digitalWrite(DIR_PIN, HIGH);    // Set direction forward
    digitalWrite(BRAKE_PIN, LOW);   // Disengage brake
    analogWrite(PWM_PIN, 255);      // FULL power
    delay(30);                      // On for 30ms (1/32nd of a second)
    stopSolenoid();                 // Properly stop the solenoid
    
    // Backward burst (like backwardBurst function)
    // Removed serial output to achieve higher speed
    digitalWrite(DIR_PIN, LOW);     // Set direction backward
    digitalWrite(BRAKE_PIN, LOW);   // Disengage brake
    analogWrite(PWM_PIN, 255);      // FULL power
    delay(30);                      // On for 30ms (1/32nd of a second)
    stopSolenoid();                 // Properly stop the solenoid
  }
  
  Serial.println("Cyclic test complete.");
}


