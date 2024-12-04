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

    const state = {
        objects: [], // Store all objects here
        programInfo: null, // Add shader program info later
    };

        // Fetch the dog.json file
    fetch('./bird.json')
    .then(response => response.json())
    .then(dogData => {
        console.log("Dog data loaded");
        doDrawing(gl, canvas, dogData);
    })
    .catch(error => {
        console.error("Error loading dog.json:", error);
    });

}

function doDrawing(gl, canvas, inputTriangles) {
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
            buffers: null,
            texture: null,
            centroid: calculateCentroid(inputTriangles[i].vertices),
            materialColor: inputTriangles[i].material.diffuse, // Add material color
        });
        

        initBuffers(gl, state.objects[i], inputTriangles[i].vertices.flat(), inputTriangles[i].triangles.flat());
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

    //console.log(state)

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

    var projectionMatrix = mat4.create();
    var fovy = 60.0 * Math.PI / 180.0; // Vertical field of view in radians
    var aspect = state.canvas.clientWidth / state.canvas.clientHeight; // Aspect ratio of the canvas
    var near = 0.1; // Near clipping plane
    var far = 100.0; // Far clipping plane
    // Generate the projection matrix using perspective
    mat4.perspective(projectionMatrix, fovy, aspect, near, far);

    var viewMatrix = mat4.create();
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


        gl.uniformMatrix4fv(object.programInfo.uniformLocations.projection, false, projectionMatrix);

    
        gl.uniformMatrix4fv(object.programInfo.uniformLocations.view, false, viewMatrix);


        var modelMatrix = mat4.create();
        //Need to update lights here
        mat4.translate(modelMatrix, modelMatrix, object.model.position);

        mat4.translate(modelMatrix, modelMatrix, object.centroid);

        mat4.multiply(modelMatrix, modelMatrix, object.model.rotation);

        mat4.scale(modelMatrix, modelMatrix, object.model.scale);

        mat4.translate(modelMatrix, modelMatrix, vec3.negate(vec3.create(), object.centroid));

        gl.uniformMatrix4fv(object.programInfo.uniformLocations.uModelMatrix, false, modelMatrix);

        gl.uniform3fv(object.programInfo.uniformLocations.uMaterialColor, object.materialColor);
        
        gl.uniform3fv(object.programInfo.uniformLocations.cameraPosition, state.camera.position);

        //Update lights
        gl.uniform3fv(object.programInfo.uniformLocations.light0Position, state.lights[0].position);
        gl.uniform3fv(object.programInfo.uniformLocations.light0Colour, state.lights[0].colour);
        gl.uniform1f(object.programInfo.uniformLocations.light0Strength, state.lights[0].strength);
    

        // Draw 
        {
            // Bind the buffer we want to draw
            gl.bindVertexArray(object.buffers.vao);

            if(object.texture != null) {
                gl.uniform1i(object.programInfo.uniformLocations.sampler, object.texture);
            }
            

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
in vec3 aNormal;

uniform mat4 uProjectionMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uModelMatrix;

uniform vec3 uCameraPosition;

out vec3 oNormal;
out vec3 oFragPosition;
out vec3 oCameraPosition;

void main() {
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
    oFragPosition = (uModelMatrix * vec4(aPosition, 1.0)).xyz;

    oNormal = normalize((uModelMatrix * vec4(aNormal, 0.0)).xyz);  // Need to convert normal to world space
    oCameraPosition = uCameraPosition;
}
`;

    // Fragment shader source code
    const fsSource = `#version 300 es
precision highp float;

uniform vec3 uMaterialColor;

in vec3 oNormal;
in vec3 oFragPosition;
in vec3 oCameraPosition;

uniform vec3 uLight0Position;
uniform vec3 uLight0Colour;
uniform float uLight0Strength;

out vec4 fragColor;

void main() {
    vec3 lightDirection = normalize(uLight0Position - oFragPosition);

    // Diffuse lighting
    float diff = max(dot(oNormal, lightDirection), 0.0);
    vec3 diffuse = diff * uLight0Colour;

    // Ambient lighting
    vec3 ambient = vec3(0.3, 0.3, 0.3);

    // Combine ambient and diffuse lighting, modulate by material color
    fragColor = vec4((diffuse + ambient) * uMaterialColor, 1.0);
}

`;

    // Create shader program
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    const programInfo = {
        // The actual shader program
        program: shaderProgram,
        // The attribute locations. WebGL will use there to hook up the buffers to the shader program.
        // NOTE: it may be wise to check if these calls fail by seeing that the returned location is not -1.
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
            vertexNormal: gl.getAttribLocation(shaderProgram, 'aNormal'),
        },
        uniformLocations: {
            projection: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            view: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
            model: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
            uMaterialColor: gl.getUniformLocation(shaderProgram, 'uMaterialColor'),
            cameraPosition: gl.getUniformLocation(shaderProgram, 'uCameraPosition'),
            light0Position: gl.getUniformLocation(shaderProgram, 'uLight0Position'),
            light0Colour: gl.getUniformLocation(shaderProgram, 'uLight0Colour'),
            light0Strength: gl.getUniformLocation(shaderProgram, 'uLight0Strength'),
            // TODO location for sampler uniform from the fragment shader
            // sampler: gl.getUniformLocation(shaderProgram, 'uTexture'),
            
        },
    };

    if (programInfo.attribLocations.uProjectionMatrix === -1 ||
        programInfo.attribLocations.uViewMatrix === -1 ||
        programInfo.attribLocations.uModelMatrix === -1 ||
        programInfo.uniformLocations.uMaterialColor === -1 ||
        programInfo.attribLocations.vertexPosition === -1 ||
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

function computeNormal(v0, v1, v2) {
    const edge1 = vec3.create();
    const edge2 = vec3.create();
    const normal = vec3.create();

    // Compute the edges of the triangle
    vec3.subtract(edge1, v1, v0); // v1 - v0
    vec3.subtract(edge2, v2, v0); // v2 - v0

    // Compute the cross product to get the normal
    vec3.cross(normal, edge1, edge2);
    vec3.normalize(normal, normal); // Normalize the normal vector

    return normal;
}


function initBuffers(gl, object, positionArray, indicesArray) {

    // We have 3 vertices with x, y, and z values
    const positions = new Float32Array(positionArray);

    // We are using gl.UNSIGNED_SHORT to enumerate the indices
    const indices = new Uint16Array(indicesArray);

    const normals = new Float32Array(positions.length);

    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i];
        const i1 = indices[i + 1];
        const i2 = indices[i + 2];

        const v0 = vec3.fromValues(positions[i0 * 3], positions[i0 * 3 + 1], positions[i0 * 3 + 2]);
        const v1 = vec3.fromValues(positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]);
        const v2 = vec3.fromValues(positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]);

        const normal = computeNormal(v0, v1, v2);

        // Add the computed normal to each of the triangle's vertices
        normals[i0 * 3] += normal[0];
        normals[i0 * 3 + 1] += normal[1];
        normals[i0 * 3 + 2] += normal[2];

        normals[i1 * 3] += normal[0];
        normals[i1 * 3 + 1] += normal[1];
        normals[i1 * 3 + 2] += normal[2];

        normals[i2 * 3] += normal[0];
        normals[i2 * 3 + 1] += normal[1];
        normals[i2 * 3 + 2] += normal[2];
    }

    // Normalize the normals
    for (let i = 0; i < normals.length; i += 3) {
        const normal = vec3.fromValues(normals[i], normals[i + 1], normals[i + 2]);
        vec3.normalize(normal, normal);
        normals[i] = normal[0];
        normals[i + 1] = normal[1];
        normals[i + 2] = normal[2];
    }

    // const normalArray = new Float32Array([
    //     // normal array here
    // ]);


    // Allocate and assign a Vertex Array Object to our handle
    var vertexArrayObject = gl.createVertexArray();

    // Bind our Vertex Array Object as the current used object
    gl.bindVertexArray(vertexArrayObject);

    object.buffers = {
        vao: vertexArrayObject,
        attributes: {
            position: initPositionAttribute(gl, object.programInfo, positions),
            normal: initNormalAttribute(gl, object.programInfo, normals),
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

function resizeCanvasToFitScreen(canvas) {
    canvas.width = window.innerWidth;  // Set canvas width to window width
    canvas.height = window.innerHeight; // Set canvas height to window height
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