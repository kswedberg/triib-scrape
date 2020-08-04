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

  console.log(chalk.magentaBright('NOTE: You might see an UnhandledPromiseRejectionWarning message.'));
  console.log(chalk.cyan('You can probably safely ignore it.'));
  console.log(chalk.magentaBright('Also, there will be a delay of about 30 seconds after the final page is scraped.\n\n'));

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
