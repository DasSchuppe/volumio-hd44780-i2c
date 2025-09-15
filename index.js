'use strict';

/**
 * Volumio 3 compatible plugin index.js (no `kew` dependency)
 * Uses native Promises / async instead of kew.
 */

const fs = require('fs');
const path = require('path');
const LCD = require('./lcd-driver');

let lcd = null;

module.exports = class Hd44780Plugin {
  constructor(context) {
    this.context = context;
    this.logger = context.logger || console;
    this.commandRouter = context.coreCommand;
    // pluginManager is reachable from commandRouter in most Volumio setups
    this.pluginManager = (this.commandRouter && this.commandRouter.pluginManager) ? this.commandRouter.pluginManager : (context.pluginManager || null);
    // configFile via pluginManager (fallback to local path if unavailable)
    try {
      this.configFile = (this.pluginManager && this.pluginManager.getConfigurationFile) ?
        this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json') :
        path.join(__dirname, 'config.json');
    } catch (e) {
      this.configFile = path.join(__dirname, 'config.json');
    }
    this.config = {};
    this.uiConfigPath = path.join(__dirname, 'UIConfig.json');
  }

  // Called by Volumio on boot
  async onVolumioStart() {
    try {
      this.loadConfig();
      return Promise.resolve();
    } catch (e) {
      this.logger.error('HD44780:onVolumioStart error: ' + e);
      return Promise.resolve();
    }
  }

  // Called when plugin is enabled / started
  async onStart() {
    try {
      this.logger.info('HD44780: onStart - config=' + JSON.stringify(this.config));
      // Try to init LCD. On any error, log and continue (plugin stays started)
      try {
        lcd = new LCD('/dev/i2c-1', this.config.i2cAddress, this.config.cols, this.config.rows);
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print('Volumio Ready');
        this.logger.info('HD44780: LCD initialized');
      } catch (e) {
        this.logger.warn('HD44780: LCD init failed (continuing without display): ' + e);
        lcd = null;
      }

      // Register observer for queue/state changes (safely)
      if (this.commandRouter && typeof this.commandRouter.volumioAddQueueObserver === 'function') {
        try {
          this.commandRouter.volumioAddQueueObserver(this.onQueueChange.bind(this));
        } catch (e) {
          this.logger.warn('HD44780: failed to register queue observer: ' + e);
        }
      }

      return Promise.resolve();
    } catch (e) {
      this.logger.error('HD44780:onStart generic error: ' + e);
      return Promise.reject(e);
    }
  }

  // Called when plugin is stopped/disabled
  async onStop() {
    try {
      if (lcd) {
        try { lcd.clear(); } catch (e) { this.logger.warn('HD44780: clear error on stop: ' + e); }
        lcd = null;
      }
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async onRestart() {
    await this.onStop();
    return this.onStart();
  }

  // Return UI config (must be a Promise)
  async getUIConfig() {
    try {
      let uiConfig = { page: { options: [] } };
      if (fs.existsSync(this.uiConfigPath)) {
        uiConfig = JSON.parse(fs.readFileSync(this.uiConfigPath));
      }
      // populate defaults from current config (UI expects strings for hex address)
      if (!this.config || Object.keys(this.config).length === 0) this.loadConfig();
      if (uiConfig && uiConfig.page && Array.isArray(uiConfig.page.options)) {
        uiConfig.page.options.forEach(opt => {
          if (opt.id && this.config.hasOwnProperty(opt.id)) {
            if (opt.id === 'i2cAddress') {
              opt.value = '0x' + this.config[opt.id].toString(16);
            } else {
              opt.value = String(this.config[opt.id]);
            }
          }
        });
      }
      return Promise.resolve(uiConfig);
    } catch (e) {
      this.logger.error('HD44780:getUIConfig error: ' + e);
      return Promise.reject(e);
    }
  }

  // data comes from WebUI; returns Promise
  async saveConfig(data) {
    try {
      // parse incoming values
      let parsedAddress = 0x27;
      if (typeof data.i2cAddress === 'string') {
        // allow values like "0x27" or "27"
        const hex = data.i2cAddress.trim().toLowerCase();
        parsedAddress = hex.startsWith('0x') ? parseInt(hex, 16) : parseInt(hex, 10);
      } else {
        parsedAddress = Number(data.i2cAddress) || 0x27;
      }
      this.config.i2cAddress = Number.isNaN(parsedAddress) ? 0x27 : parsedAddress;
      this.config.cols = parseInt(data.cols, 10) || 16;
      this.config.rows = parseInt(data.rows, 10) || 2;

      // write config (atomic-ish)
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));

      this.logger.info('HD44780: config saved: ' + JSON.stringify(this.config));

      // attempt reinit lcd with new params (don't crash on error)
      try {
        if (lcd) { try { lcd.clear(); } catch (e) {} lcd = null; }
        lcd = new LCD('/dev/i2c-1', this.config.i2cAddress, this.config.cols, this.config.rows);
        lcd.clear();
        lcd.print('Config Saved');
      } catch (e) {
        this.logger.warn('HD44780: reinit after save failed: ' + e);
        lcd = null;
      }

      return Promise.resolve();
    } catch (e) {
      this.logger.error('HD44780: saveConfig error: ' + e);
      return Promise.reject(e);
    }
  }

  // load config from file
  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        this.config = JSON.parse(fs.readFileSync(this.configFile));
      } else {
        this.config = {};
      }
    } catch (e) {
      this.logger.warn('HD44780: loadConfig parse error, using defaults: ' + e);
      this.config = {};
    }
    if (!this.config.i2cAddress) this.config.i2cAddress = 0x27;
    if (!this.config.cols) this.config.cols = 16;
    if (!this.config.rows) this.config.rows = 2;
  }

  // queue/state observer callback
  onQueueChange() {
    if (!lcd) return;
    try {
      const state = (this.commandRouter && this.commandRouter.volumioGetState) ? this.commandRouter.volumioGetState() : null;
      if (!state) return;

      if (state.status === 'play') {
        const artist = state.artist || '';
        const title = state.title || '';
        const line1 = `${artist} - ${title}`.substring(0, this.config.cols);
        const elapsed = Math.floor((state.seek || 0) / 1000);
        const dur = Math.floor(state.duration || 0);
        const line2 = `${elapsed}s/${dur}s`.substring(0, this.config.cols);
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
