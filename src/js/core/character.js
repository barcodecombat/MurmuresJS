'use strict';
//debugger;

/**
 * @file Character class. Part of the MurmuresJS project.
 * @author github.com/azziliz
 * @author github.com/thyshimrod
 * @license MIT
 */

/**
 * Characters are entities that live, move and act inside a [level]{@link murmures.Level}.
 *
 * Heroes are characters managed by the players. 
 * They can be given [orders]{@link murmures.Order} on client side.
 * They can move from one level to another.
 * Mobs are characters managed by the AI.
 * The AI methods to control them are defined in the [game engine]{@link murmures.GameEngine} class.
 * They cannot change level.
 *
 * Three steps are mandatory to create a valid character:
 * 1. Load all character templates from mobs.json.
 * 2. Select templates that are needed for the current level.
 * 2. Use the "instantiate" method in the Character class to create new instances.
 * Step 1 is performed by the game engine during the server startup.
 * Step 2 and 3 are performed together by the server and the game engine when a level is loaded.
 *
 * @class
 */
murmures.Character = function () {
    /** @type {string} */
    this.guid = '';
    /** @type {murmures.Tile} */
    this.position = null;
    /** @type {string} */
    this.mobTemplate = '';
    /** @type {number} */
    this.hitPointsMax = 0 | 0;
    /** @type {number} */
    this.hitPoints = 0 | 0;
    /** @type {boolean} */
    this.onVision = false; // hero is in sight
    /** @type {boolean} */
    this.charSpotted = false; // hero is known because seen at least once
};

murmures.Character.prototype = {
    
    /**
     * It is expected that, when the server calls this function, 
     * the Tile object in parameter is already built.
     */
    build : function (tile, template) {
        this.guid = Math.random().toString();
        this.position = tile;
        this.mobTemplate = template;
        let ref = gameEngine.bodies[template];
        this.hitPointsMax = (ref.hitPointsMax || (ref.layerId === "56" ? 20 : 10)) | 0; // TODO replace 56 with Hero constant
        this.hitPoints = this.hitPointsMax | 0;
    },
    
    initialize : function (src) {
        this.guid = src.guid;
        this.synchronize(src);
    },
    
    synchronize : function (src) {
        if (typeof src === 'undefined') return;
        if (typeof src.position !== 'undefined') this.move(src.position.x, src.position.y); // TODO position=null when mob becomes invisible?
        if (typeof src.mobTemplate !== 'undefined') this.mobTemplate = src.mobTemplate;
        if (typeof src.hitPointsMax !== 'undefined') this.hitPointsMax = src.hitPointsMax;
        if (typeof src.hitPoints !== 'undefined') this.hitPoints = src.hitPoints;
        if (typeof src.onVision !== 'undefined') this.onVision = src.onVision;
    },
    
    clone : function () {
        return {
            guid: this.guid,
            position: { x: this.position.x, y: this.position.y },
            mobTemplate: this.mobTemplate,
            hitPointsMax: this.hitPointsMax,
            hitPoints: this.hitPoints,
            onVision: this.onVision,
        };
    },
    
    compare : function (beforeState) {
        let ret = {};
        if (this.guid !== beforeState.guid) throw 'Character changed guid. This souldn\'t be happening';
        if (this.position.x !== beforeState.position.x || this.position.y !== beforeState.position.y) ret.position = this.position.coordinates();
        if (this.mobTemplate !== beforeState.mobTemplate) ret.mobTemplate = this.mobTemplate;
        if (this.hitPointsMax !== beforeState.hitPointsMax) ret.hitPointsMax = this.hitPointsMax;
        if (this.hitPoints !== beforeState.hitPoints) ret.hitPoints = this.hitPoints;
        if (this.onVision !== beforeState.onVision) ret.onVision = this.onVision;
        for (var prop in ret) {
            // only returns ret if not empty
            ret.guid = this.guid;
            return ret;
        }
        // otherwise, no return = undefined
    },
    
    move : function (x, y) {
        this.position = gameEngine.level.tiles[y][x];
    },
    
    setVision : function () {
        let level = gameEngine.level;
        let tilesProcessed=[];
        
        for (let xx=0; xx < level.width; xx++) {
            for (let yy=0; yy < level.height; yy++) {
                if (level.tiles[yy][xx].state === murmures.C.TILE_HIGHLIGHTED) {
                    level.tiles[yy][xx].state = murmures.C.TILE_FOG_OF_WAR;
                }
            }
        }
        
        for (let itMob=0; itMob < gameEngine.level.mobs.length; itMob++) {
            gameEngine.level.mobs[itMob].onVision = false;
        }
        
        for (let i=0; i < 360; i++) {
            let x = Math.cos(i * 0.01745);
            let y = Math.sin(i * 0.01745);
            let ox = this.position.x + 0.5;
            let oy = this.position.y + 0.5;
            for (let j=0; j < murmures.C.DEFAULT_RANGE_SOV; j++) {
                let oxx = 0;
                oxx = Math.floor(ox);
                let oyy = 0;
                oyy = Math.floor(oy);
                if ((oxx >= 0) && (oxx < level.width) && (oyy >= 0) && (oyy < level.height)) {
                    let toProceed = true;
                    for (let itTiles=0; itTiles < tilesProcessed.length; itTiles++) {
                        if (tilesProcessed[itTiles].x == oxx && tilesProcessed[itTiles].y == oyy) {
                            toProceed = false;
                            break;
                        }
                    }
                    if (toProceed) {
                        level.tiles[oyy][oxx].state = murmures.C.TILE_HIGHLIGHTED;
                        let groundLight = (level.tiles[oyy][oxx].groundId === "") ? true : !gameEngine.bodies[level.tiles[oyy][oxx].groundId].hasPhysics ? true : !!gameEngine.bodies[level.tiles[oyy][oxx].groundId].allowFlying;
                        let propLight = (level.tiles[oyy][oxx].propId === "") ? true : !gameEngine.bodies[level.tiles[oyy][oxx].propId].hasPhysics ? true : !!gameEngine.bodies[level.tiles[oyy][oxx].propId].allowFlying;
                        if ((!groundLight || !propLight) && (j > 0)) {
                            break;
                        }
                        tilesProcessed.push(level.tiles[oyy][oxx]);
                    }
                    ox += x;
                    oy += y;
                }
            }
        }
        
        for (let itMob=0; itMob < gameEngine.level.mobs.length; itMob++) {
            let mob = gameEngine.level.mobs[itMob];
            if (level.tiles[mob.position.y][mob.position.x].state === murmures.C.TILE_HIGHLIGHTED) {
                mob.charSpotted = true;
                mob.onVision = true;
            }
        }

    }
};
