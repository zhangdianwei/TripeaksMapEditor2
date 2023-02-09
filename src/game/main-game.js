
function onGameStart(){
    let scene = new cc.Scene();
    let layer = new cc.LayerColor(cc.color(128,200,128));
    scene.addChild(layer);
    cc.director.runScene(scene);

    let mapLayer = new MapLayer();
    layer.addChild(mapLayer);

    cc.eventManager.addCustomListener("onChangeChapter", function(param){
        mapLayer.load(param.getUserData());
    });

    cc.eventManager.addCustomListener("onExportCCBDoc", function(param){
        param.getUserData().doc = mapLayer.onExportCCBDoc();
    });

    cc.eventManager.addCustomListener("onSaveDoc", function(param){
        param.getUserData().doc = mapLayer.save();
    });

    cc.eventManager.addCustomListener("onLoadDoc", function(param){
        mapLayer.load(param.getUserData().doc);
    });
}

cc.game.onStart = function(){
    let game_frame = document.getElementById("game_frame");
    cc.view.setDesignResolutionSize(game_frame.clientWidth, game_frame.clientHeight, cc.ResolutionPolicy.SHOW_ALL);

    cc.KEY.cmd = 91; //mac的command键

    let files = [
        "chest_open.png",
        "chest_close.png",
        "entry_di.png",
        "entry_front0.png",
        "entry_front1.png",
    ];
    cc.loader.load(files, (err, reses)=>{
        for(let i=0; i<files.length; ++i)
        {
            let texture = cc.textureCache.getTextureForKey(files[i]);
            let size = texture.getContentSize()
            let frame = cc.SpriteFrame.createWithTexture(texture, cc.rect(0,0,size.width,size.height));
            cc.spriteFrameCache.addSpriteFrame(frame, files[i]);
        }

        onGameStart();
    });
}
cc.game.run();

