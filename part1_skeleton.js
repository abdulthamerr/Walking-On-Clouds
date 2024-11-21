main();

/************************************
 * MAIN
 ************************************/


function main() {

    console.log("Setting up the canvas");

    // Find the canavas tag in the HTML document
    const canvas = document.querySelector("#assignmentCanvas");

    // Initialize the WebGL2 context
    var gl = canvas.getContext("webgl2");

    // Only continue if WebGL2 is available and working
    if (gl === null) {
        printError('WebGL 2 not supported by your browser',
            'Check to see you are using a <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API#WebGL_2_2" class="alert-link">modern browser</a>.');
        return;
    }

    // Hook up the button
    const fileUploadButton = document.querySelector("#fileUploadButton");
    fileUploadButton.addEventListener("click", () => {
        console.log("Submitting file...");
        let fileInput = document.getElementById('inputFile');
        let files = fileInput.files;
        let url = URL.createObjectURL(files[0]);

        fetch(url, {
            mode: 'no-cors' // 'cors' by default
        }).then(res => {
            return res.text();
        }).then(data => {
            var inputTriangles = JSON.parse(data);

            doDrawing(gl, canvas, inputTriangles);

        }).catch((e) => {
            console.error(e);
        });

    });
}

function doDrawing(gl, canvas, inputTriangles) {
    // Create a state for our scene

    var state = {
        camera: {
            position: vec3.fromValues(0.5, 0.5, -0.5),
            center: vec3.fromValues(0.5, 0.5, 0.0),
            up: vec3.fromValues(0.0, 1.0, 0.0),
        },
        objects: [],
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
        

        initBuffers(gl, state.objects[i], inputTriangles[i].vertices.flat(), inputTriangles[i].triangles.flat());
    }

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
    // Set clear colour
    gl.clearColor(0.5, 0.5, 0.5, 1.0);

    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearDepth(1.0);

    // Clear the buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    state.objects.forEach((object) => {
        // Use the shader program for the object
        gl.useProgram(object.programInfo.program);

        // TODO setup projection matrix (this doesn't change)
        // use same params as in the lab5 example
        // fovy = 60deg, near=0.1, far=100
        // Generate the projection matrix using perspective
        // link to corresponding uniform object.programInfo.uniformLocations.[...]
        const projectionMatrix = mat4.create();
        mat4.perspective(
            projectionMatrix,
            glMatrix.toRadian(60), // Field of view in radians
            state.canvas.width / state.canvas.height, // Aspect ratio
            0.1, // Near clipping plane
            100.0 // Far clipping plane
        );
        gl.uniformMatrix4fv(object.programInfo.uniformLocations.uProjectionMatrix, false, projectionMatrix);

        // TODO update view matrix with state.camera
        // use mat4.lookAt to generate the view matrix
        // link to corresponding uniform object.programInfo.uniformLocations.[...]
        const viewMatrix = mat4.create();
        mat4.lookAt(
            viewMatrix,
            state.camera.position, // Camera position
            state.camera.center, // Look-at point
            state.camera.up // Up direction
        );
        gl.uniformMatrix4fv(object.programInfo.uniformLocations.uViewMatrix, false, viewMatrix);

        // TODO Update model transform
        // apply modeling transformations in correct order using
        // object.model.position, object.model.rotation, object.model.scale
        // for correct rotation wr centroid here is the order of operations 
        // in reverse order of how they should be applied 
        // translation (object.model.position), translation(centroid), rotation, scale, translation(negative centroid)
        // link to corresponding uniform object.programInfo.uniformLocations.[...]
        const modelMatrix = mat4.create();

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
}



/************************************
 * UI EVENTS
 ************************************/

function setupKeypresses(state) {
    document.addEventListener("keydown", (event) => {
        var object = state.objects[state.selectedIndex];
        switch (event.code) {
            case "KeyA":
                if (event.getModifierState("Shift")) {
                    if (state.hasSelected) {
                        mat4.rotateY(object.model.rotation, object.model.rotation, glMatrix.toRadian(-10));
                    } else {
                        vec3.add(state.camera.center, state.camera.center, vec3.fromValues(-0.1, 0.0, 0.0));
                        vec3.add(state.camera.position, state.camera.position, vec3.fromValues(-0.1, 0.0, 0.0));
                    }
                } else {
                    if (state.hasSelected) {
                        vec3.add(object.model.position, object.model.position, vec3.fromValues(-0.1, 0.0, 0.0));
                    } else {
                        vec3.add(state.camera.center, state.camera.center, vec3.fromValues(-0.1, 0.0, 0.0));
                        vec3.add(state.camera.position, state.camera.position, vec3.fromValues(-0.1, 0.0, 0.0));
                    }
                }
                break;
            case "KeyD":
                if (event.getModifierState("Shift")) {
                    if (state.hasSelected) {
                        mat4.rotateY(object.model.rotation, object.model.rotation, glMatrix.toRadian(10));
                    } else {
                        vec3.add(state.camera.center, state.camera.center, vec3.fromValues(0.1, 0.0, 0.0));
                        vec3.add(state.camera.position, state.camera.position, vec3.fromValues(0.1, 0.0, 0.0));
                    }
                } else {
                    if (state.hasSelected) {
                        vec3.add(object.model.position, object.model.position, vec3.fromValues(0.1, 0.0, 0.0));
                    } else {
                        vec3.add(state.camera.center, state.camera.center, vec3.fromValues(0.1, 0.0, 0.0));
                        vec3.add(state.camera.position, state.camera.position, vec3.fromValues(0.1, 0.0, 0.0));
                    }
                }
                break;
            case "KeyW":
                if (state.hasSelected) {
                    vec3.add(object.model.position, object.model.position, vec3.fromValues(0.0, -0.1, 0.0));
                } else {
                    vec3.add(state.camera.center, state.camera.center, vec3.fromValues(0.0, -0.1, 0.0));
                    vec3.add(state.camera.position, state.camera.position, vec3.fromValues(0.0, -0.1, 0.0));
                }
                break;
            case "KeyS":
                if (state.hasSelected) {
                    vec3.add(object.model.position, object.model.position, vec3.fromValues(0.0, 0.1, 0.0));
                } else {
                    vec3.add(state.camera.center, state.camera.center, vec3.fromValues(0.0, 0.1, 0.0));
                    vec3.add(state.camera.position, state.camera.position, vec3.fromValues(0.0, 0.1, 0.0));
                }
                break;
            case "ArrowUp":
                if (state.hasSelected) {
                    vec3.add(object.model.position, object.model.position, vec3.fromValues(0.0, 0.0, 0.1));
                } else {
                    vec3.add(state.camera.center, state.camera.center, vec3.fromValues(0.0, 0.0, 0.1));
                    vec3.add(state.camera.position, state.camera.position, vec3.fromValues(0.0, 0.0, 0.1));
                }
                break;
            case "ArrowDown":
                if (state.hasSelected) {
                    vec3.add(object.model.position, object.model.position, vec3.fromValues(0.0, 0.0, -0.1));
                } else {
                    vec3.add(state.camera.center, state.camera.center, vec3.fromValues(0.0, 0.0, -0.1));
                    vec3.add(state.camera.position, state.camera.position, vec3.fromValues(0.0, 0.0, -0.1));
                }
                break;
            case "Space":
                if (!state.hasSelected) {
                    state.hasSelected = true;
                    changeSelectionText(state.objects[state.selectedIndex].name);
                    vec3.scale(state.objects[state.selectedIndex].model.scale, state.objects[state.selectedIndex].model.scale, 1.2);
                } else {
                    state.hasSelected = false;
                    document.getElementById("selectionText").innerHTML = "Selection: None";
                    vec3.scale(state.objects[state.selectedIndex].model.scale, state.objects[state.selectedIndex].model.scale, 0.85);
                }
                break;
            case "ArrowLeft":
                if (state.hasSelected) {
                    state.selectedIndex = (state.selectedIndex > 0) ? state.selectedIndex - 1 : state.objects.length - 1;
                    changeSelectionText(state.objects[state.selectedIndex].name);
                }
                break;
            case "ArrowRight":
                if (state.hasSelected) {
                    state.selectedIndex = (state.selectedIndex < state.objects.length - 1) ? state.selectedIndex + 1 : 0;
                    changeSelectionText(state.objects[state.selectedIndex].name);
                }
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
