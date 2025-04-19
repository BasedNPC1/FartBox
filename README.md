# FartBox

A system that monitors Solana blockchain transactions and controls Empire Mini G3 solenoid valves to emulate fart sounds.

## Project Structure

- **blockchain-command**: Monitors Solana blockchain transactions using Helius RPC and controls solenoids based on transaction activity
- **integrated-test**: Contains integrated testing for all systems
- **open-close-commands**: Python scripts for opening and closing the system
- **solenoidiso-test**: Testing scripts for solenoid functionality, including bit checks

## Hardware

- Empire Mini paintball gun solenoids
- NVIDIA Jetson AGX Orin developer kit
- Arduino for serial communication with solenoids

## Features

- Real-time monitoring of Solana blockchain for specific contract address
- Serial communication with Arduino to control solenoids
- Various solenoid control modes: toggle on/off, forward burst, backward burst, direction toggle, and stop
