"use strict";
/// <reference path="./phaser.3d6.d.ts" />
/// <reference path="./DawnScene.ts" />
var layerNames = ["background", "middleground"];
var occupyTransitionLayers = ["middleground"];
var backgroundLayerName = "background";
var config = {
    type: Phaser.CANVAS,
    width: 768,
    height: 576,
    backgroundColor: "#000000",
    parent: "phaser-example",
    pixelArt: true,
    scene: DawnScene
};
var game = new Phaser.Game(config);
var player;
var cursors;
// mwctodo: this any should get fixed up eventually.
var morecursors;
var playerMoving = false;
// make this into a Point along with several other things.
var playerTileXY = { x: 0, y: 0 };
var sceneLayers = {};
var tileBlockMarkers = [];
var monsters = [];
var test;
function bompPlayerSprite() {
    playerMoving = true;
    player.setFrame(player.frame.name + 1);
    setTimeout(function () { playerMoving = false; }, 250);
}
function checkAndAnimateMove(scene, player, tdx, tdy) {
    var moveResults = checkMove(scene, player, tdx, tdy);
    // this will play in whatever order, regardless of move validity. probably need something better eventually.
    moveResults.effects.filter(function (fx) { return fx.effect === "play-sound"; }).forEach(function (fx) {
        scene.sound.playAudioSprite(fx.spritelib, fx.spritesound);
    });
    if (!moveResults.valid)
        return;
    // probably we want various stages for fx handling. for now, maybe 3? pre, move, post.
    var doorsOpen = moveResults.effects.filter(function (fx) { return fx.effect === "occupy-transition-in"; });
    if (doorsOpen.length > 0)
        handleOccupyTransition(scene, doorsOpen);
    animateMove(scene, player, tdx, tdy);
    playerTileXY = { x: playerTileXY.x + tdx, y: playerTileXY.y + tdy };
    var doorsClosed = moveResults.effects.filter(function (fx) { return fx.effect === "occupy-transition-out"; });
    if (doorsClosed.length > 0)
        handleOccupyTransition(scene, doorsClosed);
}
function checkMove(scene, player, tdx, tdy) {
    var results = { valid: false, effects: [] };
    // for now we flip on all failed moves too. later, we probably won"t flip on some fails (e.g. entity paralyzed).
    // really this is an effect too. maybe should be handled elsewhere.
    player.flipX = tdx > 0 ? true : tdx < 0 ? false : player.flipX;
    var newxy = { x: playerTileXY.x + tdx, y: playerTileXY.y + tdy };
    var bg = sceneLayers[backgroundLayerName];
    if (newxy.x < 0 || newxy.y < 0 || newxy.x >= bg.width || newxy.y >= bg.height)
        return false;
    var bgTile = bg.tilemapLayer.getTileAt(newxy.x, newxy.y);
    if (bgTile.properties.obstacle === "stone") {
        results["effects"].push({ effect: "play-sound", spritelib: "sfx", spritesound: "boss hit" });
        return results;
    }
    // all validity checks are above this line. everything from here on is fx only.
    results.valid = true;
    occupyTransitionLayers.forEach(function (layerName) {
        // we are presently on a door tile: close the door after moving player.
        var mg = sceneLayers[layerName];
        var mgOutTile = mg.tilemapLayer.getTileAt(playerTileXY.x, playerTileXY.y);
        if (mgOutTile && mgOutTile.properties.feature === "door") {
            results["effects"].push({ effect: "occupy-transition-out", layerName: layerName,
                x: playerTileXY.x, y: playerTileXY.y, tileIndex: mgOutTile.index });
        }
        // moving into a door; paint an open one at "new" before moving player.
        var mgInTile = mg.tilemapLayer.getTileAt(newxy.x, newxy.y);
        if (mgInTile && mgInTile.properties.feature === "door") {
            results["effects"].push({ effect: "occupy-transition-in", layerName: layerName,
                x: newxy.x, y: newxy.y, tileIndex: mgInTile.index });
        }
    });
    return results;
}
function animateMove(scene, player, tdx, tdy) {
    playerMoving = true;
    var oc = function () { playerMoving = false; };
    var timeline = scene.tweens.createTimeline();
    timeline.setCallback("onComplete", oc, [timeline], timeline);
    var xq = tdx * sceneLayers[backgroundLayerName].tileWidth / 4;
    var yq = tdy * sceneLayers[backgroundLayerName].tileHeight / 4;
    for (var i = 1; i < 5; i++) {
        var dx = xq * i;
        var dy = yq * i;
        if (i % 2 === 1)
            dy -= 1;
        timeline.add({
            targets: player,
            x: player.x + dx,
            y: player.y + dy,
            duration: 20
        });
    }
    // abominable temp hack of course, but I want something to happen with monsters today.
    var monTimelines = [];
    for (var n = 0; n < monsters.length; n++) {
        var mon = monsters[n];
        var mtdx = Math.floor((Math.random() * 3) - 1);
        var mtdy = Math.floor((Math.random() * 3) - 1);
        var mtl = scene.tweens.createTimeline();
        var mxq = mtdx * sceneLayers[backgroundLayerName].tileWidth / 4;
        var myq = mtdy * sceneLayers[backgroundLayerName].tileHeight / 4;
        for (var i_1 = 1; i_1 < 5; i_1++) {
            var mdx = mxq * i_1;
            var mdy = myq * i_1;
            if (i_1 % 2 === 1)
                mdy -= 3;
            mtl.add({
                targets: mon.sprite,
                x: mon.sprite.x + mdx,
                y: mon.sprite.y + mdy,
                duration: 20
            });
        }
        mtl.play();
    }
    monTimelines.forEach(function (mtl) { mtl.play(); });
    // this might actually belong here.
    scene.sound.playAudioSprite("sfx", "squit");
    timeline.play();
}
function handleOccupyTransition(scene, occupyTransitionEffects) {
    //eventually this needs to be tweens that run in parallel, not in sequence like this.
    var layerNames = occupyTransitionEffects.map(function (fx) { return fx.layerName; });
    layerNames.forEach(function (layerName) {
        var map = sceneLayers[layerName].tilemapLayer.tilemap;
        occupyTransitionEffects
            .filter(function (fx) { return fx.layerName === layerName; })
            .forEach(function (fx) {
            var newTileId = getOccupyTransitionTileId(map, layerName, fx.effect, fx.tileIndex);
            map.putTileAt(newTileId, fx.x, fx.y);
        });
    });
}
function getOccupyTransitionTileId(map, layerName, effect, tileIndex) {
    if (effect !== 'occupy-transition-in' && effect !== 'occupy-transition-out') {
        console.error('unsupported effect "' + effect + '", returning original');
        return tileIndex;
    }
    ;
    var tilesetIndex = map.tilesets.findIndex(function (t) { return t.name === layerName; });
    var columnNumber = (tileIndex - map.tilesets[tilesetIndex].firstgid) % map.tilesets[tilesetIndex].columns;
    if (isNaN(columnNumber)) {
        console.error('columnNumber for tileIndex was NaN, returning original');
        return tileIndex;
    }
    //this too can be made door-agnostic. possibly, we can use this for char animations once this happens.
    //yanno, we could inspect the map for all the non-zero tile ids used, and then make an object that cached tileids with their related partners.
    // could do this in preload. now we don't even care about the difference between xition in and out--just reverse whatever it was.
    // although, this maybe gets tricky when multiple agents are in/out on the same turn. maybe we need to know in/out.
    var doorBlockStarts = tileBlockMarkers.filter(function (m) { return m.marker === 'door'; }).map(function (m) { return m.key; });
    if (doorBlockStarts.length !== 2) {
        console.error('expected exactly 2 door block starts, got ' + doorBlockStarts.length + ", returning original");
        return tileIndex;
    }
    ;
    var delta = Math.abs(doorBlockStarts[0] - doorBlockStarts[1]);
    return (effect === 'occupy-transition-in')
        ? tileIndex + delta
        : tileIndex - delta;
}
function initMap(scene) {
    var map = scene.add.tilemap('test-map');
    layerNames.forEach(function (name) {
        var tileset = map.addTilesetImage(name);
        map.createDynamicLayer(name, tileset);
    });
    // https://stackoverflow.com/questions/17500312/is-there-some-way-i-can-join-the-contents-of-two-javascript-arrays-much-like-i/17500836
    map.layers.forEach(function (layer) {
        sceneLayers[layer.name] = layer;
        if (!layer.tilemapLayer)
            return;
        var tp = layer.tilemapLayer.tileset.tileProperties;
        var markers = Object.keys(tp)
            .filter(function (key) { return tp[key].hasOwnProperty('marker'); })
            .map(function (key) { return ({ layerName: layer.name, key: parseInt(key), marker: tp[key]['marker'] }); });
        tileBlockMarkers.push.apply(tileBlockMarkers, markers);
    });
    var charTilesetRaw = map.tilesets.filter(function (t) { return t.name === 'characters'; })[0];
    var charTilesData = Object
        .keys(charTilesetRaw.tileProperties)
        .map(function (k) {
        var t = parseInt(k) + charTilesetRaw.firstgid;
        return { chargid: t, name: charTilesetRaw.tileProperties[k].name, props: charTilesetRaw.tileProperties[k] };
    }).reduce(function (acc, cur) {
        acc[cur.chargid] = cur.props;
        return acc;
    }, {});
    // we only care about certain properties here.
    var charObjects = map.objects
        .filter(function (o) { return o.name === 'initial-characters'; })[0].objects
        .map(function (o) {
        var obj = { gid: parseInt(o.gid), x: o.x, y: o.y };
        Object.assign(obj, o.properties);
        return obj;
    });
    var playerPlaceholders = Object.keys(charTilesData).filter(function (d) { return charTilesData[d].name === 'player-placeholder'; });
    if (playerPlaceholders.length !== 1)
        throw "Failed to find unique player placeholder gid. Found " + playerPlaceholders.length + ".";
    var playerGid = parseInt(playerPlaceholders[0]);
    var playerStartObject = charObjects.filter(function (o) { return o.gid === playerGid; })[0];
    //2259 is the frame. this is the SAME as the LOCAL id that you view while hovering in Tiled.
    // almost certainly this is because the firstgid for chartileset is 1.
    // however, we should be able to rely on this.  this means we can treat tileids and frame numbers interchangeably! awesome!
    //player = this.add.tileSprite(112, 112, 32, 32, 'characters', 2259);
    player = scene.add.tileSprite(playerStartObject.x + 16, playerStartObject.y - 16, 32, 32, 'characters', 2260);
    //no, this is NOT the same as backgroundLayer. once it is in "map" it gets extry stuff.
    var playerTile = sceneLayers[backgroundLayerName].tilemapLayer.getTileAtWorldXY(player.x, player.y);
    playerTileXY = { x: playerTile.x, y: playerTile.y };
    charObjects
        .filter(function (m) { return m.gid !== playerGid; })
        .forEach(function (m) {
        // again, spritesheet frame uses same indexing as tiled, except tiled has the gid offset.
        var monsterSprite = scene.add.tileSprite(m.x + 16, m.y - 16, 32, 32, 'characters', m.gid - charTilesetRaw.firstgid);
        var spriteTile = sceneLayers[backgroundLayerName].tilemapLayer.getTileAtWorldXY(monsterSprite.x, monsterSprite.y);
        monsters.push({ name: charTilesData[m.gid].name, x: spriteTile.x, y: spriteTile.y, sprite: monsterSprite });
    });
    //debugger;
    //test = map;
}
//# sourceMappingURL=game.js.map