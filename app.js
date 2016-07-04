'use strict';

let creds = {};
try {
  creds = require('./creds.json');
} catch(e) {}

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || creds.clientId;
const SPOTIFY_SECRET_ID = process.env.SPOTIFY_SECRET_ID || creds.clientSecret;

if(!SPOTIFY_SECRET_ID || !SPOTIFY_CLIENT_ID) {
  throw new Error('You must specify the Spotify Client ID & Secret')
}

let Spock = require('./lib/spock');
let spockInstance = new Spock(SPOTIFY_CLIENT_ID, SPOTIFY_SECRET_ID);
spockInstance.listen(process.env.PORT);
