#!/bin/bash
echo "------------------------------------------------------------"
echo "Uninstalling HD44780 I2C plugin..."
echo "------------------------------------------------------------"

# Node-Module des Plugins entfernen
rm -rf node_modules

# Temporäre Dateien löschen
rm -f package-lock.json

echo "------------------------------------------------------------"
echo "HD44780 I2C plugin successfully uninstalled."
echo "------------------------------------------------------------"
exit 0
