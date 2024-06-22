const HyperbeamPromise = import("@hyperbeam/web");

//Code from Hyperbeam's Aframe Example, prior attempts clearely showed that some part of this code should happen server side to implement the best practices
AFRAME.registerComponent("hyperbeam", {
	async init() {
		// Manipulate and set the mesh
		const geometry = this.el.getObject3D("mesh").geometry;
		const { width, height } = geometry.parameters;
		if (!navigator.userAgent.includes("Firefox")) {
			geometry.rotateZ(Math.PI);
			geometry.rotateY(Math.PI);
		}
		const texture = new THREE.Texture();
		const renderer = this.el.sceneEl.renderer;
		const material = new THREE.MeshBasicMaterial({ map: texture }); // Can we re-use the mesh's material?
		material.side = THREE.DoubleSide;
		const plane = new THREE.Mesh(geometry, material);
		this.el.setObject3D("mesh", plane);

		// Create a Hyperbeam computer
		let embedURL = ""; // Running locally and you have an embed URL? Set it here
		if (embedURL === "") {
			const room = "gdm-demo"; //location.pathname.substring(1)
			const req = await fetch(
				"https://demo-api.tutturu.workers.dev/" + room
			);
			if (req.status >= 400) {
				alert(
					"We are out of demo servers! Visit hyperbeam.dev to get your own API key"
				);
				return;
			}
			const body = await req.json();
			if (body.room !== room) {
				history.replaceState(
					null,
					null,
					"/" + body.room + location.search
				);
			}
			embedURL = body.url;
		}

		// Render the Hyperbeam computer
		const Hyperbeam = (await HyperbeamPromise).default;
		const hb = await Hyperbeam(hbcontainer, embedURL, {
			frameCb: (frame) => {
				if (!texture.image) {
					if (frame.constructor === HTMLVideoElement) {
						// hack: three.js internal methods check for .width and .height
						// need to set manually for video so that three.js handles it correctly
						frame.width = frame.videoWidth;
						frame.height = frame.videoHeight;
					}
					texture.image = frame;
					texture.needsUpdate = true;
				} else {
					renderer.copyTextureToTexture(
						new THREE.Vector2(0, 0),
						new THREE.Texture(frame),
						texture
					);
				}
			},
			audioTrackCb: (track) => {
				audio.srcObject = new MediaStream([track]);
				// This function never fire: it seems AFrame only supports static audio
				this.el.addEventListener("sound-loaded", () => {
					this.el.components.sound.playSound();
				});
			},
		});

		// Handle mouse inputs
		const handlePointer = (e) => {
			const vector = new THREE.Vector3().copy(
				e.detail.intersection.point
			);
			plane.worldToLocal(vector);
			hb.sendEvent({
				type: e.type,
				x: vector.x / width + 0.5,
				y: -vector.y / height + 0.5,
				// AFrame v1.13.0 does not expose the original mouse event:
				// https://github.com/aframevr/aframe/pull/5088
				button: 0,
			});
		};
		// At the moment there's no "mousemove" event
		// https://aframe.io/docs/1.3.0/components/cursor.html#events
		this.el.addEventListener("mousedown", handlePointer);
		this.el.addEventListener("mouseup", handlePointer);
		window.addEventListener("wheel", (e) => {
			if (this.el.is("cursor-hovered")) {
				hb.sendEvent({
					type: "wheel",
					deltaY: e.deltaY,
				});
			}
		});
	},
});

AFRAME.registerComponent("log", {
	init() {
		this.el.addEventListener("click", (e) => {
			console.log(e);
		});
		this.el.addEventListener("hideIsland", (e) => {
			console.log(e);
		});
		this.el.addEventListener("showIsland", (e) => {
			console.log(e);
		});
		this.el.addEventListener("showBands", (e) => {
			console.log(e);
		});
		this.el.addEventListener("hideBands", (e) => {
			console.log(e);
		});
	},
});

AFRAME.registerComponent("regie", {
	events: {
		summon: function (evt) {
		  console.dir(this.el.sceneEl.camera.el)
		  const camera = this.el.sceneEl.camera;
		  if(!camera)return;
		  camera.parent = this.el.object3D;
		  camera.position.x = 0;
		  camera.position.y = 0;
		  camera.position.z = 0;
		  camera.rotation.x = 0;
		  camera.rotation.y = 0;
		  camera.rotation.z = 0;
		}
	  },
	init: function () {
		this.system.registerMe(this.el);
	},

	remove: function () {
		this.system.unregisterMe(this.el);
	},

	
});

AFRAME.registerSystem("regie", {
	init: function () {
		this.entities = [];
		document.addEventListener("keydown",(e)=>{
			if(e.code.startsWith("Digit")){
				//numbers will have a code like "Digit0" to "Digit9" but we wont use the number 0
				const number = Number.parseInt(e.code.replace("Digit",""))
				this.entities[number-1]?.emit("summon");
			}
		})
	},

	registerMe: function (el) {
		this.entities.push(el);
	},

	unregisterMe: function (el) {
		var index = this.entities.indexOf(el);
		this.entities.splice(index, 1);
	},
});
