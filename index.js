'use strict';

const fs = require('fs');
const path = require('path');
const LCDDriver = require('./lcd-driver');

let config = {};
let lcd = null;

module.exports = {
  onVolumioStart: function () {
    const configFile = path.join(__dirname, 'config.json');
    config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    return true;
  },

  onStart: function () {
    lcd = new LCDDriver(config.i2cAddress, config.cols, config.rows);
    lcd.init().then(() => {
      lcd.print('Volumio 3', 0);
      lcd.print('HD44780 Ready', 1);
    });
    return true;
  },

  onStop: function () {
    if (lcd) lcd.clear();
    return true;
  },

  getUIConfig: function () {
    const uiconf = JSON.parse(fs.readFileSync(path.join(__dirname, 'UIConfig.json'), 'utf8'));
    return uiconf;
  },

  saveConfig: function (data) {
    config.i2cAddress = data.i2cAddress;
    config.rows = data.rows;
    config.cols = data.cols;
    fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(config, null, 2));
  }
};
