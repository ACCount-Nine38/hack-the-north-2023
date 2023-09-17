import "./Mode.css";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import images from "./images";
import MatchMakingEngine from './MatchMakingEngine.js';
// TODO: Remove this explicit use of firebase auth and pass the user id across the screens
import { getAuth } from 'firebase/auth';

const categories = {
  Competitive: {
    title: "Competitive",
    category: "Category",
    activeIcon: images.white_king,
    unactiveIcon: images.white_king,
    description: "Competete with credits, earn your ranks",
    gamemode: -2,
  },
  Casual: {
    title: "Casual",
    category: "Category",
    activeIcon: images.white_queen,
    unactiveIcon: images.white_queen,
    description: "Play with fun, not fire",
    gamemode: -2,
  },
  Bots: {
    title: "Bot",
    category: "Category",
    activeIcon: images.white_pawn,
    unactiveIcon: images.white_pawn,
    description: "Our bot will kick your ass",
    gamemode: -2,
  },
};

const modes = {
  CompetitiveStandard: {
    title: "Standard",
    category: "Competitive",
    activeIcon: images.black_king,
    unactiveIcon: images.white_king,
    description: "Our bot will kick your ass",
    gamemode: 21,
  },
  CompetitiveKnifeFight: {
    title: "Knife Fight",
    category: "Competitive",
    activeIcon: images.black_king,
    unactiveIcon: images.white_king,
    description: "Our bot will kick your ass",
    gamemode: 22,
  },
  CasualStandard: {
    title: "Standard",
    category: "Casual",
    activeIcon: images.black_king,
    unactiveIcon: images.white_king,
    description: "Our bot will kick your ass",
    gamemode: 11,
  },
  CasualKnifeFight: {
    title: "Knife Fight",
    category: "Casual",
    activeIcon: images.black_king,
    unactiveIcon: images.white_king,
    description: "Our bot will kick your ass",
    gamemode: 12,
  },
  CasualSearch: {
    title: "Search Opponent",
    category: "Casual",
    activeIcon: images.black_king,
    unactiveIcon: images.white_king,
    description: "Our bot will kick your ass",
    gamemode: 13,
  },
  BotStandard: {
    title: "Standard",
    category: "Bot",
    activeIcon: images.black_king,
    unactiveIcon: images.white_king,
    description: "Our bot will kick your ass",
    gamemode: 1,
  },
  BotKnifeFight: {
    title: "Knife Fight",
    category: "Bot",
    activeIcon: images.black_king,
    unactiveIcon: images.white_king,
    description: "Our bot will kick your ass",
    gamemode: 2,
  },
  BotDummy: {
    title: "Dummy",
    category: "Bot",
    activeIcon: images.black_king,
    unactiveIcon: images.white_king,
    description: "Our bot will kick your ass",
    gamemode: 0,
  },
};

const animations = {
  // animation entry
  initial: {
    opacity: [0, 1],
    scale: [1.1, 1],
    x: [0],
    transition: {
      duration: 0.5,
      ease: "easeIn",
    },
  },

  none: {},

  // initializd stale animation
  default: {
    opacity: 1,
    scale: 1,
    x: [0],
    transition: {
      duration: 0.25,
      ease: "easeInOut",
    },
  },

  // exit animation
  exit: {
    opacity: 0,
    scale: 0.5,
    transition: {
      duration: 0.25,
      ease: "easeInOut",
    },
  },

  select: {
    opacity: 1,
    scale: 1.05,
    transition: {
      duration: 0.25,
      ease: "easeInOut",
    },
  },

  unselect: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: "easeInOut",
    },
  },
};

const titleAnimations = {
  initial: {
    y: ["-200%", "0%"],
    transition: {
      duration: 0.25,
      ease: "easeInOut",
    },
  },

  exit: {
    y: "-200%",
    transition: {
      duration: 0.25,
      ease: "easeInOut",
    },
  },
};

const backButtonAnimations = {
  initial: {
    y: ["300%", "0%"],
    transition: {
      duration: 0.25,
      ease: "easeInOut",
    },
  },

  exit: {
    y: "300%",
    transition: {
      duration: 0.25,
      ease: "easeInOut",
    },
  },
};

const matchButtonAnimations = {
  initial: {
    y: ["300%", "0%"],
    transition: {
      duration: 0.25,
      ease: "easeInOut",
    },
  },

  exit: {
    y: "300%",
    transition: {
      duration: 0.25,
      ease: "easeInOut",
    },
  },

  enable: {
    y: 0,
    scale: 1.1,
    transition: {
      duration: 0.1,
      ease: "easeInOut",
    },
  },

  reset: {
    y: 0,
    scale: 1,
    transition: {
      duration: 0.1,
      ease: "easeInOut",
    },
  },
};

const Category = ({
  info,
  resetCount,
  selectedMode,
  selectedGameMode,
  onSelect,
}) => {
  const [initialized, setInitialized] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [animation, setAnimation] = useState("initial");

  useEffect(() => {
    setAnimation("initial");
  }, [resetCount]);

  useEffect(() => {
    if (selectedMode === "none") {
      setAnimation("exit");
    }
  }, [selectedMode]);

  useEffect(() => {
    if (selectedGameMode === null) {
      return;
    }
    if (selectedGameMode === info.gamemode && !isSelected) {
      setIsSelected(true);
      setAnimation("select");
    } else if (selectedGameMode !== info.gamemode && isSelected) {
      setIsSelected(false);
      setAnimation("unselect");
    }
  }, [selectedGameMode, info.gamemode, isSelected]);

  return (
    <motion.div
      className="Category"
      // hover only if not selected
      whileHover={
        isSelected || selectedMode === "none"
          ? {}
          : { scale: initialized ? 1.05 : 1 }
      }
      style={{
        backgroundColor: isSelected
          ? "#A1A1A1"
          : isHovered
          ? "#BDBDBD"
          : "#CBCBCB",
      }}
      onHoverStart={() => {
        setIsHovered(true);
      }}
      onHoverEnd={() => {
        setIsHovered(false);
      }}
      onClick={() => {
        if (selectedMode === "none") return;
        if (info.category === "Category") {
          setAnimation("exit");
        } else {
          // set game mode if we are selecting modes
          onSelect(info.gamemode);
        }
      }}
      animate={animations[animation]}
      onAnimationComplete={() => {
        if (animation === "initial") {
          setAnimation("default");
          setInitialized(true);
        } else if (animation === "exit") {
          // select category if we are on menu page
          if (info.category === "Category") {
            onSelect(info.title);
          }
          setIsHovered(false);
        }
      }}
    >
      <div
        className="CategoryTitle"
        style={{ color: isSelected ? "#636363" : "#9C9C9C" }}
      >
        {info.title}
      </div>
      <img
        className="CategoryIcon"
        src={isSelected ? info.activeIcon : info.unactiveIcon}
        alt="Category"
        draggable="false"
      />
      <div
        className="CategoryDescription"
        style={{ color: isSelected ? "#636363" : "#9C9C9C" }}
      >
        {info.description}
      </div>
    </motion.div>
  );
};


function Select({setGameMode, backToMainMenu}) {
  const [backButtonState, setBackButtonState] = useState('initial');
  const [matchButtonState, setMatchButtonState] = useState('initial');
  const [selectedMode, setSelectedMode] = useState('Category');
  // -1: unselected
  // remaining game modes follow comments in Game.js
  const [selectedGameMode, setSelectedGameMode] = useState(-1);
  const [displayedModes, setDisplayedModes] = useState([]);
  const [resetCount, setResetCount] = useState(0);

  function ToMenu() {
      const exitTimer = setTimeout(() => {
          backToMainMenu()
          clearTimeout(exitTimer)
      }, 550);
  }

  useEffect(() => {
      if (selectedMode !== 'none') {
          setResetCount(prev => prev + 1);
      } 
      
      if (selectedMode === 'Category') {
          setDisplayedModes(Object.values(categories));
      } else if (selectedMode === 'Competitive') {
          const standardModes = Object.values(modes).filter(mode => mode.category === 'Competitive');
          setDisplayedModes(standardModes);
      } else if (selectedMode === 'Casual') {
          const standardModes = Object.values(modes).filter(mode => mode.category === 'Casual');
          setDisplayedModes(standardModes);
      } else if (selectedMode === 'Bot') {
          const standardModes = Object.values(modes).filter(mode => mode.category === 'Bot');
          setDisplayedModes(standardModes);
      } 
  }, [selectedMode])

  useEffect(() => {
      setMatchButtonState('enable')
  }, [selectedGameMode])

  const categoryComponents = Object.values(displayedModes).map((category, index) => {
      return <Category info={category} key={index} resetCount={resetCount} selectedMode={selectedMode} selectedGameMode={selectedGameMode}
          onSelect={category.category === 'Category' ? setSelectedMode : setSelectedGameMode}/>
  })

  return (
      <div className = "Mode">
          <motion.div className='Title' animate={titleAnimations[backButtonState]}>
              SELECT MODE
          </motion.div>
          <div className='ModeScroll' key={resetCount}>
              {categoryComponents}
          </div>
          <motion.div className='MatchButton' 
                  whileHover={selectedGameMode >= 0 ? { scale: 1.1 } : {}}
                  style = {selectedGameMode >= 0 ? { color: '#6B6B6B' } : { color: '#B0B0B0' }}
                  animate={matchButtonAnimations[matchButtonState]}
                  onClick={() => {
                      if (selectedGameMode >= 0) {
                          // call the backend to enqueue the user into matchmaking
                          const matchMatchingEngine = new MatchMakingEngine(getAuth().currentUser.uid);
                          matchMatchingEngine.queueForMatch(selectedMode.toLowerCase(), (game_id) => {
                              setBackButtonState('exit')
                              setMatchButtonState('exit')
                              setSelectedMode('none')
                              // give enough time for exit animations to finish before going to the next screen
                              // TODO: Stop the "in-queue" animation
                              const timer = setTimeout(() => {
                                  setGameMode(selectedGameMode);
                                  clearTimeout(timer)
                              }, 750);
                          }).then(() => {
                              // TODO: Create an "in-queue" animation
                              alert("ENTERED MATCHMAKING");
                          }).catch(error => {
                              alert(error);
                          })
                      }
                  }}
                  onAnimationComplete={()=>{
                      if (matchButtonState === 'enable') {
                          setMatchButtonState('reset')
                      } 
                  }}>
              MATCH
          </motion.div>
          <motion.div className='BackButton' 
                  whileHover={{ scale: 1.1 }} 
                  animate={backButtonAnimations[backButtonState]}
                  onClick={() => {
                      if (selectedMode !== "Category") {
                          setSelectedMode("Category")
                          setSelectedGameMode(-1)
                      } else {
                          ToMenu()
                      }
                  }}>
              BACK
          </motion.div>
      </div>
  );
}

export default Select;
