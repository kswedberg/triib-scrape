require('dotenv').config();

const path = require('path');
const fs = require('fs-extra');
const cheerio = require('cheerio');
const chalk = require('chalk');
const {peach} = require('fmjs/cjs/promise.js');
const {setupAxios} = require('../utils/axios.js');
const {delay, getData, getDataPath} = require('../utils/index.js');

/**
* getScores
*
* @returns Promise
*/
const getScores = async({startAt, endAt, memberType, dirs}) => {
  const axios = await setupAxios();
  const workoutsDir = getDataPath(dirs.input, memberType);
  const scoresDir = getDataPath(dirs.output, memberType);
  const memberFiles = await fs.readdir(workoutsDir);
  const allMembers = memberFiles.map((file) => {
    return require(path.join(workoutsDir, file));
  });
  let members = allMembers;

  if (startAt || endAt) {
    members = endAt ? members.slice(startAt, endAt) : members.slice(startAt);
  }
  const len = members.length;
  const allLen = allMembers.length;

  return peach(members, async(member, i) => {
    if (i !== 0 && i % 5 === 0) {
      await delay(2000);
    }
    const username = `${member.firstName} ${member.lastName}`;

    console.log(chalk.cyan(`\nAdding scores for ${member.workouts.length} workouts for ${username} / ${member.id}\nIndex: ${i + startAt} / ${allLen}\n`));

    await peach(member.workouts, async(workout, j) => {
      let response;

      if (j !== 0 && j % 5 === 0) {
        await delay(1000);
      }
      const msg = `Fetching ${username} workout (${j + 1} of ${member.workouts.length}): ${workout.name}`;

      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(msg);
      try {
        response = await axios(workout.url);
      } catch (err) {


        if (err.response) {
          delete err.response.request;
          console.log(err.response);
        } else {
          console.log(err);
        }

        throw new Error(`Failed to open ${member.url} Check SESSIONID in .env file`);
      }

      const $ = cheerio.load(response.data);
      const $rows = $('table').eq(1).find('tbody tr');

      if (!$rows.length) {
        return console.log('NO SCORES IN WORKOUT', workout.name, 'FOR MEMBER:', member.firstName, member.lastName);
      }
      const cells = ['date', 'pr', 'score', 'level', 'notes'];

      workout.scores = [];
      $rows.each(function() {
        const score = {};
        const $td = $(this).find('td, th');

        cells.forEach((cell, i) => {
          score[cell] = $td.eq(i).text().trim();
        });

        score.date = score.date ? new Date(score.date).toISOString() : score.date;
        score.pr = !!score.pr;

        score.id = `${score.date}${score.score}`;

        if (!workout.scores.some((wko) => wko.id === score.id)) {
          workout.scores.push(score);
        }
      });

      return workout;
    });

    await fs.outputJSON(path.join(scoresDir, `${member.id}.json`), member);

    console.log(`\n\nFinished ${memberType} ${startAt + i + 1} / ${allLen}`);
  });

};

// @ts-ignore
if (!module.parent) {
  getData()
  .then(getScores)
  .then(() => console.log(chalk.green('\n\nFinished all!!')))
  .catch(console.error);

}

module.exports = {getScores};
