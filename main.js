function SArray(size, content) {
    var result = [];
    for (var i = 0; i < size; i++) {
        result[i] = JSON.parse(JSON.stringify(content));
    }
    return result;
}


function CircleEmitter(options) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.size = options.size || 100;
    this.power = options.power || 1;
    this.update = function () {
    };
    this.value = function (x, y, dt) {
        var r = Math.sqrt((this.x - x) * (this.x - x) + (this.y - y) * (this.y - y)) / this.size;
        return Math.random() < ((1 - r * r) * this.power * dt) ? 0.25 : 0;
    }
}

function l(line) {
    return Math.sqrt((line[0].x - line[1].x) * (line[0].x - line[1].x) + (line[0].y - line[1].y) * (line[0].y - line[1].y))
}

function p(curve, t) {
    return {
        x: curve[0].x * (1 - t) * (1 - t) + 2 * curve[1].x * (1 - t) * t + curve[2].x * t * t,
        y: curve[0].y * (1 - t) * (1 - t) + 2 * curve[1].y * (1 - t) * t + curve[2].y * t * t
    }
}

function dif(point, curve) {
    var cl = l([curve[0], curve[1]]) + l([curve[1], curve[2]]);
    if (cl < 10)
        return l([point, curve[0]]);

    return Math.max(dif(point, [p(curve, 0), p(curve, 0.25), p(curve, 0.5)]), dif(point, [p(curve, 0.5), p(curve, 0.75), p(curve, 1)]))

}


function ConnectorEmitter(options) {
    this.one = options.one;
    this.two = options.two;

    this.frequency = options.frequency || 0.001;
    this.duration = options.duration || 1;
    this.time = 0;
    this.r = options.r || 0.1;

    this.thirdPoint = null;
    this.position = 0;
    this.emitter = null;

    this.update = function (dt) {
        if (!this.thirdPoint) {
            this.time += dt;
            if (Math.random() < this.frequency * this.time) {
                this.thirdPoint = {
                    x: this.one.x / 2 + this.two.x / 2 + ((Math.random() * 300) | 0) - 150,
                    y: this.one.y / 2 + this.two.x / 2 + ((Math.random() * 300) | 0) - 150
                };
                this.emitter = new CircleEmitter({size: 10, power: 7});
            }
        }
        else if (this.position >= 1) {
            this.thirdPoint = null;
            this.emitter = null;
            this.position = 0;
            this.time = 0;
        }
        else {
            this.position += dt / this.duration;
            this.emitter.x = this.one.x * (1 - this.position) * (1 - this.position) + 2 * this.thirdPoint.x * (1 - this.position) * this.position + this.two.x * this.position * this.position;
            this.emitter.y = this.one.y * (1 - this.position) * (1 - this.position) + 2 * this.thirdPoint.y * (1 - this.position) * this.position + this.two.y * this.position * this.position;
        }
    };
    this.value = function (x, y, dt) {
        if (this.emitter) {
            return this.emitter.value(x, y, dt);
        }
        return 0;
    }
}

function AmbientEmitter() {
    this.update = function () {
    };
    this.value = function (x, y, dt) {
        return Math.random() < 0.02 * dt ? 0.25 : 0;
    }
}

function Model() {
    this.emitters = [
        new AmbientEmitter(),
        a = new CircleEmitter({x: 100, y: 100, size: 50}),
        b = new CircleEmitter({x: 200, y: 250, size: 50}),
        new ConnectorEmitter({one: a, two: b}),
        new ConnectorEmitter({one: b, two: a})
    ];
    this.update = function (dt) {
        this.emitters.forEach(function (e) {
            e.update(dt)
        })
    };
    this.value = function (x, y, dt) {
        return this.emitters.reduce(function (v, e) {
            return v + e.value(x, y, dt)
        }, 0);
    }
}

function Colorizer(options) {
    this.color = {r: 128, g: 64, b: 1};

    function interpolate(value, halfValue) {
        var t = (halfValue - 1) * (halfValue - 1) / (halfValue * halfValue);
        return (Math.pow(t, value) - 1) / (t - 1);
    }


    this.update = function (dt) {

    };
    this.colorize = function (value) {
        return {
            r: (interpolate(value, this.color.r / 255) * 255) | 0,
            g: (interpolate(value, this.color.g / 255) * 255) | 0,
            b: (interpolate(value, this.color.b / 255) * 255) | 0
        }
    };

}

function Space(options) {
    this.model = options.model || new Model();
    this.colorizer = options.colorizer || new Colorizer();
    this.decay = options.decay || 0.5;
    this.width = options.width || 640;
    this.height = options.height || 480;

    this.values = new SArray(this.height, new SArray(this.width, 0));
    this.update = function (dt) {
        this.model.update(dt);
        this.colorizer.update(dt);

        for (var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.height; y++) {
                this.values[y][x] = Math.max(this.values[y][x] + this.model.value(x, y, dt) - this.decay * this.values[y][x] * dt, 0);
            }
        }
    };
    this.render = function (ctx) {
        var data = ctx.createImageData(this.width, this.height);
        for (var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.height; y++) {
                var color = this.colorizer.colorize(this.values[y][x]);
                data.data[((y * (data.width * 4)) + (x * 4)) + 0] = color.r;
                data.data[((y * (data.width * 4)) + (x * 4)) + 1] = color.g;
                data.data[((y * (data.width * 4)) + (x * 4)) + 2] = color.b;
                data.data[((y * (data.width * 4)) + (x * 4)) + 3] = 255;
            }
        }
        ctx.putImageData(data, 0, 0);
    }

}

function App(options) {
    this.parent = options.parent || document.body;
    this.width = options.width || 640;
    this.height = options.height || 480;
    this.space = new Space({
        width: this.width,
        height: this.height
    });

    this.canvas = document.createElement('canvas');
    this.parent.appendChild(this.canvas);
    this.canvas.style.width = (this.canvas.width = this.width) * 2 + 'px';
    this.canvas.style.height = (this.canvas.height = this.height) * 2 + 'px';

    this.ctx = this.canvas.getContext('2d');

    this.currentTime = new Date();

    this.fps = 0;

    this.update = function () {
        setTimeout(this.update.bind(this), 30);
        var time = new Date();
        this.space.update((time - this.currentTime) / 1000);
        this.fps = (this.fps + 100 / ((time - this.currentTime) || 1)) / 2;
        this.canvas.width = this.canvas.width;
        this.space.render(this.ctx);
        this.currentTime = time;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText('FPS: ' + this.fps.toFixed(2), 10, 20);

    };


    this.update();
}

function main() {
    new App({
        parent: document.body,
        width: 300,
        height: 300
    });
}