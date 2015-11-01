var scene, visualizer, industrial, camera, renderer, controls, dataArray, timeArray, analyser, bufferLength;
window.cubes = [];
window.cubeMesh = [];
window.waves = [];
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
visualizer = new THREE.Object3D;
industrial = new THREE.Object3D;
scene.add(visualizer, industrial);
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
  navigator.getUserMedia =  navigator.getUserMedia ||
                            navigator.webkitGetUserMedia ||
                            navigator.mozGetUserMedia;
  // User choses mic
  document.getElementById("useMic")
          .addEventListener("click", function() {
            // Allows mic
            if (navigator.getUserMedia) {
              navigator.getUserMedia( {audio:true},
              function(stream) {
                audio.pause();
                analyser.disconnect();
                mic = audioCtx.createMediaStreamSource(stream);
                mic.connect(analyser);
              },
              function(err) {
                console.log(err.name + ": " + err.message);
              }
            );
          } else {
              console.log("getUserMedia not supported.");
          }
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
  timeArray = new Uint8Array(bufferLength);

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


function addBars() {
  cubes = new Array(bufferLength);
  var cubeGeometry = new THREE.BoxGeometry( .05, .05, .1 );
  var cubeMaterial = new THREE.MeshBasicMaterial ({
    color: 0x00ccff,
    transparent: true,
    opacity: .85
  });
  for(var i = 0; i < cubes.length; i++) {
    cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cubes[i] = cubeMesh;
    cubes[i].position.y = (i/16)-2;
    visualizer.add(cubeMesh);
  }
}

function addWave() {
  waves = new Array(bufferLength);
  var waveGeometry = new THREE.BoxGeometry(.05, .065, .05);
  var waveMaterial = new THREE.MeshBasicMaterial({
    color: 0xFF0066,
    transparent: true,
    opacity: .85
  });
  for(var i = 0; i < waves.length; i++) {
    waveMesh = new THREE.Mesh(waveGeometry, waveMaterial);
    waves[i] = waveMesh;
    waves[i].position.y = (i/16)-2;
    visualizer.add(waveMesh);
  }
}

function addHazard() {
  var hazardPic = THREE.ImageUtils.loadTexture("1.png");
  var hazardMaterial = new THREE.SpriteMaterial({map: hazardPic});
  hazard = new THREE.Sprite(hazardMaterial);
  hazard.scale.set(5, 5, 5);
  industrial.add(hazard);
}

function addPlane() {
  var planeGeometry = new THREE.PlaneGeometry(6,6,3,3)
  var planeMaterial = new THREE.MeshBasicMaterial({
    color: 0x0000ff,
    transparent: false
  });
  var plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.position.z = 1;
  industrial.add(plane);
}

//////////////////////////////////////////////////////////////////////////////////
//		Draw bars
//////////////////////////////////////////////////////////////////////////////////

var t = new Date().getTime();
var slowFactor = 1/100000;

onRenderFcts.push(function(analyser) {
  analyser.getByteFrequencyData(dataArray);
  analyser.getByteTimeDomainData(timeArray);
  for (var i = 0; i < cubes.length; i++) {
    // Control bar graph
    cubes[i].scale.x = Math.max(1, dataArray[i]*dataArray[i]/200);
    // Control oscilloscope
    waves[i].position.x = timeArray[i]/64.0;
  }
})


//////////////////////////////////////////////////////////////////////////////////
//		Render scene
//////////////////////////////////////////////////////////////////////////////////

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

// Scene only shows if marker detected or float enabled
scene.visible = false;

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
  var object3d = scene;

  // Hide the objects until the marker has been found
  var float = document.getElementById("float");
  if (float.checked) {
    scene.visible = true;
  }

  // When the hazard checkbox is checked, show the hazard icon and hide the visualizer
  var hazardCheck = document.getElementById("hazard");
  markers.forEach( function(marker) {
    jsArucoMarker.markerToObject3D(marker, object3d)
    scene.visible = true;
    if (!hazardCheck.checked) {
      visualizer.visible = true;
      industrial.visible = false;
    } else {
      visualizer.visible = false;
      industrial.visible = true;
    }
  })
});

initAudio();
addHazard();
addWave();
addBars();
