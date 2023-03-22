
ChestNode = cc.Node.extend({
    ctor: function(){
        this._super();

        this.chestImg = new cc.Sprite();
        this.addChild(this.chestImg);

        this.opened = true;
        this.selected = false;
        this.levelNum = 1;

        this.label = new cc.LabelTTF("title", "Arial", 64, cc.size(0,0), cc.TEXT_ALIGNMENT_LEFT, cc.VERTICAL_TEXT_ALIGNMENT_TOP);
        this.addChild(this.label);
        this.label.enableShadow(cc.color(0,0,0), cc.p(3,-2));

        this.refreshView();
    },

    setOpened: function(opened){
        this.opened = opened;
        this.refreshView();
    },
    isOpened: function(){
        return this.opened;
    },

    refreshView: function(){
        let sprite = cc.spriteFrameCache.getSpriteFrame(this.opened?"chest_open.png":"chest_close.png");
        this.chestImg.setSpriteFrame(sprite);
        if (this.selected) {
            this.chestImg.setColor(cc.color(255,0,0));
        }
        else{
            this.chestImg.setColor(cc.color(255,255,255));
        }
        this.label.setString(this.levelNum);
    },

    onSelect: function(event, select){
        if (!select) {
            this.selected = false;
            this.refreshView();
        }
        else{
            let loc = this.convertToNodeSpace(event.getLocation());
            if (cc.rectContainsPoint(this.chestImg.getBoundingBox(), loc)) {
                this.selected = true;
                this.refreshView();
                return true;
            }
        }
    },

    onChangeNodeState: function(){
        this.setOpened(!this.isOpened());
    },

    save: function(){
        let obj = {};
        obj.classname = "ChestNode";
        obj.x = this.x;
        obj.y = this.y;
        obj.opened = this.opened;
        obj.levelNum = this.levelNum;
        return obj;
    },

    load: function(obj){
        this.x = obj.x;
        this.y = obj.y;
        this.opened = obj.opened;
    },

    onExportCCBDoc: function(doc){
        let obj = {};
        obj.x = parseFloat(this.x.toFixed(1));
        obj.y = parseFloat(this.y.toFixed(1));
        let entries = doc.entries;
        for (let i = 0; i < entries.length; i++) {
            let entryPoint = entries[i];
            if (this.x > entryPoint.x)
                obj.aei = i + 1;
        }

        doc.chests.push(obj);
    },

    setLevelNumStart: function(num){
        this.levelNum = num;
        this.refreshView();
    },
    getLevelNumEnd: function(){
        return this.levelNum;
    },
});
