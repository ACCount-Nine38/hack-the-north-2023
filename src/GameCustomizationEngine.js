import {firestore, updateGameCustomizations} from "./CreateFirebaseEngine";
import {doc, onSnapshot} from "firebase/firestore";

// TODO: Use builder pattern and move this constant to shared file
const USERS_PATH = "users";

class GameCustomizationEngine {

    #user_id;
    #unsub;
    constructor(user_id, game_customizations_did_update) {
        this.#user_id = user_id;
        this.#unsub = onSnapshot(doc(firestore, USERS_PATH + "/" + user_id + "/customizations/game"), (doc) => {
            if (doc.exists) {
                const data = doc.data();
                game_customizations_did_update(data["pieces"], data["tiles"]);
            }
        });
    }

    async updateGameCustomizations(pieces, tiles){
        try {
            await updateGameCustomizations({
                pieces: pieces,
                tiles: tiles,
            })
        } catch (error) {
            switch (error.code) {
                case "functions/invalid-argument":
                    throw new Error("invalid argument");
                default:
                    throw new Error("internal")
            }
        }
    }

    destructor() {
        this.#unsub();
    }

}

export default GameCustomizationEngine;