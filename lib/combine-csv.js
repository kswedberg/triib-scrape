const path = require('path');
const fs = require('fs-extra');
const {Transform} = require('stream');
const {inherits} = require('util');
const chalk = require('chalk');
const {csvColumns, getDataPath} = require('../utils/index.js');
const {peach} = require('fmjs/cjs/promise');
const MultiStream = require('multistream');
const getCSVFiles = async() => {
  const allFiles = await fs.readdir(getDataPath('csv'));

  const files = allFiles.filter((file) => {
    return !file.startsWith('all') && file.endsWith('.csv');
  });

  return files;
};


const combineCSV = async() => {
  const csvFiles = await getCSVFiles();
  const files = csvFiles.map((file) => {
    return getDataPath('csv', file);
  });

  const allFile = getDataPath('csv', 'all.csv');
  const headerRow = csvColumns.map((cell) => `"${cell}"`).join();

  await fs.outputFile(allFile, '');
  const ws = fs.createWriteStream(allFile);
  let gotHeader = false;
  const rowCleanup = new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      let data = chunk.toString();

      if (gotHeader) {
        data = data.replace(`${headerRow}\n`, '');
      } else if (chunk.includes(headerRow)) {
        gotHeader = true;
      }

      if (data.trim()) {
        data += '\n';
      }

      callback(null, data);
    },
  });
  const streams = files.map((file, i) => {
    // Lazy load all but the first one:
    return i === 0 ? fs.createReadStream(file) : () => fs.createReadStream(file);
  });

  // @ts-ignore
  new MultiStream(streams).pipe(rowCleanup).pipe(ws);

  return files;
};

module.exports = {getCSVFiles, combineCSV};
