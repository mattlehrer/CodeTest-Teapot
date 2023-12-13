// Client code for loading and rendering the teapot.
// This only needs to run on the latest version of Chrome.

/**
 * Loads the teapot geometry.
 * @returns {Promise<{indexes: Uint16Array, vertices: Float32Array}>}
 */
async function loadTeapotGeometry() {
	// Fetch the teapot obj file
	const teapotResponse = await fetch('/triangle.obj');
	const teapotText = await teapotResponse.text();

	const indexes = [];
	const vertices = [];
	// const normals = [];
	// const textures = [];

	// Parse the obj file line by line
	for (let line of teapotText.split('\n')) {
		// TODO: Parse the glb line by line
		line = line.trim();
		if (line === '') continue; // empty line

		const [key, ...data] = line.split(/\s+/);

		if (key === '#') continue; // comments

		if (key === 'v') {
			// vertex point
			const [x, y, z] = data;
			vertices.push(parseFloat(x), parseFloat(y), parseFloat(z));
		} else if (key === 'vt') {
			// texture - skip for now
			continue;
			// const [, u, v] = line.split(' ');
			// textures.push([parseFloat(u), parseFloat(v)]);
		} else if (key === 'vn') {
			// normal - skip for now
			continue;
			// const [, x, y, z] = line.split(' ');
			// normals.push(parseFloat(x), parseFloat(y), parseFloat(z));
		} else if (key === 'f') {
			console.log({ data });
			// face
			// for (const vertex of data) {
			// 	const [vertexIndex, textureIndex, normalIndex] = vertex.split('/');
			// 	indexes.push(parseInt(vertexIndex) - 1);
			// 	// textures.push(parseInt(textureIndex) - 1);
			// 	// normals.push(parseInt(normalIndex) - 1);
			// }
			for (let i = 0; i < data.length - 2; i++) {
				const [vIndexA, textureIndexA, normalIndexA] = data[i].split('/');
				const [vIndexB, textureIndexB, normalIndexB] = data[i + 1].split('/');
				const [vIndexC, textureIndexC, normalIndexC] = data[i + 2].split('/');

				const vertexIndexA = vIndexA < 0 ? vertices.length / 3 + vIndexA : vIndexA;
				const vertexIndexB = vIndexB < 0 ? vertices.length / 3 + vIndexB : vIndexB;
				const vertexIndexC = vIndexC < 0 ? vertices.length / 3 + vIndexC : vIndexC;

				// console.log({ line, data, i, vIndexA, vIndexB, vIndexC, vertexIndexA, vertexIndexB, vertexIndexC });

				indexes.push(parseInt(vertexIndexA) - 1);
				indexes.push(parseInt(vertexIndexB) - 1);
				indexes.push(parseInt(vertexIndexC) - 1);
			}
		}
	}

	console.log({ indexes, vertices });
	// console.log({ maxIdx: Math.max(...indexes), mxVertex: vertices.length / 3 - 1 });

	// Return indices and vertices of the teapot
	// TODO: Right now this returns a triangle
	return {
		indexes: new Uint16Array(indexes),
		vertices: new Float32Array(vertices),
		// indexes: new Uint16Array([0, 1, 2]),
		// vertices: new Float32Array([-1, -1, 0, 0, 1, 0, 1, -1, 0]),
	};
}

/**
 * Sets up a shader program that renders a red object.
 * @param {WebGLRenderingContext} context
 * @returns {WebGLProgram}
 */
function setupShaderProgram(context) {
	const vertexShader = context.createShader(context.VERTEX_SHADER);
	const fragmentShader = context.createShader(context.FRAGMENT_SHADER);

	context.shaderSource(
		vertexShader,
		`
    attribute vec3 position;
    uniform mat4 modelViewMatrix;
    void main() {
      gl_Position = modelViewMatrix * vec4(position, 1);
    }
  `,
	);
	context.shaderSource(
		fragmentShader,
		`
    precision mediump float;
    void main() {
      gl_FragColor = vec4(1, 0, 0, 1);
    }
  `,
	);

	context.compileShader(vertexShader);
	context.compileShader(fragmentShader);

	const program = context.createProgram();
	context.attachShader(program, vertexShader);
	context.attachShader(program, fragmentShader);
	context.linkProgram(program);

	return program;
}

async function renderTeapot() {
	// Create rendering context
	// https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
	const canvas = document.getElementById('canvas');
	/** @type {WebGLRenderingContext} */
	const context = canvas.getContext('webgl');

	// Load teapot geometry
	const teapotGeometry = await loadTeapotGeometry();

	// Bind indexes to ELEMENT_ARRAY_BUFFER
	const index = context.createBuffer();
	context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, index);
	context.bufferData(context.ELEMENT_ARRAY_BUFFER, teapotGeometry.indexes, context.STATIC_DRAW);

	// Bind vertices to ARRAY_BUFFER
	const position = context.createBuffer();
	context.bindBuffer(context.ARRAY_BUFFER, position);
	context.bufferData(context.ARRAY_BUFFER, teapotGeometry.vertices, context.STATIC_DRAW);

	// Use the red shader program
	const program = setupShaderProgram(context);
	context.useProgram(program);

	// Bind position to it shader attribute
	const positionLocation = context.getAttribLocation(program, 'position');
	context.enableVertexAttribArray(positionLocation);
	context.vertexAttribPointer(positionLocation, 3, context.FLOAT, false, 0, 0);

	let firstFrame = performance.now();

	const renderLoop = () => {
		const delta = performance.now() - firstFrame;

		// Set a rotating model view matrix
		const modelViewMatrixLocation = context.getUniformLocation(program, 'modelViewMatrix');
		const rotation = ((delta % 10000) / 10000) * Math.PI * 2;
		context.uniformMatrix4fv(
			modelViewMatrixLocation,
			false,
			new Float32Array([
				Math.cos(rotation),
				0,
				Math.sin(rotation),
				0,
				0,
				1,
				0,
				0,
				-Math.sin(rotation),
				0,
				Math.cos(rotation),
				0,
				0,
				0,
				0,
				1,
			]),
		);

		// Render the teapot
		context.drawElements(context.TRIANGLES, teapotGeometry.indexes.length, context.UNSIGNED_SHORT, 0);
		context.flush();

		// Request another frame
		requestAnimationFrame(renderLoop);
	};

	// Start the render loop
	requestAnimationFrame(renderLoop);
}

renderTeapot();
