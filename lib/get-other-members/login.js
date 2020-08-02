
require('dotenv').config();
const fs = require('fs-extra');
const {getCookiesPath} = require('../../utils/index.js');


module.exports.login = async(data) => {
  const page = data.page;

  await page.goto(`${process.env.BASE_URL}/accounts/login/`, {
    waitUntil: 'networkidle2',
  });

  // email
  await page.waitForSelector('[name="username"]');
  // await page.click("[name='username']");
  await page.type('[name="username"]', process.env.USER_EMAIL);

  // password
  // await page.keyboard.down('Tab');
  page.$eval('[name="password"]', (el) => el.setAttribute('type', 'text'));
  await page.type('[name="password"]', process.env.USER_PWD);
  page.$eval('[name="password"]', (el) => el.setAttribute('type', 'password'));

  await page.evaluate(() => {
    let btns = [...document.querySelector('.reg-page').querySelectorAll('button')];

    btns.forEach((btn) => {
      if (btn.innerText.toLowerCase() === 'login') {
        btn.click();
      }
    });
  });

  const workoutSelector = 'a[href*="workout-history-report"]';

  await page.waitForNavigation();

  try {
    // await page.waitForSelector(workoutSelector);
    await page.waitForSelector(workoutSelector);
    console.log('logged in!');
  } catch (err) {
    // console.log(err);
  }
  await page.setViewport({
    width: 1440,
    height: 1200,
  });

  const cookies = await page.cookies();
  const cookieFile = getCookiesPath();

  data.cookies = cookies;
  await fs.outputJSON(cookieFile, cookies);

  return data;
};
