
SplineEntryNode = cc.Node.extend({
    ctor: function(){
        this._super();

        this.entry_di = new cc.Sprite("entry_di.png");
        this.addChild(this.entry_di);
        this.entry_di.setPosition(0, -11);

        this.entry_front = new cc.Sprite("entry_front0.png");
        this.addChild(this.entry_front);
        this.entry_front.setPosition(0, 0);

        this.label = new cc.LabelTTF("title", "Arial", 26, cc.size(0,0), cc.TEXT_ALIGNMENT_LEFT, cc.VERTICAL_TEXT_ALIGNMENT_TOP);
        this.addChild(this.label);
        this.label.enableShadow(cc.color(0,0,0), cc.p(3,-1));
    },

    setLevelNumStart: function(num){
        this.label.setString(num+"");
    },

    // type: 0=绿色，1=蓝色
    setEntryType: function(type){
        let sprite = cc.spriteFrameCache.getSpriteFrame(`entry_front${type}.png`);
        this.entry_front.setSpriteFrame(sprite);
    },
});
