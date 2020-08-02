require('dotenv').config();
const axios = require('axios');
const {login} = require('./login.js');

const setupAxios = async() => {
  const {cookies} = await login();
  const sessionCookie = cookies.find(({name}) => name === 'sessionid');
  const Cookie = `${sessionCookie.name}=${sessionCookie.value}`;

  const settings = {
    baseURL: process.env.BASE_URL,
    timeout: 60000,
    headers: {Cookie},
  };

  // @ts-ignore
  const instance = axios.create(settings);

  return instance;
};

module.exports = {setupAxios};
