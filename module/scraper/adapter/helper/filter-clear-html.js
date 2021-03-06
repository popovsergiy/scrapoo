const cheerio = require('cheerio');
let FilterAbstract = require('./filter-abstract');

class FilterClearHtml extends FilterAbstract {
  constructor(adapter) {
    super();
    this.source = adapter;
  }

  filter(value) {
    let $ = cheerio.load(value);
    let config = this.source.currFieldConfig;
  }
}