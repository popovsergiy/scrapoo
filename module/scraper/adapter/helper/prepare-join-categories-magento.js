const PrepareAbstract = require('./prepare-abstract');
let _ = require('lodash');

class PrepareJoinCategoriesMagento extends PrepareAbstract {

  prepare(value) {
    //console.log(value);
    let categories = [];
    _.each(value, (val, key) => {
      if ((value.length - 1) === key) {
        categories.push(val + ':: 1 :: 1 :: 1 || 4');
      } else {
        categories.push(val + ':: 1 :: 1 :: 1 || 4');
      }
    });

    //console.log(categories);

    return categories.join('/');
  }
}

module.exports = PrepareJoinCategoriesMagento;