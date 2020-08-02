/* eslint-disable no-await-in-loop */
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const {setCookies, getDataPath} = require('../../utils/index.js');
const selectors = {
  table: 'table',
  row: 'table tbody tr',
  dropdown: '#id_filter_by_select',
  nextButton: 'a.paginate_button.next:not(.disabled)',
};

module.exports.getMembers = async({dirs, memberType, page}) => {
  const nextPage = `${process.env.BASE_URL}/admin/members/member-lists/?filter-by=${memberType}`;
  const fileName = path.basename(__filename);

  // try {
  //   await page.setRequestInterception(true);

  //   page.on('request', (request) => {
  //     if (request.resourceType() === 'script') {
  //       request.abort();
  //     } else {
  //       request.continue();
  //     }
  //   });
  // } catch (err) {
  //   console.log(`[${fileName}]`, 'setRequestInterception error');
  // }


  try {
    await setCookies(page);
  } catch (err) {
    console.log('error setting cookies');
  }


  try {
    await page.goto(nextPage, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });
  } catch (err) {
    console.log(chalk.red(`[${fileName}]`), 'error navigating to', nextPage);
  }


  await page.waitForSelector(selectors.row);

  const members = [];

  await page.waitForSelector('tbody td:nth-child(3)');
  const props = ['firstName', 'lastName', 'email', 'url'];
  const memberReducer = (data) => {
    return (obj, key, i) => {
      obj[key] = data[i];

      if (key === 'url') {
        obj[key] = obj[key].replace(process.env.BASE_URL, '');
      }

      return obj;
    };
  };

  const addMembers = async() => {
    const rows = await page.$$(selectors.row);

    for (let row of rows) {
      // @ts-ignore
      const data = await Promise.allSettled([
        row.$eval('td:nth-child(1)', (node) => node.innerText),
        row.$eval('td:nth-child(2)', (node) => node.innerText),
        row.$eval('td:nth-child(3)', (node) => node.innerText),
        row.$eval('a', (node) => node.href),
      ]);

      // @ts-ignore
      const memberData = data
      // get rid of rejected ones
      .filter(({status}) => status === 'fulfilled')
      // fulfilled promises will have a value property
      // @ts-ignore
      .map(({value}) => value.trim())
      // but we only want it if it's not an empty string
      .filter((item) => !!item);

      if (memberData.length === 4) {
        const member = props.reduce(memberReducer(memberData), {});

        members.push(member);
      } else {
        console.log('missing data', memberData);
      }
    }

    console.log(`${members.length} members added…`);

    try {
      await page.waitForSelector(selectors.nextButton);
      await page.click(selectors.nextButton);
      await page.waitFor(500);
      await addMembers();
    } catch (err) {
      console.log('Finished!');
    }
  };

  await addMembers();
  console.log(`[${fileName}]`, 'members!', members.length);
  const filePath = `${getDataPath(dirs.output, memberType)}.json`;

  await fs.outputJSON(filePath, members);

  return page;

};
