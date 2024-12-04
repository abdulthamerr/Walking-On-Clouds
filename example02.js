
var skyboxVertexShaderSource = `#version 300 es
in vec4 a_position;
out vec4 v_position;
void main() {
  v_position = a_position;
  gl_Position = vec4(a_position.xy, 1, 1);
}
`;

var skyboxFragmentShaderSource = `#version 300 es
precision highp float;

uniform samplerCube u_skybox;
uniform mat4 u_viewDirectionProjectionInverse;

in vec4 v_position;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  vec4 t = u_viewDirectionProjectionInverse * v_position;
  outColor = texture(u_skybox, normalize(t.xyz / t.w));
}
`;

main();


/************************************
 * MAIN
 ************************************/

function main() {

    console.log("Setting up the canvas");

    // Find the canavas tag in the HTML document
    const canvas = document.querySelector("#exampleCanvas");

    resizeCanvasToFitScreen(canvas);

    // Update size when the window resizes
    window.addEventListener("resize", () => resizeCanvasToFitScreen(canvas));

    // Initialize the WebGL2 context
    var gl = canvas.getContext("webgl2");
 
    // Only continue if WebGL2 is available and working
    if (gl === null) {
        printError('WebGL 2 not supported by your browser',
            'Check to see you are using a <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API#WebGL_2_2" class="alert-link">modern browser</a>.');
        return;
    }



    // Create a state for our scene
    var state = {
        camera: {
            position: vec3.fromValues(-13.0, 5.0, 0.0), // Positioned along +X axis
            center: vec3.fromValues(0.0, 0.0, 0.0),  // Looking at the origin
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
                    position: vec3.fromValues(0.0, 0.0, 0.0),
                    rotation: mat4.create(), // Identity matrix
                    scale: vec3.fromValues(1.0, 1.0, 1.0),
                },
                programInfo: uvVisualShader(gl),
                buffers: null,
                texture: null,
            },
            { // First Platform
                model: {
                    position: vec3.fromValues(0.0, -1.4, 0.0),
                    rotation: mat4.create(), // Identity matrix
                    scale: vec3.fromValues(40.0, 0.4, 3.0), 
                },
                programInfo: uvVisualShader(gl),
                buffers: null,
                texture: null,
            },
            { // Second Platform
                model: {
                    position: vec3.fromValues(90.0, -1.4, 0.0), // Gap after first platform
                    rotation: mat4.create(),
                    scale: vec3.fromValues(40.0, 0.4, 3.0),
                },
                programInfo: uvVisualShader(gl),
                buffers: null,
                texture: null,
            },

            { // Third Platform
                model: {
                    position: vec3.fromValues(180.0, -1.4, 0.0), // Gap after first platform
                    rotation: mat4.create(),
                    scale: vec3.fromValues(40.0, 0.4, 3.0),
                },
                programInfo: uvVisualShader(gl),
                buffers: null,
                texture: null,
            },

            { // Forth Platform
                model: {
                    position: vec3.fromValues(270.0, -1.4, 0.0), // Gap after first platform
                    rotation: mat4.create(),
                    scale: vec3.fromValues(40.0, 0.4, 3.0),
                },
                programInfo: uvVisualShader(gl),
                buffers: null,
                texture: null,
            },
            
            { // Fifth Platform
                model: {
                    position: vec3.fromValues(360.0, -1.4, 0.0), // Gap after first platform
                    rotation: mat4.create(),
                    scale: vec3.fromValues(40.0, 0.4, 3.0),
                },
                programInfo: uvVisualShader(gl),
                buffers: null,
                texture: null,
            },

            // Obstacle for First Platform
            {
                model: {
                    position: vec3.fromValues(30.0, 1.0, 1.5), // Slightly above the platform
                    rotation: mat4.create(),
                    scale: vec3.fromValues(1.5, 1.5, 2.0),
                },
                programInfo: uvVisualShader(gl),
                buffers: null,
                texture: null,
                isTriangle: true,
            },
            // Obstacle for Second Platform
            {
                model: {
                    position: vec3.fromValues(95.0, 1.0, -1.5), // Slightly above the platform
                    rotation: mat4.create(),
                    scale: vec3.fromValues(1.5, 1.5, 2.0),
                },
                programInfo: uvVisualShader(gl),
                buffers: null,
                texture: null,
                isTriangle: true,
            },
             // Obstacle for Third Platform
             {
                model: {
                    position: vec3.fromValues(155.0, 1.0, 1.5), // Slightly above the platform
                    rotation: mat4.create(),
                    scale: vec3.fromValues(1.5, 1.5, 2.0),
                },
                programInfo: uvVisualShader(gl),
                buffers: null,
                texture: null,
                isTriangle: true,
            },
            // Obstacle for Forth Platform
            {
                model: {
                    position: vec3.fromValues(295.0, 1.0, -1.0), // Slightly above the platform
                    rotation: mat4.create(),
                    scale: vec3.fromValues(1.5, 1.5, 2.0),
                },
                programInfo: uvVisualShader(gl),
                buffers: null,
                texture: null,
                isTriangle: true,
            },
            // Obstacle for Fifth Platform
            {
                model: {
                    position: vec3.fromValues(385.0, 1.0, 1.5), // Slightly above the platform
                    rotation: mat4.create(),
                    scale: vec3.fromValues(1.5, 1.5, 2.0),
                },
                programInfo: uvVisualShader(gl),
                buffers: null,
                texture: null,
                isTriangle: true,
            },
            

            {
                model: {
                    position: vec3.fromValues(0.0, 0.0, 0.0),
                    rotation: mat4.create(), // Identity matrix
                    scale: vec3.fromValues(5.0, 0.5, 0.5),
                },
                programInfo: uvVisualShader(gl),
                buffers: null,
                texture: null,
            },
        ],
        skybox: [
            {
                texture: null,
            }
        ],
        canvas: canvas,
        selectedIndex: 0,
    };



    
    // Tell the twgl to match position with a_position, n
    // normal with a_normal etc..
    twgl.setAttributePrefix("a_");
    
    
    state.skybox.texture = twgl.createTexture(gl, {
        target: gl.TEXTURE_CUBE_MAP,
        src: [
          '../materials/px.png',  
          '../materials/nx.png',  
          '../materials/py.png',  
          '../materials/ny.png',  
          '../materials/pz.png',  
          '../materials/nz.png',  
        ],
        min: gl.LINEAR_MIPMAP_LINEAR,
    });



    setupKeypresses(state);

    state.objects.forEach((object) => {
        if (object.isTriangle) {
            // Initialize triangular buffer for obstacles
            initTriangleBuffers(gl, object);
        } else {
            // Initialize cube buffer for platforms or other objects
            initCubeBuffers(gl, object);
        }
    });
    

    //state.objects[1].texture = loadTexture(gl, 0, null);
    //setupUploadButton(gl);

    setupKeypresses(state);

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
    // Speed
    const platformSpeed = 0.5;

    // Update platform positions
    state.objects.forEach((object, index) => {
        if (index > 0 && index < state.objects.length - 1) {
            object.model.position[0] -= platformSpeed;

            // Reset platform position when it goes out of view
            if (object.model.position[0] < -50) {
                object.model.position[0] += 450; // Adjust based on platform spacing
            }
        }
    });

    // Collision detection
    const player = state.objects[0]; 
    state.objects.forEach((object) => {
        if (object.isTriangle) {
            if (checkCollision(player, object)) {
                location.reload(); // Refresh the website
            }
        }
    });
}

// Function to check collision between 2 things
function checkCollision(obj1, obj2) {
    const obj1Pos = obj1.model.position;
    const obj2Pos = obj2.model.position;
    const obj1Scale = obj1.model.scale;
    const obj2Scale = obj2.model.scale;

    return (
        Math.abs(obj1Pos[0] - obj2Pos[0]) < (obj1Scale[0] + obj2Scale[0]) / 2 &&
        Math.abs(obj1Pos[1] - obj2Pos[1]) < (obj1Scale[1] + obj2Scale[1]) / 2 &&
        Math.abs(obj1Pos[2] - obj2Pos[2]) < (obj1Scale[2] + obj2Scale[2]) / 2
    );
}



function drawScene(gl, state) {

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    //gl.depthFunc(gl.LEQUAL); // Near things obscure far things

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var projectionMatrix = mat4.create();
    var fovy = 60.0 * Math.PI / 180.0; // Vertical field of view in radians
    var aspect = state.canvas.clientWidth / state.canvas.clientHeight; // Aspect ratio of the canvas
    var near = 0.1; // Near clipping plane
    var far = 360.0; // Far clipping plane
    // Generate the projection matrix using perspective
    mat4.perspective(projectionMatrix, fovy, aspect, near, far);

    var viewMatrix = mat4.create();
    mat4.lookAt(
        viewMatrix,
        state.camera.position,
        state.camera.center,
        state.camera.up,
    );


    var viewDirectionMatrix = m4.copy(viewMatrix);
    viewDirectionMatrix[12] = 0;
    viewDirectionMatrix[13] = 0;
    viewDirectionMatrix[14] = 0;

    var viewDirectionProjectionMatrix = m4.multiply(
        projectionMatrix, viewDirectionMatrix);
    var viewDirectionProjectionInverseMatrix =
        m4.inverse(viewDirectionProjectionMatrix);

    state.objects.forEach((object) => {
        // Choose to use our shader
        gl.useProgram(object.programInfo.program);

        // Update uniforms
    
        gl.uniformMatrix4fv(object.programInfo.uniformLocations.projection, false, projectionMatrix);
        
        gl.uniformMatrix4fv(object.programInfo.uniformLocations.view, false, viewMatrix);

        // Update model transform

        var modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, object.model.position);
        mat4.mul(modelMatrix, modelMatrix, object.model.rotation);
        mat4.scale(modelMatrix, modelMatrix, object.model.scale);
        gl.uniformMatrix4fv(object.programInfo.uniformLocations.model, false, modelMatrix);
    
        // Update camera position
        gl.uniform3fv(object.programInfo.uniformLocations.cameraPosition, state.camera.position);

        //Update lights
        gl.uniform3fv(object.programInfo.uniformLocations.light0Position, state.lights[0].position);
        gl.uniform3fv(object.programInfo.uniformLocations.light0Colour, state.lights[0].colour);
        gl.uniform1f(object.programInfo.uniformLocations.light0Strength, state.lights[0].strength);
    

        // Draw 
        // Bind the buffer we want to draw
        gl.bindVertexArray(object.buffers.vao);

        if(object.texture != null) {
            gl.uniform1i(object.programInfo.uniformLocations.sampler, object.texture);
        }

        // Draw the object
        gl.drawElements(gl.TRIANGLES, object.buffers.numVertices, gl.UNSIGNED_SHORT, 0);

    });


    gl.depthFunc(gl.LEQUAL);

    const skyboxProgramInfo = twgl.createProgramInfo(
        gl, [skyboxVertexShaderSource, skyboxFragmentShaderSource]);

    const quadBufferInfo = twgl.primitives.createXYQuadBufferInfo(gl);
    const quadVAO = twgl.createVAOFromBufferInfo(gl, skyboxProgramInfo, quadBufferInfo);


    gl.useProgram(skyboxProgramInfo.program);
    gl.bindVertexArray(quadVAO);
    twgl.setUniforms(skyboxProgramInfo, {
      u_viewDirectionProjectionInverse: viewDirectionProjectionInverseMatrix,
      u_skybox: state.skybox.texture,
    });
    twgl.drawBufferInfo(gl, quadBufferInfo);

}


/************************************
 * UI EVENTS
 ************************************/

function setupKeypresses(state){
    document.addEventListener("keydown", (event) => {
        console.log(event.code);

        var object = state.objects[state.selectedIndex];

        switch(event.code) {
        default:
            break;
        }
    });
}


/************************************
 * SHADER SETUP
 ************************************/

function uvVisualShader(gl){

    // Vertex shader source code
    const vsSource =
    `#version 300 es
    in vec3 aPosition;
    in vec3 aNormal;
    in vec2 aUV;

    uniform mat4 uProjectionMatrix;
    uniform mat4 uViewMatrix;
    uniform mat4 uModelMatrix;

    uniform vec3 uCameraPosition;

    out vec3 oNormal;
    out vec4 oColor;
    out vec3 oFragPosition;
    out vec3 oCameraPosition;

    void main() {
        // Position needs to be a vec4 with w as 1.0
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
        
        // Postion of the fragment in world space
        oFragPosition = (uModelMatrix * vec4(aPosition, 1.0)).xyz;

        // Pass the colour to the fragment shader
        oColor = vec4(aUV, 0.0, 1.0);
        oNormal = normalize((uModelMatrix * vec4(aNormal, 0.0)).xyz);  // !!! Need to make the normal into world space
        oCameraPosition = uCameraPosition;
    }
    `;

    // Fragment shader source code
    const fsSource =
    `#version 300 es
    precision highp float;

    out vec4 fragColor;

    in vec4 oColor;
    in vec3 oNormal;
    in vec3 oFragPosition;
    in vec3 oCameraPosition;

    uniform vec3 uLight0Position;
    uniform vec3 uLight0Colour;
    uniform float uLight0Strength;

    void main() {
        // Get the dirction of the light relative to the object
        vec3 lightDirection = normalize(uLight0Position - oFragPosition);
        
        // Diffuse lighting
        float diff = max(dot(oNormal, lightDirection), 0.0);
        vec3 diffuse = diff * uLight0Colour;

        vec3 ambient = vec3(0.3, 0.3, 0.3);

        fragColor = vec4((diffuse + ambient) * oColor.rgb, 1.0);
    }
    `;


    // Create our shader program with our custom function
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    // Collect all the info needed to use the shader program.
    const programInfo = {
        // The actual shader program
        program: shaderProgram,
        // The attribute locations. WebGL will use there to hook up the buffers to the shader program.
        // NOTE: it may be wise to check if these calls fail by seeing that the returned location is not -1.
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
        },
    };

       // Check to see if we found the locations of our uniforms and attributes
    // Typos are a common source of failure
    if (programInfo.attribLocations.vertexPosition === -1 ||
        programInfo.attribLocations.vertexColour === -1 ||
        programInfo.attribLocations.vertexNormal === -1 ||
        programInfo.attribLocations.vertexUV === -1 ||
        programInfo.uniformLocations.projection === -1 ||
        programInfo.uniformLocations.view === -1 ||
        programInfo.uniformLocations.model === -1 ||
        programInfo.uniformLocations.light0Position === -1 ||
        programInfo.uniformLocations.light0Colour === -1 ||
        programInfo.uniformLocations.light0Strength === -1 ||
        programInfo.uniformLocations.cameraPosition === -1) {
        printError('Shader Location Error', 'One or more of the uniform and attribute variables in the shaders could not be located');
    }

    return programInfo;
}

function textureShader(gl){

    // Vertex shader source code
    const vsSource =
    `#version 300 es
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
        // Position needs to be a vec4 with w as 1.0
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
        
        // Postion of the fragment in world space
        oFragPosition = (uModelMatrix * vec4(aPosition, 1.0)).xyz;

        // Pass the colour to the fragment shader
        oNormal = normalize((uModelMatrix * vec4(aNormal, 0.0)).xyz);  // !!! Need to make the normal into world space
        oCameraPosition = uCameraPosition;
        oUV = aUV;
    }
    `;

    // Fragment shader source code
    const fsSource =
    `#version 300 es
    precision highp float;

    out vec4 fragColor;

    in vec3 oNormal;
    in vec3 oFragPosition;
    in vec3 oCameraPosition;
    // TODO incoming texture coords 
    in vec2 oUV;

    // TODO uniform variable for texture (type sampler2D)
    uniform sampler2D uTexture;
  
    uniform vec3 uLight0Position;
    uniform vec3 uLight0Colour;
    uniform float uLight0Strength;

    void main() {
        // Get the dirction of the light relative to the object
        vec3 lightDirection = normalize(uLight0Position - oFragPosition);
        
        // Diffuse lighting
        float diff = max(dot(oNormal, lightDirection), 0.0);
        vec3 diffuse = diff * uLight0Colour;

        vec3 ambient = vec3(0.3, 0.3, 0.3);
        //vec4 textureColor = vec4(0.0, 1.0, 1.0, 1.0);
        // TODO initialize textureColor with corect value from uTexture 
        vec4 textureColor = texture(uTexture,oUV);
       
        fragColor = vec4(textureColor.rgb, 1.0);
    }
    `;


    // Create our shader program with our custom function
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    // Collect all the info needed to use the shader program.
    const programInfo = {
        // The actual shader program
        program: shaderProgram,
        // The attribute locations. WebGL will use there to hook up the buffers to the shader program.
        // NOTE: it may be wise to check if these calls fail by seeing that the returned location is not -1.
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
            // TODO location for sampler uniform from the fragment shader
            sampler: gl.getUniformLocation(shaderProgram, 'uTexture'),
            
        },
    };

       // Check to see if we found the locations of our uniforms and attributes
    // Typos are a common source of failure
    if (programInfo.attribLocations.vertexPosition === -1 ||
        programInfo.attribLocations.vertexColour === -1 ||
        programInfo.attribLocations.vertexNormal === -1 ||
        programInfo.attribLocations.vertexUV === -1 ||
        programInfo.uniformLocations.projection === -1 ||
        programInfo.uniformLocations.view === -1 ||
        programInfo.uniformLocations.model === -1 ||
        programInfo.uniformLocations.light0Position === -1 ||
        programInfo.uniformLocations.light0Colour === -1 ||
        programInfo.uniformLocations.light0Strength === -1 ||
        programInfo.uniformLocations.cameraPosition === -1 || 
        programInfo.uniformLocations.sampler === -1) {
        printError('Shader Location Error', 'One or more of the uniform and attribute variables in the shaders could not be located');
    }

    return programInfo;
}

/************************************
 * BUFFER SETUP
 ************************************/

function initCubeBuffers(gl, object) {

     // We have 3 vertices with x, y, and z values
     const positionArray = new Float32Array([
        // Front face
        -1.0, -1.0,  1.0,
        1.0, -1.0,  1.0,
        1.0,  1.0,  1.0,
        -1.0,  1.0,  1.0,
        
        // Back face
        -1.0, -1.0, -1.0,
        -1.0,  1.0, -1.0,
        1.0,  1.0, -1.0,
        1.0, -1.0, -1.0,
        
        // Top face
        -1.0,  1.0, -1.0,
        -1.0,  1.0,  1.0,
        1.0,  1.0,  1.0,
        1.0,  1.0, -1.0,
        
        // Bottom face
        -1.0, -1.0, -1.0,
        1.0, -1.0, -1.0,
        1.0, -1.0,  1.0,
        -1.0, -1.0,  1.0,
        
        // Right face
        1.0, -1.0, -1.0,
        1.0,  1.0, -1.0,
        1.0,  1.0,  1.0,
        1.0, -1.0,  1.0,
        
        // Left face
        -1.0, -1.0, -1.0,
        -1.0, -1.0,  1.0,
        -1.0,  1.0,  1.0,
        -1.0,  1.0, -1.0,
    ]);

    const normalArray = new Float32Array([
        // Front
        0.0,  0.0,  1.0,
        0.0,  0.0,  1.0,
        0.0,  0.0,  1.0,
        0.0,  0.0,  1.0,

        // Back
        0.0,  0.0, -1.0,
        0.0,  0.0, -1.0,
        0.0,  0.0, -1.0,
        0.0,  0.0, -1.0,

        // Top
        0.0,  1.0,  0.0,
        0.0,  1.0,  0.0,
        0.0,  1.0,  0.0,
        0.0,  1.0,  0.0,

        // Bottom
        0.0, -1.0,  0.0,
        0.0, -1.0,  0.0,
        0.0, -1.0,  0.0,
        0.0, -1.0,  0.0,

        // Right
        1.0,  0.0,  0.0,
        1.0,  0.0,  0.0,
        1.0,  0.0,  0.0,
        1.0,  0.0,  0.0,

        // Left
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0
    ]);

    const textureCoordArray = [
        // Front
        1.0,  1.0,
        0.0,  1.0,
        0.0,  0.0,
        1.0,  0.0,
        // Back
        0.0,  1.0,
        0.0,  0.0,
        1.0,  0.0,
        1.0,  1.0,
        // Top
        0.0,  0.0,
        1.0,  0.0,
        1.0,  1.0,
        0.0,  1.0,
        // Bottom
        0.0,  0.0,
        1.0,  0.0,
        1.0,  1.0,
        0.0,  1.0,
        // Right
        0.0,  1.0,
        0.0,  0.0,
        1.0,  0.0,
        1.0,  1.0,
        // Left
        1.0,  1.0,
        0.0,  1.0,
        0.0,  0.0,
        1.0,  0.0,
      ];

    // We are using gl.UNSIGNED_SHORT to enumerate the indices
    const indicesArray = new Uint16Array([
        0,  1,  2,      0,  2,  3,    // front
        4,  5,  6,      4,  6,  7,    // back
        8,  9,  10,     8,  10, 11,   // top
        12, 13, 14,     12, 14, 15,   // bottom
        16, 17, 18,     16, 18, 19,   // right
        20, 21, 22,     20, 22, 23,   // left
    ]);

    initBuffers(gl, object, positionArray, normalArray, null, textureCoordArray, indicesArray);
}

function initBuffers(gl, object, positionArray, normalArray, colourArray, textureCoordArray, indicesArray) {

    // We have 3 vertices with x, y, and z values
    const positions = new Float32Array(positionArray);

    const normals = new Float32Array(normalArray);

    const colours = new Float32Array(colourArray);

    const textureCoords = new Float32Array(textureCoordArray);

    // We are using gl.UNSIGNED_SHORT to enumerate the indices
    const indices = new Uint16Array(indicesArray);

    // Allocate and assign a Vertex Array Object to our handle
    var vertexArrayObject = gl.createVertexArray();

    // Bind our Vertex Array Object as the current used object
    gl.bindVertexArray(vertexArrayObject);

    object.buffers = {
        vao: vertexArrayObject,
        attributes: {
            position: initPositionAttribute(gl, object.programInfo, positions),
            normal: initNormalAttribute(gl, object.programInfo, normals),
            colour: initColourAttribute(gl, object.programInfo, colours),
            uv: initTextureCoords(gl,  object.programInfo, textureCoords),
        },
        indices: initIndexBuffer(gl, indices),
        numVertices: indices.length,
    };
}

function initPositionAttribute(gl, programInfo, positionArray) {
    if(positionArray != null && positionArray.length > 0){
        // Create a buffer for the positions.
        const positionBuffer = gl.createBuffer();

        // Select the buffer as the one to apply buffer
        // operations to from here out.
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        // Now pass the list of positions into WebGL to build the
        // shape. We do this by creating a Float32Array from the
        // JavaScript array, then use it to fill the current buffer.
        gl.bufferData(
            gl.ARRAY_BUFFER, // The kind of buffer this is
            positionArray, // The data in an Array object
            gl.STATIC_DRAW // We are not going to change this data, so it is static
        );

        // Tell WebGL how to pull out the positions from the position
        // buffer into the vertexPosition attribute.
        {
            const numComponents = 3; // pull out 3 values per iteration, ie vec3
            const type = gl.FLOAT; // the data in the buffer is 32bit floats
            const normalize = false; // don't normalize between 0 and 1
            const stride = 0; // how many bytes to get from one set of values to the next
            // Set stride to 0 to use type and numComponents above
            const offset = 0; // how many bytes inside the buffer to start from


            // Set the information WebGL needs to read the buffer properly
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset
            );
            // Tell WebGL to use this attribute
            gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexPosition);
        }

        return positionBuffer;
    }
}


function initColourAttribute(gl, programInfo, colourArray) {

    if(colourArray != null && colourArray.length > 0) {
        // Create a buffer for the positions.
        const colourBuffer = gl.createBuffer();

        // Select the buffer as the one to apply buffer
        // operations to from here out.
        gl.bindBuffer(gl.ARRAY_BUFFER, colourBuffer);

        // Now pass the list of positions into WebGL to build the
        // shape. We do this by creating a Float32Array from the
        // JavaScript array, then use it to fill the current buffer.
        gl.bufferData(
            gl.ARRAY_BUFFER, // The kind of buffer this is
            colourArray, // The data in an Array object
            gl.STATIC_DRAW // We are not going to change this data, so it is static
        );

        // Tell WebGL how to pull out the positions from the position
        // buffer into the vertexPosition attribute.
        {
            const numComponents = 4; // pull out 4 values per iteration, ie vec4
            const type = gl.FLOAT; // the data in the buffer is 32bit floats
            const normalize = false; // don't normalize between 0 and 1
            const stride = 0; // how many bytes to get from one set of values to the next
            // Set stride to 0 to use type and numComponents above
            const offset = 0; // how many bytes inside the buffer to start from

            // Set the information WebGL needs to read the buffer properly
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexColour,
                numComponents,
                type,
                normalize,
                stride,
                offset
            );
            // Tell WebGL to use this attribute
            gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexColour);
        }

        return colourBuffer;
    }
}


function initNormalAttribute(gl, programInfo, normalArray) {
    if(normalArray != null && normalArray.length > 0){
        // Create a buffer for the positions.
        const normalBuffer = gl.createBuffer();

        // Select the buffer as the one to apply buffer
        // operations to from here out.
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);

        // Now pass the list of positions into WebGL to build the
        // shape. We do this by creating a Float32Array from the
        // JavaScript array, then use it to fill the current buffer.
        gl.bufferData(
            gl.ARRAY_BUFFER, // The kind of buffer this is
            normalArray, // The data in an Array object
            gl.STATIC_DRAW // We are not going to change this data, so it is static
        );

        // Tell WebGL how to pull out the positions from the position
        // buffer into the vertexPosition attribute.
        {
            const numComponents = 3; // pull out 4 values per iteration, ie vec3
            const type = gl.FLOAT; // the data in the buffer is 32bit floats
            const normalize = false; // don't normalize between 0 and 1
            const stride = 0; // how many bytes to get from one set of values to the next
            // Set stride to 0 to use type and numComponents above
            const offset = 0; // how many bytes inside the buffer to start from

            // Set the information WebGL needs to read the buffer properly
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexNormal,
                numComponents,
                type,
                normalize,
                stride,
                offset
            );
            // Tell WebGL to use this attribute
            gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexNormal);
        }

        return normalBuffer;
    }
}

function initTextureCoords(gl, programInfo, textureCoords) {
    if(textureCoords != null && textureCoords.length > 0){
        // Create a buffer for the positions.
        const textureCoordBuffer = gl.createBuffer();

        // Select the buffer as the one to apply buffer
        // operations to from here out.
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

        // Now pass the list of positions into WebGL to build the
        // shape. We do this by creating a Float32Array from the
        // JavaScript array, then use it to fill the current buffer.
        gl.bufferData(
            gl.ARRAY_BUFFER, // The kind of buffer this is
            textureCoords, // The data in an Array object
            gl.STATIC_DRAW // We are not going to change this data, so it is static
        );

        // Tell WebGL how to pull out the positions from the position
        // buffer into the vertexPosition attribute.
        {
            const numComponents = 2; 
            const type = gl.FLOAT; // the data in the buffer is 32bit floats
            const normalize = false; // don't normalize between 0 and 1
            const stride = 0; // how many bytes to get from one set of values to the next
            // Set stride to 0 to use type and numComponents above
            const offset = 0; // how many bytes inside the buffer to start from

            // Set the information WebGL needs to read the buffer properly
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexUV,
                numComponents,
                type,
                normalize,
                stride,
                offset
            );
            // Tell WebGL to use this attribute
            gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexUV);
        }

        return textureCoordBuffer;
    }
}

function initIndexBuffer(gl, elementArray) {

    // Create a buffer for the positions.
    const indexBuffer = gl.createBuffer();

    // Select the buffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER, // The kind of buffer this is
        elementArray, // The data in an Array object
        gl.STATIC_DRAW // We are not going to change this data, so it is static
    );

    return indexBuffer;
}

/*****************************
 * TEXTURES
 *****************************/

// function loadTexture(gl, textureId, url) {
//     url = "../materials/sky.png";
//     var texture = gl.createTexture();

//     gl.activeTexture(gl.TEXTURE0 + textureId);

//     gl.bindTexture(gl.TEXTURE_2D, texture);

    
//     const level = 0;
//     const internalFormat = gl.RGBA;
//     const width = 1;
//     const height = 1;
//     const border = 0;
//     const format = gl.RGBA;
//     const type = gl.UNSIGNED_BYTE;
//     const data = new Uint8Array([
//         0, 255, 255, 255,
//     ]);
//     gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
//     gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border,
//                 format, type, data);

//     // set the filtering so we don't need mips
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
//     if(url != null) {
//         console.log("Loading...");
//         var image = new Image();
//         image.addEventListener('load', () => {
//             console.log("Loaded ")
//             gl.bindTexture(gl.TEXTURE_2D, texture);
//             gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
//                 format, type, image);
                
//                 gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//                 gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
//                 gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
//                 gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
//         });
//         image.src = url;
//     }

//     return textureId;
// }

function setupKeypresses(state) {
    let isJumping = false;
    let jumpDirection = 1; // 1 for up, -1 for down
    let jumpHeight = 0; // Current jump height
    const maxJumpHeight = 2; // Maximum height of the jump
    const jumpSpeed = 0.1; // Speed of the jump

    document.addEventListener("keydown", (event) => {
        console.log(event.code);

        const rotationSpeed = 0.1; // speed of camera rotation (can be adjusted)
        const moveSpeed = 0.1;    // speed of camera translation (can be adjusted)

        // Camera movement controls
        switch(event.code) {
            case "Space":
                if (!isJumping) {
                    isJumping = true; // Start the jump
                    jumpDirection = 1; // Begin moving upwards
                }
                break;
            case "ArrowRight":
                // Move light to the right (already in your original code)
                state.lights[0].position[0] += 0.1;
                break;
            case "ArrowLeft":
                // Move light to the left
                state.lights[0].position[0] -= 0.1;
                break;
            case "KeyD":
                // Rotate camera right (clockwise around the Y-axis)
                const rotationMatrixD = mat4.create();
                mat4.rotateY(rotationMatrixD, rotationMatrixD, -rotationSpeed);
                vec3.transformMat4(state.camera.position, state.camera.position, rotationMatrixD);
                vec3.transformMat4(state.camera.center, state.camera.center, rotationMatrixD);
                break;
            case "KeyA":
                // Rotate camera left (counterclockwise around the Y-axis)
                const rotationMatrixA = mat4.create();
                mat4.rotateY(rotationMatrixA, rotationMatrixA, rotationSpeed);
                vec3.transformMat4(state.camera.position, state.camera.position, rotationMatrixA);
                vec3.transformMat4(state.camera.center, state.camera.center, rotationMatrixA);
                break;
            case "KeyW":
                // Move camera forward (along the Z-axis)
                const forward = vec3.create();
                vec3.subtract(forward, state.camera.center, state.camera.position);  // Get direction vector from camera to center
                vec3.normalize(forward, forward);  // Normalize it to get a unit vector
                vec3.scale(forward, forward, moveSpeed);  // Scale it by moveSpeed
                vec3.add(state.camera.position, state.camera.position, forward); // Translate the camera position forward
                vec3.add(state.camera.center, state.camera.center, forward);  // Move the center along the same direction
                break;
            case "KeyS":
                // Move camera backward (along the Z-axis)
                const backward = vec3.create();
                vec3.subtract(backward, state.camera.position, state.camera.center);  // Reverse direction vector
                vec3.normalize(backward, backward);  // Normalize it
                vec3.scale(backward, backward, moveSpeed);  // Scale by moveSpeed
                vec3.add(state.camera.position, state.camera.position, backward);  // Translate the camera position backward
                vec3.add(state.camera.center, state.camera.center, backward);  // Move the center along the same direction
                break;
            case "KeyQ":
                // Move camera up (along the Y-axis)
                const up = vec3.fromValues(0, 1, 0);  // Define the up direction (positive Y-axis)
                vec3.scale(up, up, moveSpeed);  // Scale it by moveSpeed
                vec3.add(state.camera.position, state.camera.position, up);  // Translate camera position upwards
                vec3.add(state.camera.center, state.camera.center, up);  // Move the center upwards
                break;
            case "KeyE":
                // Move camera down (along the Y-axis)
                const down = vec3.fromValues(0, -1, 0);  // Define the down (negative Y-axis)
                vec3.scale(down, down, moveSpeed);  // Scale by moveSpeed
                vec3.add(state.camera.position, state.camera.position, down);  // Translate camera position downwards
                vec3.add(state.camera.center, state.camera.center, down);  // Move the center downwards
                break;
            case "ArrowUp":
                // Tilt camera up (rotate upwards around the X-axis)
                const rotationMatrixUp = mat4.create();
                mat4.rotateX(rotationMatrixUp, rotationMatrixUp, rotationSpeed); // Positive rotation around X-axis
                vec3.transformMat4(state.camera.position, state.camera.position, rotationMatrixUp);
                vec3.transformMat4(state.camera.center, state.camera.center, rotationMatrixUp);
                break;
            case "ArrowDown":
                // Tilt camera down (rotate downwards around the X-axis)
                const rotationMatrixDown = mat4.create();
                mat4.rotateX(rotationMatrixDown, rotationMatrixDown, -rotationSpeed); // Negative rotation around X-axis
                vec3.transformMat4(state.camera.position, state.camera.position, rotationMatrixDown);
                vec3.transformMat4(state.camera.center, state.camera.center, rotationMatrixDown);
                break;
            case "KeyL":
                //move right
                vec3.add(state.objects[0].model.position, state.objects[0].model.position, vec3.fromValues(0.0, 0.0, 0.5));

                break;
            case "KeyJ":
                // Move left
                vec3.add(state.objects[0].model.position, state.objects[0].model.position, vec3.fromValues(0.0, 0.0, -0.5));

                break;
            
            default:
                break;
        }
    });

    function handleJump() {
        if (isJumping) {
            jumpHeight += jumpDirection * jumpSpeed;

            // Check if maximum height is reached
            if (jumpHeight >= maxJumpHeight) {
                jumpDirection = -1; // Start moving down
            }

            // Check end of jump
            if (jumpHeight <= 0) {
                jumpHeight = 0;
                isJumping = false; // Stop jump
                jumpDirection = 1; // Reset direction for next jump
            }

            // Update the object's position
            state.objects[0].model.position[1] += jumpDirection * jumpSpeed;
        }

        requestAnimationFrame(handleJump); // Continue animation loop
    }      
    

    handleJump(); // Start animating

}

function initTriangleBuffers(gl, object) {
    const positionArray = new Float32Array([
        // Pyramid base (aligned flat on the platform, centered at Y = -1.2)
        -0.5, -1.2,  0.5,  // Bottom-left vertex of the base
         0.5, -1.2,  0.5,  // Bottom-right vertex of the base
         0.5, -1.2, -0.5,  // Top-right vertex of the base
        -0.5, -1.2, -0.5,  // Top-left vertex of the base

        // Pyramid tip (raised above the base)
         0.0,  0.3,  0.0,  // Tip of the pyramid
    ]);

    const normalArray = new Float32Array([
        // Base normals (pointing down)
        0.0, -1.0, 0.0,  // Bottom face normal
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,

        // Side face normals (pointing outward)
        0.0,  1.0,  0.0,
        0.0,  1.0,  0.0,
    ]);

    const indicesArray = new Uint16Array([
        // Base face (two triangles forming a square)
        0, 1, 2,
        0, 2, 3,

        // Side faces (connecting base to apex)
        0, 1, 4, // Side 1
        1, 2, 4, // Side 2
        2, 3, 4, // Side 3
        3, 0, 4, // Side 4
    ]);

    initBuffers(gl, object, positionArray, normalArray, null, null, indicesArray);
}



function resizeCanvasToFitScreen(canvas) {
    canvas.width = window.innerWidth;  // Set canvas width to window width
    canvas.height = window.innerHeight; // Set canvas height to window height
}