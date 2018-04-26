/// <reference path="./phaser.3d6.d.ts" />
/// <reference path="./DawnScene.ts" />

const layerNames:string[] = ["background", "middleground"];
const occupyTransitionLayers:string[] = ["middleground"];
const backgroundLayerName:string = "background";

const config:Object = {
    type: Phaser.AUTO,
    width: 768,
    height: 576,
    backgroundColor: "#000000",
    parent: "dawnbreak",
    pixelArt: true,
    scene: DawnScene
};

let game:Phaser.Game = new Phaser.Game(config);
