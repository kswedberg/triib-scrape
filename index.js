const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const inquirer = require('inquirer');
const {peach} = require('fmjs/cjs/promise.js');

const {getActiveMembers} = require('./lib/get-active-members.js');
const {getOtherMembers} = require('./lib/get-other-members/index.js');
const {getTasks, getPrompts, getPossibleMemberTypes, getDataDirs} = require('./utils/prompts.js');


const start = async() => {
  const tasks = await getTasks();
  const questions = [
    {
      name: 'task',
      type: 'list',
      choices: tasks.map((item) => {
        const {fn, ...task} = item;

        return task;
      }),
    },
  ];

  const answers = await inquirer.prompt(questions);

  const task = tasks.find(({value}) => value === answers.task);
  const dirs = getDataDirs(task);
  const memberTypes = await getPossibleMemberTypes(task);

  if (!memberTypes.length) {
    return console.log(chalk.red(`ABORTING.\nCould not find the required files in the data/${dirs.input} directory`));
  }
  const prompts = await getPrompts(task, memberTypes);

  const data = {startAt: 0, endAt: -1, memberType: '', dirs};

  if (prompts) {
    const promptData = await inquirer.prompt(prompts);

    Object.assign(data, promptData);
  }

  if (task.value === 'getMembers') {
    task.fn = data.memberType === 'active' ? getActiveMembers : getOtherMembers;
  }

  if (data.memberTypes) {
    await peach(data.memberTypes, (memberType) => {
      const mtData = Object.assign({}, data, {memberType});

      return task.fn(mtData);
    });
  } else {
    await task.fn(data);
  }
  const finishedFor = data.memberTypes || data.memberType ? ` for ${data.memberTypes ? data.memberTypes.join(' & ') : data.memberType}` : '';

  console.log(chalk.green(`\n${task.name}: Finished${finishedFor}!`));
};

(async function() {
  try {
    await start();
  } catch (err) {
    console.error(err);
  }

})();
