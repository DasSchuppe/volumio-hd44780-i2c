'use strict';

const LCD = require('lcd');

class LcdDriver {
  constructor(address = 0x27, cols = 16, rows = 2) {
    this.lcd = new LCD({
      rs: 0,
      e: 0,
      data: [0, 0, 0, 0],
      cols: cols,
      rows: rows,
      i2c: 1,
      address: address
    });

    this.lcd.on('ready', () => {
      this.lcd.clear();
    });
  }

  writeLine(line, text) {
    if (!this.lcd) return;
    this.lcd.setCursor(0, line);
    this.lcd.print(text.padEnd(this.lcd.cols).substring(0, this.lcd.cols));
  }

  clear() {
    if (!this.lcd) return;
    this.lcd.clear();
  }
}

module.exports = LcdDriver;
