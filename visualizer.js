var scene, camera, renderer, controls, dataArray, analyser, bufferLength;
window.cubes = [];
window.cubeMesh = [];

//////////////////////////////////////////////////////////////////////////////////
//		Check if all features are supported
//////////////////////////////////////////////////////////////////////////////////

(function checkSupport(){
  var hasGetUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia) ? true : false
  var hasMediaStreamTrackSources = MediaStreamTrack.getSources ? true : false
  var hasWebGL = ( function () { try { var canvas = document.createElement( 'canvas' ); return !! ( window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) ) ); } catch ( e ) { return false; } } )()

  if( hasWebGL === false ){
    alert('your browser doesn\'t support navigator.getUserMedia()')
  }
  if( hasMediaStreamTrackSources === false ){
    alert('your browser doesn\'t support MediaStreamTrack.getSources()')
  }
  if( hasGetUserMedia === false ){
    alert('your browser doesn\'t support navigator.getUserMedia()')
  }
})()


//////////////////////////////////////////////////////////////////////////////////
//		Init
//////////////////////////////////////////////////////////////////////////////////

// Init scene and renderer
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera( 75,  window.innerWidth / window.innerHeight, 0.1, 1000);
renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});
renderer.setSize( window.innerWidth, window.innerHeight-100 );
document.body.appendChild( renderer.domElement );

// Resize canvas automatically
window.addEventListener( 'resize', function() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight-100 ); //must be same as render.setSize
});

// array of functions for the rendering loop
var onRenderFcts = [];


//////////////////////////////////////////////////////////////////////////////////
//		Control the visualizer
//////////////////////////////////////////////////////////////////////////////////

function addControls(audio, audioCtx, analyser) {
  var mic;
  // User choses mic
  document.getElementById("useMic")
          .addEventListener("click", function() {
            // Allows mic
            navigator.mediaDevices.getUserMedia({audio: true})
            .then(function(stream) {
              audio.pause();
              analyser.disconnect();
              mic = audioCtx.createMediaStreamSource(stream);
              mic.connect(analyser);
            })
            .catch(function(err) {
              console.log(err.name + ": " + err.message);
            });
  });
  // User uploads a song file
  document.getElementById("songFile")
          .addEventListener("change", function() {
            audio.src = URL.createObjectURL(document.getElementById('songFile').files[0]);
            mic.disconnect();
            analyser.connect(audioCtx.destination);
            audio.load();
            audio.play();
  });
}


//////////////////////////////////////////////////////////////////////////////////
//		Analyze the selected audio
//////////////////////////////////////////////////////////////////////////////////

function initAudio() {
  var audio = document.getElementById("audio");
  // Create audio context to process audio info
  var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.smoothingTimeConstant = 0.85;
  analyser.fftSize = 1024;

  // dataArray controls the visualizer
  bufferLength = analyser.frequencyBinCount/2;
  dataArray = new Uint8Array(bufferLength);

  // Connect audio to the analyser, analyzer to the speaker
  audio.src = "Rayman.ogg";
  var source = audioCtx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  // Let the user select the connection
  addControls(audio, audioCtx, analyser);
  //draw(analyser);
}


//////////////////////////////////////////////////////////////////////////////////
//		Initialize objects
//////////////////////////////////////////////////////////////////////////////////

function addPlane() {
  var planeGeometry = new THREE.PlaneGeometry(200,200,200,200)
  var planeMaterial = new THREE.MeshBasicMaterial({
    color: 0x0000ff,
    transparent: false
  });
  var plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.position.z = 1;

  scene.add(plane);
}

function addBars() {
  cubes = new Array(bufferLength);

  var cubeGeometry = new THREE.BoxGeometry( .05, .05, .05 );
  var cubeMaterial = new THREE.MeshBasicMaterial ({
    color: 0x00ccff,
    transparent: true,
    opacity: 0.8
  });

  // Creates a bufferLength number of cubes and set their positions
  var radius = 10;
    for(var i = 0; i < cubes.length; i++) {
    var cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
    var angle = i * Math.PI * 2 / cubes.length;
    cubeMesh.position.x = Math.cos(angle) * radius;
    cubeMesh.position.y = Math.sin(angle) * radius;
    cubes[i] = cubeMesh;
    scene.add(cubeMesh);
  }
}


//////////////////////////////////////////////////////////////////////////////////
//		Draw bars
//////////////////////////////////////////////////////////////////////////////////

onRenderFcts.push(function(analyser) {
  analyser.getByteFrequencyData(dataArray);
  var t = new Date().getTime();
  var radius = 5;
  var slowFactor = 1/100000;
  for (var i = 0; i < cubes.length; i++) {
    // Rotate each bar in a circle
    var angle = i * Math.PI * 2 / cubes.length + ( t * slowFactor * Math.PI * 2  );
    cubes[i].position.x = Math.cos(angle) * radius;
    cubes[i].position.y = Math.sin(angle) * radius;
    cubes[i].position.z = 2;

    // Rescales each bar accordng to the dataArray
    cubes[i].scale.z = Math.max(1, dataArray[i]*dataArray[i]/2500);
  }
})


//////////////////////////////////////////////////////////////////////////////////
//		Render scene
//////////////////////////////////////////////////////////////////////////////////

// set the scene as visible
scene.visible	= false

// render the scene
onRenderFcts.push(function(){
  renderer.render( scene, camera );
})

// run the rendering loop
var previousTime = performance.now()
requestAnimationFrame(function animate(now){

  requestAnimationFrame(animate);

  onRenderFcts.forEach(function(onRenderFct) {
    onRenderFct(analyser)
  })

  previousTime	= now
})


//////////////////////////////////////////////////////////////////////////////////
//		Add AR stuff **Adapted from threex.webar
//////////////////////////////////////////////////////////////////////////////////

// Init the marker recognition
var jsArucoMarker	= new THREEx.JsArucoMarker()

// Init the image source grabbing
if( false ){
  var videoGrabbing = new THREEx.VideoGrabbing()
  jsArucoMarker.videoScaleDown = 10
} else if( true ){
  var videoGrabbing = new THREEx.WebcamGrabbing()
  jsArucoMarker.videoScaleDown = 2
} else if( true ){
  var videoGrabbing = new THREEx.ImageGrabbing()
  jsArucoMarker.videoScaleDown = 10
} else console.assert(false)

// Attach the videoGrabbing.domElement to the body
document.body.appendChild(videoGrabbing.domElement)

// process the image source with the marker recognition
onRenderFcts.push(function(){
  var domElement = videoGrabbing.domElement
  var markers	= jsArucoMarker.detectMarkers(domElement)
  var object3d = scene

  // Hide the objects until the marker has been found
  object3d.visible = false

  markers.forEach( function(marker) {
    jsArucoMarker.markerToObject3D(marker, object3d)
    object3d.visible = true
  })
});

initAudio();
addBars();
