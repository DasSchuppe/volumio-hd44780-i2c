'use strict';

const libQ = require('kew');
const fs = require('fs-extra');
const i2c = require('i2c-bus');

// ---------------- LCD DRIVER ---------------- //
class PCF8574LCD {
  constructor(address, cols, rows) {
    this.i2c = i2c.openSync(1); // I2C Bus 1 auf RPi
    this.address = address;
    this.cols = cols;
    this.rows = rows;
    this.backlight = 0x08; // Backlight ON
    this.init();
  }

  sleep(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  }

  writeNibble(nibble, mode) {
    let data = nibble | this.backlight | mode;
    this.i2c.sendByteSync(this.address, data | 0x04); // Enable high
    this.i2c.sendByteSync(this.address, data & ~0x04); // Enable low
  }

  send(value, mode) {
    this.writeNibble(value & 0xF0, mode);
    this.writeNibble((value << 4) & 0xF0, mode);
  }

  command(cmd) {
    this.send(cmd, 0x00);
    this.sleep(2);
  }

  writeChar(char) {
    this.send(char.charCodeAt(0), 0x01);
  }

  clear() {
    this.command(0x01);
    this.sleep(2);
  }

  init() {
    // Initialisierung nach HD44780 Datenblatt
    this.sleep(50);
    this.writeNibble(0x30, 0);
    this.sleep(5);
    this.writeNibble(0x30, 0);
    this.sleep(1);
    this.writeNibble(0x20, 0); // 4-bit mode

    this.command(0x28); // 4-bit, 2 line, 5x8 dots
    this.command(0x08); // display off
    this.command(0x01); // clear
    this.command(0x06); // entry mode set
    this.command(0x0C); // display on, cursor off
  }

  setCursor(line, col) {
    const offsets = [0x00, 0x40, 0x14, 0x54];
    this.command(0x80 | (col + offsets[line]));
  }

  printLine(line, text) {
    this.setCursor(line, 0);
    for (let i = 0; i < this.cols; i++) {
      let char = i < text.length ? text[i] : ' ';
      this.writeChar(char);
    }
  }
}

// ---------------- VOLuMIO PLUGIN ---------------- //
module.exports = Hd44780Plugin;

let lcd;

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
  this.logger.info('Starting HD44780 I2C LCD Plugin...');

  lcd = new PCF8574LCD(this.config.i2cAddress, this.config.cols, this.config.rows);
  lcd.clear();
  lcd.printLine(0, 'Volumio Ready');

  this.commandRouter.volumioAddQueueObserver(this.onQueueChange.bind(this));

  return libQ.resolve();
};

Hd44780Plugin.prototype.onStop = function () {
  if (lcd) {
    lcd.clear();
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

    lcd.printLine(0, line1);
    if (this.config.rows > 1) lcd.printLine(1, line2);
  } else {
    lcd.printLine(0, 'Volumio Idle');
    if (this.config.rows > 1) lcd.printLine(1, '');
  }
};
