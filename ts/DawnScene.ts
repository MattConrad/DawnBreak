/// <reference path="./phaser.3d6.d.ts" />
// tslint:disable:curly

class DawnScene extends Phaser.Scene {

    constructor (config) {
        console.log(config);
        super(config);
    }

    // preload ():void {
    //     this.load.image('face', 'assets/pics/bw-face.png');
    // }

    // create ():void {
    //     this.face = this.add.image(400, 300, 'face');
    // }

}