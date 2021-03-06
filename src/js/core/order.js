﻿'use strict';
//debugger;

/**
 * @file Order class. Part of the MurmuresJS project.
 * @author github.com/azziliz
 * @author github.com/thyshimrod
 * @license MIT
 */

/**
 * An order is a player-generated instruction or event.
 *
 * It is sent from the client to the server by an asynchronous request.
 * It contains a "command" field, which describes the type of the order, and various parameters.
 * Currently allowed commands are: "move" and "attack".
 * The list of allowed commands is expected to grow in the future.
 *
 * Orders validity is enforced by a GameEngine method called "checkOrder".
 * Every time an existing command is modified or a new command is created, the checkOrder method should be updated.
 *
 * The server responds to an order by sending the new gameEngine state, after the command is executed.
 *
 * @class
 */
murmures.Order = function () {
    /** @type {string} */
    this.command = '';
    /** @type {murmures.Character} */
    this.source = {};
    /** @type {murmures.Tile} */
    this.target = {};
    /** @type {Object.[String, String]}*/
    this.custom = {};
};

murmures.Order.prototype = {
    /*
     * This class doesn't have initialize and synchronize methods because the server doesn't send orders to the client.
     * Hence no need to rebuild the order object on client side.
     */

    /**
     * Synchronization method called on server side only.
     * Creates a full Order object from a JSON.
     * This function is considered "safe" because it doesn't try to rebuild objects directly from the source.
     * Instead, it reads the client data and builds an Order object refering only to other server objects.
     *
     * @param {Object} src - A parsed version of the stringified remote order.
     */
    build : function (src) {
        this.command = src.command;
        if(src.custom !== 'undefined') this.custom = src.custom;
        this.source = undefined;
        for (let itHero = 0; itHero < gameEngine.heros.length; itHero++){
          if (parseFloat(gameEngine.heros[itHero].guid) === parseFloat(src.source.guid)) {
            if (src.source.activeSkill !== 'undefined') gameEngine.heros[itHero].activeSkill = src.source.activeSkill;
            this.source = gameEngine.heros[itHero];
            break;
          }
        }

        if(typeof this.source === 'undefined') {
            murmures.serverLog("Tech Error - Guid does not match any heroes- " + src.source.guid );
            return { valid: false, reason: 'Technical error - Guid does not match - Please refresh the page' };
        }
        if(typeof src.target !== 'undefined')
          this.target = gameEngine.level.tiles[src.target.y|0][src.target.x|0];
        return { valid: true };
    },

    clean: function () {
        this.source = { guid: this.source.guid, activeSkill : this.source.activeSkill};
        this.target = { x: this.target.x, y: this.target.y };

    }
};
