/****************************************************************************
 Copyright (c) 2013-2014 Chukong Technologies Inc.

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

(function () {
    var mat3x3Transform = function (m, v, out) {
        var x = m[0] * v[0] + m[3] * v[1] + m[6];
        var y = m[1] * v[0] + m[4] * v[1] + m[7];
        var w = m[2] * v[0] + m[5] * v[1] + m[8];
        var iw = (w) ? (1 / w) : (1);
        out[0] = x * iw;
        out[1] = y * iw;
        return out;
    };

    var mat3x3Scale = function (m, x, y) {
        m[0] *= x;
        m[1] *= x;
        m[2] *= x;
        m[3] *= y;
        m[4] *= y;
        m[5] *= y;
        return m;
    };

    var mat3x3RotateCosSin = function (m, c, s) {
        var m0 = m[0];
        var m1 = m[1];
        var m3 = m[3];
        var m4 = m[4];
        m[0] = m0 * c + m3 * s;
        m[1] = m1 * c + m4 * s;
        m[3] = m3 * c - m0 * s;
        m[4] = m4 * c - m1 * s;
        return m;
    };

    var mat3x3Identity = function (m) {
        m[1] = m[2] = m[3] = m[5] = m[6] = m[7] = 0.0;
        m[0] = m[4] = m[8] = 1.0;
        return m;
    };

    var mat3x3Translate = function (m, x, y) {
        m[6] += m[0] * x + m[3] * y;
        m[7] += m[1] * x + m[4] * y;
        return m;
    };

    var drawImageMesh = function (triangles, positions, texcoords, image, site) {
        var ctx = cc._renderContext.getContext();

        var site_texmatrix = new Float32Array(9);
        var site_texcoord = new Float32Array(2);
        mat3x3Identity(site_texmatrix);

        var locScaleX = cc.view.getScaleX(), locScaleY = cc.view.getScaleY();

        image && mat3x3Scale(site_texmatrix, image.width, image.height);
        // http://www.irrlicht3d.org/pivot/entry.php?id=1329
        var index = 0;
        while(index < triangles.length) {
            var triangle0 = triangles[index++] * 2;
            var position0 = positions.subarray(triangle0, triangle0 + 2);
            var x0 = position0[0] * locScaleX;
            var y0 = position0[1] * locScaleY;
            var texcoord0 = mat3x3Transform(site_texmatrix, texcoords.subarray(triangle0, triangle0 + 2), site_texcoord);
            var u0 = texcoord0[0];
            var v0 = texcoord0[1];
            var triangle1 = triangles[index++] * 2;
            var position1 = positions.subarray(triangle1, triangle1 + 2);
            var x1 = position1[0] * locScaleX;
            var y1 = position1[1] * locScaleY;
            var texcoord1 = mat3x3Transform(site_texmatrix, texcoords.subarray(triangle1, triangle1 + 2), site_texcoord);
            var u1 = texcoord1[0];
            var v1 = texcoord1[1];
            var triangle2 = triangles[index++] * 2;
            var position2 = positions.subarray(triangle2, triangle2 + 2);
            var x2 = position2[0] * locScaleX;
            var y2 = position2[1] * locScaleY;
            var texcoord2 = mat3x3Transform(site_texmatrix, texcoords.subarray(triangle2, triangle2 + 2), site_texcoord);
            var u2 = texcoord2[0];
            var v2 = texcoord2[1];
            cc._renderContext.save();
            ctx.beginPath();
            y0 = -y0;
            y1 = -y1;
            y2 = -y2;

            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.closePath();
            ctx.clip();

            x1 -= x0;
            y1 -= y0;
            x2 -= x0;
            y2 -= y0;
            u1 -= u0;
            v1 -= v0;
            u2 -= u0;
            v2 -= v0;
            var id = 1 / (u1 * v2 - u2 * v1);
            var a = id * (v2 * x1 - v1 * x2);
            var b = id * (v2 * y1 - v1 * y2);
            var c = id * (u1 * x2 - u2 * x1);
            var d = id * (u1 * y2 - u2 * y1);
            var e = x0 - (a * u0 + c * v0);
            var f = y0 - (b * u0 + d * v0);
            ctx.transform(a, b, c, d, e, f);
            image && ctx.drawImage(image._htmlElementObj, 0, 0);
            cc._renderContext.restore();
        }
    };
var spine = sp.spine;

sp.Skeleton.CanvasRenderCmd = function (renderableObject) {
    this._rootCtor(renderableObject);
    this._needDraw = true;

    this._clipper = new sp.spine.SkeletonClipping();
    this.QUAD_TRIANGLES = [0, 1, 2, 2, 3, 0]
};

var proto = sp.Skeleton.CanvasRenderCmd.prototype = Object.create(cc.Node.CanvasRenderCmd.prototype);
proto.constructor = sp.Skeleton.CanvasRenderCmd;

proto.rendering = function (wrapper, scaleX, scaleY) {
    var node = this._node, i, len, slot, slotNode;
    wrapper = wrapper || cc._renderContext;

    var locSkeleton = node._skeleton, drawOrder = locSkeleton.drawOrder;


    for (i = 0, len = drawOrder.length; i < len; i++) {
        slot = drawOrder[i];
        slotNode = slot._slotNode;

        var attachment = slot.attachment;


        // get the vertices length
        var vertCount = 0;
        if (attachment instanceof spine.RegionAttachment) {
            vertCount = 6; // a quad = two triangles = six vertices
        }
        else if (attachment instanceof spine.MeshAttachment) {
            vertCount = attachment.regionUVs.length / 2;
        }
        else if(attachment instanceof spine.ClippingAttachment) {
            this._clipper.clipStart(slot, attachment);
            continue;
        }
        else {
            continue;
        }
        // no vertices to render
        if (vertCount === 0) {
            continue;
        }

        var regionTextureAtlas = node.getTextureAtlas(attachment);
        // Broken for changing batch info
        this._currTexture = regionTextureAtlas.texture.getRealTexture();

        var vertices = null;
        var uvs = null;
        var attachmentColor = null;
        var triangles = [];
        if (attachment instanceof spine.RegionAttachment) {
            vertices = spine.Utils.newFloatArray(8);
            attachment.computeWorldVertices(slot.bone, vertices, 0, 2);

            uvs = attachment.uvs;
            triangles = this.QUAD_TRIANGLES;
            attachmentColor = attachment.color;
            // slotDebugPoints = this._uploadRegionAttachmentData(attachment, slot, premultiAlpha, f32buffer, ui32buffer, vertexDataOffset);
        }
        else if (attachment instanceof spine.MeshAttachment) {
            var verticesLength = attachment.worldVerticesLength;
            vertices = spine.Utils.newFloatArray(verticesLength);
            attachment.computeWorldVertices(slot, 0, verticesLength, vertices, 0, 2);
            triangles  = attachment.triangles;
            uvs = attachment.uvs;
            attachmentColor = attachment.color;
            // this._uploadMeshAttachmentData(attachment, slot, premultiAlpha, f32buffer, ui32buffer, vertexDataOffset);
        }
        else {
            continue;
        }

        if(this._currTexture != null) {
            var finalColor = attachment.tempColor;

            if(this._clipper.isClipping()) {
                this._clipper.clipTriangles(vertices, vertices.length, triangles, triangles.length, uvs, finalColor, slot.darkColor, false);
                var clippedVertices = new Float32Array(this._clipper.clippedVertices);
                triangles = this._clipper.clippedTriangles;

                vertices = spine.Utils.newFloatArray( clippedVertices.length / 8 * 2);
                uvs =  spine.Utils.newFloatArray( clippedVertices.length / 8 * 2);

                var vertexIndex = 0;

                for (var v = 0, n = clippedVertices.length; v < n; v += 8) {
                    vertices[vertexIndex] = clippedVertices[v];
                    vertices[vertexIndex + 1] = clippedVertices[v + 1];

                    uvs[vertexIndex] = clippedVertices[v + 6];
                    uvs[vertexIndex + 1] = clippedVertices[v + 7];
                    vertexIndex += 2;
                }

                wrapper.save();
                wrapper.setGlobalAlpha(this.getDisplayedOpacity()/255);
                wrapper.setTransform(this._worldTransform, scaleX, scaleY);
                drawImageMesh(triangles,vertices, uvs, this._currTexture, regionTextureAtlas)
                wrapper.restore();

            } else {
                wrapper.save();
                wrapper.setGlobalAlpha(this.getDisplayedOpacity()/255);
                wrapper.setTransform(this._worldTransform, scaleX, scaleY);
                drawImageMesh(triangles,vertices, uvs, this._currTexture, regionTextureAtlas)
                wrapper.restore();
            }
        }

        this._clipper.clipEndWithSlot(slot);
    }

    this._clipper.clipEnd();

    if (!node._debugSlots && !node._debugBones)
        return;

    wrapper.setTransform(this._worldTransform, scaleX, scaleY);
    wrapper.setGlobalAlpha(1);
    var attachment, drawingUtil = cc._drawingUtil;


    if (node._debugSlots) {
        // Slots.
        drawingUtil.setDrawColor(0, 0, 255, 255);
        drawingUtil.setLineWidth(1);

        var points = [];
        for (i = 0, n = locSkeleton.slots.length; i < n; i++) {
            slot = locSkeleton.drawOrder[i];
            if (!slot.attachment || !(slot.attachment instanceof spine.RegionAttachment))
                continue;
            attachment = slot.attachment;
            this._updateRegionAttachmentSlot(attachment, slot, points);
            drawingUtil.drawPoly(points, 4, true);
        }
    }

    if (node._debugBones) {
        // Bone lengths.
        var bone;
        drawingUtil.setLineWidth(2);
        drawingUtil.setDrawColor(255, 0, 0, 255);

        for (i = 0, n = locSkeleton.bones.length; i < n; i++) {
            bone = locSkeleton.bones[i];
            var x = bone.data.length * bone.a + bone.worldX;
            var y = bone.data.length * bone.c + bone.worldY;
            drawingUtil.drawLine(
                {x: bone.worldX, y: bone.worldY},
                {x: x, y: y});
        }

        // Bone origins.
        var pointSize = 4;
        drawingUtil.setDrawColor(0, 0, 255, 255); // Root bone is blue.

        for (i = 0, n = locSkeleton.bones.length; i < n; i++) {
            bone = locSkeleton.bones[i];
            drawingUtil.drawPoint({x: bone.worldX, y: bone.worldY}, pointSize);
            if (i === 0)
                drawingUtil.setDrawColor(0, 255, 0, 255);
        }
    }
};

proto.updateStatus = function() {
    // this.originUpdateStatus();
    // this._updateCurrentRegions();
    this._regionFlag = cc.Node.CanvasRenderCmd.RegionStatus.DirtyDouble;
    this._dirtyFlag &= ~cc.Node._dirtyFlags.contentDirty;
//
};

proto.getLocalBB = function() {
    //return this._node.getBoundingBox();
};

proto._updateRegionAttachmentSlot = function (attachment, slot, points) {
    if (!points)
        return;

    // var vertices = spine.Utils.setArraySize(new Array(), 8, 0);
    // attachment.computeWorldVertices(slot.bone, vertices, 0, 2);
    // var VERTEX = spine.RegionAttachment;
    // points.length = 0;
    // points.push(cc.p(vertices[VERTEX.OX1], vertices[VERTEX.OY1]));
    // points.push(cc.p(vertices[VERTEX.OX4], vertices[VERTEX.OY4]));
    // points.push(cc.p(vertices[VERTEX.OX3], vertices[VERTEX.OY3]));
    // points.push(cc.p(vertices[VERTEX.OX2], vertices[VERTEX.OY2]));
};

proto._createChildFormSkeletonData = function () {
    // var node = this._node;
    // var locSkeleton = node._skeleton, spriteName, sprite;
    // for (var i = 0, n = locSkeleton.slots.length; i < n; i++) {
    //     var slot = locSkeleton.slots[i], attachment = slot.attachment;
    //     var slotNode = new cc.Node();
    //     slot._slotNode = slotNode;
    //
    //     if (attachment instanceof spine.RegionAttachment) {
    //         spriteName = attachment.region.name;
    //         sprite = this._createSprite(slot, attachment);
    //         slot.currentSprite = sprite;
    //         slot.currentSpriteName = spriteName;
    //         slotNode.addChild(sprite);
    //     } else if (attachment instanceof spine.MeshAttachment) {
    //         //todo for mesh
    //     }
    // }
};

var loaded = function (sprite, texture, attachment) {
    // var rendererObject = attachment.region;
    // var rect = new cc.Rect(rendererObject.x, rendererObject.y, rendererObject.width, rendererObject.height);
    // sprite.initWithTexture(texture, rect, rendererObject.rotate, false);
    // sprite._rect.width = attachment.width;
    // sprite._rect.height = attachment.height;
    // sprite.setContentSize(attachment.width, attachment.height);
    // sprite.setRotation(-attachment.rotation);
    // sprite.setScale(rendererObject.width / rendererObject.originalWidth * attachment.scaleX,
    //     rendererObject.height / rendererObject.originalHeight * attachment.scaleY);
};

proto._createSprite = function (slot, attachment) {
    // var rendererObject = attachment.region;
    // var texture = rendererObject.texture.getRealTexture();
    // var sprite = new cc.Sprite();
    // if (texture.isLoaded()) {
    //     loaded(sprite, texture, attachment);
    // } else {
    //     texture.addEventListener('load', function () {
    //         loaded(sprite, texture, attachment);
    //     }, this);
    // }
    // slot.sprites = slot.sprites || {};
    // slot.sprites[rendererObject.name] = sprite;
    // return sprite;
};

proto._updateChild = function () {
    // var locSkeleton = this._node._skeleton, slots = locSkeleton.slots;
    // var color = this._displayedColor, opacity = this._displayedOpacity;
    // var i, n, selSprite, ax, ay;
    //
    // var slot, attachment, slotNode;
    // for (i = 0, n = slots.length; i < n; i++) {
    //     slot = slots[i];
    //     attachment = slot.attachment;
    //     slotNode = slot._slotNode;
    //     if (!attachment) {
    //         slotNode.setVisible(false);
    //         continue;
    //     }
    //     if (attachment instanceof spine.RegionAttachment) {
    //         if (attachment.region) {
    //             if (!slot.currentSpriteName || slot.currentSpriteName !== attachment.name) {
    //                 var spriteName = attachment.region.name;
    //                 if (slot.currentSprite !== undefined)
    //                     slot.currentSprite.setVisible(false);
    //                 slot.sprites = slot.sprites || {};
    //                 if (slot.sprites[spriteName] !== undefined)
    //                     slot.sprites[spriteName].setVisible(true);
    //                 else {
    //                     var sprite = this._createSprite(slot, attachment);
    //                     slotNode.addChild(sprite);
    //                 }
    //                 slot.currentSprite = slot.sprites[spriteName];
    //                 slot.currentSpriteName = spriteName;
    //             }
    //         }
    //         var bone = slot.bone;
    //         if (attachment.region.offsetX === 0 && attachment.region.offsetY === 0) {
    //             ax = attachment.x;
    //             ay = attachment.y;
    //         }
    //         else {
    //             //var regionScaleX = attachment.width / attachment.regionOriginalWidth * attachment.scaleX;
    //             //ax = attachment.x + attachment.regionOffsetX * regionScaleX - (attachment.width * attachment.scaleX - attachment.regionWidth * regionScaleX) / 2;
    //             ax = (attachment.offset[0] + attachment.offset[4]) * 0.5;
    //             ay = (attachment.offset[1] + attachment.offset[5]) * 0.5;
    //         }
    //         slotNode.setPosition(bone.worldX + ax * bone.a + ay * bone.b, bone.worldY + ax * bone.c + ay * bone.d);
    //         slotNode.setScale(bone.getWorldScaleX(), bone.getWorldScaleY());
    //
    //         //set the color and opacity
    //         selSprite = slot.currentSprite;
    //         selSprite._flippedX = bone.skeleton.flipX;
    //         selSprite._flippedY = bone.skeleton.flipY;
    //         if (selSprite._flippedY || selSprite._flippedX) {
    //             slotNode.setRotation(bone.getWorldRotationX());
    //             selSprite.setRotation(attachment.rotation);
    //         } else {
    //             slotNode.setRotation(-bone.getWorldRotationX());
    //             selSprite.setRotation(-attachment.rotation);
    //         }
    //
    //         //hack for sprite
    //         selSprite._renderCmd._displayedOpacity = 0 | (opacity * slot.color.a);
    //         var r = 0 | (color.r * slot.color.r), g = 0 | (color.g * slot.color.g), b = 0 | (color.b * slot.color.b);
    //         selSprite.setColor(cc.color(r, g, b));
    //         selSprite._renderCmd._updateColor();
    //     } else if (attachment instanceof spine.MeshAttachment) {
    //         // Can not render mesh
    //     } else {
    //         slotNode.setVisible(false);
    //         continue;
    //     }
    //     slotNode.setVisible(true);
    // }
};

})();
