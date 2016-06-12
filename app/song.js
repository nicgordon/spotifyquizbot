// spotify track payload example:
// track = {
//   artist: 'Bob Dylan',
//   album: 'Highway 61 Revisited',
//   disc_number: 1,
//   duration: 370,
//   played count: 0, // don't think this works.
//   track_number: 1,
//   starred: false,
//   popularity: 71,
//   id: 'spotify:track:3AhXZa8sUQht0UEdBJgpGc',
//   name: 'Like A Rolling Stone',
//   album_artist: 'Bob Dylan',
//   spotify_url: 'spotify:track:3AhXZa8sUQht0UEdBJgpGc' }
// }
import english from './lib/english';
import natural from 'natural';

export const GUESS_RESULT = {
  CORRECT: 1,
  INCORRECT: 2,
  ALREADY_GUESSED: 3,
};

const MIN_GUESS_ACCURACY = 0.9;

export default class Song {
  constructor(spotifyTrackPayload) {
    this.id = spotifyTrackPayload.id;
    this.artist = spotifyTrackPayload.artist;
    this.title = spotifyTrackPayload.name;
    this.album = spotifyTrackPayload.album;

    this.comparableArtist = english.removeDiacritics(this.artist).replace(/-/g, ' ').toLowerCase();
    this.comparableTitle = english.removeDiacritics(this.title).replace(/-/g, ' ').toLowerCase();

    this.artistGuessed = false;
    this.titleGuessed = false;
  }

  verifyGuess(attempt) {
    const result = {
      artist: GUESS_RESULT.ALREADY_GUESSED,
      title: GUESS_RESULT.ALREADY_GUESSED,
    };

    if (this.artistGuessed && this.titleGuessed) {
      return result;
    }

    // remove the >
    const guess = attempt.replace('&gt;', '');

    // split the attempt up by -
    // if there are more than 2 parts, discard the remainder    
    const guessParts = guess.split('-').map((part) => part.trim()).filter((part) => !!part).slice(0, 2);

    // if artist isn't already guessed validate all parts against artist
    // if any of them pass remove that part
    // update the artist result
    if (!this.artistGuessed) {
      for (let i = 0, len = guessParts.length; i < len; i++) {
        console.log(`"${guessParts[i]}" vs. "${this.comparableArtist}" = ${natural.JaroWinklerDistance(this.comparableArtist, guessParts[i])}`);

        if (natural.JaroWinklerDistance(this.comparableArtist, guessParts[i]) >= MIN_GUESS_ACCURACY) {
          this.artistGuessed = true;
          result.artist = GUESS_RESULT.CORRECT;
          guessParts.splice(i, 1);
          break;
        }
      }

      // If the guess was incorrect, mark the result so
      if (!this.artistGuessed) {
        result.artist = GUESS_RESULT.INCORRECT;
      }
    }


    // if title isn't already guessed validate all parts against title
    // if any of them pass remove that part
    // update the title result
    if (!this.titleGuessed) {
      for (let i = 0, len = guessParts.length; i < len; i++) {
        console.log(`"${guessParts[i]}" vs. "${this.comparableTitle}" = ${natural.JaroWinklerDistance(this.comparableTitle, guessParts[i])}`);

        if (natural.JaroWinklerDistance(this.comparableTitle, guessParts[i]) >= MIN_GUESS_ACCURACY) {
          this.titleGuessed = true;
          result.title = GUESS_RESULT.CORRECT;
          guessParts.splice(i, 1);
          break;
        }
      }

      // If the guess was incorrect, mark the result so
      if (!this.titleGuessed) {
        result.title = GUESS_RESULT.INCORRECT;
      }
    }

    return result;
  }
}