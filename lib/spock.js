'use strict';
let spotifyUri = require('spotify-uri');
let SpotifyWebApi = require('spotify-web-api-node');

let express = require('express');
let bodyParser = require('body-parser');

const SPOTIFY_REGEX = /(spotify:[a-zA-Z0-9]{22}|https:\/\/[a-z]+\.spotify\.com\/track\/[a-zA-Z0-9]{22})/ig;
const SPOTIFY_SCOPES = ['playlist-modify-private', 'playlist-modify-public'];

// AQA9IpLWVOGJ6YutydWZafIiMF1y4lR6cg_NjCcpvVUBZBvxna_zibI6pdkE0Mr7QtFhTZU-Qi5wZiARpA_F8144-2QoBarfBR1QD30BMpVWdbwaPDX2XcHse80b3z_F6MP12pSzCopaaU5Fh4qUc3-BbgMBHGpmTnnJzY8dqLrOaAe7Vbn16Nm0Stw4E6cMpksxzGuFZxXAYlBe2_D-FmJC7mg

class Spock {

  constructor(clientId, clientSecret) {

    this.tracks = [];
    this.app = express();
    this.configureRoutes();

    this.spotifyApi = new SpotifyWebApi({
      clientId: clientId,
      clientSecret: clientSecret,
      redirectUri: 'https://gorgeous-rocky-mountain-44675.herokuapp.com/return'
    });

    console.log(this.spotifyApi.createAuthorizeURL(SPOTIFY_SCOPES, 'spock'))

  }

  parseMessage(message) {

    // Reset the tracks container each message
    this.tracks = [];

    let matchedUris = message.match(SPOTIFY_REGEX);

    if(!matchedUris) {
      return false;
    }

    if(!Array.isArray(matchedUris)) {
      matchedUris = [matchedUris];
    }

    matchedUris.forEach((uri) => {

      let spotifyUriParts = spotifyUri.parse(uri);

      // Only interested in tracks for now
      if(spotifyUriParts.type === 'track') {
        this.tracks.push(spotifyUriParts.id);
      }

    });

  }

  configureRoutes() {

    let self = this;

    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(bodyParser.json());

    this.app.get('/return', (req, res) => {

      var code = req.query.code;
      this.spotifyApi.authorizationCodeGrant(code)
        .then((data) => {
          console.log('The token expires in ' + data.body['expires_in']);
          console.log('The access token is ' + data.body['access_token']);
          console.log('The refresh token is ' + data.body['refresh_token']);

          // Set the access token on the API object to use it in later calls
          this.spotifyApi.setAccessToken(data.body['access_token']);
          this.spotifyApi.setRefreshToken(data.body['refresh_token']);

          return res.send('Ok')

        })
        .catch((error) => {
          console.log(error);
          return res.send(error);
        });

    });

    this.app.post('/incoming', (req, res) => {

      // First, parse the incoming message, if it exists
      if(!req.body.text) {
        return res.status(500).send({message: 'text required'});
      }

      self.spotifyApi.refreshAccessToken()
        .then(function(data) {

          self.parseMessage(req.body.text);

          if(!self.tracks.length) {
            return res.status(200).send('');
          }

          self.spotifyApi.getTracks(self.tracks)
            .then((data) => {

              // Add tracks to a playlist
              self.spotifyApi.addTracksToPlaylist('tomhallam', '0J000PG3ymwwp2uKvI7Y0A', data.body.tracks.map((track) => {return 'spotify:track:' + track.id}))
                .then(function(data) {
                  return res.status(200).send({
                    text: self.tracks.length + ' ' + (self.tracks.length > 1 ? 'tracks' : 'track') + ' will be added to your playlist :tada:'
                  });
                }, function(err) {
                  console.log('Something went wrong!', err);
                });

            })
            .catch((error) => {
              console.log(error);
              return res.status(200).send({
                text: 'There was a problem getting one or more tracks from Spotify. Try again!'
              });
            })

        }, function(err) {
          console.log('Could not refresh access token', err);
        });

    });

  }

  listen(port) {
    if(!port) {
      port = 3000;
    }
    this.app.listen(port, () => {
      console.log(`Listening at port ${port}`);
    });
  }

}

module.exports = Spock;
