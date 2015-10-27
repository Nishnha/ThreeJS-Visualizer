var scene, camera, renderer, controls, dataArray, analyser, bufferLength;
window.cubes = [];
window.cubeMesh = [];
window.light = [];
window.floatingLights = [];

var audioSource = document.getElementById("audioSource");
audioSource.addEventListener('click', function(){
	console.log(audio.src);
});

function init() {
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera( 75,  window.innerWidth / window.innerHeight, 0.1, 1000);
	renderer = new THREE.WebGLRenderer( {antialias: true} );
	renderer.setSize( window.innerWidth, window.innerHeight-100 );
	document.body.appendChild( renderer.domElement );

	//initializes OrbitControls
	controls = new THREE.OrbitControls( camera );
	controls.target.set(
		camera.position.x + 0.1 ,
		camera.position.y,
		camera.position.z
	);

	//resizes canvas if window is resized
	window.addEventListener( 'resize', function() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
	  renderer.setSize( window.innerWidth, window.innerHeight-100 ); //must be same as render.setSize
	});
}

function initAudio() {
	var audio = document.getElementById("audio");
	//audio.src = "Rayman.ogg";

	//set audio as a user selected song
	//function getSong() {
		var songFile = document.getElementById("songFile");
		songFile.addEventListener ('change', function() {
				audio.src = URL.createObjectURL(document.getElementById('songFile').files[0]);
				audio.load();
				audio.play();
		});
	//}

	//set audio as the user's microphone
	var micButton = document.getElementById("useMic");
	micButton.addEventListener("click", function useMic() {
		navigator.mediaDevices = navigator.mediaDevices ||
													 ((navigator.mozGetUserMedia ||
														 navigator.webkitGetUserMedia) ? {
		 getUserMedia: function(c) {
			 return new Promise(function(y, n) {
				 (navigator.mozGetUserMedia ||
				  navigator.webkitGetUserMedia).call(navigator, c, y, n);
			 });
		 }
	 	} : null);
		//if the user allows mic
		navigator.mediaDevices.getUserMedia({audio:true})
		.then(function(stream) {
			audio.src = window.URL.createObjectURL(stream);
			audio.play();
			//console.log(audio.src);
			onloadedmetadata = function(e) {
	    	audio.play();
			};
		})
		.catch(function(err) {
			console.log(err.name + ": " + err.message);
		});
	});
	//must create audio context to process audio info
	var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	analyser = audioCtx.createAnalyser();
  analyser.smoothingTimeConstant = 0.85;
	analyser.fftSize = 1024;

	//dataArray is used to control the music visualizer
	bufferLength = analyser.frequencyBinCount/2;
	dataArray = new Uint8Array(bufferLength);

	//connect audio to the analyser, analyzer to the speaker
	var source = audioCtx.createMediaElementSource(audio);
	source.connect(analyser);
	analyser.connect(audioCtx.destination);
}

function initGraphics() { //renders the cubes into the scene
	cubes = new Array(bufferLength);
	var cubeGeometry = new THREE.BoxGeometry( 1, 1, 1 );
	var cubeMaterial = new THREE.MeshBasicMaterial ( {color: 0xffddff, transparent: true, opacity: 0.8}	);

	var lightGeometry = new THREE.SphereGeometry(1, 20, 20);
	var lightMaterial = new THREE.MeshBasicMaterial ( {color: 0x66CCFF} );

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
		var light = new THREE.Mesh( lightGeometry, lightMaterial);
		light.position.x = (Math.random() - .5 ) * radius;
		light.position.y = (Math.random() - .5 ) * radius;
		light.position.z = (Math.random() - .5 ) * radius;
		floatingLights[i] = light;
		scene.add(light);
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
		var lightSize = Math.max(.1, dataArray[i]/400 );
		floatingLights[i].scale.x = lightSize;
		floatingLights[i].scale.y = lightSize;
		floatingLights[i].scale.z = lightSize;
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

init();
initAudio();
animate();
initGraphics();
