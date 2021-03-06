const FilterAbstract = require('./filter-abstract');
const _ = require('lodash');

class FilterToLower extends FilterAbstract {
  constructor(adapter) {
    super();
    this.source = adapter;
  }

  /**
   * @see https://stackoverflow.com/a/10003709
   * @param value
   */
  filter(value) {
    //console.log('module/scraper/adapter/helper/filter-to-lower.js', value);

    let filtered = null;
    if (_.isArray(value)) {
      filtered = _.map(value, (val) => {
        return this.filter(val);
      });
    } else {
      filtered = _.toLower(value);
    }

    return filtered;
  }
}

module.exports = FilterToLower;