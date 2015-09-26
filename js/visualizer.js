var scene, camera, renderer, controls, analyser, dataArray, bufferLength;
window.cubes = [];
window.cubeMesh = [];
window.blocks = [];
window.floatingBlocks = [];

init();
loadAudio();
animate();
initGraphics();

function init() {
	scene = new THREE.Scene();
	//camera takes args FOV, aspect ratio, closest, farthest
	camera = new THREE.PerspectiveCamera( 75,  window.innerWidth / window.innerHeight, 0.1, 1000);

	//adds renderer
	renderer = new THREE.WebGLRenderer( {antialias: true} );
	renderer.setSize( window.innerWidth, window.innerHeight-100 ); //vertical size is decresed so scrolling isn't needed.
	document.body.appendChild( renderer.domElement );

	//initializes OrbitControls
	controls = new THREE.OrbitControls( camera );
	controls.target.set(
		camera.position.x + 0.1 ,
		camera.position.y,
		camera.position.z
	);

	// function setOrientationControls(e) {
	// 	if (!e.alpha) {
	// 		return;
	// 	}
	// 	controls = new THREE.DeviceOrientationControls(camera, true);
	// 	controls.connect();
	// 	controls.update();
	// 	element.addEventListener('click', fullscreen, false);
	// 	window.removeEventListener('deviceorientation', setOrientationControls, true);
	// }
	// window.addEventListener('deviceorientation', setOrientationControls, true);

	//resizes canvas if window is resized
	window.addEventListener( 'resize', function() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
	  renderer.setSize( window.innerWidth, window.innerHeight-100 ); //must be same as render.setSize
	});
}

function loadAudio() {
  //creates audio context with multiple browser support
  var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	var audio = document.getElementById("audio");
	//if a song is chosen, the song will be loaded and played
	var audioSelector = document.getElementById("audioSelector");
	var URL = window.URL || window.webkitURL;
	audio.src = "rayman.ogg"; //default audio is rayman
	audioSelector.addEventListener ('change', function() {
		audio.src = URL.createObjectURL(audioSelector.files[0]); //get url to the object (song)
		audio.load();
		audio.play();
	});
  //creates analyser
  analyser = audioCtx.createAnalyser();
  analyser.smoothingTimeConstant = 0.85;
  analyser.fftSize = 1024;
  //connects audio source to analyser, analyser to speakers
  var source = audioCtx.createMediaElementSource(audio);
	source.connect(analyser);
  analyser.connect(audioCtx.destination);
  //creates an unsigned 8 bit array of the same length as the fftSize
	bufferLength = analyser.frequencyBinCount/2;
	dataArray = new Uint8Array(bufferLength);
}

function initGraphics() { //renders the cubes into the scene
	cubes = new Array(bufferLength);
	var cubeGeometry = new THREE.BoxGeometry( 1, 1, 1 );
	var cubeMaterial = new THREE.MeshBasicMaterial ( {color: 0xffddff, transparent: true, opacity: 0.8}	);

	var blockGeometry = new THREE.BoxGeometry( 1, Math.random() , 1);
	var blockMaterial = new THREE.MeshBasicMaterial ( {color: 0x66CCFF} );

	//radius of the visualizer circle
	var radius = 200;
	//creates an bufferLength number of cubes and sets their positions
	for(var i = 0; i < cubes.length; i++) {
		var cubeMesh = new THREE.Mesh( cubeGeometry, cubeMaterial );
		var angle = i * Math.PI * 2 / cubes.length;
		cubeMesh.position.x = Math.cos(angle) * radius;
		cubeMesh.position.z = Math.sin(angle) * radius;
		cubes[i] = cubeMesh;
		scene.add(cubeMesh);
	}

	//creates a bunch of random cubes
	for(var i = 0; i < cubes.length; i++) {
		var blocks = new THREE.Mesh( blockGeometry, blockMaterial);
		blocks.position.y = ( Math.random() - .5 ) * radius;
		blocks.position.z = ( Math.random() - .5 ) * radius;
		blocks.position.x = ( Math.random() - .5 ) * radius;
		floatingBlocks[i] = blocks;
		scene.add(blocks);
	}
}

function draw() { //changes the position of the cube every frame and changes its length, but does no rerender
	//for every frame update, fills the array dataArray with frequency data
	analyser.getByteFrequencyData(dataArray);
	var t = new Date().getTime();
	var radius = 200;
	var slow = 1/20000;
	for (var i = 0; i < cubes.length; i++) {
		var angle = i * Math.PI * 2 / cubes.length + ( t * slow * Math.PI * 2  );
		cubes[i].position.x = Math.cos(angle) * radius;
		cubes[i].position.z = Math.sin(angle) * radius;
		//rescales each cube iteratively on the z axis
    cubes[i].scale.y = Math.max(1, dataArray[i]*dataArray[i]/300);
		//changes the scale of the random blocks
		var blockSize = Math.max(.1, dataArray[i]/400 );
		floatingBlocks[i].scale.x = blockSize;
		floatingBlocks[i].scale.y = blockSize;
		floatingBlocks[i].scale.z = blockSize;
	}
}

function animate() {
	requestAnimationFrame(animate);
	controls.update();
	draw();
	render();
}

function render() {
	renderer.render(scene, camera);
}
