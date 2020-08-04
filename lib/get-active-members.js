require('dotenv').config();

const fs = require('fs-extra');
const cheerio = require('cheerio');
const chalk = require('chalk');
const {setupAxios} = require('../utils/axios.js');
const {getDataPath} = require('../utils/index.js');


const getActiveMembers = async function({dirs, memberType}) {
  let responses;
  const urls = ['/admin/members/'];
  const outputFile = `${getDataPath(dirs.output, memberType)}.json`;
  const axios = await setupAxios();

  try {
    responses = await Promise.all([
      axios.get(urls[0]),
    ]);

  } catch (err) {
    console.log(err);

    return console.log(chalk.red(`Failed to open ${urls.join(' or ')}.`));
  }

  const members = [];

  responses.forEach((response) => {
    const $ = cheerio.load(response.data);

    $('tbody tr').each(function() {
      const $td = $(this).find('td');
      const firstName = $td.eq(0).text().trim();
      const lastName = $td.eq(1).text().trim();
      const email = $td.eq(2).text().trim();

      if (firstName && lastName && email && !members.find((already) => email === already.email)) {
        const member = {
          firstName,
          lastName,
          email,
          url: $td.eq(0).find('a').attr('href'),
        };

        members.push(member);
      }
    });
  });

  await fs.outputJSON(outputFile, members);
};

// @ts-ignore
if (!module.parent) {
  (async function() {
    await getActiveMembers();
  })();
}

module.exports = {getActiveMembers};
