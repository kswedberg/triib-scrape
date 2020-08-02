require('dotenv').config();
const puppeteer = require('puppeteer');
const chalk = require('chalk');
const {login} = require('./login.js');
const {getMembers} = require('./members.js');
const {getData} = require('../../utils/index.js');

const getOtherMembers = async function(data) {
  const browser = await puppeteer.launch({
    headless: true,
  });

  data.page = await browser.newPage();

  console.log('NOTE: You might see an UnhandledPromiseRejectionWarning message.');
  console.log('You can probably safely ignore it.');
  console.log('Also, there will be a delay of about 30 seconds after the final page is scraped.');

  return login(data)
  .then(getMembers)
  .then(async() => {
    await browser.close();

    console.log(chalk.green(`got all ${data.memberType} members!`));
  })
  .catch((err) => {
    console.log(err);
  });

};

// @ts-ignore
if (!module.parent) {
  getData()
  .then(getOtherMembers);
}
module.exports = {getOtherMembers};
