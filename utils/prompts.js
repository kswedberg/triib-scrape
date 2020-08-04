const path = require('path');
const fs = require('fs-extra');
const {getDataPath} = require('./index.js');

const {getWorkouts} = require('../lib/get-workouts.js');
const {getScores} = require('../lib/get-scores.js');
const {prepForCSV} = require('../lib/prep-for-csv.js');
const {createCSV} = require('../lib/create-csv.js');
const {combineCSV, getCSVFiles} = require('../lib/combine-csv.js');

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
const memberTypes = [
  'active',
  'inactive',
  'archived',
  'on-hold',
];

const getTasks = async() => {
  const csvFiles = await getCSVFiles();

  if (csvFiles.length <= 1) {
    return tasks;
  }

  return [
    ...tasks,
    {
      name: 'Combine CSV files into "all.csv"',
      value: 'combineCSV',
      short: 'csv',
      fn: combineCSV,
    },
  ];
};

const getDataDirs = (task) => {
  if (task.value === 'combineCSV') {
    return {input: 'csv', output: 'csv'};
  }

  const index = tasks.findIndex(({value}) => task.value === value);

  return {
    input: index === 0 ? '' : tasks[index - 1].short,
    output: tasks[index].short,
  };
};
const getPossibleMemberTypes = async(task) => {

  if (/getMembers|combineCSV/.test(task.value)) {
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
  const noPromptTasks = ['combineCSV'];

  if (noPromptTasks.includes(task.value)) {
    return null;
  }

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

module.exports = {getDataDirs, getTasks, getPrompts, getPossibleMemberTypes};
