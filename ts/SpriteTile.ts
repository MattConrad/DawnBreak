// not to be confused with the TileSprite that is built into Phaser,
// this is an object that composes sprite and tile location.
// possibly this ends up as an inteface, but for now I'm guessing it will get some behavior.
class SpriteTile {
    public name:string;
    public location:Point;
    public sprite:Phaser.GameObjects.TileSprite
}
