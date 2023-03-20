// import * as Spline from "./Spline"

let MapLayer = cc.Layer.extend({
    ctor: function() {
        this._super(cc.color(0,0,0));

        this.moveNode = new cc.Node(); //所有随地图移动的节点都是moveNode的子节点
        this.addChild(this.moveNode);
        this.moveNode.name = "moveNode";

        this.bgNode = new cc.Node();
        this.moveNode.addChild(this.bgNode);
        this.bgNode.setPosition(-200,320);

        cc.eventManager.addListener({
            event: cc.EventListener.MOUSE,
            swallowTouches: true,
            onMouseDown: this.onMouseDown.bind(this),
            onMouseMove: this.onMouseMove.bind(this),
            onMouseUp: this.onMouseUp.bind(this),
            onMouseScroll: this.onMouseScroll.bind(this),
        }, this);

        cc.eventManager.addListener({
            event: cc.EventListener.KEYBOARD,
            onKeyPressed: this.onKeyPressed.bind(this),
            onKeyReleased: this.onKeyReleased.bind(this),
        }, this);
        this.keyRecords = {};
        this.hotkeys = {
            "d": this.onDump.bind(this),
            "Delete": this.onDelete.bind(this),
            "backspace": this.onDelete.bind(this),
            "t": this.onDebugLog.bind(this),
            "tab": this.onChangeNodeState.bind(this),
            "dash": this.onSubEntryNum.bind(this),
            "equal": this.onAddEntryNum.bind(this),
            "-": this.onSubEntryNum.bind(this),
            "+": this.onAddEntryNum.bind(this),
        };

        this.editNode = new cc.Node(); //所有chest和spline的父节点
        this.moveNode.addChild(this.editNode);

        this.pickNodes = []; //所有选中的节点

        this.mousePosition = cc.p(0,0);

        this.menuNode = this.createMenuNode();
        this.addChild(this.menuNode);
        this.showMenu(null);
    },

    createMenuNode: function(){
        let menuNode = new cc.Node();
        menuNode.addChild(this.createButton("创建曲线", this.onCreateSpline.bind(this)));
        menuNode.addChild(this.createButton("创建宝箱", this.onCreateChest.bind(this)));
        menuNode.addChild(this.createButton("300关切割", this.onSmartSplitSpline.bind(this)));
        for(let i=0; i<menuNode.children.length; ++i)
        {
            menuNode.children[i].setPosition(0, -i*60);
        }
        return menuNode;
    },

    createButton: function(title, callback){
        let button = new ccui.Button("button_normal.png");
        button.addClickEventListener(callback);
        button.setPressedActionEnabled(true);
        button.setZoomScale(-0.05);

        let label = new cc.LabelTTF(title, "Arial", 32, cc.size(0,0), cc.TEXT_ALIGNMENT_CENTER, cc.VERTICAL_TEXT_ALIGNMENT_CENTER);
        button.addChild(label);
        label.setPosition(90, 42);

        return button;
    },

    showMenu: function(pos){
        if (pos && this.doc) {
            this.menuNode.setVisible(true);
            this.menuNode.setPosition(cc.p(pos.x+50, pos.y));
            this.menuNode.setScale(0);
            this.menuNode.runAction(cc.sequence([
                cc.scaleTo(0.1, 1).easing(cc.easeOut(1.2))
            ]));
        }
        else {
            this.menuNode.setVisible(false);
        }
    },

    onCreateSpline: function(){
        let node = new SplineNode();
        this.editNode.addChild(node);
        let loc = this.editNode.convertToNodeSpace(this.mousePosition);
        node.setPosition(loc);

        this.rebuildLevelNum();

        this.showMenu(null);
    },

    onCreateChest: function(){
        let node = new ChestNode();
        this.editNode.addChild(node);
        let loc = this.editNode.convertToNodeSpace(this.mousePosition);
        node.setPosition(loc);
        
        this.rebuildLevelNum();

        this.showMenu(null);
    },

    isMultiSelect: function(){
        return this.keyRecords[cc.KEY.ctrl] || this.keyRecords[cc.KEY.cmd];
    },

    onMouseDown:function(event) {
        // console.log("mouse", JSON.stringify(event.getLocation()));
        this.showMenu(null);

        for(let i=0; i<this.pickNodes.length; ++i)
        {
            this.pickNodes[i].onSelect(event, false);
        }
        this.pickNodes.length = 0;

        let pickNode = this.editNode.children.find((node)=>node.onSelect(event, true));
        if (pickNode) {
            this.pickNodes.push(pickNode);
        }
    },
    onMouseMove:function(event){
        this.mousePosition = event.getLocation();

        if (event.getButton()==cc.EventMouse.BUTTON_LEFT)
        {
            if (this.pickNodes.length>0) //移动edit对象
            {
                for(let i=0; i<this.pickNodes.length; ++i)
                {
                    let node = this.pickNodes[i];
                    if (node.onDrag) {
                        node.onDrag(event);
                    }
                    else{
                        let loc = this.editNode.convertToNodeSpace(event.getLocation());
                        node.setPosition(loc);
                    }
                }
            }
            else //移动地图
            {
                this.moveNode.x += event.getDelta().x*2;
                this.moveNode.x = cc.clampf(this.moveNode.x, -this.getBgMinX(), 0);
            }
        }
    },
    onMouseUp:function(event){
        if (event.getButton()==cc.EventMouse.BUTTON_RIGHT) {
            let loc = this.convertToNodeSpace(event.getLocation());
            this.showMenu(loc);
        }
    },

    onMouseScroll: function(event){
        for(let i=0; i<this.pickNodes.length; ++i)
        {
            let node = this.pickNodes[i];
            if (node.setEntryNum) {
                let entryNum = event.getScrollY()>0?node.entryNum+1:node.entryNum-1;
                entryNum = cc.clampf(entryNum, 2, 300);
                node.setEntryNum(entryNum);
            }
        }
    },

    onSubEntryNum: function(){
        for(let i=0; i<this.pickNodes.length; ++i)
        {
            let node = this.pickNodes[i];
            if (node.setEntryNum) {
                entryNum = Math.max(node.entryNum-10, 2);
                node.setEntryNum(entryNum);
            }
        }
    },
    onAddEntryNum: function(){
        for(let i=0; i<this.pickNodes.length; ++i)
        {
            let node = this.pickNodes[i];
            if (node.entryNum) {
                node.setEntryNum(node.entryNum+10);
            }
        }
    },

    onKeyPressed: function(keycode, event){
        this.keyRecords[keycode] = 1;
    },
    onKeyReleased: function(keycode, event){
        delete this.keyRecords[keycode];

        let key_index = [];
        if (this.keyRecords[cc.KEY.ctrl]) {
            key_index.push("ctrl");
        }
        if (this.keyRecords[91]) {
            key_index.push("cmd");
        }
        if (this.keyRecords[cc.KEY.shift]) {
            key_index.push("shift");
        }
        key_index.push(this.getNameByKeyCode(keycode));
        key_index = key_index.join(" ");

        // console.log("onKeyReleased", keycode, "key_index", key_index);

        let func = this.hotkeys[key_index];
        if (func) {
            func();
        }
    },

    getNameByKeyCode: function(keycode){
        if (keycode==91) {
            return "cmd";
        }

        for(let name in cc.KEY)
        {
            if (cc.KEY[name]==keycode) {
                return name;
            }
        }
    },

    // 背景最多向左能移动多少像素
    getBgMinX: function(){
        return (1386+1386*10+200);
    },

    onDump: function(){
        // console.log("onDump");
        for(let i=0; i<this.pickNodes.length; ++i)
        {
            let node = this.pickNodes[i];
            if (node.onDump) {
                node.onDump();
            }
        }
    },

    onDelete: function(){
        for(let i=0; i<this.pickNodes.length; ++i)
        {
            let node = this.pickNodes[i];
            if (node.onDelete) {
                node.onDelete();
            }
        }

        let shouldDelete = this.pickNodes.filter((node)=>node.shouldDelete?node.shouldDelete():true);
        for(let i=0; i<shouldDelete.length; ++i)
        {
            let node = shouldDelete[i];
            node.removeFromParent();
        }
        this.pickNodes.length=0;
    },

    onDebugLog: function(){
    },

    onChangeNodeState: function(){
        for(let i=0; i<this.pickNodes.length; ++i)
        {
            let node = this.pickNodes[i];
            if (node.onChangeNodeState) {
                node.onChangeNodeState();
            }
        }
    },

    save: function(){
        if (!this.doc) {
            return {};
        }

        let doc = {
            chapterNum: this.doc.chapterNum,
            obj: [],
        };
        for(let i=0; i<this.editNode.children.length; ++i)
        {
            let node = this.editNode.children[i];
            let node_obj = node.save();
            doc.obj.push(node_obj);
        }
        return doc;
    },

    onExportCCBDoc: function(){
        if (!this.doc) {
            return {};
        }
        let doc = {
            chapterNum: this.doc.chapterNum,
            entries: [],
            chests: [],
        };
        for(let i=0; i<this.editNode.children.length; ++i)
        {
            let node = this.editNode.children[i];
            node.onExportCCBDoc(doc);
        }
        return doc;
    },

    rebuildLevelNum: function(){
        let splines = this.editNode.children.filter((node)=>node instanceof SplineNode);
        splines.sort((a,b)=>a.x-b.x);
        for(let i=0; i<splines.length; ++i)
        {
            splines[i].setLocalZOrder(i+1);
        }
        for(let i=0; i<splines.length; ++i)
        {
            let node = splines[i];
            let pre = splines[i-1];
            if (i==0) {
                node.setLevelNumStart(1);
            }
            else{
                node.setLevelNumStart(pre.getLevelNumEnd()+1);
            }
        }

        let chests = this.editNode.children.filter((node)=>node instanceof ChestNode);
        chests.sort((a,b)=>a.x-b.x);
        for(let i=0; i<chests.length; ++i)
        {
            chests[i].setLocalZOrder(10000+i+1);
        }
        for(let i=0; i<chests.length; ++i)
        {
            let node = chests[i];
            let pre = chests[i-1];
            if (i==0) {
                node.setLevelNumStart(1);
            }
            else{
                node.setLevelNumStart(pre.getLevelNumEnd()+1);
            }
        }
    },

    // doc: {obj,chapterNum}
    load: function(doc){
        this.doc = doc;

        this.reload_bg();
        this.reload_editNode();

        if (this.editNode.children.length==0) {
            let node = new SplineNode();
            this.editNode.addChild(node);
            node.setPosition(cc.p(377,182));
        }

        this.rebuildLevelNum();
    },

    reload_bg: function(){
        let root = `${window.localStorage.getItem("git_root")}/ResourcesTripeasks_B/Resources`;
        let files = [];
        if (this.doc.chapterNum===1) {
            for(let i=0; i<10; ++i)
            {
                files.push(`${root}/lobby/map/world_${this.doc.chapterNum}/sprite/lobby${this.doc.chapterNum}_${i+1}.jpg`);
            }
        }
        else if (this.doc.chapterNum===2) {
            for(let i=0; i<8; ++i)
            {
                files.push(`${root}/lobby/map/world_${this.doc.chapterNum}/sprite/lobby${this.doc.chapterNum}_${i+1}.jpg`);
            }
        }
        else if (this.doc.chapterNum===3) {
            for(let i=0; i<10; ++i)
            {
                files.push(`${root}/lobby/map/world_${this.doc.chapterNum}/sprite/lobby${this.doc.chapterNum}_${i+1}.jpg`);
            }
        }
        else{
            for(let i=0; i<12; ++i)
            {
                files.push(`${root}/world_${this.doc.chapterNum}_opt/lobby/map/sprite/lobby${this.doc.chapterNum}_${i+1}.jpg`);
            }
        }

        files = files.map((x)=>window.__TAURI__.tauri.convertFileSrc(x));

        this.moveNode.setPosition(0,0);
        this.bgNode.removeAllChildren();
        cc.loader.load(files, (err, reses)=>{
            let pos = cc.p(0,0);
            for(let i=0; i<reses.length; ++i)
            {
                let node = new cc.Sprite(reses[i]);
                node.setAnchorPoint(cc.p(0,0.5));
                this.bgNode.addChild(node);
                node.setPosition(pos);

                let drawNode = new cc.DrawNode();
                node.addChild(drawNode);
                drawNode.drawRect(cc.p(0,0), cc.p(node.width,node.height), null, 5, cc.color(128,128,128,255));

                let label = new cc.LabelTTF(`${i+1}`, "Arial", 64, cc.size(0,0), cc.TEXT_ALIGNMENT_LEFT, cc.VERTICAL_TEXT_ALIGNMENT_BOTTOM);
                node.addChild(label);
                label.enableShadow(cc.color(0,0,0), cc.p(5,-2));
                label.setPosition(50,100);

                pos.x += node.width;
            }
        });
    },

    reload_editNode: function(){
        this.editNode.removeAllChildren();
        if (!this.doc.obj) {
            return;
        }
        for(let i=0; i<this.doc.obj.length; ++i)
        {
            let node_obj = this.doc.obj[i];
            let node = new window[node_obj.classname]();
            node.load(node_obj);
            this.editNode.addChild(node);
        }
    },

    showTip: function(msg){
        let node = new cc.Node();
        
        let label = new cc.LabelTTF(msg, "Arial", 64, cc.size(0,0), cc.TEXT_ALIGNMENT_CENTER, cc.VERTICAL_TEXT_ALIGNMENT_CENTER);
        label.setColor(cc.color(200,0,0));
        label.enableShadow(cc.color(0,0,0), cc.p(3,-2));
        node.addChild(label);

        this.addChild(node);
        node.setPosition(cc.winSize.width/2, cc.winSize.height/2);
        node.runAction(cc.sequence([
            cc.delayTime(2.0),
            cc.removeSelf()
        ]));
    },

    onSmartSplitSpline: function(){
        if (this.editNode.children.length!=4) {
            this.showTip(`必须有${this.editNode.children.length}/4条总线`);
            return;
        }

        let totals = this.editNode.children.slice();
        for(let i=0; i<totals.length; ++i)
        {
            let total = totals[i];
            this.smartSplitSplineOne(total);
        }

        for(let i=0; i<totals.length; ++i)
        {
            let total = totals[i];
            total.removeFromParent();
        }
        this.rebuildLevelNum();
    },
    smartSplitSplineOne: function(total){
        total.setEntryNum(75);

        // 布点：在所有关卡点的位置，生成控制点
        let positions = total.getEntryPoints(total.entryNum);
        total.resetPoints(positions);

        // 找出3个宝箱的位置
        positions = total.getEntryPoints(4);
        positions.shift(); //删掉第一个没用的
        // 给找出的位置上都加上宝箱
        for(let i=0; i<positions.length; ++i)
        {
            let node = new ChestNode();
            this.editNode.addChild(node);
            let world = total.convertToWorldSpace(positions[i]);
            let loc = this.editNode.convertToNodeSpace(world);
            node.setPosition(loc);
        }

        // 所有关卡点，每25关分一段
        for(let i=0; i<total.points.length; i+=25)
        {
            let points = total.points.slice(i, i+25);
            if (i>0) { //删掉一个点，给宝箱留点地方
                points.shift();
            }
            let node = new SplineNode();
            this.editNode.addChild(node);
            node.setPosition(total.getPosition());
            node.resetPoints(points);
            node.setEntryNum(25);
        }
    },
});

