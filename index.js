const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const inquirer = require('inquirer');

const {getDataPath} = require('./utils/index.js');
const {getActiveMembers} = require('./lib/get-active-members.js');
const {getWorkouts} = require('./lib/get-workouts.js');
const {getScores} = require('./lib/get-scores.js');
const {prepForCSV} = require('./lib/prep-for-csv.js');
const {getOtherMembers} = require('./lib/get-other-members/index.js');
const {createCSV} = require('./lib/create-csv.js');
const {peach} = require('fmjs/cjs/promise.js');


const tasks = [
  {
    name: 'Fetch Members',
    value: 'getMembers',
    short: 'members',
    fn: () => {/* no-op*/},
  },

  {
    name: 'Fetch workouts for each member',
    value: 'getWorkouts',
    short: 'workouts',
    fn: getWorkouts,
  },
  {
    name: 'Fetch scores for each workout',
    value: 'getScores',
    short: 'scores',
    fn: getScores,
  },
  {
    name: 'Prepare scores data for CSV',
    value: 'prepForCSV',
    short: 'csv-ready',
    fn: prepForCSV,
  },
  {
    name: 'Create CSV',
    value: 'createCSV',
    short: 'csv',
    fn: createCSV,
  },
];

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

const memberTypes = [
  'active',
  'inactive',
  'archived',
  'on-hold',
];

const getDataDirs = (task) => {
  const index = tasks.findIndex(({value}) => task.value === value);

  return {
    input: index === 0 ? '' : tasks[index - 1].short,
    output: tasks[index].short,
  };
};
const getPossibleMemberTypes = async(task) => {
  const memberTypes = [
    'active',
    'inactive',
    'archived',
    'on-hold',
  ];

  if (task.value === 'getMembers') {
    return memberTypes;
  }

  const {input} = getDataDirs(task);
  const dir = getDataPath(input);

  await fs.ensureDir(dir);
  const files = await fs.readdir(dir);

  return files.map((item) => {
    return path.basename(item, '.json');
  })
  .filter((item) => {
    return memberTypes.includes(item);
  });
};

const getPrompts = (task, memberTypes) => {
  const fetchingTasks = ['getMembers', 'getWorkouts', 'getScores'];

  return [
    {
      name: 'memberType',
      type: 'list',
      message: 'which member type are we dealing with?',
      choices: memberTypes,
      when() {
        return fetchingTasks.includes(task.value);
      },
    },
    {
      name: 'memberTypes',
      type: 'checkbox',
      message: 'which member type(s) are we dealing with?',
      choices: memberTypes,
      when() {
        return !fetchingTasks.includes(task.value);
      },
    },
    {
      name: 'startAt',
      message: 'where in the array of members do you want to start?',
      default: 0,
      type: 'number',
      when() {
        return fetchingTasks.slice(1).includes(task.value);
      },
    },
    {
      name: 'endAt',
      message: 'where in the array of members do you want to end?',
      type: 'input',
      filter: (val) => parseInt(val, 10) || undefined,
      when() {
        return fetchingTasks.slice(1).includes(task.value);
      },
    },
  ];
};

const start = async() => {
  const answers = await inquirer.prompt(questions);

  const task = tasks.find(({value}) => value === answers.task);
  const dirs = getDataDirs(task);
  const memberTypes = await getPossibleMemberTypes(task);

  if (!memberTypes.length) {
    return console.log(chalk.red(`ABORTING.\nCould not find the required files in the data/${dirs.input} directory`));
  }
  const prompts = getPrompts(task, memberTypes);
  const data = await inquirer.prompt(prompts);

  if (task.value === 'getMembers') {
    task.fn = data.memberType === 'active' ? getActiveMembers : getOtherMembers;
  }

  data.dirs = dirs;

  if (data.memberTypes) {
    await peach(data.memberTypes, (memberType) => {
      const mtData = Object.assign({}, data, {memberType});

      return task.fn(mtData);
    });
  } else {
    await task.fn(data);
  }
  console.log(chalk.green('Finished!'));
};

(async function() {
  try {
    await start();
  } catch (err) {
    console.error(err);
  }

})();
