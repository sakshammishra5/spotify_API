require('dotenv').config();
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const app = express();

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI
});

// Login endpoint to start authorization
app.get('/login', (req, res) => {
  const scopes = ['user-read-playback-state', 'user-modify-playback-state', 'user-top-read'];
  res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

// Callback endpoint to handle authorization code
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    spotifyApi.setAccessToken(data.body.access_token);
    spotifyApi.setRefreshToken(data.body.refresh_token);
    res.send('Authentication successful! You can now use the /spotify endpoint.');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Main endpoint to get top tracks and now playing
app.get('/spotify', async (req, res) => {
  try {
    const topTracks = await spotifyApi.getMyTopTracks({ limit: 10 });
    const nowPlaying = await spotifyApi.getMyCurrentPlayingTrack();

    const response = {
      topTracks: topTracks.body.items.map(track => ({
        name: track.name,
        artist: track.artists[0].name,
        uri: track.uri
      })),
      nowPlaying: nowPlaying.body.item ? {
        name: nowPlaying.body.item.name,
        artist: nowPlaying.body.item.artists[0].name,
        uri: nowPlaying.body.item.uri
      } : null,
      controls: {
        stop: '/spotify/stop',
        play: '/spotify/play/:uri'
      }
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop playback
app.get('/spotify/stop', async (req, res) => {
  try {
    await spotifyApi.pause();
    res.json({ message: 'Stopped playing' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Play a track
app.get('/spotify/play/:uri', async (req, res) => {
  try {
    await spotifyApi.play({ uris: [req.params.uri] });
    res.json({ message: 'Started playing' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));