/**
 * This is where we loop through all the member files and turn them into 3 separate files:
 * athletes.json, workouts.json, and scores.json
 *
 */

require('dotenv').config();

const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const {getData, getDataPath} = require('../utils/index.js');
const {slugify} = require('fmjs/cjs/string.js');
const regexes = {
  xByy: /(\d+\s*[xX]\s*\d+)/,
  repMax: /(\d+)\s*(RM)/,
  cleanRM: /\s*\(?\d+\s*rm\)?\s*(rx+)?/i,
  lbs: /\s*lbs$/i,
  rounds: /\d+\s+\+\s+\d+/,
  roundsAlpha: /\s*rounds$/i,
  reps: /\s+reps$/i,
  allSpaces: /\s+/g,
  units: /\s*(?:lbs|cals?|reps?)\s*$/,
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

const getWorkoutTitle = (title, repScheme) => {
  const t = title.replace(regexes.cleanRM, '');
  const slug = t.replace(/["\s-]+/g, '');

  if (!slug || slug === '012415' || /x0/.test(slug) || /^(?:0x|\d\d?\/\d\d?\/\d{2,4})/.test(slug)) {
    return '';
  }
  const name = t.replace(/^\d+\s*x\s*\d+/, '').trim();

  return repScheme ? `${name} ${repScheme}` : name;
};

const getWorkoutType = (type, result, repScheme) => {
  const score = `${result}`;

  if (type) {
    return type;
  }

  if (repScheme) {
    // Some people are using rep-scheme syntax for non-weight scores,
    // so just purge them
    return result.includes('+') ? '' : 'weight';
  }

  if (score.includes(':')) {
    return 'time';
  }

  return 'reps';
};

const getScoreData = (type, result) => {
  const data = {score: result};

  if (type === 'time') {
    const time = result.split(':');
    const seconds = Number(time.pop()) || 0;
    const minutes = Number(time.pop()) || 0;

    Object.assign(data, {
      minutes,
      seconds,
      time: (minutes * 60) + seconds,
    });
  }

  if (type === 'reps') {
    const roundsReps = `${result}`.split('+');
    const reps = Number(roundsReps.pop()) || 0;
    const rounds = Number(roundsReps.pop()) || 0;

    Object.assign(data, {
      rounds,
      reps,
    });
  }

  if (type === 'weight') {
    Object.assign(data, {weight: Number(result) || 0});
  }

  return data;
};

const getDate = (d) => {
  const date = d ? new Date(d) : new Date();

  return date.toLocaleDateString('en', {month: '2-digit', day: '2-digit', year: 'numeric'});
};
const getResult = (score) => {
  if (regexes.roundsAlpha.test(score)) {
    return score.replace(regexes.roundsAlpha, '+0');
  }
  if (regexes.rounds.test(score)) {
    return score.replace(regexes.allSpaces, '').replace(regexes.reps, '');
  }

  return score.replace(regexes.units, '');
};

const buildRows = async({dirs, memberTypes}) => {
  const members = new Set();

  memberTypes.reverse();
  for (let memberType of memberTypes) {
    const scoresDir = getDataPath(dirs.input, memberType);

    // eslint-disable-next-line no-await-in-loop
    const scoreFiles = await fs.readdir(scoresDir);

    scoreFiles
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      return require(path.join(scoresDir, file));
    })
    .forEach((member) => {
      members.add(member);
    });
  }

  const len = members.size;

  const athletes = new Map();
  const workouts = new Map();
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
  const weights = {
    'Rx+': 2,
    Rx: 1,
    Scaled: 0,
  };

  let i = 0;

  members.forEach((member) => {
    const pct = `${Math.round((i++ / len) * 100)}% members prepped`;

    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(pct);

    const {firstName, lastName, id: athleteId, email} = member;
    const fullName = `${firstName} ${lastName}`;
    const athleteSlug = slugify(fullName);

    athletes.set(athleteId, {id: athleteId, slug: athleteSlug, firstName, lastName, name: fullName, email});

    if (!member.workouts || !member.workouts.length) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);

      return console.log(`\n${fullName} has no workouts`);
    }
    member.workouts.forEach((workout) => {
      const name = workout.name;
      const repScheme = getRepScheme(name);
      const workoutTitle = getWorkoutTitle(name, repScheme);
      const workoutSlug = slugify(workoutTitle);

      if (!workout.scores || !workout.scores.length) {
        return console.log(`\n${fullName} has no scores for ${name}`);
      }

      if (!workoutTitle) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(`${pct} - Skipping ${name}`);

        return;
      }
      let workoutType = '';

      workout.scores.forEach((score, i) => {
        const result = getResult(score.score);


        if (isZero(score) || hasDupe(score, workout.scores, i)) {
          expunge++;
        } else {
          workoutType = getWorkoutType(workoutType, result, repScheme);

          const scoreData = getScoreData(workoutType, result);

          rows.push({
            athleteId,
            athleteName: fullName,
            athleteSlug,
            workoutId: workoutSlug,
            workoutTitle,
            workoutType,
            ...scoreData,
            date: getDate(score.date),
            level: score.level,
            levelWeight: weights[score.level],
            repScheme,
            notes: score.notes,
          });
        }
      });

      if (workoutTitle && workoutType) {
        workouts.set(workoutSlug, {name: workoutTitle, id: workoutSlug, type: workoutType});
      }

    });
  });


  return {
    athletes: [...athletes.values()],
    workouts: [...workouts.values()],
    scores: rows,
    expunge,
  };
};

const outputFiles = (d) => {
  const {expunge, ...data} = d;
  // const saveTo = getDataPath(dirs.output, `${memberType}.json`);

  console.log(chalk.magenta(`\n${expunge} dupe or "zero" ${expunge === 1 ? 'score' : 'scores'} expunged`));

  const outputs = Object.entries(data).map(([key, val]) => {
    const saveTo = getDataPath('mongo-ready', `${key}.json`);

    console.log(chalk.cyan(`${val.length} ${key} gathered. Saving to ${saveTo}\n`));

    return fs.outputJSON(saveTo, val);
  });

  return Promise.all(outputs);
};

const prepForMongo = (data) => {
  return buildRows(data)
  .then(outputFiles);
};

// @ts-ignore
if (!module.parent) {

  getData()
  .then(prepForMongo)
  .then(() => console.log(chalk.green('\n\nFinished all!!')))
  .catch(console.error);

}

module.exports = {prepForMongo};
