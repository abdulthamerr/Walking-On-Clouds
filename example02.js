/************************************
 * MAIN
 ************************************/

function main() {

    console.log("Setting up the canvas");

    // Find the canvas tag in the HTML document
    const canvas = document.querySelector("#assignmentCanvas");

    // Initialize the WebGL2 context
    var gl = canvas.getContext("webgl2");

    // Only continue if WebGL2 is available and working
    if (gl === null) {
        console.error('WebGL 2 not supported by your browser');
        return;
    }

    // Create a state for our scene
    var state = {
        camera: {
            position: vec3.fromValues(0.0, 3.0, 5.0),
            center: vec3.fromValues(0.0, 0.0, 0.0),
            up: vec3.fromValues(0.0, 1.0, 0.0),
        },
        lights: [
            {
                position: vec3.fromValues(0.0, 5.0, 5.0),
                colour: vec3.fromValues(1.0, 1.0, 1.0),
                strength: 10.0,
            }
        ],
        objects: [
            {
                model: {
                    position: vec3.fromValues(-1.5, 0.0, 0.0),
                    rotation: mat4.create(), // Identity matrix
                    scale: vec3.fromValues(1.0, 1.0, 1.0),
                },
                programInfo: uvVisualShader(gl),
                buffers: null,
                texture: null,
            },
            {
                model: {
                    position: vec3.fromValues(1.5, 0.0, 0.0),
                    rotation: mat4.create(), // Identity matrix
                    scale: vec3.fromValues(1.0, 1.0, 1.0),
                },
                programInfo: textureShader(gl),
                buffers: null,
                texture: null,
            },
        ],
        canvas: canvas,
        selectedIndex: 0,
    };

    state.objects.forEach((object) => {
        initRectangleBuffers(gl, object);  // Initialize buffers for the rectangle
    });

    // Load the texture automatically
    state.objects[1].texture = loadTexture(gl, 0, '.../materials/cloud.png');  
    console.log("Starting rendering loop");
    startRendering(gl, state);
}

/************************************
 * RENDERING CALLS
 ************************************/

function startRendering(gl, state) {
    // A variable for keeping track of time between frames
    var then = 0.0;

    // This function is called when we want to render a frame to the canvas
    function render(now) {
        now *= 0.001; // convert to seconds
        const deltaTime = now - then;
        then = now;

        updateState(deltaTime, state);

        // Draw our scene
        drawScene(gl, state);

        // Request another frame when this one is done
        requestAnimationFrame(render);
    }

    // Draw the scene
    requestAnimationFrame(render);
}

function updateState(deltaTime, state) {
    // Update state as you wish here.  Gets called every frame.
    state.objects.forEach((object) => {
        mat4.rotate(object.model.rotation, object.model.rotation, 0.005, vec3.fromValues(1.0, 1.0, 1.0));
    });
}

function drawScene(gl, state) {
    // Set clear colour and depth testing settings
    gl.clearColor(0.55686, 0.54902, 0.52157, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearDepth(1.0);

    state.objects.forEach((object) => {
        console.log(object); 
        gl.useProgram(object.programInfo.program);

        // Update transformation matrices
        var projectionMatrix = mat4.create();
        var fovy = 60.0 * Math.PI / 180.0;
        var aspect = state.canvas.clientWidth / state.canvas.clientHeight;
        mat4.perspective(projectionMatrix, fovy, aspect, 0.1, 100.0);
        gl.uniformMatrix4fv(object.programInfo.uniformLocations.projection, false, projectionMatrix);

        var viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, state.camera.position, state.camera.center, state.camera.up);
        gl.uniformMatrix4fv(object.programInfo.uniformLocations.view, false, viewMatrix);

        // Update the model matrix (apply position, rotation, and scale)
        var modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, object.model.position);
        mat4.mul(modelMatrix, modelMatrix, object.model.rotation);
        mat4.scale(modelMatrix, modelMatrix, object.model.scale);
        gl.uniformMatrix4fv(object.programInfo.uniformLocations.model, false, modelMatrix);

        gl.uniform3fv(object.programInfo.uniformLocations.cameraPosition, state.camera.position);
        gl.uniform3fv(object.programInfo.uniformLocations.light0Position, state.lights[0].position);
        gl.uniform3fv(object.programInfo.uniformLocations.light0Colour, state.lights[0].colour);
        gl.uniform1f(object.programInfo.uniformLocations.light0Strength, state.lights[0].strength);

        // Bind the texture and pass it to the fragment shader
        if (object.texture != null) {
            gl.uniform1i(object.programInfo.uniformLocations.sampler, 0);  // Sampler uniform location
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, object.texture);
        }

        // Draw the object (rectangle with texture)
        gl.bindVertexArray(object.buffers.vao);
        gl.drawElements(gl.TRIANGLES, object.buffers.numVertices, gl.UNSIGNED_SHORT, 0);
    });
}

/************************************
 * SHADER SETUP
 ************************************/

function uvVisualShader(gl) {
    const vsSource = `#version 300 es
    in vec3 aPosition;
    in vec3 aNormal;
    in vec2 aUV;

    uniform mat4 uProjectionMatrix;
    uniform mat4 uViewMatrix;
    uniform mat4 uModelMatrix;

    uniform vec3 uCameraPosition;

    out vec3 oNormal;
    out vec3 oFragPosition;
    out vec3 oCameraPosition;
    out vec2 oUV;

    void main() {
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
        oFragPosition = (uModelMatrix * vec4(aPosition, 1.0)).xyz;
        oNormal = normalize((uModelMatrix * vec4(aNormal, 0.0)).xyz);
        oCameraPosition = uCameraPosition;
        oUV = aUV;
    }`;

    const fsSource = `#version 300 es
    precision highp float;
    in vec2 oUV;
    uniform sampler2D uTexture;
    out vec4 fragColor;

    void main() {
        vec4 textureColor = texture(uTexture, oUV);
        fragColor = textureColor;
    }`;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
            vertexNormal: gl.getAttribLocation(shaderProgram, 'aNormal'),
            vertexUV: gl.getAttribLocation(shaderProgram, 'aUV'),
        },
        uniformLocations: {
            projection: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            view: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
            model: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
            cameraPosition: gl.getUniformLocation(shaderProgram, 'uCameraPosition'),
            light0Position: gl.getUniformLocation(shaderProgram, 'uLight0Position'),
            light0Colour: gl.getUniformLocation(shaderProgram, 'uLight0Colour'),
            light0Strength: gl.getUniformLocation(shaderProgram, 'uLight0Strength'),
            sampler: gl.getUniformLocation(shaderProgram, 'uTexture'),
        },
    };

    return programInfo;
}

function textureShader(gl) {
    return uvVisualShader(gl);  // Use the same shader for texture mapping
}

/************************************
 * BUFFER SETUP
 ************************************/

function initRectangleBuffers(gl, object) {
    const vertices = new Float32Array([
        -0.5,  0.5, 0.0,     0.0, 0.5,  // Top-left corner
        -0.5, -0.5, 0.0,     0.0, 0.0,  // Bottom-left corner
         0.5, -0.5, 0.0,     0.5, 0.0,  // Bottom-right corner
         0.5,  0.5, 0.0,     0.5, 0.5,  // Top-right corner
    ]);

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.vertexAttribPointer(object.programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.enableVertexAttribArray(object.programInfo.attribLocations.vertexPosition);

    gl.vertexAttribPointer(object.programInfo.attribLocations.vertexUV, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
    gl.enableVertexAttribArray(object.programInfo.attribLocations.vertexUV);

    object.buffers = { vao, numVertices: indices.length };
}

/************************************
 * TEXTURE HANDLING
 ************************************/

function loadTexture(gl, textureId, url) {
    var texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + textureId);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const image = new Image();
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);  // Generate mipmaps
    };
    image.src = url;  // Path to your cloud image

    return texture;
}

main();
