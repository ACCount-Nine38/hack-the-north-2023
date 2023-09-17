import {doc, onSnapshot} from "firebase/firestore";
import {firestore, queueForMatch} from "./CreateFirebaseEngine";

const USERS_PATH = "users";

class MatchMakingEngine {

    #user_id;
    #unsub;

    constructor(user_id) {
        this.#user_id = user_id;
    }

    async queueForMatch(competitiveness, didFindMatch) {
        try {
            await queueForMatch(
                {
                    competitiveness: competitiveness,
                });
        } catch (error) {
            switch (error.code) {
                case "functions/invalid-argument":
                    throw new Error("invalid argument")
                case "functions/unauthenticated":
                    throw new Error("unauthenticated")
                case "functions/failed-precondition":
                    throw new Error("already in queue/game")
                default:
                    throw new Error("internal")
            }
        }

        this.#unsub = onSnapshot(doc(firestore, USERS_PATH + "/" + this.#user_id + "/status/match-making"), (doc) => {
            if (doc.exists) {
                const data = doc.data();
                if (data.status === "in-game") {
                    didFindMatch(data.game_id);
                    this.#unsub(); // TODO: Investigate possible race condition
                }
            }
        });
    }
}

export default MatchMakingEngine;