'use strict';

const LcdDriver = require('./lib/lcd-driver');

module.exports = class Hd44780Plugin {
  constructor(context) {
    this.context = context;
    this.logger = context.logger;
    this.configManager = context.configManager;
    this.commandRouter = context.coreCommand;

    this.configFile = this.commandRouter.pluginManager.getConfigurationFile(
      this.context,
      'config.json'
    );
    this.config = new this.configManager(this.configFile);

    this.lcd = null;
  }

  onVolumioStart() {
    this.logger.info('[HD44780] Plugin start');
    return true;
  }

  onStart() {
    const address = this.config.get('i2cAddress') || 0x27;
    const cols = parseInt(this.config.get('cols')) || 16;
    const rows = parseInt(this.config.get('rows')) || 2;

    this.logger.info(`[HD44780] Init LCD at address ${address}, ${cols}x${rows}`);

    try {
      this.lcd = new LcdDriver(address, cols, rows);
      this.lcd.writeLine(0, 'Volumio Ready');
    } catch (err) {
      this.logger.error(`[HD44780] LCD init failed: ${err}`);
    }

    return true;
  }

  onStop() {
    if (this.lcd) {
      this.lcd.clear();
    }
    return true;
  }

  getUIConfig() {
    return this.commandRouter.i18nJson(
      __dirname + '/UIConfig.json',
      __dirname + '/i18n/strings_en.json',
      __dirname + '/i18n/strings_de.json'
    );
  }

  saveConfig(data) {
    this.config.set('i2cAddress', data['i2cAddress']);
    this.config.set('cols', data['cols']);
    this.config.set('rows', data['rows']);
  }
};
