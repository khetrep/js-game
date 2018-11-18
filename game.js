'use strict';

function isType(value, cls) {
  return value instanceof cls || cls.isPrototypeOf(value);
}
function checkIsType(value, cls, msg = 'Тип аргумента конструктора должен быть ' + cls.name) {
  if (!isType(value, cls)) {
    throw new Error(msg);
  }
}
function isClass(valueClass, cls) {
  return valueClass && (cls.isPrototypeOf(valueClass) || cls === valueClass);
}

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  plus(vector) {
    checkIsType(vector, Vector, 'Можно прибавлять к вектору только вектор типа Vector');
    return new Vector(this.x + vector.x, this.y + vector.y);
  }
  times(factor) {
    return new Vector(this.x * factor, this.y * factor);
  }
}

class Actor {
  constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
    checkIsType(pos, Vector, 'Первый аргумент конструктора "расположение" должен быть типа Vector');
    checkIsType(size, Vector, 'Второй аргумент конструктора "размер" должен быть типа Vector');
    checkIsType(speed, Vector, 'Третий аргумент конструктора "скорость" должен быть типа Vector');

    this.pos = pos;
    this.size = size;
    this.speed = speed;
  }
  act() {

  }
  get left() {
    return this.pos.x;
  }
  get top() {
    return this.pos.y;

  }
  get right() {
    return this.pos.x + this.size.x;
  }
  get bottom() {
    return this.pos.y + this.size.y;
  }
  get type() {
    return 'actor';
  }
  isIntersect(actor) {
    checkIsType(actor, Actor);
    if (this === actor) {
      return false;
    }
    return !(this.left >= actor.right
      || this.right < actor.left
      || this.top >= actor.bottom
      || this.bottom < actor.top);
  }
}

class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid;
    this.actors = actors;// TODO check is has coins
    this.player = actors.find(actor => {
      return actor.type === 'player';
    });
    this.status = null;
    this.finishDelay = 1;

    this.height = this.grid.length;
    let width = 0;
    for (let col of this.grid) {
      if (col !== undefined) {
        width = Math.max(col.length, width);
      }
    }
    this.width = width;

  }
  isFinished() {
    return this.status != null && this.finishDelay < 0;
  }
  actorAt(actor) {
    checkIsType(actor, Actor);
    return this.actors.find(a => {
      return actor.isIntersect(a) ? a : undefined;
    });
  }
  obstacleAt(pos, size) {
    checkIsType(pos, Vector);
    checkIsType(size, Vector);
    if (pos.y + size.y > this.height) {
      return 'lava';
    }
    if (pos.x + size.x > this.width
      || pos.x < 0 || pos.x + size.x < 0
      || pos.y < 0 || pos.y + size.y < 0
    ) {
      return 'wall';
    }
    const startRow = Math.floor(pos.y);
    const endRow = Math.ceil(pos.y + size.y);
    const startColumn = Math.floor(pos.x);
    const endColumn = Math.ceil(pos.x + size.x);
    for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
      let row = this.grid[rowIndex];
      if (row) {
        for (let col = startColumn; col < endColumn; col++) {
          if (row[col] && (row[col] === 'wall' || row[col] === 'lava')) {
            return row[col];
          }
        }
      }
    }
    return undefined;
  }
  removeActor(actor) {
    this.actors.splice(this.actors.indexOf(actor), 1);
  }
  noMoreActors(actorType) {
    let found = this.actors.find(actor => {
      return actor.type === actorType;
    });
    return found === undefined;
  }
  playerTouched(objectType, actor) {
    if (this.status != null) {
      return;
    }
    if (objectType === 'lava' || objectType === 'fireball') {
      this.status = 'lost';
      return;
    }
    if (objectType === 'coin' && actor !== undefined && actor.type === 'coin') {
      this.removeActor(actor);
      if (this.noMoreActors('coin')) {
        this.status = 'won';
        return;
      }
    }
  }
}

class LevelParser {
  constructor(dic = {}) {
    this.dic = dic;
    this.obstacle = new Map([['x', 'wall'], ['!', 'lava']]);
  }
  actorFromSymbol(key) {
    return key !== undefined ? this.dic[key] : undefined;
  }
  obstacleFromSymbol(key) {
    return this.obstacle.get(key);
  }
  createGrid(rows) {
    return rows.map(value => {
      return value.split('').map(c => this.obstacleFromSymbol(c));
    });
  }
  createActors(rows) {
    let actors = [];
    if (Array.isArray(rows)) {
      rows.forEach((value, row) => {
        value.split('').forEach((c, col) => {
          let actorClass = this.actorFromSymbol(c);
          if (isClass(actorClass, Actor)) {
            actors.push(new actorClass(new Vector(col, row)));
          }
        });
      });
    }
    return actors;
  }
  parse(rows) {
    return new Level(this.createGrid(rows), this.createActors(rows));
  }
}

class Fireball extends Actor {
  constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
    super(pos, new Vector(1, 1), speed);
  }
  get type() {
    return 'fireball';
  }
  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time));
  }
  handleObstacle() {
    this.speed = this.speed.times(-1);
  }
  act(time, level) {
    let nextPos = this.getNextPosition(time);
    let obstacle = level.obstacleAt(nextPos, this.size);
    if (obstacle === undefined) {
      this.pos = nextPos;
    } else {
      this.handleObstacle();
    }
  }
}
class HorizontalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(2, 0));
  }
}
class VerticalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(0, 2));
  }
}
class FireRain extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(0, 3));
    this.originalPos = new Vector(pos.x, pos.y);
  }
  handleObstacle() {
    this.pos.x = this.originalPos.x;
    this.pos.y = this.originalPos.y;
  }
}
class Coin extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
    this.originalPos = new Vector(this.pos.x, this.pos.y);
    this.spring = Math.random() * 2 * Math.PI;
  }
  get type() {
    return 'coin';
  }
  get springSpeed() {
    return 8;
  }
  get springDist() {
    return 0.07;
  }
  updateSpring(time = 1) {
    this.spring = this.spring + this.springSpeed * time;
  }
  getSpringVector() {
    let y = Math.sin(this.spring) * this.springDist;
    return new Vector(0, y);
  }
  getNextPosition(time = 1) {
    this.updateSpring(time);
    return this.originalPos.plus(this.getSpringVector());
  }
  act(time) {
    this.pos = this.getNextPosition(time);
  }
}
class Player extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(new Vector(pos.x, pos.y - 0.5), new Vector(0.8, 1.5), new Vector(0, 0));
  }
  get type() {
    return 'player';
  }
}

const actorDict = {
  '@': Player,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball,
  'v': FireRain
}
const parser = new LevelParser(actorDict);

loadLevels().then(schemasStr => {
  let schemas = JSON.parse(schemasStr);
  return runGame(schemas, parser, DOMDisplay);
}).then(() => {
  alert('Вы выиграли приз!')
});