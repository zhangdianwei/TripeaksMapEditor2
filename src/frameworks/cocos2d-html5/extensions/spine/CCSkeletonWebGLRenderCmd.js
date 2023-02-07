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

var spine = sp.spine;

sp.Skeleton.WebGLRenderCmd = function (renderableObject) {
    this._rootCtor(renderableObject);
    this._needDraw = true;
    this._matrix = new cc.math.Matrix4();
    this._matrix.identity();
    this._currTexture = null;
    this._currBlendFunc = {};
    this.vertexType = cc.renderer.VertexType.CUSTOM;
    this.setShaderProgram(cc.shaderCache.programForKey(cc.SHADER_SPRITE_POSITION_TEXTURECOLOR));

    this._clipper = new sp.spine.SkeletonClipping();
    this.QUAD_TRIANGLES = [0, 1, 2, 2, 3, 0]
};

var proto = sp.Skeleton.WebGLRenderCmd.prototype = Object.create(cc.Node.WebGLRenderCmd.prototype);
proto.constructor = sp.Skeleton.WebGLRenderCmd;

proto.uploadData = function (f32buffer, ui32buffer, vertexDataOffset){
    var node = this._node;
    var color = this._displayedColor, locSkeleton = node._skeleton;

    var attachment, slot, i, len;
    var premultiAlpha = node._premultipliedAlpha;

    locSkeleton.r = color.r / 255;
    locSkeleton.g = color.g / 255;
    locSkeleton.b = color.b / 255;
    locSkeleton.a = this._displayedOpacity / 255;
    if (premultiAlpha) {
        locSkeleton.r *= locSkeleton.a;
        locSkeleton.g *= locSkeleton.a;
        locSkeleton.b *= locSkeleton.a;
    }

    var nodeColor = this._displayedColor;
    var nodeR = nodeColor.r,
        nodeG = nodeColor.g,
        nodeB = nodeColor.b,
        nodeA = this._displayedOpacity;


    // var debugSlotsInfo = null;
    // if (this._node._debugSlots) {
    //     debugSlotsInfo = [];
    // }

    var skeletonColor = locSkeleton.color;


    var wt = this._worldTransform,
        wa = wt.a, wb = wt.b, wc = wt.c, wd = wt.d,
        wx = wt.tx, wy = wt.ty,
        z = this._node.vertexZ;

    for (i = 0, len = locSkeleton.drawOrder.length; i < len; i++) {
        slot = locSkeleton.drawOrder[i];
        if (!slot.attachment)
            continue;
        attachment = slot.attachment;

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
        var batchBroken = cc.renderer._updateBatchedInfo(this._currTexture, this._getBlendFunc(slot.data.blendMode, premultiAlpha), this._glProgramState);

        // keep the same logic with RendererWebGL.js, avoid vertex data overflow
        var uploadAll = vertexDataOffset / 6 + vertCount > (cc.BATCH_VERTEX_COUNT - 200) * 0.5;
        // Broken for vertex data overflow
        if (!batchBroken && uploadAll) {
            // render the cached data
            cc.renderer._batchRendering();
            batchBroken = true;
        }

        if (batchBroken) {
            vertexDataOffset = 0;
        }

        // update the vertex buffer
        var slotDebugPoints = null;
        var vertices = null;
        var uvs = null;
        var attachmentColor = null;
        var triangles = [];
        if (attachment instanceof spine.RegionAttachment) {
            vertices = spine.Utils.setArraySize(new Array(), 8, 0);
            attachment.computeWorldVertices(slot.bone, vertices, 0, 2);

            uvs = attachment.uvs;
            triangles = this.QUAD_TRIANGLES;
            attachmentColor = attachment.color;
        }
        else if (attachment instanceof spine.MeshAttachment) {
            var verticesLength = attachment.worldVerticesLength;
            vertices = spine.Utils.setArraySize(new Array(), verticesLength, 0);
            attachment.computeWorldVertices(slot, 0, verticesLength, vertices, 0, 2);
            triangles  = attachment.triangles;
            uvs = attachment.uvs;
            attachmentColor = attachment.color;
        }
        else {
            continue;
        }

        if(this._currTexture != null) {
            var slotColor = slot.color;
            var finalColor = attachment.tempColor;

            finalColor.r = skeletonColor.r * slotColor.r * attachmentColor.r;
            finalColor.g = skeletonColor.g * slotColor.g * attachmentColor.g;
            finalColor.b = skeletonColor.b * slotColor.b * attachmentColor.b;
            finalColor.a = skeletonColor.a * slotColor.a * attachmentColor.a;

            if (premultiAlpha) {
                finalColor.r *= finalColor.a;
                finalColor.g *= finalColor.a;
                finalColor.b *= finalColor.a;
            }

            if(this._clipper.isClipping()) {
                this._clipper.clipTriangles(vertices, vertices.length, triangles, triangles.length, uvs, finalColor, slot.darkColor, false);
                var clippedVertices = new Float32Array(this._clipper.clippedVertices);
                triangles = this._clipper.clippedTriangles;
                var verts = clippedVertices;

                vertCount = clippedVertices.length / 8;

                var uploadAll = vertexDataOffset / 6 + vertCount > (cc.BATCH_VERTEX_COUNT - 200) * 0.5;
                // Broken for vertex data overflow
                if (uploadAll) {
                    // render the cached data
                    cc.renderer._batchRendering();
                    batchBroken = true;
                    vertexDataOffset = 0;
                }

                var offset = vertexDataOffset;

                for (var v = 0, n = clippedVertices.length; v < n; v += 8) {

                    var vx = verts[v];
                    var vy = verts[v + 1];

                    var x = vx * wa + vy * wb + wx,
                        y = vx * wc + vy * wd + wy;

                    var r = verts[v + 2] * nodeR,
                        g = verts[v + 3] * nodeG,
                        b = verts[v + 4] * nodeB,
                        a = verts[v + 5] * nodeA;

                    var color = ((a<<24) | (b<<16) | (g<<8) | r);

                    f32buffer[offset] = x;
                    f32buffer[offset + 1] = y;
                    f32buffer[offset + 2] = z;
                    ui32buffer[offset + 3] = color;
                    f32buffer[offset + 4] = verts[v + 6];
                    f32buffer[offset + 5] = verts[v + 7];
                    offset += 6;
                }
            } else {
                var verts = vertices;
                var offset = vertexDataOffset;

                for (var v = 0, n = vertices.length; v < n; v += 2) {

                    var vx = verts[v];
                    var vy = verts[v + 1];

                    var x = vx * wa + vy * wb + wx,
                        y = vx * wc + vy * wd + wy;

                    var r = finalColor.r * nodeR,
                        g = finalColor.g * nodeG,
                        b = finalColor.b * nodeB,
                        a = finalColor.a * nodeA;

                    var color = ((a<<24) | (b<<16) | (g<<8) | r);

                    f32buffer[offset] = x;
                    f32buffer[offset + 1] = y;
                    f32buffer[offset + 2] = z;
                    ui32buffer[offset + 3] = color;
                    f32buffer[offset + 4] = uvs[v];
                    f32buffer[offset + 5] = uvs[v + 1];
                    offset += 6;
                }
            }
        }



        // if (this._node._debugSlots) {
        //     debugSlotsInfo[i] = slotDebugPoints;
        // }

        // update the index buffer
        cc.renderer._increaseBatchingSize(vertCount, cc.renderer.VertexType.CUSTOM, triangles);

        this._clipper.clipEndWithSlot(slot);
        // update the index data
        vertexDataOffset += vertCount * 6;
    }

    this._clipper.clipEnd();

    // if (node._debugBones || node._debugSlots) {
    //     // flush previous vertices
    //     cc.renderer._batchRendering();
    //
    //     var wt = this._worldTransform, mat = this._matrix.mat;
    //     mat[0] = wt.a;
    //     mat[4] = wt.c;
    //     mat[12] = wt.tx;
    //     mat[1] = wt.b;
    //     mat[5] = wt.d;
    //     mat[13] = wt.ty;
    //     cc.kmGLMatrixMode(cc.KM_GL_MODELVIEW);
    //     cc.current_stack.stack.push(cc.current_stack.top);
    //     cc.current_stack.top = this._matrix;
    //     var drawingUtil = cc._drawingUtil;
    //
    //     if (node._debugSlots && debugSlotsInfo && debugSlotsInfo.length > 0) {
    //         // Slots.
    //         drawingUtil.setDrawColor(0, 0, 255, 255);
    //         drawingUtil.setLineWidth(1);
    //
    //         for (i = 0, n = locSkeleton.slots.length; i < n; i++) {
    //             var points = debugSlotsInfo[i];
    //             if (points) {
    //                 drawingUtil.drawPoly(points, 4, true);
    //             }
    //         }
    //     }
    //
    //     if (node._debugBones) {
    //         // Bone lengths.
    //         var bone;
    //         drawingUtil.setLineWidth(2);
    //         drawingUtil.setDrawColor(255, 0, 0, 255);
    //
    //         for (i = 0, n = locSkeleton.bones.length; i < n; i++) {
    //             bone = locSkeleton.bones[i];
    //             var x = bone.data.length * bone.a + bone.worldX;
    //             var y = bone.data.length * bone.c + bone.worldY;
    //             drawingUtil.drawLine(cc.p(bone.worldX, bone.worldY), cc.p(x, y));
    //         }
    //
    //         // Bone origins.
    //         drawingUtil.setPointSize(4);
    //         drawingUtil.setDrawColor(0, 0, 255, 255); // Root bone is blue.
    //
    //         for (i = 0, n = locSkeleton.bones.length; i < n; i++) {
    //             bone = locSkeleton.bones[i];
    //             drawingUtil.drawPoint(cc.p(bone.worldX, bone.worldY));
    //             if (i == 0) {
    //                 drawingUtil.setDrawColor(0, 255, 0, 255);
    //             }
    //         }
    //     }
    //     cc.kmGLPopMatrix();
    // }

    return 0;
};

proto._getBlendFunc = function (blendMode, premultiAlpha) {
    var ret = this._currBlendFunc;
    switch (blendMode) {
        case spine.BlendMode.Normal:
            ret.src = premultiAlpha ? cc.ONE : cc.SRC_ALPHA;
            ret.dst = cc.ONE_MINUS_SRC_ALPHA;
            break;
        case spine.BlendMode.Additive:
            ret.src = premultiAlpha ? cc.ONE : cc.SRC_ALPHA;
            ret.dst = cc.ONE;
            break;
        case spine.BlendMode.Multiply:
            ret.src = cc.DST_COLOR;
            ret.dst = cc.ONE_MINUS_SRC_ALPHA;
            break;
        case spine.BlendMode.Screen:
            ret.src = cc.ONE;
            ret.dst = cc.ONE_MINUS_SRC_COLOR;
            break;
        default:
            ret = this._node._blendFunc;
            break;
    }

    return ret;
};

proto._createChildFormSkeletonData = function(){};

proto._updateChild = function(){};

proto._uploadRegionAttachmentData = function(attachment, slot, premultipliedAlpha, f32buffer, ui32buffer, vertexDataOffset) {
    // the vertices in format:
    // [
    //   X1, Y1, C1R, C1G, C1B, C1A, U1, V1,    // bottom left
    //   X2, Y2, C2R, C2G, C2B, C2A, U2, V2,    // top left
    //   X3, Y3, C3R, C3G, C3B, C3A, U3, V3,    // top right
    //   X4, Y4, C4R, C4G, C4B, C4A, U4, V4     // bottom right
    // ]
    //
    var nodeColor = this._displayedColor;
    var nodeR = nodeColor.r,
        nodeG = nodeColor.g,
        nodeB = nodeColor.b,
        nodeA = this._displayedOpacity;

    var vertices = spine.Utils.setArraySize(new Array(), 8, 0);
    attachment.computeWorldVertices(slot.bone, vertices, 0, 2);

    var uvs = attachment.uvs;

    // get the colors data
    var skeleton = slot.bone.skeleton;
    var skeletonColor = skeleton.color;
    var slotColor = slot.color;
    var regionColor = attachment.color;
    var alpha = skeletonColor.a * slotColor.a * regionColor.a;
    var multiplier = premultipliedAlpha ? alpha : 1;
    var colors = attachment.tempColor;
    colors.set(skeletonColor.r * slotColor.r * regionColor.r * multiplier,
        skeletonColor.g * slotColor.g * regionColor.g * multiplier,
        skeletonColor.b * slotColor.b * regionColor.b * multiplier,
        alpha);
    
    var wt = this._worldTransform,
        wa = wt.a, wb = wt.b, wc = wt.c, wd = wt.d,
        wx = wt.tx, wy = wt.ty,
        z = this._node.vertexZ;

    var offset = vertexDataOffset;
    // generate 6 vertices data (two triangles) from the quad vertices
    // using two angles : (0, 1, 2) & (0, 2, 3)
    for (var i = 0; i < 6; i++) {
        var srcIdx = i < 4 ? i % 3 : i - 2;
        var vx = vertices[srcIdx * 2],
            vy = vertices[srcIdx * 2 + 1];
        var x = vx * wa + vy * wc + wx,
            y = vx * wb + vy * wd + wy;
        var r = colors.r * nodeR,
            g = colors.g * nodeG,
            b = colors.b * nodeB,
            a = colors.a * nodeA;
        var color = ((a<<24) | (b<<16) | (g<<8) | r);
        f32buffer[offset] = x;
        f32buffer[offset + 1] = y;
        f32buffer[offset + 2] = z;
        ui32buffer[offset + 3] = color;
        f32buffer[offset + 4] = uvs[srcIdx * 2];
        f32buffer[offset + 5] = uvs[srcIdx * 2 + 1];
        offset += 6;
    }

    if (this._node._debugSlots) {
        // return the quad points info if debug slot enabled
        var VERTEX = spine.RegionAttachment;
        return [
            cc.p(vertices[VERTEX.OX1], vertices[VERTEX.OY1]),
            cc.p(vertices[VERTEX.OX2], vertices[VERTEX.OY2]),
            cc.p(vertices[VERTEX.OX3], vertices[VERTEX.OY3]),
            cc.p(vertices[VERTEX.OX4], vertices[VERTEX.OY4])
        ];
    }
};

proto._uploadMeshAttachmentData = function(attachment, slot, premultipliedAlpha, f32buffer, ui32buffer, vertexDataOffset) {
    var wt = this._worldTransform,
        wa = wt.a, wb = wt.b, wc = wt.c, wd = wt.d,
        wx = wt.tx, wy = wt.ty,
        z = this._node.vertexZ;
    // get the vertex data
    var verticesLength = attachment.worldVerticesLength;
    var vertices = spine.Utils.setArraySize(new Array(), verticesLength, 0);
    attachment.computeWorldVertices(slot, 0, verticesLength, vertices, 0, 2);

    var uvs = attachment.uvs;

    // get the colors data
    var skeleton = slot.bone.skeleton;
    var skeletonColor = skeleton.color, slotColor = slot.color, meshColor = attachment.color;
    var alpha = skeletonColor.a * slotColor.a * meshColor.a;
    var multiplier = premultipliedAlpha ? alpha : 1;
    var colors = attachment.tempColor;
    colors.set(skeletonColor.r * slotColor.r * meshColor.r * multiplier,
        skeletonColor.g * slotColor.g * meshColor.g * multiplier,
        skeletonColor.b * slotColor.b * meshColor.b * multiplier,
        alpha);
            
    var offset = vertexDataOffset;
    var nodeColor = this._displayedColor;
    var nodeR = nodeColor.r,
        nodeG = nodeColor.g,
        nodeB = nodeColor.b,
        nodeA = this._displayedOpacity;
    for (var i = 0, n = vertices.length; i < n; i += 2) {
        var vx = vertices[i],
            vy = vertices[i + 1];
        var x = vx * wa + vy * wb + wx,
            y = vx * wc + vy * wd + wy;
        var r = colors.r * nodeR,
            g = colors.g * nodeG,
            b = colors.b * nodeB,
            a = colors.a * nodeA;
        var color = ((a<<24) | (b<<16) | (g<<8) | r);

        f32buffer[offset] = x;
        f32buffer[offset + 1] = y;
        f32buffer[offset + 2] = z;
        ui32buffer[offset + 3] = color;
        f32buffer[offset + 4] = uvs[i];
        f32buffer[offset + 5] = uvs[i + 1];
        offset += 6;
    }
};

})();
