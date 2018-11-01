'use strict';

function checkIsVector(value, msg) {
  msg = msg | 'Тип аргумента конструктора должен быть Vector'
  if (!(value instanceof Vector || Vector.isPrototypeOf(value))) {
    throw new Error(msg);
  }
}
function isActor(actor) {
  return actor instanceof Actor || Actor.isPrototypeOf(actor);
}
function isActorClass(actorClass) {
  if (actorClass) {
    return Actor.isPrototypeOf(actorClass) || Actor === actorClass;
  }
  return false;
}
function checkIsActor(actor) {
  if (!isActor(actor)) {
    throw new Error('Тип аргумента конструктора должен быть Actor');
  }
}
class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  plus(vector) {
    checkIsVector(vector, 'Можно прибавлять к вектору только вектор типа Vector');
    return new Vector(this.x + vector.x, this.y + vector.y);
  }
  times(factor) {
    return new Vector(this.x * factor, this.y * factor);
  }
}

class Actor {
  constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
    checkIsVector(pos, 'Первый аргумент конструктора "расположение" должен быть типа Vector');
    checkIsVector(size, 'Второй аргумент конструктора "размер" должен быть типа Vector');
    checkIsVector(speed, 'Третий аргумент конструктора "скорость" должен быть типа Vector');

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
    checkIsActor(actor);
    if (this === actor) {
      return false;
    }
    return !(this.left > actor.right
      || this.right < actor.left
      || this.top > actor.bottom
      || this.bottom < actor.top);
  }
}

class Level {
  constructor(grid, actors) {
    this.grid = grid;
    this.actors = actors;//TODO check is has coins
    if (actors !== undefined) {
      this.player = actors.find(actor => {
        return actor.type === 'player';
      });
    }
    this.status = null;
    this.finishDelay = 1;

    this.height = this.grid.length;
    let width = 0;
    for (let col of this.grid) {
      width = Math.max(col.length, width);
    }
    this.width = width;

  }
  isFinished() {
    return this.status != null && this.finishDelay < 0;
  }
  actorAt(actor) {
    checkIsActor(actor);
    return this.actors.find(a => {
      return actor.isIntersect(a) ? a : undefined;
    });
  }
  obstacleAt(pos, size) {
    checkIsVector(pos);
    checkIsVector(size);
    if (pos.y + size.y > this.height) {
      return 'lava';
    } else if (pos.x + size.x > this.width
      || pos.x < 0
      || pos.x + size.x < 0
      || pos.y < 0
      || pos.y + size.y < 0
    ) {
      return 'wall';
    }
    let result = {
      cell: undefined
    };
    this.grid.find(row => {
      if (row !== undefined) {
        return row.find(cell => {
          result.cell = cell;
          return cell;
        });
      }
    });
    return result.cell;
  }
  removeActor(actor) {
    this.actors.splice(this.actors.indexOf(actor), 1);
  }
  noMoreActors(actorType) {
    let found = this.actors.find(actor => {
      return actor.type === actorType ? true : undefined;
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
    if (objectType === 'coin' && actor !== undefined) {
      this.removeActor(actor);
      if (this.noMoreActors('coin')) {
        this.status = 'won';
        return;
      }
    }
  }
}

class LevelParser {
  constructor(dic) {
    this.dic = dic;
    this.obstacle = new Map([['x', 'wall'], ['!', 'lava']]);
  }
  actorFromSymbol(key) {
    return this.dic[key];
  }
  obstacleFromSymbol(key) {
    return this.obstacle.get(key);
  }
  createGrid(rows) {
    let self = this;
    return rows.map(value => {
      return value.split('').map(c => self.obstacleFromSymbol(c));
    });
  }
  createActors(rows) {
    let self = this;
    let actors = [];
    rows.forEach((value, row) => {
      value.split('').forEach((c, col) => {
        let actorClass = self.actorFromSymbol(c);
        if (isActorClass(actorClass)) {
          actors.push(new actorClass(new Vector(col, row)));
        }
      });
    });
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
    let x = this.pos.x + this.speed.x * time;
    let y = this.pos.y + this.speed.y * time;
    return new Vector(x, y);
  }
  handleObstacle() {
    this.speed.x = -this.speed.x;
    this.speed.y = -this.speed.y;
  }
  act(time, level) {
    let nextPos = getNextPosition(time);
    let obstacle = level.obstacleAt(nextPos, this.size);
    if (obstacle === undefined) {
      this.pos = nextPos;
    }
  }
}
class HorizontalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(2, 0));
  }
  handleObstacle() {
    this.speed.x = -this.speed.x;
  }
}
class VerticalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(0, 2));
  }
  handleObstacle() {
    this.speed.y = -this.speed.y;
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
    super(new Vector(pos.x + 0.2, pos.y + 0.1), new Vector(0.6, 0.6));
    this.originalPos = new Vector(pos.x, pos.y);
    this._spring = Math.random() * 2 * Math.PI;
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
  get spring() {
    return this._spring;
  }
  updateSpring(time = 1) {
    this._spring = (this._spring + springSpeed() * time) % (2 * Math.PI);
  }
  getSpringVector() {
    let y = Math.sin(this.spring) * this.size.x / 2;
    return new Vector(0, y);
  }
  getNextPosition(time = 1) {
    this.updateSpring(time);
    let springVector = this.getSpringVector();
    return new Vector(this.originalPos.x + springVector.x, this.originalPos.y + springVector.y);
  }
  act(time) {
    this.pos = this.getNextPosition();
  }
}
class Player extends Actor {
  constructor(pos) {
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

/*const schemas = [
  [
    '         ',
    '         ',
    '    =    ',
    '       o ',
    '     !xxx',
    ' @       ',
    'xxx!     ',
    '         '
  ],
  [
    '      v  ',
    '    v    ',
    '  v      ',
    '        o',
    '        x',
    '@   x    ',
    'x        ',
    '         '
  ]
];*/

const schemas = [
  [
    '         ',
    '         ',
    '    =    ',
    '       o ',
    '     !xxx',
    ' @       ',
    'xxx!     ',
    '         '
  ],
  [
    '      v  ',
    '    v    ',
    '  v      ',
    '        o',
    '        x',
    '@   x    ',
    'x        ',
    '         '
  ]
];

runGame(schemas, parser, DOMDisplay)
  .then(() => console.log('Вы выиграли приз!'));
