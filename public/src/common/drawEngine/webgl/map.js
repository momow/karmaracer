(function(EngineWebGL) {
  "use strict";
  
  EngineWebGL.prototype.drawMap = function() {
    this.drawOutsideWalls();
    this.drawGround();
    this.drawStaticItems();
  };
  
  EngineWebGL.prototype.loadGroundBuffers = function() {
    var gl = this.gl;
    
    var s = this.worldInfo.size;
    var worldWidth = s.w;
    var worldHeight = s.h;

    this.groundTexCoordBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.groundTexCoordBuf);
    var texCoord = [
      0.0, 0.0,
      worldWidth, 0.0,
      worldWidth, worldHeight,
      0.0, worldHeight
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoord), gl.STATIC_DRAW);
    
    this.groundVerticesBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.groundVerticesBuf);
    this.vertexCoord = [
      -worldWidth/2, -worldHeight/2, 0,
       worldWidth/2, -worldHeight/2, 0,
       worldWidth/2,  worldHeight/2, 0,
      -worldWidth/2,  worldHeight/2, 0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertexCoord), gl.STATIC_DRAW);    

    this.groundVerticesIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.groundVerticesIndexBuf);
    var vertexIndices = [
      0, 1, 2, 0, 2, 3
    ];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertexIndices), gl.STATIC_DRAW);    
  };

  EngineWebGL.prototype.drawGround = function() {
    var s = this.worldInfo.size;
    var worldWidth = s.w;
    var worldHeight = s.h;
    var gl = this.gl;
  
    this.mvPushMatrix();
    mat4.translate(this.mvMatrix, this.mvMatrix, [worldWidth / 2, worldHeight / 2, 0]);
   
    gl.bindBuffer(gl.ARRAY_BUFFER, this.groundVerticesBuf);
    gl.vertexAttribPointer(this.shaderProgram.aVertexPosition, 3, gl.FLOAT, false, 0, 0);    

    gl.bindBuffer(gl.ARRAY_BUFFER, this.groundTexCoordBuf);
    gl.vertexAttribPointer(this.shaderProgram.aTextureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(this.gl.TEXTURE0);
    gl.bindTexture(this.gl.TEXTURE_2D, this.tabTextures.grass);
    gl.uniform1i(this.shaderProgram.uSampler, 0);    
    gl.uniform1i(this.shaderProgram.bUseTextures, true);
    gl.uniform1f(this.shaderProgram.uAlpha, 1.0);    
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.groundVerticesIndexBuf);
    this.setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    this.mvPopMatrix();    
  };

  EngineWebGL.prototype.drawOutsideWalls = function() {
    var s = this.worldInfo.size;
    var worldWidth = s.w;
    var worldHeight = s.h;
    var wh = 2; // wall height    
    var gl = this.gl;
  
    this.drawOutsideWall({ x: worldWidth / 2, y: 0, z: wh / 2 }, { x: worldWidth, y: 0, z: wh });
    this.drawOutsideWall({ x: worldWidth / 2, y: worldHeight, z: wh / 2 }, { x: worldWidth, y: 0, z: wh });
    this.drawOutsideWall({ x: 0, y: worldHeight / 2, z: wh / 2 }, { x: 0, y: worldHeight, z: wh });
    this.drawOutsideWall({ x: worldWidth, y: worldHeight / 2, z: wh / 2 }, { x: 0, y: worldHeight, z: wh });
  };

  EngineWebGL.prototype.drawOutsideWall = function(pos, size) {
    var gl = this.gl;    
    this.mvPushMatrix();
    mat4.translate(this.mvMatrix, this.mvMatrix, [pos.x, pos.y, pos.z]);
    this.gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    this.gl.bufferData(
        this.gl.ARRAY_BUFFER,
        new Float32Array([
            -size.x/2, -size.y/2,  size.z/2,
             size.x/2,  size.y/2,  size.z/2,
            -size.x/2, -size.y/2, -size.z/2,
            -size.x/2, -size.y/2, -size.z/2,
             size.x/2,  size.y/2,  size.z/2,
             size.x/2,  size.y/2, -size.z/2]),
        this.gl.STATIC_DRAW);
      
    gl.vertexAttribPointer(this.shaderProgram.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  
    var sx = size.x;
    var sy = size.y;
    var sz = size.z;
    
    if (size.x) {    
      this.gl.bufferData(
          this.gl.ARRAY_BUFFER,
          new Float32Array([
            0, sz,
            sx, sz,
            0, 0,
            0, 0,
            sx, sz,
            sx, 0]),
          this.gl.STATIC_DRAW);      
    } else {
      this.gl.bufferData(
          this.gl.ARRAY_BUFFER,
          new Float32Array([
            0, sz,
            sy, sz,
            0, 0,
            0, 0,
            sy, sz,
            sy, 0]),
          this.gl.STATIC_DRAW);      
    }
    
    gl.vertexAttribPointer(this.shaderProgram.aTextureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(this.gl.TEXTURE0);
    gl.bindTexture(this.gl.TEXTURE_2D, this.tabTextures.wall);
    gl.uniform1i(this.shaderProgram.uSampler, 0);
    gl.uniform1i(this.shaderProgram.bUseTextures, 1);
    
    this.setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLES, 0, 6, gl.UNSIGNED_SHORT, 0);
    
    this.mvPopMatrix();
  };
  
  EngineWebGL.prototype.drawStaticItems = function() {
    var height = 1;
    for (var i in this.worldInfo.staticItems) {
      var c = this.worldInfo.staticItems[i];
      if (c && c.name.substring(0, 4) != 'wall') {
        this.drawStaticItem([c.x, c.y, height / 2, c.r], [c.w, c.h, height]);
      }
    }
  };
  
  EngineWebGL.prototype.drawStaticItem = function(pos, size) 
  {
    var gl = this.gl;    
    var sx = size[0];
    var sy = size[1];
    var sz = size[2];
    
    this.mvPushMatrix();

    mat4.translate(this.mvMatrix, this.mvMatrix, [pos[0], pos[1], pos[2]]);
    mat4.rotate(this.mvMatrix, this.mvMatrix, pos[3] || 0, [0, 0, 1]);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    this.gl.bufferData(
        this.gl.ARRAY_BUFFER,
        new Float32Array([
            // top
            -size[0]/2, -size[1]/2, size[2]/2,
             size[0]/2,  size[1]/2, size[2]/2,
            -size[0]/2,  size[1]/2, size[2]/2,
            -size[0]/2, -size[1]/2, size[2]/2,
             size[0]/2,  size[1]/2, size[2]/2,
             size[0]/2, -size[1]/2, size[2]/2,
            // // side 1
            -size[0]/2, -size[1]/2, -size[2]/2,
            -size[0]/2,  size[1]/2,  size[2]/2,
            -size[0]/2,  size[1]/2, -size[2]/2,
            -size[0]/2, -size[1]/2, -size[2]/2,
            -size[0]/2,  size[1]/2,  size[2]/2,
            -size[0]/2, -size[1]/2,  size[2]/2,
            // side 2
             size[0]/2, -size[1]/2, -size[2]/2,
             size[0]/2,  size[1]/2,  size[2]/2,
             size[0]/2,  size[1]/2, -size[2]/2,
             size[0]/2, -size[1]/2, -size[2]/2,
             size[0]/2,  size[1]/2,  size[2]/2,
             size[0]/2, -size[1]/2,  size[2]/2,
            // side 3
            -size[0]/2,  size[1]/2, -size[2]/2,
             size[0]/2,  size[1]/2,  size[2]/2,
             size[0]/2,  size[1]/2, -size[2]/2,
            -size[0]/2,  size[1]/2, -size[2]/2,
             size[0]/2,  size[1]/2,  size[2]/2,
            -size[0]/2,  size[1]/2,  size[2]/2,
            // side 4
            -size[0]/2, -size[1]/2, -size[2]/2,
             size[0]/2, -size[1]/2,  size[2]/2,
             size[0]/2, -size[1]/2, -size[2]/2,
            -size[0]/2, -size[1]/2, -size[2]/2,
             size[0]/2, -size[1]/2,  size[2]/2,
            -size[0]/2, -size[1]/2,  size[2]/2,
            // bottom
            -size[0]/2, -size[1]/2, -size[2]/2,
             size[0]/2,  size[1]/2, -size[2]/2,
            -size[0]/2,  size[1]/2, -size[2]/2,
            -size[0]/2, -size[1]/2, -size[2]/2,
             size[0]/2,  size[1]/2, -size[2]/2,
             size[0]/2, -size[1]/2, -size[2]/2
        ]),
        this.gl.STATIC_DRAW);        
    gl.vertexAttribPointer(this.shaderProgram.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());    
    this.gl.bufferData(
        this.gl.ARRAY_BUFFER,
        new Float32Array([        
          // top
          0, 0,
          sx, sy,
          0, sy,
          0, 0,
          sx, sy,
          sx, 0,
          // side 1
          0, 0,
          sy, sz,
          sy, 0,
          0, 0,
          sy, sz,
          0, sz,
          // // side 2
          0, 0,
          sx, sz,
          sx, 0,
          0, 0,
          sx, sz,
          0, sz,
          // // side 3
          0, 0,
          sy, sz,
          sy, 0,
          0, 0,
          sy, sz,
          0, sz,
          // // side 4
          0, 0,
          sx, sz,
          sx, 0,
          0, 0,
          sx, sz,
          0, sz,
          // // bottom
          0, 0,
          sx, sy,
          0, sy,
          0, 0,
          sx, sy,
          sx, 0
        ]),
        this.gl.STATIC_DRAW);      
    gl.vertexAttribPointer(this.shaderProgram.aTextureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(this.gl.TEXTURE0);
    gl.bindTexture(this.gl.TEXTURE_2D, this.tabTextures.wall);
    gl.uniform1i(this.shaderProgram.uSampler, 0);
    gl.uniform1f(this.shaderProgram.uAlpha, 1.0);    
    gl.uniform1i(this.shaderProgram.bUseTextures, 1);
    this.setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLES, 0, 36, gl.UNSIGNED_SHORT, 0);
    this.mvPopMatrix();
  };
 
}(Karma.EngineWebGL));