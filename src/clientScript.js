﻿'use strict';
var gameEngine = new murmures.gameEngine();
gameEngine.allowOrders = true;

// #region Utils
function screenLog(txt) {
    let now = new Date();
    document.getElementById("screenLog").insertAdjacentHTML('afterbegin', '<span style="color:#ffa">' + now.toLocaleTimeString() + '.' + ('00' + now.getMilliseconds().toString()).substr(-3) + '</span> ' + txt + '<br/>');
}

function sendAjax(path, param, callback, async) {
    let xhr = new XMLHttpRequest();
    xhr.onerror = onXhrError;
    xhr.open('POST', window.location.href + path, async);
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (callback !== null) {
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                callback(xhr.responseText);
            }
        };
    }
    xhr.send(param);
}

function onXhrError(e) {
    screenLog('<span style="color:#f66">' + 'ERROR - Vous avez été déconnecté du serveur</span>');
}
// #endregion

function init() {
    screenLog('>> getLevel');
    sendAjax('getLevel', '{"id":"level1"}', loadEngine, true);
    registerEvents();
}


// #region Renderer
function renderLevel() {
    let allCanvas = document.getElementsByTagName("canvas");
    for (let canvasIter = 0; canvasIter < allCanvas.length; canvasIter++) {
        allCanvas[canvasIter].width = gameEngine.level.width * gameEngine.tileSize; // This is a hard reset of all canvas and is quite time consumming.
        allCanvas[canvasIter].height = gameEngine.level.height * gameEngine.tileSize;
        let context = allCanvas[canvasIter].getContext('2d');
        //context.translate(0.5, 0.5); // translation prevents anti-aliasing.
        context.imageSmoothingEnabled = false;
    }
    document.getElementById("screenLog").style.top = (10 + gameEngine.level.height * gameEngine.tileSize).toString() + 'px';
    //drawGrid();
    let img = new Image();
    img.onload = function () {
        drawTiles();
        initUI();
        updateCharacters();
    }
    img.src = "/src/img/rltiles-2d.png";
}

// #region Grid
function drawGrid() {
    let layer = document.getElementById('gridLayer');
    let context = layer.getContext('2d');
    context.clearRect(0, 0, layer.width, layer.height);
    for (let x = 0; x < gameEngine.level.width; x++) {
        for (let y = 0; y < gameEngine.level.height; y++) {
            drawOneSquare(context, x, y, "#ccc", false); // light gray
        }
    }
}

function drawOneSquare(context, x, y, color, filled) {
    context.beginPath();
    if (filled || y === 0) {
        context.moveTo(gameEngine.tileSize * x, gameEngine.tileSize * y);
        context.lineTo(gameEngine.tileSize * x + gameEngine.tileSize, gameEngine.tileSize * y);
    }
    else {
        context.moveTo(gameEngine.tileSize * x + gameEngine.tileSize, gameEngine.tileSize * y);
    }
    context.lineTo(gameEngine.tileSize * x + gameEngine.tileSize, gameEngine.tileSize * y + gameEngine.tileSize);
    context.lineTo(gameEngine.tileSize * x, gameEngine.tileSize * y + gameEngine.tileSize);
    if (filled || x === 0) {
        context.lineTo(gameEngine.tileSize * x, gameEngine.tileSize * y);
    }
    context.strokeStyle = color;
    context.stroke();
    if (filled) {
        context.closePath();
        context.fillStyle = color;
        context.fill();
    }
}
// #endregion

// #region Tiles
function drawTiles() {
    document.getElementById('fogOfWarLayer').getContext('2d').clearRect(0, 0, gameEngine.level.width * gameEngine.tileSize, gameEngine.level.height * gameEngine.tileSize);
    for (let x = 0; x < gameEngine.level.width; x++) {
        for (let y = 0; y < gameEngine.level.height; y++) {
            drawOneTile(x, y, "#2D1E19");
        }
    }
}

function drawOneTile(x, y, color) {
    let img = new Image();
    img.src = "/src/img/rltiles-2d.png";
    let tilesetCoord = gameEngine.bodies[gameEngine.level.tiles[y][x].groundId].tilesetCoord;
    if (gameEngine.level.tiles[y][x].state !== 0) {
        document.getElementById('tilesLayer').getContext('2d').drawImage(img,
                    tilesetCoord[0] * gameEngine.tileSize, tilesetCoord[1] * gameEngine.tileSize, gameEngine.tileSize, gameEngine.tileSize,
                    gameEngine.tileSize * x, gameEngine.tileSize * y, gameEngine.tileSize, gameEngine.tileSize);
    }
    if (gameEngine.level.tiles[y][x].state === 2) {
        drawOneSquare(document.getElementById('fogOfWarLayer').getContext('2d'), x, y, "#000000", true);
    }
}
// #endregion

// #region Characters
function initUI() {
    let characterUiTemplate = document.getElementById('characterUiTemplate').innerHTML;
    let templateStr = /template/g;
    document.getElementById('rightCharacters').innerHTML += characterUiTemplate.replace(templateStr, 'mob0');
    document.getElementById('rightCharacters').innerHTML += characterUiTemplate.replace(templateStr, 'mob1');
    document.getElementById('leftCharacters').innerHTML += characterUiTemplate.replace(templateStr, 'hero0').replace('bgColorMob', 'bgColorHero');
}

function updateCharacters() {
    clearCharacterLayer();
    for (let i = 0; i < gameEngine.mobs.length; i++) {
        document.getElementById('mob' + i + '-icon').src = gameEngine.mobs[i].img;
        document.getElementById('mob' + i + '-name').innerHTML = 'Squelette';
        let missingLife = parseFloat(gameEngine.mobs[i].hitPoints) / parseFloat(gameEngine.mobs[i].hitPointsMax) * 100.0;
        document.getElementById('mob' + i + '-life').style.width = Math.round(missingLife).toString() + '%';
        if (gameEngine.mobs[i].hitPoints === 0) {
            document.getElementById('mob' + i + '-box').style.display = "none";
        }
        else {
            drawCharacter(gameEngine.mobs[i]);
        }
    }
    let i = 0;
    document.getElementById('hero' + i + '-icon').src = gameEngine.hero.img;
    document.getElementById('hero' + i + '-name').innerHTML = gameEngine.hero.name;
    let missingLife = parseFloat(gameEngine.hero.hitPoints) / parseFloat(gameEngine.hero.hitPointsMax) * 100.0;
    document.getElementById('hero' + i + '-life').style.width = Math.round(missingLife).toString() + '%';
    drawCharacter(gameEngine.hero);
}

function clearCharacterLayer() {
    let layer = document.getElementById('characterLayer');
    let context = layer.getContext('2d');
    context.clearRect(0, 0, layer.width, layer.height);
}

function drawCharacter(character) {
    /// <param name="character" type="character"/>
    if (gameEngine.level.tiles[character.position.y][character.position.x].state == 1) {
        let layer = document.getElementById('characterLayer');
        let context = layer.getContext('2d');
        let img = new Image();
        img.onload = function () {
            context.drawImage(img, character.position.x * gameEngine.tileSize, character.position.y * gameEngine.tileSize, gameEngine.tileSize, gameEngine.tileSize);
        };
        img.src = character.img;
    }
}
// #endregion
// #endregion

function loadEngine(engine) {
    screenLog('<< loadEngine');
    gameEngine.fromJson(JSON.parse(engine), murmures);
    renderLevel();
}

function registerEvents() {
    // IE11 returns decimal number for MouseEvent coordinates but Chrome43 always rounds down.
    // --> using floor() for consistency.
    // and retrieves the nearest pixel coordinates.
    let topLayer = document.getElementById("topLayer");
    topLayer.addEventListener("mousedown", function (e) {
        e.preventDefault(); // usually, keeping the left mouse button down triggers a text selection or a drag & drop.
        let mouseX = Math.floor(e.offsetX);
        let mouseY = Math.floor(e.offsetY);
        topLayer_onClick(mouseX, mouseY, e.button == 2);
    }, false);
    window.addEventListener("keypress", function (e) {
        let char = '';
        if (e.which == null)
            char = String.fromCharCode(e.keyCode);
        else
            char = String.fromCharCode(e.which);
        onKeyPress(char);
    }, false);
}

function topLayer_onClick(mouseEventX, mouseEventY, rightClick) {
    if (!rightClick) {
        // event is a left click
        // find hovered tile
        let hoveredTile = getHoveredTile(mouseEventX, mouseEventY);
        if (gameEngine.tileHasMob(hoveredTile)) {
            let attackOrder = new murmures.order();
            attackOrder.command = "attack";
            attackOrder.source = gameEngine.hero;
            attackOrder.target = hoveredTile;
            launchOrder(attackOrder);
        }
        else {
            let moveOrder = new murmures.order();
            moveOrder.command = "move";
            moveOrder.source = gameEngine.hero;
            moveOrder.target = hoveredTile;
            launchOrder(moveOrder);
        }
    }
    else {
        // event is a right click
        let hoveredTile = getHoveredTile(mouseEventX, mouseEventY);
    }
}

function getHoveredTile(mouseEventX, mouseEventY) {
    let tileX = Math.floor(mouseEventX / gameEngine.tileSize);
    let tileY = Math.floor(mouseEventY / gameEngine.tileSize);
    document.getElementById('debugDiv').innerHTML = ''.concat(tileX, ' ', tileY);
    let ret = new murmures.tile();
    ret.x = tileX;
    ret.y = tileY;
    return ret;
}

function onKeyPress(char) {
    let allowedChars = '12346789';
    if (allowedChars.indexOf(char) >= 0) {
        let moveOrder = new murmures.order();
        moveOrder.command = "move";
        moveOrder.source = gameEngine.hero;
        let target = new murmures.tile();
        if (char === '9' || char === '6' || char === '3') target.x = gameEngine.hero.position.x + 1;
        if (char === '7' || char === '4' || char === '1') target.x = gameEngine.hero.position.x - 1;
        if (char === '8' || char === '2') target.x = gameEngine.hero.position.x;
        if (char === '9' || char === '8' || char === '7') target.y = gameEngine.hero.position.y - 1;
        if (char === '3' || char === '2' || char === '1') target.y = gameEngine.hero.position.y + 1;
        if (char === '4' || char === '6') target.y = gameEngine.hero.position.y;
        moveOrder.target = target;
        launchOrder(moveOrder);
    }
    else {
        screenLog('<span style="color:#f66">' + 'ERROR - This is not a valid key</span>');
    }
}

function launchOrder(order) {
    let check = gameEngine.checkOrder(order);
    if (gameEngine.allowOrders) {
        if (check.valid) {
            screenLog('>> order - ' + order.command);
            sendAjax('order', JSON.stringify(order), onOrderResponse, true);
            gameEngine.allowOrders = false;
        }
        else {
            screenLog('<span style="color:#f66">' + 'ERROR - Invalid order - ' + check.reason + '</span>');
        }
    }
    else {
        screenLog('<span style="color:#f66">' + 'WARNING - Order was discarded - Waiting for server response </span>');
    }
}

function onOrderResponse(response) {
    screenLog('<< onOrderResponse');
    gameEngine.allowOrders = true;
    let ge = JSON.parse(response);
    /*  gameEngine.hero = ge.hero;
            gameEngine.mobs = ge.mobs;*/
            gameEngine.fromJson(ge, murmures);
    window.requestAnimationFrame(drawTiles);
    updateCharacters();
}
