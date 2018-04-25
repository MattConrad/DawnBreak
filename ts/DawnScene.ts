/// <reference path="./phaser.3d6.d.ts" />

// this one looks like it might actually work.
//https://stackoverflow.com/questions/42878257/with-just-typescript-no-webpack-and-no-bable-can-i-get-a-multiple-file-solutio

// https://stackoverflow.com/questions/42649220/visual-studio-typescript-uncaught-referenceerror-exports-is-not-defined-at/48436147#48436147
// https://stackoverflow.com/questions/31173738/typescript-getting-error-ts2304-cannot-find-name-require?rq=1

class DawnScene extends Phaser.Scene {

    constructor (config) {
        console.log(config);
        super(config);
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
        initMap(this);

        let graphics:Phaser.GameObjects.Graphics = this.add.graphics();

        this.cameras.main.startFollow(player);

        this.cameras.main.setScroll(0, 0);

        cursors = this.input.keyboard.createCursorKeys();

        // phaser is apparently a little slow on certain things. if phaser drags too much you can write your own custom cursor keys.
        // http://www.codeforeach.com/javascript/keycode-for-each-key-and-usage-with-demo
        morecursors = this.input.keyboard.addKeys({
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
        if (playerMoving) return;
    
        if (cursors.left.isDown || morecursors.numleft.isDown) {
            checkAndAnimateMove(this, player, -1, 0);
        } else if (cursors.right.isDown || morecursors.numright.isDown) {
            checkAndAnimateMove(this, player, +1, 0);
        } else if (cursors.down.isDown || morecursors.numdown.isDown) {
            checkAndAnimateMove(this, player, 0, +1);
        } else if (cursors.up.isDown || morecursors.numup.isDown) {
            checkAndAnimateMove(this, player, 0, -1);
        } else if (morecursors.numupright.isDown) {
            checkAndAnimateMove(this, player, +1, -1);
        } else if (morecursors.numdownright.isDown) {
            checkAndAnimateMove(this, player, +1, +1);
        } else if (morecursors.numupleft.isDown) {
            checkAndAnimateMove(this, player, -1, -1);
        } else if (morecursors.numdownleft.isDown) {
            checkAndAnimateMove(this, player, -1, +1);
        } else if (cursors.space.isDown) {
            bompPlayerSprite();
        }
    }
}

