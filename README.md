## Spotify Quiz Bot

A bot which will referee a game of "who can guess the song the fastest". Run it on a computer that is also running spotify and you're good to go!

### Setup

#### Create your bot

Log into Slack website, and then [create your own bot](https://my.slack.com/services/new/bot).

Name your bot "spotbot" or whatever you like. Copy the key Slack gives you.

#### Configure your bot

Create a file named `setup.js` in the root of the project and populate it with:

```javascript
export default {
  token: 'your slack bot token here',
};
```

#### Install the required dependencies

    npm install

#### Boot up your new bot

    npm start

In Slack, invite the bot to a channel (`/invite @bot_name`) and now you can talk to it.

Type `@bot_name help` to get a list of commands

#### Keep your bot running as a background service

On OS X, background services are either LaunchAgents or LaunchDaemons.
SpotifySlackBot can only run while a user is logged in, since it depends
on the Spotify GUI app being open, so the appropriate type of service
here is a LaunchAgent.

First, edit `spotifybot.launchagent.plist` and change `BOT_HOME` to
the **full path** of your bot's directory, e.g.
`/Users/nicgordon/code/spotifyquizbot` or the like.

Install the launchAgent by copying it to the required location:

    cp spotifybot.launchagent.plist ~/Library/LaunchAgents/

Finally, launch your background service for the first time (it will now auto-start upon login)

    launchctl load ~/Library/LaunchAgents/spotifybot.launchagent.plist

