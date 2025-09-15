'use strict';

const libQ = require('kew');
const fs = require('fs-extra');
const LCD = require('lcd-pcf8574');

let lcd;

module.exports = Hd44780Plugin;

function Hd44780Plugin(context) {
  this.context = context;
  this.logger = this.context.logger;
  this.commandRouter = this.context.coreCommand;
  this.configManager = this.context.configManager;

  this.configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');
  this.config = {};
}

Hd44780Plugin.prototype.onVolumioStart = function () {
  this.loadConfig();
  return libQ.resolve();
};

Hd44780Plugin.prototype.onStart = function () {
  this.logger.info('Starting HD44780 LCD Plugin...');

  lcd = new LCD(this.config.i2cAddress, this.config.cols, this.config.rows);
  lcd.clear();
  lcd.printLine(0, 'Volumio Ready');

  this.commandRouter.volumioAddQueueObserver(this.onQueueChange.bind(this));

  return libQ.resolve();
};

Hd44780Plugin.prototype.onStop = function () {
  if (lcd) {
    lcd.clear();
    lcd.close();
  }
  return libQ.resolve();
};

Hd44780Plugin.prototype.onRestart = function () {
  return this.onStop().then(this.onStart.bind(this));
};

Hd44780Plugin.prototype.getUIConfig = function () {
  return this.commandRouter.i18nJson(__dirname + '/UIConfig.json');
};

Hd44780Plugin.prototype.saveConfig = function (data) {
  this.config.i2cAddress = parseInt(data.i2cAddress, 16);
  this.config.cols = parseInt(data.cols);
  this.config.rows = parseInt(data.rows);
  fs.writeJsonSync(this.configFile, this.config);
};

Hd44780Plugin.prototype.loadConfig = function () {
  if (fs.existsSync(this.configFile)) {
    this.config = fs.readJsonSync(this.configFile, { throws: false }) || {};
  }
  if (!this.config.i2cAddress) this.config.i2cAddress = 0x27;
  if (!this.config.cols) this.config.cols = 16;
  if (!this.config.rows) this.config.rows = 2;
};

Hd44780Plugin.prototype.onQueueChange = function () {
  let state = this.commandRouter.volumioGetState();

  if (state.status === 'play') {
    let line1 = `${state.artist} - ${state.title}`.substring(0, this.config.cols);
    let line2 = `${Math.floor(state.seek / 1000)}s/${state.duration}s`.substring(0, this.config.cols);

    lcd.clear();
    lcd.printLine(0, line1);
    lcd.printLine(1, line2);
  } else {
    lcd.clear();
    lcd.printLine(0, 'Volumio Idle');
  }
};