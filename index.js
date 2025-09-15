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
    const defer = libQ.defer();
    try {
      lcd = new LCD('/dev/i2c-1', this.config.i2cAddress, this.config.cols, this.config.rows);
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print('Volumio Ready');
      this.commandRouter.volumioAddQueueObserver(this.onQueueChange.bind(this));
      defer.resolve();
    } catch (e) {
      this.logger.error('LCD init failed: ' + e);
      defer.reject(new Error('LCD init failed'));
    }
    return defer.promise;
  }

  onStop() {
    const defer = libQ.defer();
    try {
      if (lcd) lcd.clear();
      defer.resolve();
    } catch (e) {
      defer.reject(new Error('Error stopping plugin'));
    }
    return defer.promise;
  }

  onRestart() {
    return this.onStop().then(this.onStart.bind(this));
  }

  getUIConfig() {
    const defer = libQ.defer();
    try {
      let uiConfig = fs.readJsonSync(__dirname + '/UIConfig.json');
      // Werte aus config.json übernehmen
      uiConfig.page.options.forEach(opt => {
        if (opt.id in this.config) {
          opt.value = this.config[opt.id];
        }
      });
      defer.resolve(uiConfig);
    } catch (e) {
      defer.reject(e);
    }
    return defer.promise;
  }

  saveConfig(data) {
    const defer = libQ.defer();
    try {
      this.config.i2cAddress = parseInt(data.i2cAddress, 16);
      this.config.cols = parseInt(data.cols);
      this.config.rows = parseInt(data.rows);
      fs.writeJsonSync(this.configFile, this.config);
      defer.resolve();
    } catch (e) {
      defer.reject(e);
    }
    return defer.promise;
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
    if (!lcd) return;
    let state = this.commandRouter.volumioGetState();
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
      if (this.config.rows > 1) lcd.setCursor(0, 1).print(' '.repeat(this.config.cols));
    }
  }
};
