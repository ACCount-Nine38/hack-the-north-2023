import { firestore } from './CreateFirebaseEngine.js'
import { doc, onSnapshot } from "firebase/firestore";

// TODO: Use builder pattern and move this constant to shared file
const GAMES_PATH = "games";

class GameNetworkingEngine {

    #unsub;

    constructor(game_id, gameDidUpdate) {

        this.#unsub = onSnapshot(doc(firestore, GAMES_PATH + "/" + game_id), (doc) => {
            if (doc.exists) {
                gameDidUpdate(doc.data());
            }
        });
    }

    destructor() {
        this.#unsub();
    }
}

export default GameNetworkingEngine;