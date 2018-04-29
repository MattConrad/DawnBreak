interface MoveResults {
    valid: boolean;
    effects: Array<MoveEffect>;
}

interface MoveEffect {
    effect: string;
    spritelib?: string;
    spritesound?: string;
    layerName?: string;
    x?: integer;
    y?: integer;
    tileIndex?: integer;
}
