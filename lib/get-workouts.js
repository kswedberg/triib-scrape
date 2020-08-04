require('dotenv').config();

const path = require('path');
const fs = require('fs-extra');
const cheerio = require('cheerio');
const {peach} = require('fmjs/cjs/promise.js');
const {slugify} = require('fmjs/cjs/string.js');
const {setupAxios} = require('../utils/axios.js');
const {getData, getDataPath} = require('../utils/index.js');

/**
 * getWorkouts
 *
 * @returns Promise
 */
const getWorkouts = async({startAt, endAt, memberType, dirs}) => {
  const axios = await setupAxios();
  const memberPath = getDataPath(dirs.input, memberType);
  const workoutsPath = getDataPath(dirs.output, memberType);
  const allMembers = require(`${memberPath}.json`);
  let members = allMembers;

  if (startAt || endAt) {
    members = endAt ? members.slice(startAt, endAt) : members.slice(startAt);
  }
  const len = members.length;
  const notFound = [];

  return peach(members, async(member, i) => {
    const preface = `Index ${startAt + i}/${len} (${member.firstName} ${member.lastName})`;
    const urlParts = member.url.replace(/\/$/, '').split('/');
    const id = urlParts.pop();
    const memberFile = path.join(workoutsPath, `${id}.json`);
    let response;

    Object.assign(member, {id, workouts: []});

    const workoutUrl = `${path.join(member.url, 'workout-history')}/`;

    try {
      response = await axios(workoutUrl);
    } catch (err) {
      if (err.response) {
        const {status, statusText, headers, config} = err.response;

        console.log({status, statusText, headers, config, message: err.message});

        if (err.response.status === 404) {
          notFound.push(member);

          return;
        }

      } else {
        console.log(err.response || err);
      }
      throw new Error(`Failed to open ${member.url} Check SESSIONID in .env file`);
    }

    const $ = cheerio.load(response.data);
    const $rows = $('table').eq(0).find('tbody tr');

    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);

    if (!$rows.length) {
      process.stdout.write(`${preface}: Skipping. No workout history`);

      return;
    }
    $rows.each(function() {
      const $td = $(this).find('td');
      const name = $td.eq(0).text().trim();

      member.workouts.push({
        name,
        slug: slugify(name),
        url: $td.eq(0).find('a').attr('href'),
        scores: [],
      });

    });

    process.stdout.write(`${preface} saved`);
    await fs.outputJSON(memberFile, member);
  });
};

// @ts-ignore
if (!module.parent) {
  getData()
  .then(getWorkouts)
  .then(() => console.log('\n\nFinished all!!'))
  .catch(console.error);
}

module.exports = {getWorkouts};
