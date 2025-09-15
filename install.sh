#!/bin/bash
echo "Installing dependencies for volumio-hd44780-i2c..."
sudo apt-get update
sudo apt-get install -y i2c-tools python3 python3-pip
cd $(dirname $0)
npm install --unsafe-perm
echo "Installation finished."
