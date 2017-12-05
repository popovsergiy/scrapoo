require('app-module-path').addPath(process.cwd() + '/module');

let chai = require('chai');
let sinon = require('sinon');
let expect = chai.expect;
let fs = require('fs');
let path =  require('path');
//let File = require('scraper/source/file');
let Combiner = require('scraper/converter/combiner');
//let Csv = require('scraper/output/csv');

let consts = {};
describe('Combiner', () => {
  before(() => {
    consts.config = {
      "pool": "shop-it",
      "type": "combiner",


      "file": [
        {
          "path": "data/shop-it/south-contract/pprice_list-*.xls",
          "default": {
            "index": "Код",
            "fields": {
              "code": "Код",
              "manufacturer": "ТМ",
              "manufacturer_code": "Артикул",
              "is_in_stock": "NS W300",
            },
            "omit": {
              "fields": {
                "is_in_stock": "out of stock"
              }
            },
            "newly": {
              "separate": true
            }
          },
          // if should combine all sheet to one then use "sheet config"
          /*"sheet": [
            {"name": " УЦЕНКА ПОСУДА", "skip": 1, "skipLast": 1},
            {"name": "ДЕФЕКТ УП. ПОСУДА", "skip": 2, "skipLast": 1},
            {"name": "Аксессуарные группы", "skip": 5, "skipLast": 1},
            {"name": "Дефект уп-ки Акция!", "skip": 1},
            {"name": "it_ноутбуки", "skip": 1},
            {"name": "быт.тех", "skip": 1, "categorize": {"__filter": ["replace:ЦЕНЫ СНИЖЕНЫ !, ", "upper-first"]}},
            {"name": "TV_видео_аудио", "skip": 1, "categorize": {"__filter": ["replace:/^.+\/.+?\\s(.*)$/, $1", "upper-first"]}},
            {"name": "авто_ц.фото_ц.планшеты_аудио", "skip": 0, "categorize": {"__filter": ["replace:/^.+\/.+?\\s(.*)$/, $1", "upper-first"]}},
            {"name": "моб.тел_планшеты", "skip": 1, "categorize": {"__filter": ["replace:/^.+\/.+?\\s(.*)$/, $1", "upper-first"]}}
          ]*/
        },
        {
          // if set only "path" then all config will be taken from first file config
          "path": "data/shop-it/south-contract/pprice_list-*.xls"
        }
      ]

    }
  });

  it('run: should combine omitted items and mark as "out of stock"', async () => {
    let dataProvider = {
      files: [
        [ // first file
          {"Код": "Код", "Назва": "Назва", "NS W300": "NS W300"},
          {"Код": "2974651", "Назва": "ноутбук 14FMI/i5-7200U", "NS W300": "in stock"},
          {"Код": "2852963", "Назва": "ноутбук 14M/i7-6500U", "NS W300": "out of stock"},
        ],
        [ // second file
          {"Код": "Код", "Назва": "Назва", "NS W300": "NS W300"},
          {"Код": "2974651", "Назва": "ноутбук 14FMI/i5-7200U", "NS W300": "out of stock"},
          {"Код": "2852963", "Назва": "ноутбук 14M/i7-6500U", "NS W300": "in stock"},
          {"Код": "2879423", "Назва": "ноутбук 14M/i3-6100U", "NS W300": "in stock"}
        ]
      ]
  };

    let config = {
      "pool": "shop-it",
      "type": "combiner",

      "file": [
        {
          "path": ['path/to/file-one.xlsx', 'path/to/file-two.xlsx'],
          "default": {
            "index": "Код",
            "fields": {"code": "Код", "is_in_stock": "NS W300", "name": {"name": "Назва"}},
            "omit": {
              "fields": {"is_in_stock": "out of stock"}
            },
            "newly": {"separate": true}
          },
        },
        /*{
          // WRONG! if set only "path" then all config will be taken from first file config
          // "path": "data/shop-it/south-contract/pprice_list-*.xls"
        }*/
      ]
    };

    let combiner = new Combiner(config);
    sinon.stub(combiner, 'getFileNames').returns(config.file[0].path);

    dataProvider.files.forEach((rows, i) => {
      let path = config.file[0].path[i];
      let xlsx = combiner.getXlsx(path, config.file[0]);

      sinon.stub(xlsx, '_getSheets').returns({'Sheet1': {}});
      sinon.stub(xlsx, '_getSheetNames').returns(['Sheet1']);
      sinon.stub(xlsx, '_convertRawSheet').returns(rows);
      sinon.stub(xlsx, '_getFilename');
      sinon.stub(xlsx, '_getWorkbookReader');
    });

    await combiner.run();

    expect(combiner._rows.length)
      .to.deep.equal(3);

    expect(combiner._rows).to.eql([
      {"code": "2974651", "is_in_stock": "in stock", "name": "ноутбук 14FMI/i5-7200U"},
      {"code": "2852963", "is_in_stock": "out of stock", "name": "ноутбук 14M/i7-6500U"},
      {"code": "2879423", "is_in_stock": "out of stock", "name": "ноутбук 14M/i3-6100U"}
    ]);
  });

});