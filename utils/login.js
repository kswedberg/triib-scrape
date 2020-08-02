const fs = require('fs-extra');
const puppeteer = require('puppeteer');
const {getCookiesPath} = require('./index.js');


module.exports.login = async() => {

  const browser = await puppeteer.launch({
    headless: true,
  });
  const page = await browser.newPage();

  await page.goto(`${process.env.BASE_URL}/accounts/login/`, {
    waitUntil: 'networkidle2',
  });

  // Enter username (email) and password
  await page.waitForSelector('[name="username"]');
  await page.type('[name="username"]', process.env.USER_EMAIL);
  await page.type('[name="password"]', process.env.USER_PWD);

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

  await fs.outputJSON(cookieFile, cookies);
  await browser.close();

  return {cookies};
};
