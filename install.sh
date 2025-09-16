#!/bin/bash
echo "------------------------------------------------------------"
echo "Installing system dependencies for HD44780 I2C plugin..."
echo "------------------------------------------------------------"

# Update Paketlisten
sudo apt-get update

# Install build tools + python für node-gyp / i2c-bus
sudo apt-get install -y build-essential python

echo "------------------------------------------------------------"
echo "Installing Node.js dependencies (i2c-bus, lcd)..."
echo "------------------------------------------------------------"

# Plugin-Pakete installieren
npm install --production || exit 1

echo "------------------------------------------------------------"
echo "HD44780 I2C plugin installation finished."
echo "------------------------------------------------------------"
exit 0
