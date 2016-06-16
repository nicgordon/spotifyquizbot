import _ from 'lodash';
import async from 'async';

import { bot } from './index';
import spotifyManager from './spotify-manager';

import { GUESS_RESULT } from './song';
const SONG_CLUE_DELAY = 30000;

export default class Game {
  constructor(channel) {
    this.channel = channel;

    // A queue of guesses in the order they were made
    this.guessQueue = this.initGuessQueue();

    // Scores is a collection of objects which have a Player and a score
    this.scores = [];

    // Give clues
    this.nextClue = null;
    spotifyManager.on('newSong', (song) => {
      if (song.duration > 30) {
        this.nextClue = setTimeout(() => {
          this.giveClue(song);
        }, SONG_CLUE_DELAY);
      }
    });
  }

  addScore(player, score) {
    const playerScore = _.find(this.scores, { player });

    if (playerScore) {
      playerScore.score += score;
    } else {
      // Create a new playerScore if this player hasn't scored yet in this game
      this.scores.push({
        player,
        score,
      });
    }
  }

  getScores() {
    return this.scores;
  }

  giveClue(song) {
    function redactItem(item) {
      return item.replace(/\B\w/g, '_');
    }

    const artistClue = song.artistGuessed ? song.artist : redactItem(song.artist);
    const titleClue = song.titleGuessed ? song.title : redactItem(song.title);

    bot.say({
      text: `Okay, here's a clue: \`${artistClue} - ${titleClue}\``,
      channel: this.channel,
    });
  }

  initGuessQueue() {
    function addReaction(message, emojiName) {
      bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: emojiName,
      });
    }

    return async.queue((guess, callback) => {
      // If Spotify isn't running this promise will throw an error which we can just ignore
      spotifyManager.getCurrentSong()
        .then((song) => {
          console.log('Song detected as', song.artist, song.title);

          const result = song.verifyGuess(guess.message.text);
          let score = (result.artist === GUESS_RESULT.CORRECT ? 1 : 0) + (result.title === GUESS_RESULT.CORRECT ? 1 : 0);
          
          // If the guess got both right in a single guess then award a bonus point
          score = score === 2 ? 3 : score;

          this.addScore(guess.player, score);
          callback();

          // Cancel queued clue if song has been identified
          if (song.artistGuessed && song.titleGuessed) {
            clearTimeout(this.nextClue);
          }

          // Add reactions after the queue has moved on
          if (result.artist === GUESS_RESULT.CORRECT || result.title === GUESS_RESULT.CORRECT) {
            if (result.artist === GUESS_RESULT.CORRECT) {
              addReaction(guess.message, 'art');
            }

            if (result.title === GUESS_RESULT.CORRECT) {
              addReaction(guess.message, 'musical_note');
            }

            if (result.artist === GUESS_RESULT.CORRECT && result.title === GUESS_RESULT.CORRECT) {
              addReaction(guess.message, 'clap');
            }
          } else if (result.artist === GUESS_RESULT.INCORRECT || result.title === GUESS_RESULT.INCORRECT) {
            addReaction(guess.message, 'x');
          }
        })
        .catch((err) => {
          console.error('Could not detect current song', err);
          callback();
        });
    });
  }

  /**
   * When a player makes a guess the process for validating it is initiated here
   * @param {Player} player
   * @param {object} message - A Slack message
   */
  makeGuess(player, message) {
    this.guessQueue.push({
      player,
      message,
    }, (err) => {
      if (err) {
        // maybe try queuing again?
        console.error('Could not process guess in queue', err);
        return;
      }
    });
  }
}