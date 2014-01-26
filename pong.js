var sdl = require("node-sdl");
var eng = require("./engine.js");

var width = 640;
var height = 480;
var title = "Pong";
var fps = 60;

var paddleSize = {x: width / 10, y: width / 20};
var paddleSpeed = 230;

var rectCollision = function(pos1, size1, pos2, size2) {
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
}

var paddleInput = function(event, world) {
	if(event.repeat !== undefined && event.repeat) {
		return;
	}

	if(event.type === "KEYDOWN") {
		if(event.scancode === sdl.SCANCODE.LEFT) {
			this.velx += -paddleSpeed;
		}
		else if(event.scancode === sdl.SCANCODE.RIGHT) {
			this.velx += paddleSpeed;
		}
	}
	else if(event.type === "KEYUP") {
		if(event.scancode === sdl.SCANCODE.LEFT) {
			this.velx += paddleSpeed;
		}
		else if(event.scancode === sdl.SCANCODE.RIGHT) {
			this.velx += -paddleSpeed;
		}
	}
}
// var paddleTick = function(dt, world) {
// 	eng.Entity.prototype.timeStep.apply(this, [dt, world]);

// 	if(this.x < world.leftWall.x + world.leftWall.w) {
// 		this.x = world.leftWall.x + world.leftWall.w - 1;
// 	}
// 	else if(this.x + this.w > world.rightWall.x) {
// 		this.x = world.rightWall.x - this.w;
// 	}
// }
var paddleCollision = function(other) {
	if(other.type === "wall") {
		var dxRight = (this.x + this.w) - other.x;
		var dxLeft = (other.x + other.w) - this.x;
		if(dxLeft < dxRight) {
			this.x += dxLeft - 1;
		}
		else {
			this.x -= dxRight;
		}
	}
}

var ballTick = function(dt, world) {
	eng.Entity.prototype.timeStep.apply(this, [dt, world]);

	if(this.x < world.leftWall.x + world.leftWall.w) {
		this.vel.x = -this.vel.x;
	}
	else if(this.x + this.w > world.rightWall.x) {
		this.vel.x = -this.vel.x;
	}
	else if(this.y + this.h < 0) {
		// this.vel.y = -this.vel.y;
		world.playerScore.score++;
		this.x = width / 2 - this.w / 2;
		this.y = height / 2 - this.h / 2;
		var ratio = Math.min(Math.random(), 0.3);
		ratio = Math.max(ratio, 0.7);
		this.vel.x = 200 * ratio;
		this.vel.y = 200 * (1 - ratio);
		// console.log("Player now has score: " + world.playerScore);
	}
	else if(this.y > height) {
		// this.vel.y = -this.vel.y;
		world.enemyScore.score++;
		this.x = width / 2 - this.w / 2;
		this.y = height / 2 - this.h / 2;
		var ratio = Math.min(Math.random(), 0.3);
		ratio = Math.max(ratio, 0.7);
		this.vel.x = 200 * ratio;
		this.vel.y = 200 * (1 - ratio);
		// console.log("Enemy now has score: " + world.enemyScore);
	}
	else if(rectCollision(this.pos, this.size, world.paddle.pos, world.paddle.size)) {
		var ballMiddle = this.x + this.w / 2;
		var paddleMiddle = world.paddle.pos.x + world.paddle.size.x / 2;
		var delta = ballMiddle - paddleMiddle;
		var direction = delta < 0 ? -1 : 1;
		delta = Math.abs(delta);
		var ratio = delta === 0 ? 0 : delta / world.paddle.size.x / 2;
		ratio = Math.min(ratio, 0.7);
		var totalSpeed = Math.abs(this.vel.x) + Math.abs(this.vel.y) + 20;
		this.vel.x = totalSpeed * ratio * direction;
		this.vel.y = -totalSpeed * (1 - ratio);
	}
	else if(rectCollision(this.pos, this.size, world.enemy.pos, world.enemy.size)) {
		var ballMiddle = this.x + this.w / 2;
		var paddleMiddle = world.enemy.pos.x + world.enemy.size.x / 2;
		var delta = ballMiddle - paddleMiddle;
		var direction = delta < 0 ? -1 : 1;
		delta = Math.abs(delta);
		var ratio = delta === 0 ? 0 : delta / world.enemy.size.x / 2;
		ratio = Math.min(ratio, 0.7);
		var totalSpeed = Math.abs(this.vel.x) + Math.abs(this.vel.y) + 20;
		this.vel.x = totalSpeed * ratio * direction;
		this.vel.y = totalSpeed * (1 - ratio);
		world.enemy.hitArea = Math.random() * world.enemy.w;
	}
}

var enemyTick = function(dt, world) {
	// eng.Entity.prototype.timeStep.apply(this, [dt, world]);

	this.x = (world.ball.x + world.ball.w / 2) - this.w + this.hitArea;

	if(this.x < world.leftWall.x + world.leftWall.w) {
		this.x = world.leftWall.x + world.leftWall.w;
	}
	else if(this.x + this.w > world.rightWall.x) {
		this.x = world.rightWall.x - this.w;
	}
}

var scoreTick = function(dt, world, self) {
	if(self.lastScore != self.score) {
		console.log("Creating new texture for score: ", self.score);
		self.lastScore = self.score;
		var score = world.font.renderTextBlended("" + self.score, new sdl.Color(255, 255, 255));
		self.texture = new sdl.Texture(world.renderer, score);
	}
}

var shouldQuit = function(event, world) {
	if(event.type === "KEYDOWN") {
		if(event.scancode === sdl.SCANCODE.Q) {
			return true;
		}
	}
	return false;
}

var setup = function(window, renderer) {
	var world = {};

	var surface = new sdl.Surface(paddleSize.x, paddleSize.y);
	surface.fillRect(new sdl.Color(255, 255, 255).getColor(surface.getPixelFormat()));
	world.paddleTex = new sdl.Texture(renderer, surface);

	surface = new sdl.Surface(width / 30, width / 30);
	surface.fillRect(new sdl.Color(255, 255, 255).getColor(surface.getPixelFormat()));
	world.ballTex = new sdl.Texture(renderer, surface);

	surface = new sdl.Surface(width / 100, height);
	surface.fillRect(new sdl.Color(255, 255, 255).getColor(surface.getPixelFormat()));
	world.wallTex = new sdl.Texture(renderer, surface);

	world.font = new sdl.TTF.Font("Arial.ttf", 26);

	world.paddle = new eng.Entity({
		type: "paddle",
		texture: world.paddleTex,
		processInput: paddleInput,
		// timeStep: paddleTick,
		handleCollision: paddleCollision,
		pos: {y: height - paddleSize.y * 2, x: width / 2 - paddleSize.x / 2},
		size: paddleSize
	});
	world.enemy = new eng.Entity({
		type: "paddle",
		texture: world.paddleTex,
		tick: enemyTick,
		pos: {y: paddleSize.y, x: width / 2 - paddleSize.x / 2},
		size: paddleSize
	});
	world.enemy.hitArea = Math.random() * paddleSize.x;

	world.leftWall = new eng.Entity({
		type: "wall",
		texture: world.wallTex,
		pos: {y: 0, x: (width / 100) * 2 + 100},
		size: {x: width / 50, y: height}
	});
	world.rightWall = new eng.Entity({
		type: "wall",
		texture: world.wallTex,
		pos: {y: 0, x: width - (width / 100) * 2 - 100},
		size: {x: width / 50, y: height}
	});

	world.ball = new eng.Entity({
		type: "ball",
		texture: world.ballTex,
		timeStep: ballTick,
		pos: {y: height / 2, x: width / 2},
		size: {x: width / 30, y: width / 30},
		vel: {x: 100, y: 100}
	});

	var score = world.font.renderTextBlended("" + 0, new sdl.Color(255, 255, 255));
	world.playerScore = new eng.Entity({
		type: "score",
		texture: new sdl.Texture(renderer, score),
		tick: function(dt, world) { scoreTick(dt, world, world.playerScore); },
		pos: {y: height - score.getHeight(), x: score.getHeight()},
		size: {x: score.getWidth(), y: score.getHeight()}
	});
	world.playerScore.score = 0;
	world.playerScore.lastScore = 0;
	score = world.font.renderTextBlended("" + 0, new sdl.Color(255, 255, 255));
	world.enemyScore = new eng.Entity({
		type: "score",
		texture: new sdl.Texture(renderer, score),
		tick: function(dt, world) { scoreTick(dt, world, world.enemyScore); },
		pos: {y: score.getHeight(), x: width - score.getWidth()},
		size: {x: score.getWidth(), y: score.getHeight()}
	});
	world.enemyScore.score = 0;
	world.enemyScore.lastScore = 0;

	world.renderer = renderer;

	return world;
}

eng.gameLoop(fps, setup, shouldQuit, {width: width, height: height, title: title});