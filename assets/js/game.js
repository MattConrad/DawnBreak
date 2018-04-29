"use strict";
/// <reference path="./phaser.3d6.d.ts" />
/// <reference path="./Point.ts" />
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var DawnScene = /** @class */ (function (_super) {
    __extends(DawnScene, _super);
    function DawnScene(config) {
        var _this = _super.call(this, config) || this;
        _this.playerMoving = false;
        _this.sceneLayers = {};
        _this.tileBlockMarkers = [];
        _this.monsters = [];
        console.log(config);
        return _this;
    }
    DawnScene.prototype.preload = function () {
        this.load.image("background", "/assets/maps/background.png");
        this.load.image("middleground", "/assets/maps/middleground.png");
        this.load.spritesheet("characters", "/assets/maps/characters.png", { frameWidth: 32, frameHeight: 32 });
        // this, at least, will NOT be the same from map to map.
        this.load.tilemapTiledJSON("test-map", "/assets/maps/first-test-map.json");
        // mwctodo: does <object><any> hack actually work? YES. is there a better way?
        this.load.audioSprite("sfx", ["/assets/audio/fx_mixdown.ogg"], "/assets/audio/fx_mixdown.json", {
            instances: 1
        });
    };
    DawnScene.prototype.create = function () {
        this.initMap();
        var graphics = this.add.graphics();
        this.cameras.main.startFollow(this.player.sprite);
        this.cameras.main.setScroll(0, 0);
        this.cursors = this.input.keyboard.createCursorKeys();
        // phaser is apparently a little slow on certain things. if phaser drags too much you can write your own custom cursor keys.
        // http://www.codeforeach.com/javascript/keycode-for-each-key-and-usage-with-demo
        this.morecursors = this.input.keyboard.addKeys({
            numupright: 105,
            numupleft: 103,
            numdownright: 99,
            numdownleft: 97,
            numup: 104,
            numdown: 98,
            numright: 102,
            numleft: 100
        });
    };
    DawnScene.prototype.update = function () {
        if (this.playerMoving)
            return;
        if (this.cursors.left.isDown || this.morecursors.numleft.isDown) {
            this.checkAndAnimateMove(this.player, -1, 0);
        }
        else if (this.cursors.right.isDown || this.morecursors.numright.isDown) {
            this.checkAndAnimateMove(this.player, +1, 0);
        }
        else if (this.cursors.down.isDown || this.morecursors.numdown.isDown) {
            this.checkAndAnimateMove(this.player, 0, +1);
        }
        else if (this.cursors.up.isDown || this.morecursors.numup.isDown) {
            this.checkAndAnimateMove(this.player, 0, -1);
        }
        else if (this.morecursors.numupright.isDown) {
            this.checkAndAnimateMove(this.player, +1, -1);
        }
        else if (this.morecursors.numdownright.isDown) {
            this.checkAndAnimateMove(this.player, +1, +1);
        }
        else if (this.morecursors.numupleft.isDown) {
            this.checkAndAnimateMove(this.player, -1, -1);
        }
        else if (this.morecursors.numdownleft.isDown) {
            this.checkAndAnimateMove(this.player, -1, +1);
        }
        else if (this.cursors.space.isDown) {
            this.bompPlayerSprite();
        }
    };
    DawnScene.prototype.bompPlayerSprite = function () {
        var _this = this;
        this.playerMoving = true;
        this.player.sprite.setFrame(this.player.sprite.frame.name + 1);
        setTimeout(function () { _this.playerMoving = false; }, 250);
    };
    DawnScene.prototype.checkAndAnimateMove = function (player, tdx, tdy) {
        var _this = this;
        var moveResults = this.checkMove(player, tdx, tdy);
        // this will play in whatever order, regardless of move validity. probably need something better eventually.
        moveResults.effects.filter(function (fx) { return fx.effect === "play-sound"; }).forEach(function (fx) {
            _this.sound.playAudioSprite(fx.spritelib, fx.spritesound);
        });
        if (!moveResults.valid)
            return;
        // probably we want various stages for fx handling. for now, maybe 3? pre, move, post.
        var doorsOpen = moveResults.effects.filter(function (fx) { return fx.effect === "occupy-transition-in"; });
        if (doorsOpen.length > 0)
            this.handleOccupyTransition(doorsOpen);
        this.animateMove(player, tdx, tdy);
        this.player.location = { x: this.player.location.x + tdx, y: this.player.location.y + tdy };
        var doorsClosed = moveResults.effects.filter(function (fx) { return fx.effect === "occupy-transition-out"; });
        if (doorsClosed.length > 0)
            this.handleOccupyTransition(doorsClosed);
    };
    DawnScene.prototype.checkMove = function (player, tdx, tdy) {
        var _this = this;
        var results = { valid: false, effects: Array() };
        // for now we flip on all failed moves too. later, we probably won"t flip on some fails (e.g. entity paralyzed).
        // really this is an effect too. maybe should be handled elsewhere.
        player.sprite.flipX = tdx > 0 ? true : tdx < 0 ? false : player.sprite.flipX;
        var newxy = { x: this.player.location.x + tdx, y: this.player.location.y + tdy };
        var bg = this.sceneLayers[backgroundLayerName];
        if (newxy.x < 0 || newxy.y < 0 || newxy.x >= bg.width || newxy.y >= bg.height)
            return results;
        var bgTile = bg.tilemapLayer.getTileAt(newxy.x, newxy.y);
        if (bgTile.properties.obstacle === "stone") {
            results["effects"].push({ effect: "play-sound", spritelib: "sfx", spritesound: "boss hit" });
            return results;
        }
        // all validity checks are above this line. everything from here on is fx only.
        results.valid = true;
        occupyTransitionLayers.forEach(function (layerName) {
            // we are presently on a door tile: close the door after moving player.
            var mg = _this.sceneLayers[layerName];
            var mgOutTile = mg.tilemapLayer.getTileAt(_this.player.location.x, _this.player.location.y);
            if (mgOutTile && mgOutTile.properties.feature === "door") {
                results["effects"].push({ effect: "occupy-transition-out", layerName: layerName,
                    x: _this.player.location.x, y: _this.player.location.y, tileIndex: mgOutTile.index });
            }
            // moving into a door; paint an open one at "new" before moving player.
            var mgInTile = mg.tilemapLayer.getTileAt(newxy.x, newxy.y);
            if (mgInTile && mgInTile.properties.feature === "door") {
                results["effects"].push({ effect: "occupy-transition-in", layerName: layerName,
                    x: newxy.x, y: newxy.y, tileIndex: mgInTile.index });
            }
        });
        return results;
    };
    DawnScene.prototype.animateMove = function (player, tdx, tdy) {
        var _this = this;
        this.playerMoving = true;
        var oc = function () { _this.playerMoving = false; };
        var timeline = this.tweens.createTimeline(null);
        timeline.setCallback("onComplete", oc, [timeline], timeline);
        var xq = tdx * this.sceneLayers[backgroundLayerName].tileWidth / 4;
        var yq = tdy * this.sceneLayers[backgroundLayerName].tileHeight / 4;
        for (var i = 1; i < 5; i++) {
            var dx = xq * i;
            var dy = yq * i;
            if (i % 2 === 1)
                dy -= 1;
            timeline.add({
                targets: player.sprite,
                x: player.sprite.x + dx,
                y: player.sprite.y + dy,
                duration: 20
            });
        }
        // abominable temp hack of course, but I want something to happen with monsters today.
        var monTimelines = Array();
        for (var n = 0; n < this.monsters.length; n++) {
            var mon = this.monsters[n];
            var mtdx = Math.floor((Math.random() * 3) - 1);
            var mtdy = Math.floor((Math.random() * 3) - 1);
            var mtl = this.tweens.createTimeline(null);
            var mxq = mtdx * this.sceneLayers[backgroundLayerName].tileWidth / 4;
            var myq = mtdy * this.sceneLayers[backgroundLayerName].tileHeight / 4;
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
        this.sound.playAudioSprite("sfx", "squit");
        timeline.play();
    };
    DawnScene.prototype.handleOccupyTransition = function (occupyTransitionEffects) {
        var _this = this;
        //eventually this needs to be tweens that run in parallel, not in sequence like this.
        var layerNames = occupyTransitionEffects.map(function (fx) { return fx.layerName; });
        layerNames.forEach(function (layerName) {
            var map = _this.sceneLayers[layerName].tilemapLayer.tilemap;
            occupyTransitionEffects
                .filter(function (fx) { return fx.layerName === layerName; })
                .forEach(function (fx) {
                var newTileId = _this.getOccupyTransitionTileId(map, layerName, fx.effect, fx.tileIndex);
                map.putTileAt(newTileId, fx.x, fx.y);
            });
        });
    };
    DawnScene.prototype.getOccupyTransitionTileId = function (map, layerName, effect, tileIndex) {
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
        var doorBlockStarts = this.tileBlockMarkers.filter(function (m) { return m.marker === 'door'; }).map(function (m) { return m.key; });
        if (doorBlockStarts.length !== 2) {
            console.error('expected exactly 2 door block starts, got ' + doorBlockStarts.length + ", returning original");
            return tileIndex;
        }
        ;
        var delta = Math.abs(doorBlockStarts[0] - doorBlockStarts[1]);
        return (effect === 'occupy-transition-in')
            ? tileIndex + delta
            : tileIndex - delta;
    };
    DawnScene.prototype.initMap = function () {
        var _this = this;
        var map = this.add.tilemap('test-map');
        layerNames.forEach(function (name) {
            var tileset = map.addTilesetImage(name);
            map.createDynamicLayer(name, tileset, null, null);
        });
        map.layers.forEach(function (layer) {
            _this.sceneLayers[layer.name] = layer;
            if (!layer.tilemapLayer)
                return;
            var tp = layer.tilemapLayer.tileset.tileProperties;
            var markers = Object.keys(tp)
                .filter(function (key) { return tp[key].hasOwnProperty('marker'); })
                .map(function (key) { return ({ layerName: layer.name, key: parseInt(key), marker: tp[key]['marker'] }); });
            _this.tileBlockMarkers.push.apply(_this.tileBlockMarkers, markers);
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
        var playerPoint = charObjects.filter(function (o) { return o.gid === playerGid; })[0];
        //2259 is the frame. this is the SAME as the LOCAL id that you view while hovering in Tiled.
        // almost certainly this is because the firstgid for chartileset is 1.
        // however, we should be able to rely on this.  this means we can treat tileids and frame numbers interchangeably! awesome!
        //player = this.add.tileSprite(112, 112, 32, 32, 'characters', 2259);
        this.player = new SpriteTile();
        this.player.name = 'player';
        this.player.sprite = this.add.tileSprite(playerPoint.x + 16, playerPoint.y - 16, 32, 32, 'characters', 2260);
        var bgLayer = this.sceneLayers[backgroundLayerName];
        //no, this is NOT the same as backgroundLayer. once it is in "map" it gets extry stuff.
        var playerTile = bgLayer.tilemapLayer.getTileAtWorldXY(this.player.sprite.x, this.player.sprite.y);
        this.player.location = { x: playerTile.x, y: playerTile.y };
        //let monners = this.monsters;
        charObjects
            .filter(function (m) { return m.gid !== playerGid; })
            .forEach(function (m) {
            // again, spritesheet frame uses same indexing as tiled, except tiled has the gid offset.
            // let monsterSprite = this.add.tileSprite(m.x + 16, m.y - 16, 32, 32, 'characters', m.gid - charTilesetRaw.firstgid);
            //this.monsters.push({ name: charTilesData[m.gid].name, x: spriteTileLocation.x, y: spriteTileLocation.y, sprite: monsterSprite });
            var monster = new SpriteTile();
            monster.name = charTilesData[m.gid].name;
            monster.sprite = _this.add.tileSprite(m.x + 16, m.y - 16, 32, 32, 'characters', m.gid - charTilesetRaw.firstgid);
            var spriteTileLocation = bgLayer.tilemapLayer.getTileAtWorldXY(monster.sprite.x, monster.sprite.y);
            monster.location = { x: spriteTileLocation.x, y: spriteTileLocation.y };
            _this.monsters.push(monster);
        });
        //debugger;
        //test = map;
    };
    return DawnScene;
}(Phaser.Scene));
// not to be confused with the TileSprite that is built into Phaser,
// this is an object that composes sprite and tile location.
// possibly this ends up as an inteface, but for now I'm guessing it will get some behavior.
var SpriteTile = /** @class */ (function () {
    function SpriteTile() {
    }
    return SpriteTile;
}());
/// <reference path="./phaser.3d6.d.ts" />
/// <reference path="./DawnScene.ts" />
var layerNames = ["background", "middleground"];
var occupyTransitionLayers = ["middleground"];
var backgroundLayerName = "background";
var config = {
    type: Phaser.AUTO,
    width: 768,
    height: 576,
    backgroundColor: "#000000",
    parent: "dawnbreak",
    pixelArt: true,
    scene: DawnScene
};
var game = new Phaser.Game(config);
//# sourceMappingURL=game.js.map