const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const Nightmare = require('nightmare');

//let Csv = require('scraper/output/csv');
const Problem = require('scraper/output/problem');
const Preprocessor = require('scraper/core/preprocessor');
const ConfigHandler = require('scraper/core/config-handler');
const Variably = require('scraper/variably');

class Abstract {
  constructor(browser, config) {
    this._browser = browser;
    //this._config = config || {};

    this._config = _.merge({"source": {"driver": {"file": "scraper/source/driver/xlsx"}}}, config);

    this._crawlers = {};
    this._output = {};
    //this._outputProblem = null;
    this._preprocessor = null;
    this._configHandler = null;
    this._nextUrl = null;

    this._row = {};
    this._headerMap = null;

    if (!_.has(this.config, 'source.path')) {
      throw new Error('Config error: source.path must be set');
    }
    // source.path in file is path and in site is url
    /*this.location = URL.parse(config.source.path);
    this.baseUrlHelper = new PrepareBaseUrl().setOption('location', this.location);*/

    this.logger = fs.createWriteStream('data/error.log', {
      flags: 'a', // 'a' means appending (old data will be preserved)
      encoding: 'utf8',
    });

    if (new.target === Abstract) {
      throw new TypeError('Cannot construct Abstract instances directly');
    }
    // or maybe test typeof this.method === undefined

    /**
     * Start scan process
     *
     * @return self
     */
    if (this.start === 'function') {
      throw new TypeError('Must override method "start()"');
    }
  }

  setConfig() {
    return this._config;
  }

  getConfig() {
    return this._config;
  }

  get config() {
    return this._config;
  }

  get browser() {
    return this._browser;
  }

  /**
   * Get column names to index
   * @returns json
   */
  get headMap() {
    return this._headerMap;
  }

  /**
   * Get current row
   */
  get row() {
    return this._row;

  }

  set row(row) {
    _.each(row, (val, headName) => {
      let name = this.headMap[headName];
      //let name = this.config.source.fields
      this._row[name] = val;
    });

    //let headName = this.config.source.fields[name];
    //let columnIndex = this.headMap[headName];
    //return this.row[columnIndex];

    return this;
  }

  getData(name) {
    return this.getField(name);
  }

  getField(name) {
    let headName = this.config.source.fields[name];
    let columnIndex = this.headMap[headName];

    return this.row[columnIndex];
  }

  /** @deprecated */
  getNamedField(name) {
    return this.getField(name);
  }

  getCrawler(config) {
    if (!this._crawlers[config.name]) {
      let Adapter = require('scraper/adapter/' + config.name);
      this._crawlers[config.name] = new Adapter(this.browser, this.configHandler, config); // retrieve hotline etc. adapter
    }

    return this._crawlers[config.name].setConfig(config);
  }

  set output(output) {
    this._output = output;

    return this;
  }

  /*get output() {
    if (!this._output) {
      let name = path.extname(this.config.output.path).substring(1);
      let Output = require('scraper/output/' + name);
      //return this.helpers[key] = new HelperClass(this);

      this._output = new Output(this.config.output);
    }

    return this._output;
  }*/

  getOutput(context = 'default') {
    //let context = context || 'default';
    if (!this._output[context]) {
      let config = _.get(this.config, `output.${context}`);
      let name = path.extname(config.path).substring(1);
      let Output = require('scraper/output/' + name);

      this._output[context] = new Output(config);
    }

    return this._output[context];
  }

  /*set outputProblem(output) {
    this._outputProblem = output;

    return this;
  }

  get outputProblem() {
    if (!this._outputProblem) {
      this._outputProblem = new Problem(this.config.problemOutput);
    }

    return this._outputProblem;
  }*/

  set driver(driver) {
    this._driver = driver;

    return this;
  }

  get driver() {
    if (!this._driver) {
      let Driver = require(this.config.source.driver[this.config.source.type]);
      this._driver = new Driver();
    }

    return this._driver;
  }

  get variably() {
    if (!this._variably) {
      this._variably = new Variably();
      this._variably.set('source', this);
      this._variably.set('config', this.config);

      // Поки вимкнув передачу 'crawler', так як не зрозуміло навіщо передавати зайву залежність.
      // Це тільки додає не зрозумілості системі.
      //this._variably.set('crawler', this.crawler);
    }

    return this._variably;
  }

  get preprocessor() {
    if (!this._preprocessor) {
      this._preprocessor = new Preprocessor(this.configHandler, this.config.preprocessor);
    }

    return this._preprocessor;
  }

  get configHandler() {
    if (!this._configHandler) {
      //this._configHandler = new ConfigHandler(this);
      this._configHandler = new ConfigHandler(this.variably);
    }

    return this._configHandler;
  }

  /**
   * Return current crawler (adapter)
   *
   * @returns {*|null}
   */
  get crawler() {
    return this._crawler;
  }

  log(message) {
    this.logger.write(new Date().toISOString() + '\t' + message + '\n');
  }

  async process(searchable) {
    try {
      if (_.size(this.config.crawler)) {
        // iterate through crawlers if they are placed in config
        let fields = await this._scrap(searchable, this.config.crawler);
        if (fields && _.size(fields)) {
          for (let f = 0; f < fields.length; f++) {
            let handled = this.preprocessor.process(_.merge({}, this.row, fields[f]));
            await this.getOutput().send(handled);
          }
        } else {
          // fields not found with any crawler
          // write to file about problem product
          this.getOutput('problem').send({
            value: searchable.join(','),
            message: 'Not found'
          });
        }

      } else if (_.isUndefined(this.config.source.searchKeys)) {
        // run preprocessor skip crawling
        let fields = this.preprocessor.process(this.row);
        await this.getOutput().send(fields);
      }
    } catch (e) {
      if (_.isString(e)) {
        console.error(e);
        this.log(e);
      } else {
        console.log(e);
        this.log(e.message + ' ' + e.stack);
      }
    }
  }

  async _scrap(searchable, crawlersConfig) {
    if (_.isUndefined(searchable) || searchable.length < 1) {
      return false;
    }

    crawlersConfig = _.castArray(crawlersConfig);

    // iterate through crawlers if they are placed in config
    let fields = null;
    for (let key in crawlersConfig) {
      if (fields) {
        // don't run other crawler if first has found needed fields
        break;
      }
      let crawlerConfig = crawlersConfig[key];

      //console.log('Run crawler: ' + crawlerConfig.name);
      console.log('Search: ' + _.castArray(searchable).join(', '));


      // here must be iteration though config.crawler
      let crawler = /*this._crawler =*/ this.getCrawler(crawlerConfig);
      // why slice? see here http://orizens.com/wp/topics/javascript-arrays-passing-by-reference-or-by-value/
      fields = await crawler.scan(searchable.slice());

      //console.log('--------++++++++++---------');


      /*if (await this.nextPageExist()) {
        await this.process(this._nextUrl);
      }*/
      //this.output.file.end(); // here is problem "write after end Error: write after end"
    }

    return fields;
  }

  /*_canScrap() {
    return _.size(this.config.crawler);
  }*/

}

module.exports = Abstract;