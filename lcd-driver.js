const fs = require('fs');

class LCD {
  constructor(bus = '/dev/i2c-1', addr = 0x27, cols = 16, rows = 2) {
    this.cols = cols;
    this.rows = rows;
    this.addr = addr;
    this.fd = fs.openSync(bus, 'r+');
    this.backlight = 0x08; // Backlight ON
    this.init();
  }

  sleep(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  }

  write4bits(val) {
    fs.writeSync(this.fd, Buffer.from([val | this.backlight | 0x04])); // enable high
    this.sleep(1);
    fs.writeSync(this.fd, Buffer.from([val | this.backlight & ~0x04])); // enable low
  }

  send(val, mode) {
    this.write4bits(val & 0xF0 | mode);
    this.write4bits((val << 4) & 0xF0 | mode);
  }

  command(cmd) {
    this.send(cmd, 0x00);
    this.sleep(2);
  }

  writeChar(ch) {
    this.send(ch.charCodeAt(0), 0x01);
  }

  init() {
    this.command(0x33);
    this.command(0x32);
    this.command(0x28);
    this.command(0x0C);
    this.command(0x06);
    this.clear();
  }

  clear() {
    this.command(0x01);
    this.sleep(2);
  }

  setCursor(col, row) {
    const row_offsets = [0x00, 0x40, 0x14, 0x54];
    this.command(0x80 | (col + row_offsets[row]));
  }

  print(text) {
    for (let i = 0; i < text.length; i++) {
      this.writeChar(text[i]);
    }
  }
}

module.exports = LCD;
