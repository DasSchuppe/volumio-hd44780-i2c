#!/bin/bash
echo "Uninstalling volumio-hd44780-i2c..."
cd $(dirname $0)
rm -rf node_modules
echo "Done."
