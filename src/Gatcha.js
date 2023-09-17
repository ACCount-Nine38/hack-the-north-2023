import "./Menu.css";
import { motion } from "framer-motion";
import React, { useState, useEffect } from "react";
import chessSkins from "./Appendix.js";
import { BannerCategory , Pieces} from "./Enums";
import images from "./images";
import SkinCollectionEngine from './SkinCollectionEngine'
import { useAuth } from './AuthContext';


import {
  fadeAnimation,
  topAnimation,
  bottomAnimation,
  leftAnimation,
  rightAnimation,
} from "./animations";
import { firestore } from "./CreateFirebaseEngine";
import { doc, getDoc, updateDoc} from "firebase/firestore";

const dropRates = {
    Prestige: {
      Pawn: 0.01,
      Piece: 0.004,
    },
    Normal: {
      Pawn: 0.25,
      Piece: 0.07,
    },
    Tile: 0.37, //0.25
    // SpecialAvatar: 0.01,
    // SpecialWeapon: 0.01,
    // RandomAvatar: 0.1,
};

const drops = {
    "prestige pawn" : dropRates.Prestige.Pawn,
    "prestige rook" : dropRates.Prestige.Pawn + dropRates.Prestige.Piece,
    "prestige knight" : dropRates.Prestige.Pawn + dropRates.Prestige.Piece * 2,
    "prestige bishop" : dropRates.Prestige.Pawn + dropRates.Prestige.Piece * 3,
    "prestige queen" : dropRates.Prestige.Pawn + dropRates.Prestige.Piece * 4,
    "prestige king" : dropRates.Prestige.Pawn + dropRates.Prestige.Piece * 5,
    "normal pawn" : dropRates.Prestige.Pawn + dropRates.Prestige.Piece * 5 + dropRates.Normal.Pawn,
    "normal rook" : dropRates.Prestige.Pawn + dropRates.Prestige.Piece * 5 + dropRates.Normal.Pawn + dropRates.Normal.Piece,
    "normal knight" : dropRates.Prestige.Pawn + dropRates.Prestige.Piece * 5 + dropRates.Normal.Pawn + dropRates.Normal.Piece * 2,
    "normal bishop" : dropRates.Prestige.Pawn + dropRates.Prestige.Piece * 5 + dropRates.Normal.Pawn + dropRates.Normal.Piece * 3,
    "normal queen" : dropRates.Prestige.Pawn + dropRates.Prestige.Piece * 5 + dropRates.Normal.Pawn + dropRates.Normal.Piece * 4,
    "normal king" : dropRates.Prestige.Pawn + dropRates.Prestige.Piece * 5 + dropRates.Normal.Pawn + dropRates.Normal.Piece * 5,
    "tile" : dropRates.Prestige.Pawn + dropRates.Prestige.Piece * 5 + dropRates.Normal.Pawn + dropRates.Normal.Piece * 5 + dropRates.Tile
}

const BannerType = {
    'Crime City' : {
        status: BannerCategory.PRESTIGE,
        sets : ['Mafia', 'The Law']
    },
    'Dark Age' : {
        status: BannerCategory.PRESTIGE,
        sets : ['Kingdom', 'Rebels']
    },
    'The Massacre' : {
        status: BannerCategory.PRESTIGE,
        sets : ['Doom Bots', 'Survivors']
    },
    'The World of Arcane' : {
        status: BannerCategory.PRESTIGE,
        sets : ['Mages', 'Witches']
    },
    'The Enchanting' : {
        status: BannerCategory.PRESTIGE,
        sets : ['Holy Cult', 'Unholy Cult']
    },
    'The Gate Between Worlds' : {
        status: BannerCategory.PRESTIGE,
        sets : ['Demons', 'Angels']
    },
    'Curse of the Flying Dutchman' : {
        status: BannerCategory.PRESTIGE,
        sets : ['Pirates', 'Undead Pirates']
    },
    'Cool Japan' : {
        status: BannerCategory.PRESTIGE,
        sets : ['Ninja', 'Samurai']
    },
    'Defenders of Evil' : {
        status: BannerCategory.PRESTIGE,
        sets : ['Magic Girls', 'Tentacle Monsters']
    },
    'Artesian' : {
        status: BannerCategory.NORMAL,
        sets : ['Artistic', 'Minima']
    },
    'Wild West' : {
        status: BannerCategory.NORMAL,
        sets : ['Cowboy', 'Horses']
    },
    'Alien vs Predators' : {
        status: BannerCategory.NORMAL,
        sets : ['Alien', 'Predators']
    },
    'The Poor' : {
        status: BannerCategory.NORMAL,
        sets : ['Wheat Farmers', 'Beggers']
    },
    'Atlantis' : {
        status: BannerCategory.NORMAL,
        sets : ['Mermaids', 'Explorers']
    }
}

const PRESTIGE_BANNER_COST = 25;
const NORMAL_BANNER_COST = 20;
// const FIRST_PULL_DISCOUNT = 5;

const NUM_PIECES = 5;

const banners = ['Crime City', 'Crime City'];
  
function Gatcha({ BackToMenu }) {
    const user = useAuth();
    // component animation fields
    const [creditAmount, setCreditAmount] = useState(0);
    const [banner, setBanner] = useState("")
    const [gatchaBackgroundImage, setGatchaBackgroundImage] = useState("../images/banners/banner1.png");
    const [skinRolled, setSkinRolled] = useState("");

    // saving the skins
    const [skinCollectionEngine, setSkinCollectionEngine] = useState(null)
    useEffect(() => {
        setSkinCollectionEngine(new SkinCollectionEngine(user.id, (skinCollection) => {

        }));
    }, [])

    useEffect(() => {
        // console.log(skinRolled)
    }, [skinRolled])

    useEffect(() => {
        setCreditAmount(user.currentUser.nuggetCount);
        setCreditAmount(1000);
    }, []);

    useEffect(() => {
        const docRef = doc(firestore, "users", user.currentUser.id);
        const dataToUpdate = {
            nuggetCount: creditAmount,
        };
        updateDoc(docRef, dataToUpdate)
        .catch((error) => {
            console.error("Error updating document: ", error);
        });
        user.newNuggetCount(creditAmount);
        console.log(creditAmount);
    }, [creditAmount]);

    useEffect(() => {
        setGatchaBackgroundImage(".......")
    }, [banner]);

    function BannerOptions(props) {
        return (
            <motion.div
                whileHover={{ scale: 1.03 }}
                className="BannerOptionButton"
                onClick= {() => {
                    setBanner(props.bannerType);
                    // setButtonStatus(props.num);
                }}
            >
                {props.bannerType}
            </motion.div>
        );
    }


    function GatchaRoll() {
        if (banner === "") return;
        // const status = BannerType[banner].status;
        const status = BannerCategory.NORMAL ;
        var item = "";
        const rand = Math.random();
        
        if (status === BannerCategory.NORMAL && creditAmount < NORMAL_BANNER_COST) return;
        if (status === BannerCategory.PRESTIGE && creditAmount < PRESTIGE_BANNER_COST) return;

        for (const [it, dropRate] of Object.entries(drops)) {
            if (dropRate > rand) {
                item = it;
                break; 
            }
        }

        const idx = Math.random() < 0.5 ? 0 : 1;
        const set = BannerType[banner].sets[idx];

        var type = Pieces.PAWN; // change to tile
        const grade = item.includes("prestige") ? "prestige" : "normal";

        if (item === "prestige pawn" || item === "normal pawn") type = Pieces.PAWN;
        if (item === "prestige rook" || item === "normal rook") type = Pieces.ROOK;
        if (item === "prestige knight" || item === "normal knight") type = Pieces.KNIGHT;
        if (item === "prestige bishop" || item === "normal bishop") type = Pieces.BISHOP;
        if (item === "prestige queen" || item === "normal queen") type = Pieces.QUEEN;
        if (item === "prestige king" || item === "normal king") type = Pieces.KING;

        const skin = Object.keys(chessSkins).find((key) => {
            const temp = chessSkins[key];
            return temp.type === type && temp.set === set && temp.grade === "normal";
        });

        console.log(type,set, grade, skin);
        
        setSkinRolled(skin);
        setCreditAmount(creditAmount - (status === BannerCategory.NORMAL ? NORMAL_BANNER_COST : PRESTIGE_BANNER_COST));
    }


  return (
    <motion.div className="GatchaPage">
        <motion.div className="MallTitle">Mall</motion.div>
        <motion.div className="BannerOptionPage">
            <BannerOptions num={0} bannerType={'Crime City'}/>
        </motion.div>
        <motion.image className='BannerBackground'/>
        <motion.div className="GatchaMachine">
            {/* <motion.img className="GatchaMachine" src={images.gatchaMachine} /> */}
            <motion.div
                whileHover={{ scale: 1.05 }}
                className="GatchaRollButton"
                onClick= {() => {
                    GatchaRoll();
                }}
            >
                roll
            </motion.div>
            <motion.div className="GatchaRollResult">{skinRolled}</motion.div>
        </motion.div>
        
        <motion.div className='BackButton'
                onClick={() => BackToMenu()} whileHover={{ scale: 1.1 }}> 
            Back 
        </motion.div>
    </motion.div>
  );
}

export default Gatcha;
