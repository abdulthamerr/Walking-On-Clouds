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
    const canvas = document.querySelector("#assignmentCanvas");
     // Resize canvas to fit the window
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
    // Initialize the state object
    const state = {
        objects: [], // Store all objects here
        programInfo: null, // Add shader program info later
    };

        // Fetch the dog.json file
    fetch('./dog.json')
    .then(response => response.json())
    .then(dogData => {
        console.log("Dog data loaded");
        doDrawing(gl, canvas, dogData);
    })
    .catch(error => {
        console.error("Error loading dog.json:", error);
    });
}
function resizeCanvasToFitScreen(canvas) {
    canvas.width = window.innerWidth;  // Set canvas width to window width
    canvas.height = window.innerHeight; // Set canvas height to window height
}

function doDrawing(gl, canvas, inputTriangles) {
    // Create a state for our scene
    var state = {
        camera: {
            position: vec3.fromValues(0.0,7.875, -19.015),
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
        objects: [],
        skybox: [
            {
                texture: null,
            }
        ],
        canvas: canvas,
        selectedIndex: 0,
        hasSelected: false,
    };
    for (var i = 0; i < inputTriangles.length; i++) {
        state.objects.push({
            name: inputTriangles[i].name,
            model: {
                position: vec3.fromValues(0.0, 0.0, 0.5),
                rotation: mat4.create(),
                scale: vec3.fromValues(1.0, 1.0, 1.0),
            },
            programInfo: transformShader(gl),
            buffers: undefined,
            centroid: calculateCentroid(inputTriangles[i].vertices),
            materialColor: inputTriangles[i].material.diffuse, // Add material color
        });
        

        initBuffers(gl, state.objects[i], inputTriangles[i].vertices.flat(),
        inputTriangles[i].triangles.flat());
    }

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

        // Draw our scene
        drawScene(gl, deltaTime, state);

        // Request another frame when this one is done
        requestAnimationFrame(render);
    }

    // Draw the scene
    requestAnimationFrame(render);
}
/**
 * Draws the scene. Should be called every frame
 * 
 * @param  {} gl WebGL2 context
 * @param {number} deltaTime Time between each rendering call
 */
function drawScene(gl, deltaTime, state) {
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    // Clear the buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
     

    const projectionMatrix = mat4.create();
        mat4.perspective(
            projectionMatrix,
            glMatrix.toRadian(60), // Field of view in radians
            state.canvas.width / state.canvas.height, // Aspect ratio
            0.1, // Near clipping plane
            5000.0 // Far clipping plane
        );

    const viewMatrix = mat4.create();
    mat4.lookAt(
        viewMatrix,
        state.camera.position, // Camera position
        state.camera.center, // Look-at point
        state.camera.up // Up direction
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
        // Use the shader program for the object
        gl.useProgram(object.programInfo.program);

        
        
        gl.uniformMatrix4fv(object.programInfo.uniformLocations.uProjectionMatrix, false, projectionMatrix);

       
    
        gl.uniformMatrix4fv(object.programInfo.uniformLocations.uViewMatrix, false, viewMatrix);

        
        const modelMatrix = mat4.create();
        //Need to update lights here
        mat4.translate(modelMatrix, modelMatrix, object.model.position);

        mat4.translate(modelMatrix, modelMatrix, object.centroid);

        mat4.multiply(modelMatrix, modelMatrix, object.model.rotation);

        mat4.scale(modelMatrix, modelMatrix, object.model.scale);

        mat4.translate(modelMatrix, modelMatrix, vec3.negate(vec3.create(), object.centroid));

        gl.uniformMatrix4fv(object.programInfo.uniformLocations.uModelMatrix, false, modelMatrix);

        // TODO Update other uniforms like colors

        gl.uniform3fv(object.programInfo.uniformLocations.uMaterialColor, object.materialColor);

        // Draw 
        {
            // Bind the buffer we want to draw
            gl.bindVertexArray(object.buffers.vao);
            

            // Draw the object
            const offset = 0; // Number of elements to skip before starting
            gl.drawElements(gl.TRIANGLES, object.buffers.numVertices, gl.UNSIGNED_SHORT, offset);
        }
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

function setupKeypresses(state) {
    document.addEventListener("keydown", (event) => {
        console.log(event.code);

        const rotationSpeed = 0.1; // speed of camera rotation (can be adjusted)
        const moveSpeed = 0.1;    // speed of camera translation (can be adjusted)

        // Camera movement controls
        switch(event.code) {
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
            default:
                break;
        }
    });
}
/************************************
 * SHADER SETUP
 ************************************/
function transformShader(gl) {
    // Vertex shader source code
    const vsSource = `#version 300 es
    in vec3 aPosition;

    uniform mat4 uProjectionMatrix;
    uniform mat4 uViewMatrix;
    uniform mat4 uModelMatrix;

    void main() {
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
    }`;

    // Fragment shader source code
    const fsSource = `#version 300 es
    precision mediump float;

    uniform vec3 uMaterialColor;

    out vec4 fragColor;

    void main() {
        fragColor = vec4(uMaterialColor, 1.0);
    }`;

    // Create shader program
    const program = initShaderProgram(gl, vsSource, fsSource);

    // Collect program information
    const programInfo = {
        program: program,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(program, 'aPosition'),
        },
        uniformLocations: {
            uProjectionMatrix: gl.getUniformLocation(program, 'uProjectionMatrix'),
            uViewMatrix: gl.getUniformLocation(program, 'uViewMatrix'),
            uModelMatrix: gl.getUniformLocation(program, 'uModelMatrix'),
            uMaterialColor: gl.getUniformLocation(program, 'uMaterialColor'),
        },
    };

    // Check for missing locations
    if (programInfo.attribLocations.vertexPosition === -1) {
        console.error("Failed to locate attribute 'aPosition'");
    }
    if (!programInfo.uniformLocations.uProjectionMatrix || 
        !programInfo.uniformLocations.uViewMatrix ||
        !programInfo.uniformLocations.uModelMatrix || 
        !programInfo.uniformLocations.uMaterialColor) {
        console.error("Failed to locate one or more uniform locations");
    }

    return programInfo;
}
/************************************
 * BUFFER SETUP
 ************************************/

function initBuffers(gl, object, positionArray, indicesArray) {

    // We have 3 vertices with x, y, and z values
    const positions = new Float32Array(positionArray);

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
        },
        indices: initIndexBuffer(gl, indices),
        numVertices: indices.length,
    };
}

function initPositionAttribute(gl, programInfo, positionArray) {

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
function initColourAttribute(gl, programInfo, colourArray) {

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
/**
 * 
 * @param {array of x,y,z vertices} vertices 
 */
function calculateCentroid(vertices) {

    var center = vec3.fromValues(0.0, 0.0, 0.0);
    for (let t = 0; t < vertices.length; t++) {
        vec3.add(center,center,vertices[t]);
    }
    vec3.scale(center,center,1/vertices.length);
    return center;

}