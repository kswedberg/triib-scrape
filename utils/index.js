const path = require('path');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const delay = (time = 2000) => {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
};

const getDataPath = (task, memberType = '') => {
  return path.resolve(__dirname, '..', 'data', task, memberType);
};

const memberTypes = [
  'active',
  'inactive',
  'archived',
  'on-hold',

];
const defaultPrompts = [
  {
    name: 'memberType',
    type: 'list',
    message: 'which member type are we dealing with?',
    choices: memberTypes,
  },
  {
    name: 'startAt',
    message: 'where in the array do you want to start?',
    default: 0,
    type: 'number',
  },
  {
    name: 'endAt',
    message: 'where in the array do you want to end?',
    type: 'input',
    filter: (val) => parseInt(val, 10) || undefined,
  },
];

const getData = async(prompts = defaultPrompts) => {
  const answers = await inquirer.prompt(prompts);

  answers.success = true;

  return answers;
};

const getCookiesPath = () => {
  return `${getDataPath('cookies')}.json`;
};
const setCookies = async(page) => {
  const cookieFile = getCookiesPath();
  const cookies = await fs.readJSON(cookieFile);

  await page.setCookie(cookies[0]);
};

module.exports = {delay, getData, getDataPath, getCookiesPath, setCookies};
