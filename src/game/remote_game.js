/**
 * Created by peter on 5/16/16.
 */

import promiseTry from 'es6-promise-try';
import firebase from 'firebase';
import { addRemoteMove } from './actions';

import { BLACK, WHITE } from './color';

import { currentTurn } from './getters';

firebase.initializeApp({
  apiKey: 'AIzaSyD1sB2mtSubsImIEh4SklU7EivMnJHKLDA',
  authDomain: 'vuego.firebaseapp.com',
  databaseURL: 'https://vuego.firebaseio.com',
  storageBucket: 'project-1396985000601130379.appspot.com'
});

let fb = firebase.database();

class RemoteGame {
  constructor (store) {
    this.store = store;
    let gameId = store.state.remoteGameId;
    // TODO: If no opponent yet, listen for acceptance of invitation!
    this.movesRef = fb.ref(`moves/${gameId}`);
    this.movesRef.on('child_added', m => {
      addRemoteMove(store, { id: m.key, move: m.val() });
    });
  }

  pass () {
    this.movesRef.push({
      type: 'pass'
    });
  }

  play ({ x, y }) {
    this.movesRef.push({
      type: 'play',
      params: {
        x,
        y
      }
    });
  }

  localCurrentTurn () {
    let t = currentTurn(this.store.state); // TODO: Actually, you know, implement this.

    if (!t) {
      return t;
    }

    let uid = firebase.auth().currentUser.uid;

    return this.store.state[t] === uid ? t : null;
  }
}

RemoteGame.create = function ({ size }) {
  if (!firebase.auth().currentUser) {
    return promiseTry(() =>
      firebase.auth().signInAnonymously()
    ).then(() =>
      RemoteGame.create({ size })
    );
  }

  let uid = firebase.auth().currentUser.uid;
  let games = fb.ref('games');
  let newGame = games.push({
    size,
    [BLACK]: uid,
    [WHITE]: null
  });

  let key = newGame.key;

  return Promise.resolve({ size, gameId: key, inviteId: key, [BLACK]: uid });
};

RemoteGame.join = function ({ gameId }) {
  if (!firebase.auth().currentUser) {
    return promiseTry(() =>
      firebase.auth().signInAnonymously()
    ).then(() =>
      RemoteGame.join({ gameId })
    );
  }

  let game = fb.ref(`games/${gameId}`);
  return promiseTry(() =>
    game.update({ [WHITE]: firebase.auth().currentUser.uid })
  ).then(() =>
    game.once('value')
  ).then(v => {
    let { size, [WHITE]: white, [BLACK]: black } = v.val();

    return { size, [WHITE]: white, [BLACK]: black, gameId: v.key };
  });
};

export default RemoteGame;
