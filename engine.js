var sdl = require("node-sdl");
var threads = require("webworker-threads");

var entities = [];
var msPerFrame = 0;
var sPerFrame = 0;
var sPerTimeStep = 0;
var window, renderer, world;
var _quitFun;
var _going = true;

var tickerEvent = function() {
	var event;
	while((event = sdl.pollEvent()) !== undefined) {
		if(_quitFun(event, world) || sdl.quitRequested()) {
			_going = false;
		}
		// for(var i in entities) {
		// 	entities[i].processInput(event, world);
		// }
		// for(i = 0; i < entities.length; i++) {
		// 	entities[i].processInput(event, world);
		// }
		var i = entities.length;
		while(i--) {
			entities[i].processInput(event, world);
		}
		if(event.type === "KEYDOWN") {
			if(event.scancode == sdl.SCANCODE.Q) {
				_going = false;
			}
		}
	}
}
var tickerTick = function(dt) {
	for(var i = 0; i < entities.length; i++) {
		entities[i].tick(dt, world);
	}
}
var tickerCollision = function() {
	for(var i = 0, len = entities.length; i < len; i++) {
		var ent1 = entities[i];
		for(var j = 0; j < len; j++) {
			var ent2 = entities[j];
			if(ent1 == ent2) {
				continue;
			}

			if(module.exports.rectCollision(ent1.pos, ent1.size, ent2.pos, ent2.size)) {
				ent1.handleCollision(ent2);
			}
		}
	}
}
var tickerTimeStep = function(dt) {
	for(var i = 0; i < entities.length; i++) {
		entities[i].timeStep(dt, world);
	}
}
var tickerRender = function(interpolation) {
	var befc = process.hrtime();
	renderer.clear();
	// console.log("Clear took: " + hrtoms(process.hrtime(befc)) + "ms.");
	var befl = process.hrtime();
	for(i = 0; i < entities.length; i++) {
		entities[i].render(renderer, interpolation);
	}
	// console.log("Render loop took: " + hrtoms(process.hrtime(befl)) + "ms.");
}

var timePassed = sPerTimeStep, start, delta, interpolation, last, slept = 0;
var ticker = function() {
	delta = hrtoms(process.hrtime(last));
	slept += delta / 1000.0;
	if(_going) {
		while(slept >= sPerFrame) {
			slept -= sPerFrame;

			tickerEvent();
			while(timePassed >= sPerTimeStep) {
				tickerTimeStep(sPerTimeStep);
				timePassed -= sPerTimeStep;
			}

			interpolation = timePassed / sPerTimeStep;
			interpolation *= sPerTimeStep;

			tickerTick(interpolation);
			tickerCollision();
			tickerRender(interpolation);
			presenter();
		}
		timePassed += hrtoms(process.hrtime(last)) / 1000;
		last = process.hrtime();
		setTimeout(ticker, 1);
	}
}
var presenter = function() {
	var befp = process.hrtime();
	renderer.present();
	var delta = hrtoms(process.hrtime(befp));
	if(delta > 20) {
		console.log("Present took too long: " + delta + "ms.");
	}
}
var hrtoms = function(hr) {
	return (hr[0] * 1e9 + hr[1]) / 1e6;
}

module.exports = {
	rectCollision: function(pos1, size1, pos2, size2) {
		if(pos1.x > pos2.x + size2.x) {
			return false;
		}
		else if(pos1.x + size1.x < pos2.x) {
			return false;
		}
		else if(pos1.y > pos2.y + size2.y) {
			return false;
		}
		else if(pos1.y + size1.y < pos2.y) {
			return false;
		}
		return true;
	},

	Entity: function (args) {
		this._pos = {x: 0, y: 0};
		this._size = {x: 0, y: 0};
		this._vel = {x: 0, y: 0};
		this._accel = {x: 0, y: 0};

		this.type = args.type || "Anything";
		this.pos = args.pos;
		this._fakepos = this._pos;
		this.size = args.size;
		this.vel = args.vel;
		this.accel = args.accel;
		this._texture = args.texture === undefined ? testTex : args.texture;
		this._id = args.id === undefined ? "BasicID" : args.id;

		this.render = args.render || this.render;
		this.processInput = args.processInput || this.processInput;
		this.tick = args.tick || this.tick;
		this.timeStep = args.timeStep || this.timeStep;
		this.handleCollision = args.handleCollision || this.handleCollision;

		entities.push(this);
	},
	choice: function (l) {
		var chosen = Math.floor(Math.random() * l.length);
		return l[chosen];
	},
	gameLoop: function(fps, setupFun, quitFun, windowArgs) {
		console.log("SDL VERSION: ", sdl.getVersion());
		msPerFrame = 1000 / fps;
		sPerFrame = msPerFrame / 1000;
		// If given an sPerFrame from 60 fps, should become about 25fps worth of time per step.
		sPerTimeStep = sPerFrame * 2.4;
		console.log("Seconds per time step: ", sPerTimeStep);
		_quitFun = quitFun;

		sdl.init(sdl.INIT.EVERYTHING);
		sdl.TTF.init();
		sdl.GL.setAttribute(sdl.GL.DOUBLEBUFFER, 1);

		window = new sdl.Window(!!windowArgs.title ? "Default" : windowArgs.title,
			!!windowArgs.x ? sdl.WINDOWPOS.CENTERED : windowArgs.x,
			!!windowArgs.y ? sdl.WINDOWPOS.CENTERED : windowArgs.y,
			!!windowArgs.w ? 640 : windowArgs.w,
			!!windowArgs.h ? 480 : windowArgs.h,
			sdl.WINDOW.OPENGL);
		// msPerFrame = 1000 / window.getDisplayMode().refreshRate;
		// sPerFrame = msPerFrame / 1000;
		renderer = new sdl.Renderer(window, -1, sdl.RENDERER.ACCELERATED | sdl.RENDERER.PRESENTVSYNC);
		// renderer = new sdl.Renderer(window, -1, sdl.RENDERER.ACCELERATED);
		world = setupFun(window, renderer);
		baseline = process.hrtime();
		renderer.clear();
		last = process.hrtime();
		ticker();
		// presenter();
		// setTimeout(presenter, 0);
		// setTimeout(ticker, 0);
		// ticker();
	}
}

module.exports.Entity.prototype = {
	move: function(delta) {
		this.x = this.x + delta.x;
		this.y = this.y + delta.y;
	},

	get x() {
		return this._fakepos.x;
	},
	get y() {
		return this._fakepos.y;
	},
	set x(x) {
		this._pos.x = x;
		this._fakepos.x = x;
	},
	set y(y) {
		this._pos.y = y;
		this._fakepos.y = y;
	},
	get pos() {
		return {x: this._fakepos.x, y: this._fakepos.y};
	},
	set pos(pos) {
		this._pos.x = pos.x === undefined ? this._pos.x : pos.x;
		this._pos.y = pos.y === undefined ? this._pos.y : pos.y;
		this._fakepos = this._pos;
	},
	get realPos() {
		return {x: this._pos.x, y: this._pos.y};
	},

	get w() {
		return this._size.x;
	},
	get h() {
		return this._size.y;
	},
	set w(w) {
		this._size.x = w;
	},
	set h(h) {
		this._size.y = h;
	},
	get size() {
		return {x: this._size.x, y: this._size.y};
	},
	set size(size) {
		if(size) {
			this._size.x = size.x === undefined ? this._size.x : size.x;
			this._size.y = size.y === undefined ? this._size.y : size.y;
		}
	},

	get vel() {
		return this._vel;
	},
	get velx() {
		return this._vel.x;
	},
	get vely() {
		return this._vel.y;
	},
	set vel(vel) {
		if(vel) {
			this._vel.x = vel.x === undefined ? this._vel.x : vel.x;
			this._vel.y = vel.y === undefined ? this._vel.y : vel.y;
		}
	},
	set velx(x) {
		this._vel.x = x;
		if(this._vel.x == 0) {
			this._pos.x = this._fakepos.x;
		}
	},
	set vely(y) {
		this._vel.y = y;
		if(this._vel.y == 0) {
			this._pos.y = this._fakepos.y;
		}
	},

	get accel() {
		return {x: this._accel.x, y: this._accel.y};
	},
	set accel(accel) {
		if(accel) {
			this._accel.x = accel.x === undefined ? this._accel.x : accel.x;
			this._accel.y = accel.y === undefined ? this._accel.y : accel.y;
		}
	},

	set texture(texture) {
		this._texture = texture || this._texture;
	},

	processInput: function(event, world) {
		// console.log("Entity basic processInput: " + event.type);
	},
	render: function(renderer, interpolation) {
		renderer.copy(this._texture, undefined, new sdl.Rect(this._fakepos.x, this._fakepos.y, this.w, this.h));
	},
	tick: function(dt, world) {
		var interpAccelx = this._accel.x * dt;
		var interpAccely = this._accel.y * dt;
		var interpVelx = this._vel.x + interpAccelx;
		var interpVely = this._vel.y + interpAccely;
		var x = this._pos.x + interpVelx * dt;
		var y = this._pos.y + interpVely * dt;
		this._fakepos = {x: x, y: y};
	},
	timeStep: function(dt, world) {
		this._vel.x += this._accel.x * dt;
		this._vel.y += this._accel.y * dt;

		this._pos.x += this._vel.x * dt;
		this._pos.y += this._vel.y * dt;

		this._fakepos = this._pos;
	},
	handleCollision: function(other) {
	}
};
