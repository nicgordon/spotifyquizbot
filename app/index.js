import _ from 'lodash';
import english from './lib/english';
import Botkit from 'botkit';

import setup from '../setup';

import Game from './game';
import Player from './player';

const games = [];
let players = [];

export const controller = Botkit.slackbot({
  debug: false,
});

export const bot = controller.spawn({
  token: setup.token
}).startRTM();

// Collect all slack users and convert them to Players
bot.api.users.list({}, (err, response) => {
  if (err) {
    console.error('Unable to retrieve users list', err);
    return;
  }

  const members = (response.hasOwnProperty('members') && response.ok) ? response.members : [];

  // Filter down the slack members to only those that are active and human
  players = members
    .filter((member) => !member.deleted && !member.is_bot)
    .map((member) => new Player(member.id, member.name, member.profile.first_name, member.profile.last_name));  
});

// Help
controller.hears(['help'], 'direct_message,direct_mention,mention', (bot, message) => {
  console.log('Received help message');

  bot.reply(message, `*_Can you guess the track currently playing on Spotify faster than your mates?_*
For each new song that comes on there are 2 points up for grabs: 1 for being the first to correctly identify the artist and 1 for the song title.
To make a guess just start your message with a ">", you don't need to notify me directly.
You can guess artist and title separately or at the same time separated by a "-".

I'll add reactions to messages in certain situtations:
 - :art: means you got the point for guessing the *_artist_* of the current song
 - :musical_note: means you got the point for guessing the *_title_* of the current song
 - :x: means it was all wrong
 - No reaction normally means someone else beat you to it!

Here are some things you can tell me to do:
 - *_start_* or *_begin_* the game - e.g. _hey @spotbot, start the game already!_
 - *_check_* the *_score_* - e.g. _what's the score @spotbot?_
 - *_finish_* or *_end_* the game - e.g. _@spotbot: finish the game._

Have fun!`);
});

// Respond to greetings just for the lols
controller.hears(['hello','hi'], 'direct_message,direct_mention,mention', (bot, message) => {
  console.log('Received hello message');

  bot.api.reactions.add({
    timestamp: message.ts,
    channel: message.channel,
    name: 'wave',
  }, (err, res) => {
    if (err) {
      console.error('Failed to add emoji reaction :(', err);
    }
  });

  const player = _.find(players, { id: message.user });
  bot.reply(message,`Hello <@${message.user}|${player.username}>!!`);
});

function getScoresOutput(scores) {
  if (!scores.length) {
    return 'Noone has scored anything yet!';
  }

  const sortedScores = _.orderBy(scores, ['score'], ['desc']);

  let previousScore = 0;
  let previousPosition = 0;
  const standings = sortedScores.map((score, index) => {
    const position = (index > 0 && score.score === previousScore) ? previousPosition : index + 1;

    previousScore = score.score;
    previousPosition = position;

    return `${position}. ${score.score}pt${score.score === 1 ? '' : 's'} - <@${score.player.id}|${score.player.username}>`
  });

  return standings.join('\n');
}

// Begin a game in the current channel
controller.hears(['start','begin'], 'direct_message,direct_mention,mention', (bot, message) => {
  console.log('Received start game message');

  const game = _.find(games, { channel: message.channel });
  if (game) {
    bot.reply(message, 'There is already a game in progress on this channel!\nEnd the other game before starting a new one by saying "end game".');
    return;
  }

  // Create a new game
  games.push(new Game(message.channel));
  bot.reply(message, "A new game has begun! May the most musically-knowledgeable win!");
});

// Finish the game running in the current channel
controller.hears(['end','finish'], 'direct_message,direct_mention,mention', (bot, message) => {
  console.log('received end game message');

  const game = _.find(games, { channel: message.channel });
  if (!game) {
    return;
  }

  // Remove the game from the games array
  _.pull(games, game);

  // Print the scores
  const scores = game.getScores();
  if (!scores.length) {
    bot.reply(message, 'Well that was the most boring game ever, noone scored anything!');
    return;
  }

  const winningScore = Math.max(...scores.map((score) => score.score));
  const winners = scores.filter((score) => score.score === winningScore);

  let output = `The game is over! ${(winners.length > 1) ? 'It\'s a tie!!' : ''} :tada:
Congratulations to our winner${(winners.length > 1) ? 's' : ''}: ${english.toList(winners.map((score) => `<@${score.player.id}|${score.player.username}>`))} :trophy:

  ${getScoresOutput(scores)}`;

  bot.reply(message, output);
});

// Check the scores of the game running in the current channel
controller.hears(['check', 'score'], 'direct_message,direct_mention,mention', (bot, message) => {
  console.log('Received check scores message');

  const game = _.find(games, { channel: message.channel });
  if (!game) {
    bot.reply(message, 'You haven\'t started a game yet!\nUse "start game" or something along those lines to begin.');
    return;
  }

  const scores = game.getScores();
  bot.reply(message, getScoresOutput(scores));
});

// Listen for guesses. Guesses have to start with a ">" 
controller.on('ambient', function(bot, message) {
  if (message.text.startsWith('&gt;')) {
    console.log('Detected possible guess attempt message', message.text);

    // Attempt detected, check that there is a game running in this channel
    const game = _.find(games, { channel: message.channel });
    if (!game) {
      return;
    }

    // Find the player that made the guess
    const player = _.find(players, { id: message.user });
    if (!player) {
      console.error('Could not find information on the player with ID', message.user);
      return;
    }

    // Queue the guess for verification
    game.makeGuess(player, message);
  }
});
