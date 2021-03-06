const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const dateFormat = require('dateformat');

class Abstract {

  constructor(config) {
    this._config = _.merge({
      options: {
        dateable: false,
        bom: false
      }
    }, config);

    this._pathname = this._preparePath(config.path);

    this.file = fs.createWriteStream(this._pathname, {
      flags: 'w',
      encoding: 'utf8',
      mode: '0744'
    });

    // @todo improve stats implementation
    /*this.stats = await fs.existsSync(this._pathname)
      ? await fs.statSync(this._pathname)
      : {};*/
    this.stats = 0;

    /**
     * Send output to resource (file, I/O)
     *
     * @return self
     */
    if (this.send === 'function') {
      throw new TypeError('Must override method "send()"');
    }
  }

  get pathname() {
    return this._pathname;
  }

  get output() {
    return this.file;
  }

  async getStats() {
    if (this._stats) {
      this._stats = await fs.existsSync(this._pathname)
        ? await fs.statSync(this._pathname)
        : {};
      //this.stats = 0;
    }

    return this._stats;
  }

  _preparePath(filePath) {
    if (!this._config.options.dateable) { // getter this.config isn't available now
      return filePath;
    }

    let parsed = path.parse(filePath);
    let now = new Date();
    let date = dateFormat(now, 'dd-mm-yyyy_h.MM.ssTT');

    return path.format({
      root: '/ignored',
      dir: parsed.dir,
      name: parsed.name + '_' + date,
      ext: parsed.ext
    });
  }
}

module.exports = Abstract;
