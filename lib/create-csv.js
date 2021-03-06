require('dotenv').config();

const path = require('path');
const fs = require('fs-extra');
const {createReadStream, createWriteStream} = require('fs');
const {AsyncParser} = require('json2csv');
const chalk = require('chalk');
const {csvColumns, getData, getDataPath} = require('../utils/index.js');

const endPath = (filePath, start = -3) => {
  return filePath.split('/').slice(start).join('/');
};

const createCSV = async({dirs, memberType}) => {
  const inputFile = `${getDataPath(dirs.input, memberType)}.json`;
  const outputFile = `${getDataPath(dirs.output, memberType)}.csv`;

  await fs.ensureFile(outputFile);

  const fields = csvColumns;

  console.log('\nAdding records from', `${endPath(inputFile)}…`);
  const opts = {fields};
  const transformOpts = {highWaterMark: 16384};
    // Using the promise API just to know when the process finishes
    // but not actually loading the CSV in memory
  const input = createReadStream(inputFile, {encoding: 'utf8'});
  const output = createWriteStream(outputFile, {encoding: 'utf8'});
  const asyncParser = new AsyncParser(opts, transformOpts);
  const parsingProcessor = asyncParser.fromInput(input).toOutput(output);

  console.log(chalk.cyan('Saved records to'), endPath(outputFile));

  parsingProcessor.promise(false).catch((err) => console.error(err));

};

// @ts-ignore
if (!module.parent) {

  getData()
  .then(createCSV)
  .then(() => console.log(chalk.green('\n\nFinished all!!')))
  .catch(console.error);

}

module.exports = {createCSV};
