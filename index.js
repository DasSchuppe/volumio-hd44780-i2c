'use strict';

const libQ = require('kew');
const fs = require('fs-extra');
const path = require('path');
const LCD = require('./lcd-driver');

let lcd = null;

module.exports = class Hd44780Plugin {
  constructor(context) {
    this.context = context;
    this.logger = context.logger;
    this.commandRouter = context.coreCommand;
    this.pluginManager = context.pluginManager;
    this.configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');
    this.config = {};
    this.uiConfigPath = path.join(__dirname, 'UIConfig.json');
  }

  onVolumioStart() {
    // wird beim Booten geladen
    this.loadConfig();
    return libQ.resolve();
  }

  onStart() {
    const defer = libQ.defer();

    // Versuche, das Display zu initialisieren — aber starte das Plugin selbst auch wenn das fehlschlägt
    try {
      this.logger.info('HD44780: starting, config: ' + JSON.stringify(this.config));
      try {
        lcd = new LCD('/dev/i2c-1', this.config.i2cAddress, this.config.cols, this.config.rows);
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print('Volumio Ready');
        this.logger.info('HD44780: LCD initialized');
      } catch (e) {
        this.logger.warn('HD44780: LCD init failed (will continue without LCD): ' + e);
        lcd = null;
      }

      // Observer registrieren (Volumio state changes)
      this.commandRouter.volumioAddQueueObserver(this.onQueueChange.bind(this));

      defer.resolve();
    } catch (e) {
      this.logger.error('HD44780: onStart generic error: ' + e);
      defer.reject(e);
    }

    return defer.promise;
  }

  onStop() {
    const defer = libQ.defer();
    try {
      if (lcd) {
        try {
          lcd.clear();
        } catch (e) {
          this.logger.warn('HD44780: clear failed on stop: ' + e);
        }
      }
      defer.resolve();
    } catch (e) {
      defer.reject(e);
    }
    return defer.promise;
  }

  onRestart() {
    return this.onStop().then(this.onStart.bind(this));
  }

  getUIConfig() {
    const defer = libQ.defer();
    try {
      let uiConfig = fs.readJsonSync(this.uiConfigPath);
      // Falls wir Werte aus config.json haben, setzen wir sie in das UIConfig (als string)
      if (!this.config) this.loadConfig();
      uiConfig.page.options.forEach(opt => {
        if (opt.id && this.config.hasOwnProperty(opt.id)) {
          // UI expects strings for the values in many cases
          if (typeof this.config[opt.id] === 'number') {
            opt.value = '0x' + this.config[opt.id].toString(16);
          } else {
            opt.value = this.config[opt.id];
          }
        }
      });
      defer.resolve(uiConfig);
    } catch (e) {
      this.logger.error('HD44780: getUIConfig error: ' + e);
      defer.reject(e);
    }
    return defer.promise;
  }

  saveConfig(data) {
    const defer = libQ.defer();
    try {
      // Erwartete Daten kommen als strings von der WebUI
      // i2cAddress z.B. "0x27" -> parseInt hex
      const parsedAddress = (typeof data.i2cAddress === 'string') ? parseInt(data.i2cAddress, 16) : Number(data.i2cAddress);
      this.config.i2cAddress = Number.isNaN(parsedAddress) ? 0x27 : parsedAddress;
      this.config.cols = parseInt(data.cols) || 16;
      this.config.rows = parseInt(data.rows) || 2;

      fs.writeJsonSync(this.configFile, this.config, { spaces: 2 });
      this.logger.info('HD44780: config saved: ' + JSON.stringify(this.config));

      // Wenn LCD läuft, reinitialisieren wir ihn mit neuen Einstellungen (fail-safe)
      try {
        if (lcd) {
          lcd.clear();
          lcd = null;
        }
        lcd = new LCD('/dev/i2c-1', this.config.i2cAddress, this.config.cols, this.config.rows);
        lcd.clear();
        lcd.print('Config Saved');
      } catch (e) {
        this.logger.warn('HD44780: reinit after save failed: ' + e);
        lcd = null;
      }

      defer.resolve();
    } catch (e) {
      this.logger.error('HD44780: saveConfig error: ' + e);
      defer.reject(e);
    }
    return defer.promise;
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        this.config = fs.readJsonSync(this.configFile, { throws: false }) || {};
      } else {
        this.config = {};
      }
      if (!this.config.i2cAddress) this.config.i2cAddress = 0x27;
      if (!this.config.cols) this.config.cols = 16;
      if (!this.config.rows) this.config.rows = 2;
    } catch (e) {
      this.logger.error('HD44780: loadConfig error: ' + e);
      this.config = { i2cAddress: 0x27, cols: 16, rows: 2 };
    }
  }

  onQueueChange() {
    // Auf State-Änderungen reagieren
    if (!lcd) return;
    try {
      const state = this.commandRouter.volumioGetState();
      if (!state) return;

      if (state.status === 'play') {
        const artist = state.artist || '';
        const title = state.title || '';
        let line1 = `${artist} - ${title}`.substring(0, this.config.cols);
        let elapsed = Math.floor((state.seek || 0) / 1000);
        let dur = Math.floor(state.duration || 0);
        let line2 = `${elapsed}s/${dur}s`.substring(0, this.config.cols);

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
    } catch (e) {
      this.logger.warn('HD44780: onQueueChange error: ' + e);
    }
  }
};
