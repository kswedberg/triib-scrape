/**
 * This is where we loop through all the member files and turn them into one big array or objects:
 *
 * columns:
Athlete
Date
Workout Title
Is Rx
Result
Set-Rep Scheme
Notes
 */

 /**
 * 1 x 3 Overhead Squat (3RM)
 */

require('dotenv').config();

const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const {getData, getDataPath} = require('../utils/index.js');

const regexes = {
  xByy: /(\d+\s*[xX]\s*\d+)/,
  repMax: /(\d+)(RM)/,
  lbs: /\s*lbs$/i,
  rounds: /\d+\s+\+\s+\d+/,
  reps: /\s+reps$/,
  allSpaces: /\s+/g,
};
const isMetcon = ['DOTCOM 180429', '1,3,2', 'HEAVY DAY', 'SQT', 'THE OTHER TRIPLE 3', 'SQUAT SEQUENCE #1', 'PRESS SEQUENCE #1 (delete)', 'PRESS SEQUENCE #1', 'PRESS SEQUENCE #2', 'HIGH FIVE', 'THREE\'s A CROWD', 'BARBELL LUNGEWALK SERIES'];

const getRepScheme = (title, score) => {
  const xby = regexes.xByy.exec(title);
  const repMax = regexes.repMax.exec(title);

  if (xby) {
    return xby[1].replace(regexes.allSpaces, '');
  }
  if (repMax) {
    return `1x${repMax[1]}`;
  }
  if (regexes.lbs.test(score) && !isMetcon.includes(title)) {
    return '1x1';
  }

  return '';
};

const getWorkoutTitle = (title, level) => {
  return level === 'Rx+' ? `${title} Rx+` : title;
};
const getDate = (d) => {
  const date = d ? new Date(d) : new Date();

  return date.toLocaleDateString('en', {month: '2-digit', day: '2-digit', year: 'numeric'});
};
const getResult = (score) => {
  if (regexes.rounds.test(score)) {
    return score.replace(regexes.allSpaces, '').replace(regexes.reps, '');
  }

  return score.replace(regexes.lbs, '');
};

const buildRows = async({startAt, endAt, memberType, dirs}) => {
  const scoresDir = getDataPath(dirs.input, memberType);
  const memberFiles = await fs.readdir(scoresDir);
  const allMembers = memberFiles
  .filter((file) => file.endsWith('.json'))
  .map((file) => {
    return require(path.join(scoresDir, file));
  });

  let members = allMembers;

  if (startAt || endAt) {
    members = endAt ? members.slice(startAt, endAt) : members.slice(startAt);
  }
  const len = members.length;
  const allLen = allMembers.length;

  const rows = [];
  let expunge = 0;

  const hasDupe = (score, scores, i) => {
    return scores.some((result, index) => {
      return index !== i &&
        (!score.date || score.date === result.date) &&
        result.score === score.score &&
        result.level === score.level &&
        result.notes === score.notes;
    });
  };

  const isZero = ({score, notes = ''}) => {
    return !parseFloat(score) && !notes.trim();
  };

  members.forEach((member, i) => {
    const pct = `${Math.round((i / len) * 100)}% prepped`;

    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(pct);

    const athlete = `${member.firstName} ${member.lastName}`;

    if (!member.workouts || !member.workouts.length) {
      return console.log(`${athlete} has no workouts`);
    }
    member.workouts.forEach((workout) => {
      const name = workout.name;
      const setRepScheme = getRepScheme(name);

      if (!workout.scores || !workout.scores.length) {
        return console.log(`${athlete} has no scores for ${name}`);
      }

      workout.scores.forEach((score, i) => {

        if (isZero(score) || hasDupe(score, workout.scores, i)) {
          expunge++;
        } else {
          rows.push({
            athlete,
            date: getDate(score.date),
            workoutTitle: getWorkoutTitle(name, score.level),
            isRx: score.level.indexOf('Rx') !== -1,
            result: getResult(score.score),
            setRepScheme,
            notes: score.notes,
          });
        }
      });
    });
  });

  return {rows, expunge, memberType, dirs};
};

const outputFile = ({rows, expunge, memberType, dirs}) => {
  const saveTo = getDataPath(dirs.output, `${memberType}.json`);

  console.log(chalk.magenta(`\n${expunge} dupe or "zero" ${expunge === 1 ? 'row' : 'rows'} expunged`));
  console.log(chalk.cyan(`\n${rows.length} gathered. Saving to ${saveTo}`));

  return fs.outputJSON(saveTo, rows);
};

const prepForCSV = (data) => {
  return buildRows(data)
  .then(outputFile);
};

// @ts-ignore
if (!module.parent) {

  getData()
  .then(prepForCSV)
  .then(() => console.log(chalk.green('\n\nFinished all!!')))
  .catch(console.error);

}

module.exports = {prepForCSV};
