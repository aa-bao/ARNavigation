let renderer = null;
let positionBuffer = null;
let texBuffer = null;

let yuvProgram = null;
let yuvDisplayTransformLoc = null;
let rgbaProgram = null;
let rgbaDisplayTransformLoc = null;

const createShaderProgram = (gl, vsSource, fsSource) => {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vsSource);
  gl.compileShader(vs);

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fsSource);
  gl.compileShader(fs);

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
};

const initBuffers = (gl) => {
  positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, 1, -1, 1, 1, -1, -1, -1]), gl.STATIC_DRAW);

  texBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, 1, 0, 1, 1, 0, 0, 0]), gl.STATIC_DRAW);
};

const initYuvProgram = (gl) => {
  const vs = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    uniform mat3 displayTransform;
    varying vec2 v_texCoord;
    void main() {
      vec3 p = displayTransform * vec3(a_position, 0.0);
      gl_Position = vec4(p.x, p.y, -1.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;

  const fs = `
    precision highp float;
    uniform sampler2D y_texture;
    uniform sampler2D uv_texture;
    varying vec2 v_texCoord;
    void main() {
      vec4 yColor = texture2D(y_texture, v_texCoord);
      vec4 uvColor = texture2D(uv_texture, v_texCoord);
      float y = yColor.r;
      float u = uvColor.r - 0.5;
      float v = uvColor.a - 0.5;
      float r = y + 1.402 * v;
      float g = y - 0.344 * u - 0.714 * v;
      float b = y + 1.772 * u;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `;

  yuvProgram = createShaderProgram(gl, vs, fs);
  gl.useProgram(yuvProgram);
  gl.uniform1i(gl.getUniformLocation(yuvProgram, 'y_texture'), 5);
  gl.uniform1i(gl.getUniformLocation(yuvProgram, 'uv_texture'), 6);
  yuvDisplayTransformLoc = gl.getUniformLocation(yuvProgram, 'displayTransform');
};

const initRgbaProgram = (gl) => {
  const vs = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    uniform mat3 displayTransform;
    varying vec2 v_texCoord;
    void main() {
      vec3 p = displayTransform * vec3(a_position, 0.0);
      gl_Position = vec4(p.x, p.y, -1.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;

  const fs = `
    precision highp float;
    uniform sampler2D rgba_texture;
    varying vec2 v_texCoord;
    void main() {
      gl_FragColor = texture2D(rgba_texture, v_texCoord);
    }
  `;

  rgbaProgram = createShaderProgram(gl, vs, fs);
  gl.useProgram(rgbaProgram);
  gl.uniform1i(gl.getUniformLocation(rgbaProgram, 'rgba_texture'), 7);
  rgbaDisplayTransformLoc = gl.getUniformLocation(rgbaProgram, 'displayTransform');
};

const bindAttributes = (gl, program) => {
  const posAttr = gl.getAttribLocation(program, 'a_position');
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(posAttr);
  gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

  const texAttr = gl.getAttribLocation(program, 'a_texCoord');
  gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
  gl.enableVertexAttribArray(texAttr);
  gl.vertexAttribPointer(texAttr, 2, gl.FLOAT, false, 0, 0);
};

const initGL = (rendererInstance) => {
  renderer = rendererInstance;
  const gl = renderer.getContext();
  initBuffers(gl);
  initYuvProgram(gl);
  initRgbaProgram(gl);
  gl.useProgram(null);
};

const renderYuv = (gl, frame, textures) => {
  gl.useProgram(yuvProgram);
  bindAttributes(gl, yuvProgram);
  gl.uniformMatrix3fv(yuvDisplayTransformLoc, false, frame.getDisplayTransform());

  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.activeTexture(gl.TEXTURE0 + 5);
  gl.bindTexture(gl.TEXTURE_2D, textures.yTexture);
  gl.activeTexture(gl.TEXTURE0 + 6);
  gl.bindTexture(gl.TEXTURE_2D, textures.uvTexture);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};

const renderRgba = (gl, frame, textures) => {
  gl.useProgram(rgbaProgram);
  bindAttributes(gl, rgbaProgram);
  gl.uniformMatrix3fv(rgbaDisplayTransformLoc, false, frame.getDisplayTransform());

  gl.activeTexture(gl.TEXTURE0 + 7);
  gl.bindTexture(gl.TEXTURE_2D, textures.texture);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};

const renderGL = (frame) => {
  if (!renderer || !frame) {
    return;
  }

  const gl = renderer.getContext();
  const currentProgram = gl.getParameter(gl.CURRENT_PROGRAM);
  const currentTexture = gl.getParameter(gl.ACTIVE_TEXTURE);

  const yuv = frame.getCameraTexture(gl, 'yuv');
  if (yuv && yuv.yTexture && yuv.uvTexture) {
    renderYuv(gl, frame, yuv);
  } else {
    const rgba = frame.getCameraTexture(gl, 'rgba');
    if (rgba && rgba.texture) {
      renderRgba(gl, frame, rgba);
    }
  }

  gl.useProgram(currentProgram);
  gl.activeTexture(currentTexture);
};

const dispose = () => {
  if (!renderer) {
    return;
  }

  const gl = renderer.getContext();
  if (positionBuffer) gl.deleteBuffer(positionBuffer);
  if (texBuffer) gl.deleteBuffer(texBuffer);
  if (yuvProgram) gl.deleteProgram(yuvProgram);
  if (rgbaProgram) gl.deleteProgram(rgbaProgram);

  renderer = null;
  positionBuffer = null;
  texBuffer = null;
  yuvProgram = null;
  yuvDisplayTransformLoc = null;
  rgbaProgram = null;
  rgbaDisplayTransformLoc = null;
};

module.exports = {
  initGL,
  renderGL,
  dispose
};
