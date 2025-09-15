'use strict';

const libQ = require('kew');
const fs = require('fs-extra');
const LCD = require('./lcd-driver');

let lcd;

module.exports = class Hd44780Plugin {
  constructor(context) {
    this.context = context;
    this.logger = context.logger;
    this.commandRouter = context.coreCommand;
    this.configManager = context.configManager;
    this.configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');
    this.config = {};
  }

  onVolumioStart() {
    this.loadConfig();
    return libQ.resolve();
  }

  onStart() {
    this.logger.info('Starting HD44780 I2C LCD Plugin...');
    lcd = new LCD('/dev/i2c-1', this.config.i2cAddress, this.config.cols, this.config.rows);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print('Volumio Ready');

    this.commandRouter.volumioAddQueueObserver(this.onQueueChange.bind(this));
    return libQ.resolve();
  }

  onStop() {
    if (lcd) lcd.clear();
    return libQ.resolve();
  }

  onRestart() {
    return this.onStop().then(this.onStart.bind(this));
  }

  getUIConfig() {
    return fs.readJsonSync(__dirname + '/UIConfig.json');
  }

  saveConfig(data) {
    this.config.i2cAddress = parseInt(data.i2cAddress, 16);
    this.config.cols = parseInt(data.cols);
    this.config.rows = parseInt(data.rows);
    fs.writeJsonSync(this.configFile, this.config);
  }

  loadConfig() {
    if (fs.existsSync(this.configFile)) {
      this.config = fs.readJsonSync(this.configFile, { throws: false }) || {};
    }
    if (!this.config.i2cAddress) this.config.i2cAddress = 0x27;
    if (!this.config.cols) this.config.cols = 16;
    if (!this.config.rows) this.config.rows = 2;
  }

  onQueueChange() {
    let state = this.commandRouter.volumioGetState();
    if (!lcd) return;

    if (state.status === 'play') {
      let line1 = `${state.artist || ''} - ${state.title || ''}`.substring(0, this.config.cols);
      let line2 = `${Math.floor((state.seek || 0)/1000)}s/${state.duration || 0}s`.substring(0, this.config.cols);
      lcd.setCursor(0, 0);
      lcd.print(line1);
      if (this.config.rows > 1) {
        lcd.setCursor(0, 1);
        lcd.print(line2);
      }
    } else {
      lcd.setCursor(0, 0);
      lcd.print('Volumio Idle');
      if (this.config.rows > 1) {
        lcd.setCursor(0, 1);
        lcd.print(' '.repeat(this.config.cols));
      }
    }
  }
};
