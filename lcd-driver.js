// reiner JS-Treiber für PCF8574 -> HD44780
const fs = require('fs');

class LCD {
  constructor(bus = '/dev/i2c-1', addr = 0x27, cols = 16, rows = 2) {
    this.cols = cols;
    this.rows = rows;
    this.addr = addr;
    this.bus = bus;
    this.backlight = 0x08; // Backlight on mask (PCF8574 mapping)
    // try open i2c device
    this.fd = fs.openSync(this.bus, 'r+');
    // no ioctl here to set slave; on many systems writing to /dev/i2c-1 requires setting slave addr via ioctl.
    // We'll try writing bytes directly; if your system requires ioctl we can add a small native or external helper.
    this.init();
  }

  sleep(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  }

  writeRawByte(b) {
    try {
      fs.writeSync(this.fd, Buffer.from([b]));
    } catch (e) {
      // some setups require an ioctl to set slave addr - if writing fails, bubble up error
      throw e;
    }
  }

  pulseEnable(data) {
    this.writeRawByte(data | 0x04); // E = 1
    this.sleep(1);
    this.writeRawByte(data & ~0x04); // E = 0
    this.sleep(1);
  }

  write4bits(val) {
    // val already contains the high nibble aligned to bits 7..4
    const data = (val & 0xF0) | this.backlight;
    this.pulseEnable(data);
  }

  send(val, mode) {
    // mode: 0 = command, 1 = data (RS bit)
    const rs = mode ? 0x01 : 0x00;
    const high = (val & 0xF0) | rs;
    const low = ((val << 4) & 0xF0) | rs;
    this.pulseEnable(high | this.backlight);
    this.pulseEnable(low | this.backlight);
  }

  command(cmd) {
    this.send(cmd, 0x00);
    this.sleep(2);
  }

  writeChar(ch) {
    this.send(ch.charCodeAt(0), 0x01);
  }

  init() {
    // standard HD44780 init sequence for 4-bit mode (via PCF8574)
    this.sleep(50);
    // Sequence: send 0x33, 0x32 to set 4-bit mode
    this.pulseEnable(0x30 | this.backlight);
    this.sleep(5);
    this.pulseEnable(0x30 | this.backlight);
    this.sleep(1);
    this.pulseEnable(0x20 | this.backlight);
    this.command(0x28); // function set 4-bit, 2 line, 5x8 dots
    this.command(0x08); // display off
    this.command(0x01); // clear
    this.command(0x06); // entry mode set
    this.command(0x0C); // display on, cursor off
  }

  clear() {
    this.command(0x01);
    this.sleep(2);
  }

  setCursor(col, row) {
    const row_offsets = [0x00, 0x40, 0x14, 0x54];
    if (row >= this.rows) row = this.rows - 1;
    this.command(0x80 | (col + row_offsets[row]));
  }

  print(text) {
    // pad/truncate to cols
    let out = text;
    if (out.length > this.cols) out = out.slice(0, this.cols);
    for (let i = 0; i < out.length; i++) {
      this.writeChar(out[i]);
    }
    // fill rest with spaces if short
    if (out.length < this.cols) {
      for (let j = out.length; j < this.cols; j++) this.writeChar(' ');
    }
  }
}

module.exports = LCD;
