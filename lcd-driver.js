const fs = require('fs');
const ioctl = require('ioctl'); // Volumio hat meist ioctl vorinstalliert

const I2C_SLAVE = 0x0703;

class LCD {
  constructor(bus = '/dev/i2c-1', addr = 0x27, cols = 16, rows = 2) {
    this.cols = cols;
    this.rows = rows;
    this.addr = addr;
    this.fd = fs.openSync(bus, 'r+');
    ioctl(this.fd, I2C_SLAVE, addr);
    this.init();
  }

  sleep(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  }

  write4bits(val) {
    fs.writeSync(this.fd, Buffer.from([val | 0x08])); // enable=1
    this.sleep(1);
    fs.writeSync(this.fd, Buffer.from([val & ~0x04])); // enable=0
  }

  send(val, mode) {
    let high = val & 0xf0;
    let low = (val << 4) & 0xf0;
    this.write4bits(high | mode);
    this.write4bits(low | mode);
  }

  command(cmd) {
    this.send(cmd, 0x00);
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
