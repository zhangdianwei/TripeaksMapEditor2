
let segmentPerSpline = 1000

SplineNode = cc.Node.extend({
    ctor: function(){
        this._super();

        this.drawNode = new cc.DrawNode();
        this.addChild(this.drawNode);

        this.entryNode = new cc.Node();
        this.addChild(this.entryNode);

        this.drawNode2 = new cc.DrawNode();
        this.addChild(this.drawNode2);

        this.points = [cc.p(0,0), cc.p(100,100), cc.p(200,0)];
        this.pickIndex = -1;

        this.entryNum = 5; //一共显示多少个关卡点
        this.entryType = 0; //0=绿色，1=蓝色

        this.refreshView();
    },

    setPoints: function(points){
        this.points = points;
        this.refreshView();
    },

    getPoints: function(){
        return this.points;
    },

    setEntryNum: function(entryNum){
        this.entryNum = entryNum;
        this.refreshView();
    },

    refreshView: function(){
        this.drawNode.clear();
        this.drawNode2.clear();
        if (this.points.length==0) {
            return;
        }

        this.drawNode.drawCardinalSpline(this.points, 0.01, segmentPerSpline, 10, cc.color(0, 255, 0, 255));

        let entryPoints = this.getEntryPoints(this.entryNum);
        while(this.entryNode.children.length>entryPoints.length){
            let last = this.entryNode.children[this.entryNode.children.length-1];
            last.removeFromParent();
        }
        while(this.entryNode.children.length<entryPoints.length){
            let node = new SplineEntryNode();
            this.entryNode.addChild(node);
        }
        for(let i=0; i<entryPoints.length; ++i)
        {
            let node = this.entryNode.children[i];
            node.setPosition(entryPoints[i]);
            node.setLevelNumStart(this.levelNum+i);
        }

        for(let i=0; i<this.points.length; ++i)
        {
            this.drawNode2.drawCircle(this.points[i], 20, 360, 10, false, 10, cc.color(0,0,0));
        }
        if (this.pickIndex>=0) {
            this.drawNode2.drawCircle(this.points[this.pickIndex], 20, 360, 10, false, 10, cc.color(255,0,0));
        }
    },

    getCurveInfo: function(){
        var curveLengths, curvePoints, deltaT, dt, i, j, lastPoint, lt, newPos, point, ref, segments, tension, totalLength;

        // if (this.points.length < 2) {
        //   return 0;
        // }

        lastPoint = null;

        deltaT = 1.0 / this.points.length;

        segments = segmentPerSpline * 10;

        tension = 0.01;

        totalLength = 0;

        curvePoints = [];

        curveLengths = [];

        for (i = j = 0, ref = segments; (0 <= ref ? j <= ref : j >= ref); i = 0 <= ref ? ++j : --j) {
          dt = i / segments;
          if (dt === 1) {
            point = this.points.length - 1;
            lt = 1;
          } else {
            point = 0 | (dt / deltaT);
            lt = (dt - deltaT * point) / deltaT;
          }
          newPos = cc.cardinalSplineAt(cc.getControlPointAt(this.points, point - 1), cc.getControlPointAt(this.points, point - 0), cc.getControlPointAt(this.points, point + 1), cc.getControlPointAt(this.points, point + 2), tension, lt);
          if (lastPoint) {
            totalLength += cc.pDistance(newPos, lastPoint);
          }
          lastPoint = newPos;
          curvePoints.push(newPos);
          curveLengths.push(totalLength);
        }

        return {totalLength, curvePoints, curveLengths};

    },

    getEntryPoints: function(entry_num){
        var averageLength, curveInfo, i, j, len, length, nextEntranceLength, positions, ref;

        positions = [];

        if (entry_num <= 0) {
          return positions;
        }

        curveInfo = this.getCurveInfo();

        if (entry_num <= 2) {
          positions.push(curveInfo.curvePoints[0]);
        } else {
          averageLength = curveInfo.totalLength / (entry_num - 1);
          nextEntranceLength = 0;
          ref = curveInfo.curveLengths;
          for (i = j = 0, len = ref.length; j < len; i = ++j) {
            length = ref[i];
            if (length >= nextEntranceLength) {
              if (positions.length < entry_num) {
                positions.push(curveInfo.curvePoints[i]);
                nextEntranceLength += averageLength;
              }
            }
          }
        }

        if (positions.length < entry_num) {
          positions.push(curveInfo.curvePoints[curveInfo.curvePoints.length - 1]);
        }

        return positions;

    },

    onSelect: function(event, select){
        if (!select) {
            this.pickIndex = -1;
            this.refreshView();
        }
        else{
            let loc = this.convertToNodeSpace(event.getLocation());
            let pickIndex = this.points.findIndex((x)=>cc.pDistance(x, loc)<20);
            this.pickIndex = pickIndex;
            this.refreshView();
            if (this.pickIndex>=0) {
                return true;
            }
        }
    },

    onDrag: function(event){
        if (this.pickIndex<0) {
            return;
        }
        let loc = this.convertToNodeSpace(event.getLocation());
        this.points[this.pickIndex] = loc;
        this.refreshView();
    },

    onDump: function(){
        if (this.pickIndex<0) {
            return;
        }

        if (this.pickIndex==this.points.length-1) {
            let pt = this.points[this.pickIndex];
            pt = cc.p(pt.x+100, pt.y);
            this.points.splice(this.pickIndex+1, 0, pt);
        }
        else{
            let pt = cc.pLerp(this.points[this.pickIndex], this.points[this.pickIndex+1], 0.5);
            this.points.splice(this.pickIndex+1, 0, pt);
        }
        this.refreshView();
    },

    onDelete: function(){
        if (this.pickIndex<0) {
            return;
        }

        this.points.splice(this.pickIndex, 1);
        this.pickIndex = -1;
        this.refreshView();
    },
    // 执行删除命令后，这个节点本身是否还有必要存在
    shouldDelete: function(){
        return this.points.length<=1;
    },

    onChangeNodeState: function(){
        this.entryType = (this.entryType+1)%2;
        for(let i=0; i<this.entryNode.children.length; ++i)
        {
            this.entryNode.children[i].setEntryType(this.entryType);
        }
    },

    save: function(){
        let obj = {};
        obj.classname = "SplineNode";
        obj.x = this.x;
        obj.y = this.y;
        obj.points = this.points;
        obj.entryNum = this.entryNum;
        obj.entryType = this.entryType;
        return obj;
    },

    load: function(obj){
        this.x = obj.x;
        this.y = obj.y;
        this.points = obj.points;
        this.entryNum = obj.entryNum || 5;
        this.entryType = obj.entryType;
    },

    onExportCCBDoc: function(doc){
        let entryPoints = this.getEntryPoints(this.entryNum);
        for(let i=0; i<entryPoints.length; ++i)
        {
            let obj = {};
            let world = this.entryNode.convertToWorldSpace(entryPoints[i]);
            let local = this.parent.parent.convertToNodeSpace(world);
            let p = local;
            obj.x = parseFloat(p.x.toFixed(1));
            obj.y = parseFloat(p.y.toFixed(1));
            obj.t = this.entryType;
            doc.entries.push(obj);
        }
    },

    setLevelNumStart: function(num){
        this.levelNum = num;
        this.refreshView();
    },
    getLevelNumEnd: function(){
        return this.levelNum+this.entryNum-1;
    },

    getPickIndex: function(){
        return this.pickIndex;
    },
    setPickIndex: function(pickIndex){
        this.pickIndex = pickIndex;
        this.refreshView();
    },
});
