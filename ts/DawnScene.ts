/// <reference path="./phaser.3d6.d.ts" />
/// <reference path="./Point.ts" />

class DawnScene extends Phaser.Scene {

    player:SpriteTile;
    cursors:CursorKeys;
    // mwctodo: this any should get fixed up eventually.
    morecursors:any;
    playerMoving:boolean = false;
    
    sceneLayers:LayerDataObject = {};
    tileBlockMarkers:any = [];
    monsters:Array<SpriteTile> = [];
    test:any;

    constructor (config:Phaser.Scenes.Settings.Config) {
        super(config);
        console.log(config);
    }

    preload():void {
        this.load.image("background", "/assets/maps/background.png");
        this.load.image("middleground", "/assets/maps/middleground.png");
        this.load.spritesheet("characters", "/assets/maps/characters.png", { frameWidth: 32, frameHeight: 32 });
        
        // this, at least, will NOT be the same from map to map.
        this.load.tilemapTiledJSON("test-map", "/assets/maps/first-test-map.json");

        // mwctodo: does <object><any> hack actually work? YES. is there a better way?
        this.load.audioSprite("sfx",
            ["/assets/audio/fx_mixdown.ogg"],
            <object><any>"/assets/audio/fx_mixdown.json",
            {
                instances: 1
            });
    }

    create():void {
        this.initMap();

        let graphics:Phaser.GameObjects.Graphics = this.add.graphics();

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
    }

    update():void {
        if (this.playerMoving) return;
    
        if (this.cursors.left.isDown || this.morecursors.numleft.isDown) {
            this.checkAndAnimateMove(this.player, -1, 0);
        } else if (this.cursors.right.isDown || this.morecursors.numright.isDown) {
            this.checkAndAnimateMove(this.player, +1, 0);
        } else if (this.cursors.down.isDown || this.morecursors.numdown.isDown) {
            this.checkAndAnimateMove(this.player, 0, +1);
        } else if (this.cursors.up.isDown || this.morecursors.numup.isDown) {
            this.checkAndAnimateMove(this.player, 0, -1);
        } else if (this.morecursors.numupright.isDown) {
            this.checkAndAnimateMove(this.player, +1, -1);
        } else if (this.morecursors.numdownright.isDown) {
            this.checkAndAnimateMove(this.player, +1, +1);
        } else if (this.morecursors.numupleft.isDown) {
            this.checkAndAnimateMove(this.player, -1, -1);
        } else if (this.morecursors.numdownleft.isDown) {
            this.checkAndAnimateMove(this.player, -1, +1);
        } else if (this.cursors.space.isDown) {
            this.bompPlayerSprite();
        }
    }

    bompPlayerSprite() {
        this.playerMoving = true;
        this.player.sprite.setFrame(this.player.sprite.frame.name + 1);
    
        setTimeout(() => { this.playerMoving = false; }, 250);
    }

    checkAndAnimateMove(player:SpriteTile, tdx:integer, tdy:integer) {

        let moveResults = this.checkMove(player, tdx, tdy);

        // this will play in whatever order, regardless of move validity. probably need something better eventually.
        moveResults.effects.filter(fx => fx.effect === "play-sound").forEach(fx => {
            this.sound.playAudioSprite(fx.spritelib, fx.spritesound);
        });
    
        if (!moveResults.valid) return;
    
        // probably we want various stages for fx handling. for now, maybe 3? pre, move, post.
    
        let doorsOpen = moveResults.effects.filter(fx => fx.effect === "occupy-transition-in");
        if (doorsOpen.length > 0) this.handleOccupyTransition(doorsOpen);

        this.animateMove(player, tdx, tdy);

        this.player.location = { x: this.player.location.x + tdx, y: this.player.location.y + tdy };
    
        var doorsClosed = moveResults.effects.filter(fx => fx.effect === "occupy-transition-out");
        if (doorsClosed.length > 0) this.handleOccupyTransition(doorsClosed);
    }
    
    checkMove(player:SpriteTile, tdx:integer, tdy:integer):MoveResults {
    
        let results = { valid: false, effects: Array<MoveEffect>() };
    
        // for now we flip on all failed moves too. later, we probably won"t flip on some fails (e.g. entity paralyzed).
        // really this is an effect too. maybe should be handled elsewhere.
        player.sprite.flipX = tdx > 0 ? true : tdx < 0 ? false : player.sprite.flipX;
    
        let newxy = { x: this.player.location.x + tdx, y: this.player.location.y + tdy };
    
        let bg = this.sceneLayers[backgroundLayerName];
        if (newxy.x < 0 || newxy.y < 0 || newxy.x >= bg.width || newxy.y >= bg.height) return results;
    
        let bgTile = bg.tilemapLayer.getTileAt(newxy.x, newxy.y);
        if (bgTile.properties.obstacle === "stone") {
            results["effects"].push({ effect: "play-sound", spritelib: "sfx", spritesound: "boss hit" });
    
            return results;
        }
        // all validity checks are above this line. everything from here on is fx only.
        results.valid = true;
    
        occupyTransitionLayers.forEach(layerName => {
                // we are presently on a door tile: close the door after moving player.
                let mg = this.sceneLayers[layerName];
                let mgOutTile = mg.tilemapLayer.getTileAt(this.player.location.x, this.player.location.y);
                if (mgOutTile && mgOutTile.properties.feature === "door") {
                    results["effects"].push({ effect: "occupy-transition-out", layerName: layerName,
                        x: this.player.location.x, y: this.player.location.y, tileIndex: mgOutTile.index });
                }
                // moving into a door; paint an open one at "new" before moving player.
                var mgInTile = mg.tilemapLayer.getTileAt(newxy.x, newxy.y);
                if (mgInTile && mgInTile.properties.feature === "door") {
                    results["effects"].push({ effect: "occupy-transition-in", layerName: layerName,
                        x: newxy.x, y: newxy.y, tileIndex: mgInTile.index });
                }        });
    
        return results;
    }
    
    animateMove(player:SpriteTile, tdx:integer, tdy:integer) {
        this.playerMoving = true;
   
        let oc = () => { this.playerMoving = false; };
        let timeline = this.tweens.createTimeline(null);
        timeline.setCallback("onComplete", oc, [timeline], timeline);
    
        let xq:integer = tdx * this.sceneLayers[backgroundLayerName].tileWidth / 4;
        let yq:integer = tdy * this.sceneLayers[backgroundLayerName].tileHeight  / 4;
        for (var i = 1; i < 5; i++) {
            let dx:integer = xq * i;
            let dy:integer = yq * i;
            if (i % 2 === 1) dy -= 1;
            timeline.add({
                targets: player.sprite,
                x: player.sprite.x + dx,
                y: player.sprite.y + dy,
                duration: 20
            });
        }

        // abominable temp hack of course, but I want something to happen with monsters today.
        let monTimelines = Array<Phaser.Tweens.Timeline>();
        for (var n:integer = 0; n < this.monsters.length; n++) {
            let mon = this.monsters[n];
    
            let mtdx:integer = Math.floor((Math.random() * 3) - 1);
            let mtdy:integer = Math.floor((Math.random() * 3) - 1);
            let mtl:Phaser.Tweens.Timeline = this.tweens.createTimeline(null);
    
            let mxq:integer = mtdx * this.sceneLayers[backgroundLayerName].tileWidth / 4;
            let myq:integer = mtdy * this.sceneLayers[backgroundLayerName].tileHeight  / 4;
            for (let i:integer = 1; i < 5; i++) {
                let mdx:integer = mxq * i;
                let mdy:integer = myq * i;
                if (i % 2 === 1) mdy -= 3;
                mtl.add({
                    targets: mon.sprite,
                    x: mon.sprite.x + mdx,
                    y: mon.sprite.y + mdy,
                    duration: 20
                });
            }
            mtl.play();
        }
        monTimelines.forEach(mtl => { mtl.play(); });
    
        // this might actually belong here.
        this.sound.playAudioSprite("sfx", "squit");
        timeline.play();
    }
    
    handleOccupyTransition(occupyTransitionEffects:Array<MoveEffect>):void {
        //eventually this needs to be tweens that run in parallel, not in sequence like this.
        var layerNames = occupyTransitionEffects.map(fx => fx.layerName);
    
        layerNames.forEach(layerName => {
            var map = this.sceneLayers[layerName].tilemapLayer.tilemap;
    
            occupyTransitionEffects
                .filter(fx => fx.layerName === layerName)
                .forEach(fx => {
                    var newTileId = this.getOccupyTransitionTileId(map, layerName, fx.effect, fx.tileIndex);
                    map.putTileAt(newTileId, fx.x, fx.y);
                });
        });
    }
    
    getOccupyTransitionTileId(map:Phaser.Tilemaps.Tilemap, layerName:string, effect:string, tileIndex:integer):integer {
    
        if (effect !== 'occupy-transition-in' && effect !== 'occupy-transition-out') {
            console.error('unsupported effect "' + effect + '", returning original');
            return tileIndex;
        };
    
        var tilesetIndex = map.tilesets.findIndex(t => t.name === layerName);
        var columnNumber = (tileIndex - map.tilesets[tilesetIndex].firstgid) % map.tilesets[tilesetIndex].columns;
    
        if (isNaN(columnNumber)) {
            console.error('columnNumber for tileIndex was NaN, returning original');
            return tileIndex;
        }
    
        //this too can be made door-agnostic. possibly, we can use this for char animations once this happens.
    
        //yanno, we could inspect the map for all the non-zero tile ids used, and then make an object that cached tileids with their related partners.
        // could do this in preload. now we don't even care about the difference between xition in and out--just reverse whatever it was.
        // although, this maybe gets tricky when multiple agents are in/out on the same turn. maybe we need to know in/out.
    
        var doorBlockStarts = this.tileBlockMarkers.filter(m => m.marker === 'door').map(m => m.key);
    
        if (doorBlockStarts.length !== 2) {
            console.error('expected exactly 2 door block starts, got ' + doorBlockStarts.length + ", returning original");
            return tileIndex;
        };
    
        var delta = Math.abs(doorBlockStarts[0] - doorBlockStarts[1]);
    
        return (effect === 'occupy-transition-in')
            ? tileIndex + delta
            : tileIndex - delta;
    }
    
    initMap() {
        let map = this.add.tilemap('test-map');
    
        layerNames.forEach(name => {
            let tileset = map.addTilesetImage(name);
            map.createDynamicLayer(name, tileset, null, null);
        });
   
        map.layers.forEach(layer => {
            this.sceneLayers[layer.name] = layer;
    
            if (!layer.tilemapLayer) return;
    
            let tp = layer.tilemapLayer.tileset.tileProperties;
            let markers = Object.keys(tp)
                .filter(key => tp[key].hasOwnProperty('marker'))
                .map(key => ({ layerName: layer.name, key: parseInt(key), marker: tp[key]['marker'] }));
                this.tileBlockMarkers.push.apply(this.tileBlockMarkers, markers);
        });

        let charTilesetRaw = map.tilesets.filter(t => t.name === 'characters')[0];
        let charTilesData = Object
            .keys(charTilesetRaw.tileProperties)
            .map(function(k) {
                let t = parseInt(k) + charTilesetRaw.firstgid;
                return { chargid: t, name: charTilesetRaw.tileProperties[k].name, props: charTilesetRaw.tileProperties[k] }
            }).reduce(function(acc, cur) {
                acc[cur.chargid] = cur.props;
                return acc;
            }, {});
    
        // we only care about certain properties here.
        let charObjects = map.objects
            .filter(o => o.name === 'initial-characters')[0].objects
            .map(function(o) {
                let obj = { gid: parseInt(o.gid), x: o.x, y: o.y };
                Object.assign(obj, o.properties);
                return obj;
            });
    
        let playerPlaceholders = Object.keys(charTilesData).filter(d => charTilesData[d].name === 'player-placeholder');
        if (playerPlaceholders.length !== 1) throw `Failed to find unique player placeholder gid. Found ${playerPlaceholders.length}.`;
    
        let playerGid = parseInt(playerPlaceholders[0]);
        let playerPoint:Point = charObjects.filter(o => o.gid === playerGid)[0];
    
        //2259 is the frame. this is the SAME as the LOCAL id that you view while hovering in Tiled.
        // almost certainly this is because the firstgid for chartileset is 1.
        // however, we should be able to rely on this.  this means we can treat tileids and frame numbers interchangeably! awesome!
        //player = this.add.tileSprite(112, 112, 32, 32, 'characters', 2259);
        this.player = new SpriteTile();
        this.player.name = 'player';
        this.player.sprite = this.add.tileSprite(playerPoint.x + 16, playerPoint.y - 16, 32, 32, 'characters', 2260);

        let bgLayer = this.sceneLayers[backgroundLayerName];

        //no, this is NOT the same as backgroundLayer. once it is in "map" it gets extry stuff.
        let playerTile = bgLayer.tilemapLayer.getTileAtWorldXY(this.player.sprite.x, this.player.sprite.y);
        this.player.location = { x: playerTile.x, y: playerTile.y };

        //let monners = this.monsters;
        charObjects
            .filter(m => m.gid !== playerGid)
            .forEach((m) => {
                // again, spritesheet frame uses same indexing as tiled, except tiled has the gid offset.
                // let monsterSprite = this.add.tileSprite(m.x + 16, m.y - 16, 32, 32, 'characters', m.gid - charTilesetRaw.firstgid);
                //this.monsters.push({ name: charTilesData[m.gid].name, x: spriteTileLocation.x, y: spriteTileLocation.y, sprite: monsterSprite });
                let monster = new SpriteTile();
                monster.name = charTilesData[m.gid].name;
                monster.sprite = this.add.tileSprite(m.x + 16, m.y - 16, 32, 32, 'characters', m.gid - charTilesetRaw.firstgid);

                let spriteTileLocation = bgLayer.tilemapLayer.getTileAtWorldXY(monster.sprite.x, monster.sprite.y);
                monster.location = { x: spriteTileLocation.x, y: spriteTileLocation.y };

                this.monsters.push(monster);
            });
    
        //debugger;
        //test = map;
    }

}

