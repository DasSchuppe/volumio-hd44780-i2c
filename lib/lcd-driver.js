const LCD = require('lcd');

class LCDDriver {
  constructor(address, cols, rows) {
    this.lcd = new LCD({
      rs: 0,
      e: 0,
      data: [0, 0, 0, 0],
      cols: cols,
      rows: rows,
      address: parseInt(address, 16)
    });
  }

  init() {
    return new Promise((resolve, reject) => {
      this.lcd.on('ready', () => {
        this.lcd.clear();
        this.lcd.setCursor(0, 0);
        this.lcd.print('Volumio Ready', err => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  print(text, row = 0) {
    this.lcd.setCursor(0, row);
    this.lcd.print(text);
  }

  clear() {
    this.lcd.clear();
  }
}

module.exports = LCDDriver;
