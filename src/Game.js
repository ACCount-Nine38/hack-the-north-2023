import './Game.css';
import Piece, { initializePieces, initializePieceCacheInfo, transitions } from './Piece.js';
import EndTurnButton from './EndTurnButton.js';
import Cell from './Cell.js';
import Equipment from './Equipment.js';
import images from './images';
import sounds from './sounds';
import { PosToCoord, CoordToPos, UpdateShootingStatus, shuffle, 
    checkLineRectIntersection, getAngle, getPointAwayFromOrigin, isPointInRectangle } from './utils.js';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Game as ChessGame } from 'js-chess-engine'
import { getLayout1, getLayoutTiles1 } from './utils.js'
import { useAuth } from './AuthContext';
import GameNetworkingEngine from "./GameNetworkingEngine";

// when switched to black / white, board will rotate
export var MY_COLOR = "white"
export var OPPONENT_COLOR = MY_COLOR === "white" ? "black" : "white";
export var BOARD_SIZE = 8

const DIRECTIONS = new Map([
    ['pawn', {directions: [[1, -1], [-1, -1]], multiStep: false}],
    ['knight', {directions: [[-1, 2], [1, 2], [-1, -2], [1, -2], [-2, 1], [2, 1], [-2, -1], [2, -1]], multiStep: false}],
    ['king', {directions: [[1, 1], [-1, -1], [1, -1], [-1, 1], [1, 0], [-1, 0], [0, 1], [0, -1]], multiStep: false}],
    ['rook',  {directions: [[1, 0], [-1, 0], [0, 1], [0, -1]], multiStep: true}],
    ['bishop',  {directions: [[1, 1], [-1, -1], [1, -1], [-1, 1]], multiStep: true}],
    ['queen',  {directions: [[1, 1], [-1, -1], [1, -1], [-1, 1], [1, 0], [-1, 0], [0, 1], [0, -1]], multiStep: true}]
])

export const EQUIPMENTS = [
    { name: 'Sniper', cost: 2500, range: 15, actionIcon: images.sniper_active, avatorIcon: images.sniper_avatar, idleAngle: -Math.PI / 5, hitForce: 100, recoil: 11, reloadSound: sounds.sniperReload, fireSound: sounds.sniperFire },
    { name: 'Rifle', cost: 1000, range: 2, actionIcon: images.rifle_active, avatorIcon: images.sniper_avatar, idleAngle: -Math.PI / 5, hitForce: 90, recoil: 8, reloadSound: sounds.rifleReload, fireSound: sounds.rifleFire },
    { name: 'Shotgun', cost: 1000, range: 1, actionIcon: images.shotgun_active, avatorIcon: images.sniper_avatar, idleAngle: -Math.PI / 5, hitForce: 100, recoil: 9, reloadSound: sounds.shotgunReload, fireSound: sounds.shotgunFire },
    { name: 'Pistol', cost: 400, range: 1, actionIcon: images.pistol_active, avatorIcon: images.pistol_avatar, idleAngle: 2 * Math.PI / 7, hitForce: 75, recoil: 5, reloadSound: sounds.pistolReload, fireSound: sounds.pistolFire },
    { name: 'Knife', cost: 50, range: 0, actionIcon: images.empty, avatorIcon: images.sniper_avatar, idleAngle: 2 * Math.PI / 7, hitForce: 0, recoil: 0, reloadSound: sounds.pistolReload, fireSound: sounds.pistolFire },
    { name: 'Vest', cost: 200, range: 0, actionIcon: images.tempGun, avatorIcon: images.sniper_avatar, idleAngle: 60, hitForce: 0, recoil: 0, reloadSound: sounds.pistolReload, fireSound: sounds.pistolFire },
];

const game = new ChessGame()

/*
Game Modes:
0 - target practice, opponent cannot move
1 - bot standard fight
2 - bot classic knife fight
11 - 1v1 standard unranked
12 - 1v1 classic knife fight unranked
13 - 1v1 find user standard unranked
13 - 1v1 find user classic knife fight unranked
21 - 1v1 standard ranked
22 - 1v1 classic knife fight ranked
*/
function Game({game_id, user_id, game_mode}) {
    const [myMoney, setMyMoney] = useState(9999);
    const [opponentMoney] = useState(9999);

    // Define the initial position of the pieces
    const [pieces, setPieces] = useState(initializePieces())
    // temporary piece info, like if its being hovered or selected
    const [cacheInfo, setCacheInfo] = useState(initializePieceCacheInfo())
    const [selectedPiece, setSelectedPiece] = useState(null);
    // control variable for checking if we can make any actions
    // usage include not allowing player to move when animation is playing
    const [allowAction, setAllowAction] = useState(false)
    const [myTurn, setMyTurn] = useState(false)

    // lit values are hints on where a piece can move to
    const [litValues, setLitValues] = useState(() => {
        const rows = new Array(BOARD_SIZE).fill(false);
        return new Array(BOARD_SIZE).fill(rows);
    })

    // control variables
    const [phase, setPhase] = useState('init')
    const [canMove, setCanMove] = useState(true)

    // **************************************
    // NETWORKING
    // **************************************

    const [game_networking_engine, setGameNetworkingEngine] = useState(null);

    useEffect(() => {
        if (game_id) {
            setGameNetworkingEngine(new GameNetworkingEngine(game_id, gameDidUpdate));
        }
    }, [game_id]);

    const gameDidUpdate = (game_state) => {
        
    }

    // **************************************
    // SCREEN SHAKE
    // **************************************

    const [shakeInfo, setShakeInfo] = useState({angle: 0, force: 0});
    const [screenShakeInfo, setScreenShakeInfo] = useState({angle: 0, force: 0});

    // shakes board
    const triggerShake = (newInfo) => {
        setShakeInfo(newInfo);
    }

    // shakes screen
    const triggerScreenShake = (newInfo) => {
        setScreenShakeInfo(newInfo);
    }

    const shakeVariants = {
        shake: {
            opacity: [1],
            scale: [1],
            x: ['0%', `${Math.floor(Math.cos(shakeInfo.angle) * shakeInfo.force)}%`, '0%'],
            y: ['0%', `${Math.floor(Math.sin(shakeInfo.angle) * shakeInfo.force)}%`, '0%'],
            transition: {
                duration: 0.25,
                ease: 'easeIn'
            },
        },
        hidden: {
            opacity: 0,
            scale: 2,
        },
        stopShake: {
            opacity: 1, 
            scale: 1,
            x: 0,
            y: 0,
            transition: {
                duration: 0.5,
            },
        },
    }

    const screenShakeVariants = {
        shake: {
            x: `${Math.floor(Math.cos(screenShakeInfo.angle) * screenShakeInfo.force)}%`,
            y: `${Math.floor(Math.sin(screenShakeInfo.angle) * screenShakeInfo.force)}%`,
            transition: {
                x: { duration: 0.05, ease: 'easeIn' },
                y: { duration: 0.05, ease: 'easeIn' },
            },
        },
        stopShake: {
            x: '0%',
            y: '0%',
            transition: {
                duration: 1, ease: 'easeOut'
            },
        },
        hidden: {
            opacity: 0,
            scale: 2,
        },
    }

    const profileAnimation = {
        initial: {
            opacity: 0,
        },
        opponentEntrance: {
            opacity: 1,
            scale: 1, 
            y: ['-200%', '0%'],
            transition: {
                duration: 0.5, ease: 'easeInOut'
            },
        },
        myEntrance: {
            opacity: 1,
            scale: 1, 
            y: ['200%', '0%'],
            transition: {
                duration: 0.5, ease: 'easeInOut'
            },
        }
    }

    // mouse position update
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [canUpdateMouse, setCanUpdateMouse] = useState(true)

    // get the user loadouts
    // const { currentUser, didLogIn, didRegister, logOut, authEngine } = useAuth();
    // const [ gameCustomizationEngine, setGameCustomizationEngine ] = useState(null)
    // const [ myLayout, setMyKayout ] = useState(getLayout1())
    // useEffect(() => {
    //     setGameCustomizationEngine(new GameCustomizationEngine(currentUser, (layout1, layoutTiles1) => {
    //         setMyKayout(layout1)
    //     }));
    // }, [])
    
    // useEffect(() => {
    //     console.log()
    // }, [myLayout])

    const handleMouseMove = (event) => {
        if (phase === 'init' || !canUpdateMouse) return
        const { clientX, clientY } = event;
        setMousePosition({ x: clientX, y: clientY });
        setCanUpdateMouse(false)
    }

    useEffect(() => {
        let debounceDelay = 150; // Adjust the delay time as needed
        if (phase === 'fire') debounceDelay = 1
      
        const timer = setTimeout(() => {
            setCanUpdateMouse(true)
        }, debounceDelay);
      
        return () => clearTimeout(timer);
    }, [canUpdateMouse, phase]);

    let PROMOTIONS = [
        {type:'rook', image: images.white_rook}, 
        {type:'knight', image: images.white_knight}, 
        {type:'bishop', image: images.white_bishop}, 
        {type:'queen', image: images.white_queen}
    ]

    if (MY_COLOR === 'black') {
        PROMOTIONS = [
            {type:'rook', image: images.black_rook}, 
            {type:'knight', image: images.black_knight}, 
            {type:'bishop', image: images.black_bishop}, 
            {type:'queen', image: images.black_queen}
        ]
    }

    // **************************************
    // helper function for chess pieces
    // **************************************

    const UpdatePos = useCallback((idx, newPos, botOrCastle = false) => {
        if (!botOrCastle) {
            if (game_mode === 2) game.move(pieces[idx].position, newPos)
            
            if (selectedPiece != null) {
                selectedPiece.position = newPos
                setSelectedPiece(selectedPiece)
            }
        }
        pieces[idx].position = newPos
        if (pieces[idx].type === 'rook' || pieces[idx].type === 'king') {
            pieces[idx].canCastle = false;
        }
        setPieces(pieces);
    }, [selectedPiece, pieces, game_mode])

    const UpdateRecoil = useCallback((idx, angle) => {
        cacheInfo[idx].recoilAngle = angle
        setCacheInfo(cacheInfo)
    }, [cacheInfo])

    // updates the status of piece with idx to newPos
    const UpdateType = useCallback((idx, newType) => {
        pieces[idx].type = newType
        setPieces(pieces)
    }, [pieces])

    // updates the status of piece with idx to newPos to false
    // destroyStatus = 1: alive
    // destroyStatus = 0: destroy by knife
    // destroyStatus = -1: destroy by guns
    const UpdateStatus = useCallback((idx, pos, weapon, destroyStatus) => {
        if (idx === -1) return
        if (pieces[idx].vest && weapon !== 'Knife') {
            pieces[idx].vest = false;
        } else {
            pieces[idx].status = false;
            cacheInfo[idx].sourcePiece = {sourcePos: pos, sourceWeapon: weapon, status: destroyStatus};
            setCacheInfo(cacheInfo)
        }
        setPieces(pieces)
    }, [cacheInfo, pieces])

    const UpdateShiver = useCallback((inRangePieceIdxes) => {
        for (let i = 0; i < cacheInfo.length; ++i) {
            cacheInfo[i].shiver = false;
        }
        for (let i = 0; i < inRangePieceIdxes.length; ++i) {
            cacheInfo[inRangePieceIdxes[i]].shiver = true;
        }
        setCacheInfo(cacheInfo)
    }, [cacheInfo])

    // set hover to true for the given index
    function SetHover(idx) {
        if (phase === 'init' || !allowAction || !canMove || !myTurn) return
        for (let i = 0; i < cacheInfo.length; ++i) cacheInfo[i].hover = false
        if (idx === -1) {
            setCacheInfo(cacheInfo)
            return
        }
        cacheInfo[idx].hover = true
        setCacheInfo(cacheInfo)
    }

    // selects the piece at the given index
    const SelectPiece = useCallback((idx) => {
        if (!myTurn) return
        for (let i = 0; i < cacheInfo.length; ++i) cacheInfo[i].selected = false
        if (idx === -1) {
            setCacheInfo(cacheInfo)
            setSelectedPiece(null)
            return
        }
        sounds.pieceSelect.play();
        cacheInfo[idx].selected = true
        setSelectedPiece(pieces[idx])
        setCacheInfo(cacheInfo)
    }, [cacheInfo, pieces, myTurn])

    const AttemptDeselect = useCallback(() => {
        if ((phase !== 'buy' && phase !== 'move') || !allowAction) {
            return
        }
        const chessBoard = document.getElementById('ChessBoard')
        const bound = chessBoard.getBoundingClientRect()
        if (!isPointInRectangle([mousePosition.x, mousePosition.y], [bound.left, bound.top, bound.width, bound.height])) {
            SelectPiece(-1)
        }
    }, [SelectPiece, mousePosition, phase, allowAction])

    // returns the piece at a coordinate x, y, null if there are nothing
    const GetPiece = useCallback((pieces, col, row) => {
        for (let i = 0; i < pieces.length; ++i) {
            let [ x, y ] = PosToCoord(pieces[i].position)
            if (pieces[i].status && x === col && y === row) {
                return pieces[i]
            }
        }
        return null
    }, [])

    useEffect(() => {
        if (phase === 'init') return
        if (game_mode === 0) {
            setCanMove(true)
        } 
    }, [game_mode, phase])

    const EnterBuyPhase = useCallback(() => {
        SelectPiece(-1)
        setCanMove(false)
        setPhase('buy')
        UpdateShiver([])
    }, [SelectPiece, UpdateShiver])
    
    // **************************************
    // Bot AI
    // **************************************

    const KnifeBotMove = useCallback(() => {
        // bot knife fight
        const timer = setTimeout(() => {
            const aiMoveResult = game.aiMove()
            const from = Object.keys(aiMoveResult)[0]; 
            const to = aiMoveResult[from];
            
            const [ x, y ] = PosToCoord(from)
            const [newX, newY] = PosToCoord(to)
            const piece = GetPiece(pieces, x, y)
            let moveType = null

            moveType = piece.type
            const destroyedPiece = GetPiece(pieces, newX, newY)
            if (destroyedPiece != null) {
                UpdateStatus(destroyedPiece.idx, piece.position, piece.weapon, 0)
            }
            if (piece.type === 'king' && Math.abs(newX - x) === 2) {
                // castle
                if (newX > x) {
                    const rook = GetPiece(pieces, BOARD_SIZE - 1, y)
                    if (rook != null) {
                        const newRookPos = CoordToPos(x + 1, y)
                        UpdatePos(rook.idx, newRookPos, true)
                    }
                } else {
                    const rook = GetPiece(pieces, 0, y)
                    if (rook != null) {
                        const newRookPos = CoordToPos(x - 1, y)
                        UpdatePos(rook.idx, newRookPos, true)
                    }
                }
            }
            UpdatePos(piece.idx, to, true)
            
            const timer2 = setTimeout(() => {
                // test for pawn promotion, note that player's side is always at the bottom
                if (piece != null && newY === BOARD_SIZE - 1 && moveType != null && moveType === 'pawn') {
                    UpdateType(piece.idx, 'queen')
                }
                setCanMove(true)
                setMyTurn(true)
                clearTimeout(timer2)
            }, 600)
            clearTimeout(timer)
        }, 500);
    }, [GetPiece, UpdatePos, UpdateStatus, UpdateType, pieces])

    const EndTurn = useCallback(() => {
        if (!myTurn || phase !== 'buy') return
        SelectPiece(-1)
        setPhase('move')
        setMyTurn(false)
        if (game_mode === 0) {
            setMyTurn(true)
        } else if (game_mode === 2) {
            KnifeBotMove()
        }
    }, [SelectPiece, game_mode, KnifeBotMove, myTurn, phase])

    const hasRun = useRef(false);
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === ' ' && phase === 'buy') EndTurn()
        }
        
        if (!hasRun.current) {
            hasRun.current = true;
            if (phase === 'init') {
                // set to move phase after 2 seconds of initialization
                const timer = setTimeout(() => {
                    setPhase('move')
                    setAllowAction(true)
                    clearTimeout(timer);
                    if (MY_COLOR === 'white') {
                        setMyTurn(true)
                        setCanMove(true)
                    } else {
                        setCanMove(true)
                        setMyTurn(false)
                        KnifeBotMove()
                    }
                }, 4000);
            }
        }
        
        window.addEventListener('keydown', handleKeyDown)
        return () => { window.removeEventListener('keydown', handleKeyDown) }
    }, [phase, game_mode, EndTurn, KnifeBotMove])


    // returns true if the given kingX kingY results in checkmate, aka kingX, kingY is a checkmate position
    const CheckmatePos = useCallback((pieces, kingX, kingY) => {
        let foundCheckmatePos = false;
        // loop through each direction, starting from the king, see if there is a possible unit that checkmates the king
        /*
            Demo:
                White King              Black Rook
            White king will check from its current location, if there is an enemy rook that can reach it
            if so, then it is a checkmate position
        */
        DIRECTIONS.forEach((value, key) => {
            let type = key
            let directions = value.directions
            let multiStep = value.multiStep
            directions.forEach((dir) => {
                let x = kingX + dir[0]
                let y = kingY + dir[1]
                if (multiStep) {
                    // if the piece can walk more than one step (i.e bishop, rook, queen)
                    while (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
                        let piece = GetPiece(pieces, x, y)
                        if (piece != null) {
                            if (piece.color !== MY_COLOR && piece.type === type) {
                                foundCheckmatePos = true
                            }
                            return
                        } 
                        x += dir[0]
                        y += dir[1]
                    }
                } else {
                    // if the piece can walk only one step (i.e knight, king, pawn)
                    let piece = GetPiece(pieces, x, y)
                    if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE && 
                        piece != null && piece.color !== MY_COLOR && piece.type === type) {
                            foundCheckmatePos = true
                            return 
                    }
                }
            })
            if (foundCheckmatePos) return 
        })
        return foundCheckmatePos
    }, [GetPiece]);

    // returns true if your move of piece with pieceIdx to newX newY results in checkmate
    const IsCheckmate = useCallback((pieceIdx, newX, newY) => {
        let tempPieces = JSON.parse(JSON.stringify(pieces))
        // temp piece is not null if there is a piece at the new X and new Y
        let tempPiece = GetPiece(tempPieces, newX, newY)
        if (tempPiece != null) {
            tempPieces[tempPiece.idx].status = false
        }
        tempPieces[pieceIdx].position = CoordToPos(newX, newY)
        let kingLocation = [];
        tempPieces.forEach((piece) => {
            if (piece.type === 'king' && piece.color === MY_COLOR) {
                kingLocation = piece.position
            }
        })
        let [ x, y ] = PosToCoord(kingLocation)
        let checkmate = CheckmatePos(tempPieces, x, y)

        return checkmate
    }, [pieces, CheckmatePos, GetPiece]);

    // returns true if castling results in checkmate
    // require: castle step is allowed (before checkmate)
    const IsCastleCheckmate = useCallback((kingIdx, newKingX, newKingY, rookIdx, newRookX, newRookY) => {
        let tempPieces = JSON.parse(JSON.stringify(pieces))
        tempPieces[kingIdx].position = CoordToPos(newKingX, newKingY)
        tempPieces[rookIdx].position = CoordToPos(newRookX, newRookY)

        let kingLocation = tempPieces[kingIdx].position
        let [ x, y ] = PosToCoord(kingLocation)
        let checkmate = CheckmatePos(tempPieces, x, y)

        if (checkmate) return true

        // cannot castle if any path king travels is checked
        tempPieces[kingIdx].position = CoordToPos(newRookX, newRookY)
        tempPieces[rookIdx].position = CoordToPos(newKingX, newKingY)

        kingLocation = tempPieces[kingIdx].position
        let [ newX, newY ] = PosToCoord(kingLocation)
        checkmate = CheckmatePos(tempPieces, newX, newY)

        return checkmate
    }, [pieces, CheckmatePos]);

    // returns all the positions that the given piece can attack towards
    // note, pawns moving forward does not count as attack since it cannot take down pieces
    // note, a piece cannot take an opponent piece directly in the move turn if it has a gun
    const GetAttackPos = useCallback((piece) => {
        if (canMove === false) return []
        let possiblePositions = []
        let directions = DIRECTIONS.get(piece.type).directions
        if (piece.type === 'pawn') {
            directions.forEach((dir) => {
                // current coordinate to the board
                let [ x, y ] = PosToCoord(piece.position)
                x += dir[0]
                y += dir[1]
                if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE && !IsCheckmate(piece.idx, x, y) && piece.weapon === 'Knife') {
                    let tempPiece = GetPiece(pieces, x, y)
                    if (tempPiece != null && tempPiece.color !== MY_COLOR) {
                        possiblePositions.push([x, y])
                    }
                }
            })
        } else if (piece.type === 'knight') {
            directions.forEach((dir) => {
                // current coordinate to the board
                let [ x, y ] = PosToCoord(piece.position)
                x += dir[0]
                y += dir[1]
                let tempPiece = GetPiece(pieces, x, y)
                if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE && !IsCheckmate(piece.idx, x, y) && 
                    (tempPiece == null || (tempPiece.color !== MY_COLOR && piece.weapon === 'Knife'))) {
                        possiblePositions.push([x, y])
                }
            })
        } else if (piece.type === 'king') {
            directions.forEach((dir) => {
                // current coordinate to the board
                let [ x, y ] = PosToCoord(piece.position)
                x += dir[0]
                y += dir[1]
                let tempPiece = GetPiece(pieces, x, y)
                if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE && !IsCheckmate(piece.idx, x, y) && 
                    (tempPiece == null || (tempPiece.color !== MY_COLOR && piece.weapon === 'Knife'))) {
                        possiblePositions.push([x, y])
                }
            })
        } else {
            directions.forEach((dir) => {
                // current coordinate to the board
                let [ x, y ] = PosToCoord(piece.position)
                x += dir[0]
                y += dir[1]
                while (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
                    if (!IsCheckmate(piece.idx, x, y)) {
                        let tempPiece = GetPiece(pieces, x, y)
                        if (tempPiece != null) {
                            if (tempPiece.color !== MY_COLOR && piece.weapon === 'Knife') possiblePositions.push([x, y])
                            break
                        } else {
                            possiblePositions.push([x, y])
                        }
                    }
                    x += dir[0]
                    y += dir[1]
                }
            })
        } 
        return possiblePositions
    }, [GetPiece, IsCheckmate, canMove, pieces]);

    // **************************************
    // Cell Interactions
    // **************************************

    // onclick for the cells
    const handlePieceClick = (position) => {
        if ((phase !== 'move' && phase !== 'buy') || !allowAction) return
        // found indicates if the cell you are moving to has an active piece
        let found = false
        // keep track of the enemy piece to see if it has been destroyed
        let selectedPieceIdx = 0
        let opponentPiece = false
        for (let i = 0; i < pieces.length; ++i) {
            if (pieces[i].status && pieces[i].position === position) {
                found = true
                selectedPieceIdx = i
                if (pieces[i].color !== MY_COLOR) opponentPiece = true
                break;
            }
        }
        let [ x, y ] = PosToCoord(position)
        if (phase === 'buy') {
            // we do not allow move during buy phase
            if (found && !opponentPiece) SelectPiece(selectedPieceIdx)
            return
        }
        if (!found) {
            // move to [x, y] if lit
            if (selectedPiece != null) {
                if (litValues[y][x]) {
                    setAllowAction(false)
                    UpdatePos(selectedPiece.idx, position)
                    const updateTimer = setTimeout(() => {
                        if (selectedPiece.type === 'pawn' && (y === 0 || y === BOARD_SIZE - 1)) setPhase('promote')
                        else if (selectedPiece.weapon === 'Knife') {
                            EnterBuyPhase()
                        }
                        else setFirePhase()
                        setAllowAction(true)
                        clearTimeout(updateTimer)
                    }, (transitions['lifted']['duration'] + transitions['moved']['duration']) * 1000 + 400);
                } else {
                    // not allowed to move here, cell not lit
                    SelectPiece(-1)
                }
            }
        } else {
            // if we selected our own piece
            if (!opponentPiece) {
                // castle logic
                if (found && selectedPiece != null && selectedPiece.type === 'king' && litValues[y][x]) {
                        let tempPiece = pieces[selectedPieceIdx]
                        if (tempPiece.type === 'rook' && tempPiece.canCastle && 
                            tempPiece.color === MY_COLOR) {
                                let [ kingX, kingY ] = PosToCoord(selectedPiece.position)
                                let [ rookX, rookY ] = PosToCoord(tempPiece.position)
                                // we can only castle if it does not result in checkmate
                                if (rookX < kingX && !IsCastleCheckmate(selectedPiece.idx, kingX - 2, kingY, tempPiece.idx, kingX - 1, rookY)) {
                                    let newKingPos = CoordToPos(kingX - 2, kingY)
                                    let newRookPos = CoordToPos(kingX - 1, rookY)
                                    UpdatePos(tempPiece.idx, newRookPos, true)
                                    UpdatePos(selectedPiece.idx, newKingPos)
                                } else if (rookX > kingX && !IsCastleCheckmate(selectedPiece.idx, kingX + 2, kingY, tempPiece.idx, kingX + 1, rookY)) {
                                    let newKingPos = CoordToPos(kingX + 2, kingY)
                                    let newRookPos = CoordToPos(kingX + 1, rookY)
                                    UpdatePos(tempPiece.idx, newRookPos, true)
                                    UpdatePos(selectedPiece.idx, newKingPos)
                                }
                                EnterBuyPhase()
                        }
                } else {
                    // set to your new selected piece
                    SelectPiece(selectedPieceIdx)
                }
            } else {
                let [ x, y ] = PosToCoord(position)
                if (litValues[y][x]) {
                    setAllowAction(false)
                    let sourcePiece = { ...selectedPiece } // create a copy of selected piece
                    UpdatePos(selectedPiece.idx, position)
                    UpdateStatus(selectedPieceIdx, sourcePiece.position, sourcePiece.weapon, 0)
                    const updateTimer = setTimeout(() => {
                        if (selectedPiece.type === 'pawn' && (y === 0 || y === BOARD_SIZE - 1)) {
                            setPhase('promote')
                        } else if (selectedPiece.weapon === 'Knife')
                            EnterBuyPhase()
                        else {
                            setFirePhase()
                        }
                        setAllowAction(true)
                        clearTimeout(updateTimer)
                    }, (transitions['lifted']['duration'] + transitions['moved']['duration']) * 1000 + 400);
                }
            }
        }
    }

    const handlePieceHover = (position) => {
        if ((phase !== 'move' && phase !== 'buy') || !allowAction || !canMove || !myTurn) return
        let [ x, y ] = PosToCoord(position)
        let hoveredPiece = GetPiece(pieces, x, y)
        if (hoveredPiece != null) SetHover(hoveredPiece.idx)
        else SetHover(-1) // reset hover
    }

    function ToggleLits(positions, reset = false) {
        if (reset) {
            setLitValues(prevLitValues => {
                const newLitValues = prevLitValues.slice()
                for (let i = 0; i < BOARD_SIZE; ++i) {
                    newLitValues[i] = newLitValues[i].slice()
                    for (let j = 0; j < BOARD_SIZE; ++j) {
                        newLitValues[i][j] = false
                    }
                }
                return newLitValues;
            });
        } else {
            setLitValues(prevLitValues => {
                const newLitValues = prevLitValues.slice()
                for (const [col, row] of positions) {
                    newLitValues[row] = newLitValues[row].slice()
                    newLitValues[row][col] = true;
                }
                return newLitValues;
            });
        }
    }
    
    // occures everytime when selectedPiece changes
    // updates the list of possible locations that the piece can move to and update lit values
    useEffect(() => {
        // clear previous lit
        ToggleLits([], true)
        if (selectedPiece == null || phase !== 'move' || !allowAction|| !myTurn) return

        // CHESS PIECE RULES
        let possiblePositions = GetAttackPos(selectedPiece)
        if (selectedPiece.type === 'pawn') {
            let [ x, y ] = PosToCoord(selectedPiece.position)
            // cannot move if there is a piece above
            let pieceAbove = GetPiece(pieces, x, y - 1)
            // pawn can move at least one cell up if its empty
            if (pieceAbove == null) {
                if (y - 1 >= 0 && !IsCheckmate(selectedPiece.idx, x, y - 1)) {
                    possiblePositions.push([x, y - 1])
                }
                // pawn can move up an additional cell if it is in its own half of the board
                if (y === 6 && !IsCheckmate(selectedPiece.idx, x, y - 2)) {
                    possiblePositions.push([x, y - 2])
                }
            }
        } else if (selectedPiece.type === 'king' && selectedPiece.canCastle) {
            let [ x, y ] = PosToCoord(selectedPiece.position)
            let directions = [1, -1]
            directions.forEach((dir) => {
                for (let i = dir; i <= 5 && i >= -5; i += dir) {
                    if (x + i < 0 || x + i >= BOARD_SIZE) break
                    let tempPiece = GetPiece(pieces, x + i, y)
                    if (tempPiece != null) {
                        if (tempPiece.type === 'rook' && tempPiece.color === MY_COLOR && tempPiece.canCastle 
                                && ((x + i > x && !IsCastleCheckmate(selectedPiece.idx, x + 2, y, tempPiece.idx, x + 1, y)) 
                                    || (x + i < x && !IsCastleCheckmate(selectedPiece.idx, x - 2, y, tempPiece.idx, x - 1, y)))) {
                            possiblePositions.push([x + i, y])
                        } else {
                            break
                        }
                    }
                }
            })
        }
        ToggleLits(possiblePositions)
    }, [selectedPiece, GetPiece, GetAttackPos, IsCheckmate, IsCastleCheckmate, phase, allowAction, myTurn, pieces])

    const handleEquip = (item) => {
        if (!selectedPiece) return;

        const equipped = selectedPiece.weapon === item.name || (item.name === 'Vest' && selectedPiece.vest);
        
        if (!equipped && myMoney >= item.cost) {
            sounds.purchaseEquipment.play();
            setMyMoney((prevMoney) => prevMoney - item.cost)
            if (item.name === 'Vest') {
                pieces[selectedPiece.idx].vest = true
                setSelectedPiece((prevSelectedPiece) => ({
                    ...prevSelectedPiece,
                    vest: true,
                }));
            } else {
                pieces[selectedPiece.idx].weapon = item.name
                setSelectedPiece((prevSelectedPiece) => ({
                    ...prevSelectedPiece,
                    weapon: item.name,
                }));
            }
        }
    };

    // handle mouse click during different game phases
    useEffect(() => {
        const handleClick = () => {
            if (phase === 'fire' && selectedPiece != null) {
                ToggleLits([], true)
                const equipment = EQUIPMENTS.find((equipment) => equipment.name === selectedPiece.weapon)
                equipment.fireSound.play()

                // handles gun firing logic
                const selectedId = 'piece' + selectedPiece.idx
                const selected = document.getElementById(selectedId);
                const selectedRect = selected.getBoundingClientRect();
                const originX = selectedRect.left + selectedRect.width / 2
                const originY = selectedRect.top + selectedRect.height / 2

                // angle in degrees so its easier to set
                let shootAngle = getAngle({x: originX, y: originY}, {x: mousePosition.x, y: mousePosition.y})
                let targetPos = getPointAwayFromOrigin(originX, originY, shootAngle, window.innerHeight)

                let inRangePieces = []
                for (let i = 0; i < pieces.length; ++i) {
                    // skip the current piece
                    if (pieces[i].idx === selectedPiece.idx || pieces[i].status === false) continue

                    const pieceId = 'piece' + pieces[i].idx
                    const piece = document.getElementById(pieceId)
                    const pieceRect = piece.getBoundingClientRect()
                    const rectXOffset = pieceRect.left + pieceRect.width / 4
                    const rectYOffset = pieceRect.top + pieceRect.height / 4
                    const rectWidth = pieceRect.width / 2
                    const rectHeight = pieceRect.height / 2

                    if (selectedPiece.weapon === 'Shotgun') {
                        for (let j = 0; j < 3; ++j) {
                            let tempTargetPos = getPointAwayFromOrigin(originX, originY, shootAngle - 35 + j * 35, window.innerHeight)
                            if (checkLineRectIntersection(originX, originY, tempTargetPos.x, tempTargetPos.y, rectXOffset, rectYOffset, rectWidth, rectHeight)) {
                                inRangePieces.push({idx: pieces[i].idx, position: pieces[i].position})
                            }
                        }
                    } else {
                        if (checkLineRectIntersection(originX, originY, targetPos.x, targetPos.y, rectXOffset, rectYOffset, rectWidth, rectHeight)) {
                            inRangePieces.push({idx: pieces[i].idx, position: pieces[i].position})
                        }
                    }
                }

                // perform recoil animation
                let recoilShootAngle = (shootAngle + 180) * Math.PI / 180
                if (recoilShootAngle > Math.PI) recoilShootAngle -= Math.PI * 2
                if (recoilShootAngle > Math.PI) recoilShootAngle -= Math.PI * 2
                UpdateRecoil(selectedPiece.idx, recoilShootAngle)
                const recoilTimer = setTimeout(() => {
                    UpdateRecoil(selectedPiece.idx, -999)
                    clearTimeout(recoilTimer)
                }, 1500);
                const recoil = equipment.recoil
                
                // screenshake animation
                triggerScreenShake({angle: shootAngle * Math.PI / 180, force: recoil})

                // gets the piece being hit and disables it
                let hitIdxes = UpdateShootingStatus(selectedPiece.weapon, selectedPiece.position, inRangePieces)

                let sourcePiece = { ...selectedPiece } // create a copy of selected piece

                // the function only returns one result if its not shotgun
                const statusTimer = setTimeout(() => {
                    hitIdxes.forEach((hitIdx) => {
                        UpdateStatus(hitIdx, sourcePiece.position, sourcePiece.weapon, -1)
                    });
                    clearTimeout(statusTimer)
                }, 50);

                EnterBuyPhase()
            }
        };

        document.addEventListener('click', handleClick);

        return () => {
            document.removeEventListener('click', handleClick);
        };
    }, [pieces, selectedPiece, mousePosition, phase, EnterBuyPhase, UpdateRecoil, UpdateStatus]);

    // ************************************
    // COMPONENTS FOR RENDERING
    // ************************************

    // creating the 8 by 8 chess board
    const cellComponents = () => {
        // initialization code
        const newCells = [];
        for (let i = 0; i < BOARD_SIZE; i++) {
            newCells.push([])
            for (let j = 0; j < BOARD_SIZE; j++) {
                // triditional chess grid unit is used, i.e. A8 -> row 8 column A
                const cellStyle = {
                    backgroundColor: (i + j) % 2 === 1 ? '#CBCBCB' : '#D9D9D9'
                }
                let cellId = 'cell' + (i * BOARD_SIZE + j)
                let pos = CoordToPos(j, i)
                newCells[i].push(<Cell lit = {litValues[i][j]} location = {pos} 
                    cellStyle = {cellStyle} key = {pos} id = {cellId} 
                    onClick = {() => handlePieceClick(pos)}
                    onMouseEnter = {() => handlePieceHover(pos)}/>)
            }
        }
        return newCells
    };

    // Generate an array from 1 to 16
    let order = Array.from({length: pieces.length / 2}, (_, i) => i + 1);
    let white_order = shuffle(order)
    let black_order = shuffle(white_order)

    // Create a component for each piece
    // pieces will take every 2nd layer based on y, equipement overlay will take the layers adjacent to it
    const pieceComponents = pieces.map((piece, index) => {
        // during init, we want to set the z index so falling pieces will have an order of depth
        let randOrder = 0
        if (phase === 'init') {
            // select a random drop sequence for the pieces falling from the sky :)
            if (piece.color === 'black') {
                randOrder = black_order[piece.idx]
            } else {
                randOrder = white_order[piece.idx - pieces.length / 2]
            }
        }
        return (
            <Piece key = {index} info = {piece} cache = {cacheInfo[piece.idx]} phase = {phase} dropOrder = {randOrder} triggerShake = {triggerShake}
                mousePos={mousePosition} selectedPieceIdx={selectedPiece == null ? -1 : selectedPiece.idx}/>
        );
    })

    const equiptmentShop = EQUIPMENTS.map((item) => {
        if (selectedPiece == null || phase !== 'buy') return null;
        
        return (
          <Equipment key={item.name} equiptment={item} selectedPiece={selectedPiece} onClick={() => handleEquip(item)}/>
        )
    })

    function setFirePhase() {
        setPhase('fire')
        const equipment = EQUIPMENTS.find((equipment) => equipment.name === selectedPiece.weapon)
        equipment.reloadSound.play()
        let shiverIdxes = []
        for (let i = 0; i < pieces.length; ++ i) {
            let [x, y] = PosToCoord(selectedPiece.position)
            let [pieceX, pieceY] = PosToCoord(pieces[i].position)
            if (pieces[i].status === true && pieces[i].idx !== selectedPiece.idx && pieces[i].color !== selectedPiece.color
                    && Math.abs(pieceX - x) <= equipment.range && Math.abs(pieceY - y) <= equipment.range) {
                let surrounded = true
                let dir = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]
                // dont shiver blocked enemies
                for (let j = 0; j < dir.length; ++j) {
                    const tempX = pieceX + dir[j][0]
                    const tempY = pieceY + dir[j][1]
                    if (tempX < 0 || tempX >= BOARD_SIZE || tempY < 0 || tempY >= BOARD_SIZE) continue
                    const tempPiece = GetPiece(pieces, tempX, tempY)
                    if (tempPiece == null || (tempPiece != null && tempPiece.idx === selectedPiece.idx)) {
                        surrounded = false
                    }
                }
                if (!surrounded) shiverIdxes.push(pieces[i].idx)
            }
        }
        UpdateShiver(shiverIdxes)
    }

    function getPromotions() {
        if (phase !== 'promote') {
            return null
        }
        // handles the promotion action given the selected pawn index and promotion option
        const promote = (promotion, idx) => {
            // safe check for a pawn promotion
            if (pieces[idx].type !== 'pawn') return
            if (game_mode === 2) {
                let FENNotation = 'Q'
                if (MY_COLOR === 'white') {
                    FENNotation = 'Q'
                    if (promotion === 'knight') FENNotation = 'N'
                    else if (promotion === 'bishop') FENNotation = 'B'
                    else if (promotion === 'rook') FENNotation = 'R'
                } else {
                    FENNotation = 'q'
                    if (promotion === 'knight') FENNotation = 'n'
                    else if (promotion === 'bishop') FENNotation = 'b'
                    else if (promotion === 'rook') FENNotation = 'r'
                }
                game.setPiece(pieces[idx].position, FENNotation)
            }
            UpdateType(idx, promotion)
            if (selectedPiece.weapon === 'Knife') EnterBuyPhase()
            else {
                const timer = setTimeout(() => {
                    setFirePhase()
                    clearTimeout(timer);
                }, 50);
            }
        }
        return (
            <div className='PromotionBoard'>
                {PROMOTIONS.map((promotion, index) => (
                    <div className="PromotionPiece" style={{backgroundColor: index % 2 === 0 ? '#CBCBCB' : '#D9D9D9'}} key={'promote' + index} onClick = {() => promote(promotion.type, selectedPiece.idx)}>
                        <img className='PieceImage' src={promotion.image} alt='promotion'></img>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className = "Game" onMouseMove={handleMouseMove} onClick={AttemptDeselect}>
            <motion.div className = "Inner" initial="stopShake"
                        animate={screenShakeInfo.force !== 0 ? "shake" : "stopShake"}
                        onAnimationComplete={() => {
                            if (screenShakeInfo.force !== 0) {
                                setScreenShakeInfo({angle: 0, force: 0})
                            }
                        }}
                        variants={screenShakeVariants}>
                <motion.div className = "OpponentProfile" animate='opponentEntrance' initial='initial' variants={profileAnimation}>
                    <div className = "Icon">
                        <img className = "Icon" src = {images.defaultIcon} alt = "Default Icon"></img>
                    </div>
                    <div className = "OpponentInfo">
                        <div className = "TextLarge">NotNotJason</div>
                        <div className = "TextSmall">Grandmaster</div>
                        <div className = "TextFiller"></div>
                        <div className = "TextSmall">$ {opponentMoney}</div>
                    </div>
                </motion.div>
                
                {getPromotions()}
                
                <motion.div className = "Chessboard" id = 'ChessBoard' onMouseLeave = {() => SetHover(-1)}
                        initial='hidden'
                        animate={shakeInfo.force !== 0 ? "shake" : "stopShake"}
                        onAnimationComplete={() => {
                            if (shakeInfo.force !== 0) {
                                setShakeInfo({angle: 0, force: 0})
                            }
                        }}
                        variants={shakeVariants}>
                    {cellComponents()}
                    {pieceComponents}
                </motion.div>

                <motion.div className = "MyProfile" animate='myEntrance' initial='initial' variants={profileAnimation}>
                    <div className = "MyInfo">
                        <div className = "TextLarge">ACCountNine38</div>
                        <div className = "TextSmall">Scrubby</div>
                        <div className = "TextFiller"></div>
                        <div className = "TextSmall">$ {myMoney}</div>
                    </div>
                    <div className = "Icon">
                        <img className = "Icon" src = {images.defaultIcon} alt = "Default Icon"></img>
                    </div>
                </motion.div>
                <div className = 'EquipmentBoard'>
                    {equiptmentShop}
                </div>
                <EndTurnButton phase={phase} state={myTurn ? phase : 'enemy'} onClick = {() => EndTurn()}/>
            </motion.div>
        </div>
    );
}

export default Game;