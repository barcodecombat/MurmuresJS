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
 * Heroes are characters managed by the players. They can be given [orders]{@link murmures.Order} on client side.
 * They can move from one level to another.
 * Mobs are characters managed by the AI. The AI methods to control them are defined in the [game engine]{@link murmures.GameEngine} class.
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
    /// <field name="guid" type="String"/>
    /// <field name="position" type="Tile"/>
    /// <field name="hitPoints" type="Number"/>
    /// <field name="hitPointsMax" type="Number"/>
    /// <field name="mobTemplate" type="String"/>
    /// <field name="toUpdate" type="bool"/>
    this.charSpotted = false; // hero is known because seen at least once
    this.onVision = false; // hero is in isght of view
    this.toUpdate = true;
    this.updatedTurn = 0;
};

murmures.Character.prototype = {
    /**
     * Method called by the server once, to build the gameEngine instance during startup.
     * Afterwards, becomes a client-side-only synchronization method.
     * Creates a full Character object from a JSON.
     *
     * @param {Object} src - A parsed version of the stringified remote character.
     */
    fromJson : function (src) {
        this.guid = src.guid;
        this.position = src.position;
        this.hitPoints = src.hitPoints;
        this.hitPointsMax = src.hitPointsMax;
        this.mobTemplate = src.mobTemplate;
        this.onVision = src.onVision;
    },

    instantiate : function (mobReference) {
        this.guid = Math.random().toString();
        this.hitPointsMax = mobReference.hitPointsMax || (mobReference.layerId === "56" ? 20 : 10);
        this.hitPoints = this.hitPointsMax;
    },

    move : function (x, y) {
        this.position = gameEngine.level.tiles[y][x];
    },

    setVision : function () {
        let level = gameEngine.level;
        let tilesProcessed=[];

        for (let xx=0; xx < level.width; xx++) {
            for (let yy=0; yy < level.height; yy++) {
/*                if ((level.tiles[yy][xx].needsClientUpdate == true) && (level.tiles[yy][xx].toUpdate == true)){
                   level.tiles[yy][xx].toUpdate = false;
                   level.tiles[yy][xx].needsClientUpdate = false;
                }*/
                if (level.tiles[yy][xx].state === murmures.C.TILE_HIGHLIGHTED) {
                   level.tiles[yy][xx].toUpdate = true;
                   //level.tiles[yy][xx].updatedTurn = gameEngine.gameTurn;
                   level.tiles[yy][xx].state = murmures.C.TILE_FOG_OF_WAR;
                }else{
                  if(level.tiles[yy][xx].updatedTurn != gameEngine.gameTurn){
                  //level.tiles[yy][xx].updatedTurn = gameEngine.gameTurn;
                    level.tiles[yy][xx].toUpdate = false;
                  }
                }
            }
        }

        for (let itMob=0; itMob < gameEngine.level.mobs.length; itMob++) {
            if(gameEngine.level.mobs[itMob].updatedTurn != gameEngine.gameTurn){
              gameEngine.level.mobs[itMob].toUpdate = gameEngine.level.mobs[itMob].onVision == true?true:false;
              gameEngine.level.mobs[itMob].onVision = false;
              //gameEngine.level.mobs[itMob].updatedTurn = gameEngine.gameTurn;
            }
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
                    for (let itTiles=0;itTiles<tilesProcessed.length;itTiles++){
                      if(tilesProcessed[itTiles].x == oxx && tilesProcessed[itTiles].y == oyy){
                        toProceed = false;
                        break;
                      }
                    }
                    if (toProceed == true){
                      /*level.tiles[oyy][oxx].toUpdate = ((level.tiles[oyy][oxx].toUpdate === false  && level.tiles[oyy][oxx].state === murmures.C.TILE_HIGHLIGHTED) ||(level.tiles[oyy][oxx].toUpdate === true  && level.tiles[oyy][oxx].state === murmures.C.TILE_FOG_OF_WAR))?false:true;
                      if(level.tiles[oyy][oxx].needsClientUpdate == true){
                        level.tiles[oyy][oxx].toUpdate =  true;
                      }*/
                      if(level.tiles[oyy][oxx].updatedTurn != gameEngine.gameTurn && level.tiles[oyy][oxx].toUpdate ==  true){
                        level.tiles[oyy][oxx].toUpdate =  false;
                        level.tiles[oyy][oxx].updatedTurn =  gameEngine.gameTurn;
                      }else{
                        level.tiles[oyy][oxx].toUpdate =  true;
                        level.tiles[oyy][oxx].updatedTurn =  gameEngine.gameTurn;
                      }
                      //level.tiles[oyy][oxx].toUpdate =  true;
                      level.tiles[oyy][oxx].state = murmures.C.TILE_HIGHLIGHTED;
                      for (let itMob=0; itMob < gameEngine.level.mobs.length; itMob++) {
                          let mob = gameEngine.level.mobs[itMob];
                          if (mob.position.x === oxx && mob.position.y === oyy) {
                              gameEngine.level.mobs[itMob].toUpdate = (gameEngine.level.mobs[itMob].toUpdate == true && mob.onVision == false)?false:true;
                              //gameEngine.level.mobs[itMob].toUpdate  = true;
                              mob.charSpotted = true;
                              mob.onVision = true;

                          }
                      }
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
/*        level.tiles[this.position.y][this.position.x].state = murmures.C.TILE_HIGHLIGHTED;
        level.tiles[this.position.y][this.position.x].toUpdate = true;
*/
    }
};
