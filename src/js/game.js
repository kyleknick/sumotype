import { isMobile } from './mobile';
import { checkMonetization, isMonetizationEnabled } from './monetization';
import { loadSongs, playSound, playSong } from './sound';
import { initSpeech } from './speech';
import { save, load } from './storage';
import { ALIGN_LEFT, ALIGN_CENTER, ALIGN_RIGHT, CHARSET_SIZE, initCharset, renderText } from './text';
import { getRandSeed, setRandSeed, lerp, loadImg } from './utils';
import TILESET from '../img/tileset.webp';
import STREET from '../img/street8x8.webp';
import PEOPLESET from '../img/tinycharacters.webp';


const konamiCode = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
let konamiIndex = 0;

// GAMEPLAY VARIABLES

const TITLE_SCREEN = 0;
const LEVEL_ONE = 1;
const LEVEL_TWO = 2;
const LEVEL_THREE = 3;
const END_SCREEN = 4;
let screen = TITLE_SCREEN;

let levelOneBeat = false;
let levelTwoBeat = false;
let levelThreeBeat = false;

// factor by which to reduce both moveX and moveY when player moving diagonally
// so they don't seem to move faster than when traveling vertically or horizontally
const RADIUS_ONE_AT_45_DEG = Math.cos(Math.PI / 4);
const TIME_TO_FULL_SPEED = 150;                // in millis, duration till going full speed in any direction
const gravity = 1;


let countdown; // in seconds
let hero;
let entities;


let speak;

// RENDER VARIABLES

const CTX = c.getContext('2d');         // visible canvas
const MAP = c.cloneNode();              // full map rendered off screen
const MAP_CTX = MAP.getContext('2d');
MAP.width = 540;                        // map size
MAP.height = 360;
const VIEWPORT = c.cloneNode();           // visible portion of map/viewport
const VIEWPORT_CTX = VIEWPORT.getContext('2d');
VIEWPORT.width = 540;                      // viewport size
VIEWPORT.height = 360;


const floor = (VIEWPORT.height - 2) / 2;
sumoMat = "xooooooooooooooooox";

// camera-window & edge-snapping settings
const CAMERA_WINDOW_X = 100;
const CAMERA_WINDOW_Y = 50;
const CAMERA_WINDOW_WIDTH = VIEWPORT.width - CAMERA_WINDOW_X;
const CAMERA_WINDOW_HEIGHT = VIEWPORT.height - CAMERA_WINDOW_Y;
let viewportOffsetX = 0;
let viewportOffsetY = 0;

const ATLAS = {
  hero: {
    move: [
      { x: 0, y: 0, w: 28, h: 32 },
    ],
    speed: 100,
    level: 0,
    isFloor: 0,
    disposition: 0,
  },
  foe: {
    move: [
      { x: 225, y: 0, w: 28, h: 32 },
    ],
    speed: 100,
    level: 1,
    isFloor: 0,
    disposition: 1,
  },
  foe2: {
    move: [
      { x: 257, y: 0, w: 28, h: 32 },
    ],
    speed: 100,
    level: 1,
    isFloor: 0,
    disposition: 1,
  },
  floorTile: {
    move: [
      { x: 0, y: 0, w: 16, h: 18 },
    ],
    speed: 1,
    isFloor: 1,
    disposition: 0,
  },
  levelTwoFloorTile: {
    move: [
      { x: 0, y: 7, w: 16, h: 18 },
    ],
    speed: 1,
    isFloor: 1,
    disposition: 0,
  }
};

let wordArray = ['sumo', 'apple', 'coke', 'chicken', 'lab', 'zoro'];
let sumoWord = "sumo";
let matchResult = "";
let matchResult2 = "";
let textEntered = "";

function renderSumoWord(arr) {
  sumoWord = (arr[Math.floor(Math.random() * arr.length)]);
  console.log(sumoWord);
}

function spellCheck() {
  // let textEntered = e.key;
  let sumoWordMatch = sumoWord.substring(0, textEntered.length);

  if (textEntered == sumoWord) {
    foe.x += 40;
    textEntered = "";
    renderSumoWord(wordArray);
  } else {
    if (textEntered == sumoWordMatch) {
      console.log('correct so far');
    } else {
      console.log('mistakes');
      textEntered = textEntered.substring(0, textEntered.length - 1);
    }
  }
}

// if (word1 == word2) {
//   heroWordInput = "";
//   foe.x += 20;
// }


const FRAME_DURATION = 0.1; // duration of 1 animation frame, in seconds
let tileset;   // characters sprite, embedded as a base64 encoded dataurl by build script
let street;
let peopleset;

// LOOP VARIABLES

let currentTime;
let elapsedTime;
let lastTime;
let requestId;
let running = true;

// GAMEPLAY HANDLERS

function unlockExtraContent() {
  // NOTE: remember to update the value of the monetization meta tag in src/index.html to your payment pointer
}

function startGame() {
  switch (screen) {
    case LEVEL_ONE:
      countdown = 60;
      viewportOffsetX = viewportOffsetY = 0;
      hero = createEntity('hero', VIEWPORT.width / 2 - 80, VIEWPORT.height / 2 - 14);
      foe = createEntity('foe', (VIEWPORT.width / 2) + 80, (VIEWPORT.height / 2) - 14);
      entities = [
        hero,
        foe,
      ];
      createLevelOneFloor();
      renderMap();
      break;
    case LEVEL_TWO:
      countdown = 60;
      viewportOffsetX = viewportOffsetY = 0;
      hero = createEntity('hero', VIEWPORT.width / 2 - 80, VIEWPORT.height / 2 - 14);
      foe = createEntity('foe2', (VIEWPORT.width / 2) + 80, VIEWPORT.height / 2 - 14);
      entities = [
        hero,
        foe,
      ];
      createLevelTwoFloor();
      renderMap();
      break;
  }
};
// setRandSeed(getRandSeed());
// if (isMonetizationEnabled()) { unlockExtraContent() }

// function startGame() {
// konamiIndex = 0;
// countdown = 60;
// viewportOffsetX = viewportOffsetY = 0;
// hero = createEntity('hero', VIEWPORT.width / 2 - 15, VIEWPORT.height / 2);
// foe = createEntity('foe', (VIEWPORT.width / 2) + 15, VIEWPORT.height / 2);
// entities = [
//   hero,
//   foe,
// ];
// createFloor();
// renderMap();
// screen = LEVEL_ONE;
// };

function testAABBCollision(entity1, entity2) {
  const test = {
    entity1MaxX: entity1.x + entity1.w,
    entity1MaxY: entity1.y + entity1.h,
    entity2MaxX: entity2.x + entity2.w,
    entity2MaxY: entity2.y + entity2.h,
  };

  test.collide = entity1.x < test.entity2MaxX
    && test.entity1MaxX > entity2.x
    && entity1.y < test.entity2MaxY
    && test.entity1MaxY > entity2.y;

  return test;
};

// entity1 collided into entity2
function correctAABBCollision(entity1, entity2, test) {
  const { entity1MaxX, entity1MaxY, entity2MaxX, entity2MaxY } = test;

  const deltaMaxX = entity1MaxX - entity2.x;
  const deltaMaxY = entity1MaxY - entity2.y;
  const deltaMinX = entity2MaxX - entity1.x;
  const deltaMinY = entity2MaxY - entity1.y;

  if (entity2.type == 'hero') {
    return;
  }

  else if (entity2.disposition == 1) {
    entity1.x -= deltaMaxX;
    if (foe.moveRight) {
      foe.x += 20;
    }
  }

  // might use this for gravity
  else if (entity2.isFloor == 1) {
    entity1.y -= deltaMaxY;
  }
};

function constrainToViewport(entity) {
  if (entity.x < 0) {
    entity.x = 0;
  } else if (entity.x > MAP.width - entity.w) {
    entity.x = MAP.width - entity.w;
  }
  if (entity.y < 0) {
    entity.y = 0;
  } else if (entity.y > MAP.height - entity.h) {
    entity.y = MAP.height - entity.h;
  }
};


function updateCameraWindow() {
  // edge snapping
  if (0 < viewportOffsetX && hero.x < viewportOffsetX + CAMERA_WINDOW_X) {
    viewportOffsetX = Math.max(0, hero.x - CAMERA_WINDOW_X);
  }
  else if (viewportOffsetX < MAP.width - VIEWPORT.width && hero.x + hero.w > viewportOffsetX + CAMERA_WINDOW_WIDTH) {
    viewportOffsetX = Math.min(MAP.width - VIEWPORT.width, hero.x + hero.w - CAMERA_WINDOW_WIDTH);
  }
  if (0 < viewportOffsetY && hero.y < viewportOffsetY + CAMERA_WINDOW_Y) {
    viewportOffsetY = Math.max(0, hero.y - CAMERA_WINDOW_Y);
  }
  else if (viewportOffsetY < MAP.height - VIEWPORT.height && hero.y + hero.h > viewportOffsetY + CAMERA_WINDOW_HEIGHT) {
    viewportOffsetY = Math.min(MAP.height - VIEWPORT.height, hero.y + hero.h - CAMERA_WINDOW_HEIGHT);
  }
};

function createEntity(type, x = 0, y = 0) {
  const action = 'move';
  const sprite = ATLAS[type][action][0];
  return {
    action,
    frame: 0,
    frameTime: 0,
    h: sprite.h,
    moveDown: 0,
    moveLeft: 0,
    moveRight: 0,
    moveUp: 0,
    moveX: 0,
    moveY: 0,
    speed: ATLAS[type].speed,
    type,
    isFloor: ATLAS[type].isFloor,
    disposition: ATLAS[type].disposition,
    w: sprite.w,
    x,
    y,
  };
};

//TODO use this for getting kicked off of stage
function createLevelOneFloor() {
  let x = 74;
  for (var i = 1; i <= 24; i++) {
    entities.push(createEntity('floorTile', x, (VIEWPORT.height / 2) + 18));
    x += 16
    console.log('p equals:', i)
  }
}

function createLevelTwoFloor() {
  let x = 74;
  for (var i = 1; i <= 24; i++) {
    entities.push(createEntity('levelTwoFloorTile', x, (VIEWPORT.height / 2) + 18));
    x += 16
    console.log('i equals:', i)
  }
}

function updateHeroInput() {
  // TODO can touch & desktop be handled the same way?
  if (isTouch) {
    hero.moveX = hero.moveLeft + hero.moveRight;
    hero.moveY = hero.moveUp + hero.moveDown;
  } else {
    if (hero.moveLeft || hero.moveRight) {
      // hero.moveX = .5;
      hero.moveX = (hero.moveLeft > hero.moveRight ? -1 : 1) * lerp(0, 1, (currentTime - Math.max(hero.moveLeft, hero.moveRight)) / TIME_TO_FULL_SPEED)
    } else {
      hero.moveX = 0;
    }
    // if (hero.moveDown || hero.moveUp) {
    //   hero.moveY = (hero.moveUp > hero.moveDown ? -1 : 1) * lerp(0, 1, (currentTime - Math.max(hero.moveUp, hero.moveDown)) / TIME_TO_FULL_SPEED)
    // } else {
    //   hero.moveY = 0;
    // }
  }
}

function updateFoe(entity) {
  // update animation frame
  entity.frameTime += elapsedTime;
  if (entity.frameTime > FRAME_DURATION) {
    entity.frameTime -= FRAME_DURATION;
    entity.frame += 1;
    entity.frame %= ATLAS[entity.type][entity.action].length;
  }
  // update position
  const scale = entity.moveX && entity.moveY ? RADIUS_ONE_AT_45_DEG : 1;
  const distance = entity.speed * elapsedTime * scale;
  if (hero.x <= 65 || foe.x >= 420) {
    entity.x += 0;
  } else {
    entity.x += distance * -.25;
  }
  if (foe.x >= 420) {
    entity.y += distance * .5;
  } else {
    entity.y += 0;
  }

}

function updateEntity(entity) {
  // update animation frame
  entity.frameTime += elapsedTime;
  if (entity.frameTime > FRAME_DURATION) {
    entity.frameTime -= FRAME_DURATION;
    entity.frame += 1;
    entity.frame %= ATLAS[entity.type][entity.action].length;
  }
  // update position
  const scale = entity.moveX && entity.moveY ? RADIUS_ONE_AT_45_DEG : 1;
  const distance = entity.speed * elapsedTime * scale;
  if (hero.x <= 65 || foe.x >= 420) {
    entity.x += 0;
    console.log(entity.x);
    endOfRound();
  } else {
    entity.x += distance * .25;
  }
  entity.y += distance * .5;
  // if (entity.x <= 65) {
  //   entity.y += distance * .5;
  // } else {
  //   entity.y += 0;
  // }
};

function wonMatch() {
  textEntered = "";
  sumoWord = "";
  matchResult = "match win!";
}

function lostMatch() {
  textEntered = "";
  sumoWord = "";
  matchResult = "match lost.."
}

function endOfRound() {
  if (foe.x >= 420) {
    wonMatch();
  } else {
    lostMatch();
  }
}

function update() {
  switch (screen) {
    case LEVEL_ONE:
      countdown -= elapsedTime;
      if (matchResult == "match win!") {
        // setTimeout(() => matchResult =)
        setTimeout(() => {
          matchResult = "";
          sumoWord = "feather";
          textEntered = "";
          screen = LEVEL_TWO;
          startGame();
        }, 5000);
        break;
      } else if (matchResult == "match lost..") {
        setTimeout(() => screen = END_SCREEN, 5000);
      } else if (countdown < 0) {
        setTimeout(() => screen = END_SCREEN, 5000)
      }
      updateHeroInput();
      updateEntity(hero);
      updateFoe(foe);
      entities.slice(1).forEach((entity) => {
        let test = testAABBCollision(hero, entity);
        if (test.collide) {
          correctAABBCollision(hero, entity, test);
        }
      });
      constrainToViewport(hero);
      updateCameraWindow();
      break;
    case LEVEL_TWO:
      countdown -= elapsedTime;
      if (matchResult == "match win!") {
        setTimeout(() => screen = TITLE_SCREEN, 5000);
      } else if (matchResult == "match lost..") {
        setTimeout(() => screen = END_SCREEN, 5000);
      } else if (countdown < 0) {
        setTimeout(() => screen = END_SCREEN, 5000)
      }
      updateHeroInput();
      updateEntity(hero);
      updateFoe(foe);
      entities.slice(1).forEach((entity) => {
        let test = testAABBCollision(hero, entity);
        if (test.collide) {
          correctAABBCollision(hero, entity, test);
        }
      });
      constrainToViewport(hero);
      updateCameraWindow();
      break;
  }
};

// RENDER HANDLERS

function blit() {
  // copy backbuffer onto visible canvas, scaling it to screen dimensions
  CTX.drawImage(
    VIEWPORT,
    0, 0, VIEWPORT.width, VIEWPORT.height,
    0, 0, c.width, c.height
  );
};

function render() {
  VIEWPORT_CTX.fillStyle = '#fff';
  VIEWPORT_CTX.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);

  switch (screen) {
    case TITLE_SCREEN:
      renderText('title screen', CHARSET_SIZE, CHARSET_SIZE);
      renderText(isMobile ? 'tap to start' : 'press any key', VIEWPORT.width / 2, VIEWPORT.height / 2, ALIGN_CENTER);
      if (konamiIndex === konamiCode.length) {
        renderText('konami mode on', VIEWPORT.width - CHARSET_SIZE, CHARSET_SIZE, ALIGN_RIGHT);
      }
      break;
    case LEVEL_ONE:
      VIEWPORT_CTX.drawImage(
        MAP,
        // adjust x/y offset
        viewportOffsetX, viewportOffsetY, VIEWPORT.width, VIEWPORT.height,
        0, 0, VIEWPORT.width, VIEWPORT.height
      );
      renderText('match 1', CHARSET_SIZE, CHARSET_SIZE);
      renderText(sumoWord, 100, 30);
      renderText(textEntered, 100, 60);
      renderText(matchResult, (VIEWPORT.width / 2), (VIEWPORT.height / 2 - 60));
      // renderText(heroWordInput, 50, 50);
      // renderText(sumoMat, VIEWPORT.width / 2, (VIEWPORT.height / 2) + 18, ALIGN_CENTER);
      renderCountdown();
      // uncomment to debug mobile input handlers
      // renderDebugTouch();
      entities.forEach(entity => renderEntity(entity));
      break;
    case LEVEL_TWO:
      VIEWPORT_CTX.drawImage(
        MAP,
        // adjust x/y offset
        viewportOffsetX, viewportOffsetY, VIEWPORT.width, VIEWPORT.height,
        0, 0, VIEWPORT.width, VIEWPORT.height
      );
      renderText('match 2', CHARSET_SIZE, CHARSET_SIZE);
      renderText(sumoWord, 100, 30);
      renderText(textEntered, 100, 60);
      renderText(matchResult2, (VIEWPORT.width / 2), (VIEWPORT.height / 2 - 60));
      // renderText(heroWordInput, 50, 50);
      // renderText(sumoMat, VIEWPORT.width / 2, (VIEWPORT.height / 2) + 18, ALIGN_CENTER);
      renderCountdown();
      // uncomment to debug mobile input handlers
      // renderDebugTouch();
      entities.forEach(entity => renderEntity(entity));
      break;
    case END_SCREEN:
      renderText('end screen', CHARSET_SIZE, CHARSET_SIZE);
      // renderText(monetizationEarned(), TEXT.width - CHARSET_SIZE, TEXT.height - 2*CHARSET_SIZE, ALIGN_RIGHT);
      break;
  }

  blit();
};

function renderCountdown() {
  if (matchResult == "") {
    const minutes = Math.floor(Math.ceil(countdown) / 60);
    const seconds = Math.ceil(countdown) - minutes * 60;
    renderText(`${minutes}:${seconds <= 9 ? '0' : ''}${seconds}`, VIEWPORT.width - CHARSET_SIZE, CHARSET_SIZE, ALIGN_RIGHT);
  } else {
    renderText('time', VIEWPORT.width - CHARSET_SIZE, CHARSET_SIZE, ALIGN_RIGHT);
  }


};

function renderEntity(entity, ctx = VIEWPORT_CTX) {
  const sprite = ATLAS[entity.type][entity.action][entity.frame];
  // TODO skip draw if image outside of visible canvas
  if (entity.isFloor == 1) {
    ctx.drawImage(
      street,
      sprite.x, sprite.y, sprite.w, sprite.h,
      Math.round(entity.x - viewportOffsetX), Math.round(entity.y - viewportOffsetY), sprite.w, sprite.h
    );
  } else {
    ctx.drawImage(
      peopleset,
      sprite.x, sprite.y, sprite.w, sprite.h,
      Math.round(entity.x - viewportOffsetX), Math.round(entity.y - viewportOffsetY), sprite.w, sprite.h
    );
    // }
  };
}

function renderMap() {
  MAP_CTX.fillStyle = '#fff';
  MAP_CTX.fillRect(0, 0, MAP.width, MAP.height);

  // TODO cache map by rendering static entities on the MAP canvas
};

// LOOP HANDLERS

function loop() {
  if (running) {
    requestId = requestAnimationFrame(loop);
    currentTime = performance.now();
    elapsedTime = (currentTime - lastTime) / 1000;
    update();
    render();
    lastTime = currentTime;
  }
};

function toggleLoop(value) {
  running = value;
  if (running) {
    lastTime = performance.now();
    loop();
  } else {
    cancelAnimationFrame(requestId);
  }
};

// EVENT HANDLERS

onload = async (e) => {
  // the real "main" of the game
  document.title = 'Game Jam Boilerplate';

  onresize();
  //checkMonetization();

  await initCharset(VIEWPORT_CTX);
  tileset = await loadImg(TILESET);
  street = await loadImg(STREET);
  peopleset = await loadImg(PEOPLESET)
  // speak = await initSpeech();

  toggleLoop(true);
};

onresize = onrotate = function () {
  // scale canvas to fit screen while maintaining aspect ratio
  const scaleToFit = Math.min(innerWidth / VIEWPORT.width, innerHeight / VIEWPORT.height);
  c.width = VIEWPORT.width * scaleToFit;
  c.height = VIEWPORT.height * scaleToFit;
  // disable smoothing on image scaling
  CTX.imageSmoothingEnabled = MAP_CTX.imageSmoothingEnabled = VIEWPORT_CTX.imageSmoothingEnabled = false;

  // fix key events not received on itch.io when game loads in full screen
  window.focus();
};

// UTILS

document.onvisibilitychange = function (e) {
  // pause loop and game timer when switching tabs
  toggleLoop(!e.target.hidden);
};

// INPUT HANDLERS

// onkeydown = function (e) {
//   // prevent itch.io from scrolling the page up/down
//   e.preventDefault();

//   if (!e.repeat) {
//     switch (screen) {
//       case LEVEL_ONE:
//         switch (e.code) {
//           case 'ArrowLeft':
//           case 'KeyA':
//           case 'KeyQ':  // French keyboard support
//             hero.moveLeft = currentTime;
//             break;
//           // case 'ArrowUp':
//           // case 'KeyW':
//           // case 'KeyZ':  // French keyboard support
//           //   hero.moveUp = currentTime;
//           //   break;
//           case 'ArrowRight':
//           case 'KeyD':
//             hero.moveRight = currentTime;
//             break;
//           // case 'ArrowDown':
//           // case 'KeyS':
//           //   hero.moveDown = currentTime;
//           //   break;
//           case 'KeyF':
//             foe.moveRight = currentTime;
//             break;
//           case 'KeyP':
//             // Pause game as soon as key is pressed
//             toggleLoop(!running);
//             break;
//         }
//         break;
//     }
//   }
// };

onkeyup = function (e) {
  switch (screen) {
    case TITLE_SCREEN:
      if (e.which !== konamiCode[konamiIndex] || konamiIndex === konamiCode.length) {
        screen = LEVEL_ONE;
        startGame();
      } else {
        konamiIndex++;
      }
      break;
    case LEVEL_ONE:
      if (e.key.length > 1) {
        toggleLoop(!running);
        break;
      } else {
        textEntered += e.key;
        spellCheck();
      }
      break;
    case LEVEL_TWO:
      if (e.key.length > 1) {
        toggleLoop(!running);
        break;
      } else {
        textEntered += e.key;
        spellCheck();
      }
      break;
    case END_SCREEN:
      switch (e.code) {
        case 'KeyT':
          open(`https://twitter.com/intent/tweet?text=viral%20marketing%20message%20https%3A%2F%2Fgoo.gl%2F${'some tiny Google url here'}`, '_blank');
          break;
        default:
          screen = TITLE_SCREEN;
          break;
      }
      break;
  }
};



// MOBILE INPUT HANDLERS

let minX = 0;
let minY = 0;
let maxX = 0;
let maxY = 0;
let MIN_DISTANCE = 30; // in px
let touches = [];
let isTouch = false;

// adding onmousedown/move/up triggers a MouseEvent and a PointerEvent
// on platform that support both (duplicate event, pointer > mouse || touch)
ontouchstart = onpointerdown = function (e) {
  e.preventDefault();
  switch (screen) {
    case LEVEL_ONE:
      isTouch = true;
      [maxX, maxY] = [minX, minY] = pointerLocation(e);
      break;
  }
};

ontouchmove = onpointermove = function (e) {
  e.preventDefault();
  switch (screen) {
    case LEVEL_ONE:
      if (minX && minY) {
        setTouchPosition(pointerLocation(e));
      }
      break;
  }
}

ontouchend = onpointerup = function (e) {
  e.preventDefault();
  switch (screen) {
    case TITLE_SCREEN:
      startGame();
      break;
    case LEVEL_ONE:
      isTouch = false;
      // stop hero
      hero.moveLeft = hero.moveRight = hero.moveDown = hero.moveUp = 0;
      // end touch
      minX = minY = maxX = maxY = 0;
      break;
    case END_SCREEN:
      screen = TITLE_SCREEN;
      break;
  }
};

// utilities
function pointerLocation(e) {
  return [e.pageX || e.changedTouches[0].pageX, e.pageY || e.changedTouches[0].pageY];
};

function setTouchPosition([x, y]) {
  // touch moving further right
  if (x > maxX) {
    maxX = x;
    hero.moveRight = lerp(0, 1, (maxX - minX) / MIN_DISTANCE)
  }
  // touch moving further left
  else if (x < minX) {
    minX = x;
    hero.moveLeft = -lerp(0, 1, (maxX - minX) / MIN_DISTANCE)
  }
  // touch reversing left while hero moving right
  else if (x < maxX && hero.moveX >= 0) {
    minX = x;
    hero.moveRight = 0;
  }
  // touch reversing right while hero moving left
  else if (minX < x && hero.moveX <= 0) {
    maxX = x;
    hero.moveLeft = 0;
  }

  // touch moving further down
  if (y > maxY) {
    maxY = y;
    hero.moveDown = lerp(0, 1, (maxY - minY) / MIN_DISTANCE)

  }
  // touch moving further up
  else if (y < minY) {
    minY = y;
    hero.moveUp = -lerp(0, 1, (maxY - minY) / MIN_DISTANCE)

  }
  // touch reversing up while hero moving down
  else if (y < maxY && hero.moveY >= 0) {
    minY = y;
    hero.moveDown = 0;
  }
  // touch reversing down while hero moving up
  else if (minY < y && hero.moveY <= 0) {
    maxY = y;
    hero.moveUp = 0;
  }

  // uncomment to debug mobile input handlers
  // addDebugTouch(x, y);
};

function addDebugTouch(x, y) {
  touches.push([x / innerWidth * VIEWPORT.width, y / innerHeight * VIEWPORT.height]);
  if (touches.length > 10) {
    touches = touches.slice(touches.length - 10);
  }
};

function renderDebugTouch() {
  let x = maxX / innerWidth * VIEWPORT.width;
  let y = maxY / innerHeight * VIEWPORT.height;
  renderDebugTouchBound(x, x, 0, VIEWPORT.height, '#f00');
  renderDebugTouchBound(0, VIEWPORT.width, y, y, '#f00');
  x = minX / innerWidth * VIEWPORT.width;
  y = minY / innerHeight * VIEWPORT.height;
  renderDebugTouchBound(x, x, 0, VIEWPORT.height, '#ff0');
  renderDebugTouchBound(0, VIEWPORT.width, y, y, '#ff0');

  if (touches.length) {
    VIEWPORT_CTX.strokeStyle = VIEWPORT_CTX.fillStyle = '#02d';
    VIEWPORT_CTX.beginPath();
    [x, y] = touches[0];
    VIEWPORT_CTX.moveTo(x, y);
    touches.forEach(function ([x, y]) {
      VIEWPORT_CTX.lineTo(x, y);
    });
    VIEWPORT_CTX.stroke();
    VIEWPORT_CTX.closePath();
    VIEWPORT_CTX.beginPath();
    [x, y] = touches[touches.length - 1];
    VIEWPORT_CTX.arc(x, y, 2, 0, 2 * Math.PI)
    VIEWPORT_CTX.fill();
    VIEWPORT_CTX.closePath();
  }
};

function renderDebugTouchBound(_minX, _maxX, _minY, _maxY, color) {
  VIEWPORT_CTX.strokeStyle = color;
  VIEWPORT_CTX.beginPath();
  VIEWPORT_CTX.moveTo(_minX, _minY);
  VIEWPORT_CTX.lineTo(_maxX, _maxY);
  VIEWPORT_CTX.stroke();
  VIEWPORT_CTX.closePath();
};

// create enemy template
// class Enemy {
//   constructor(className, startIndex, speed) {
//     this.className = className
//     this.startIndex = startIndex
//     this.speed = speed
//     this.currentIndex = startIndex
//     this.timerID = NaN
//   }
// }

// enemies = [
//   new Enemy('Fred', 180, 30),
//   new Enemy('Hank', 135, 30)
// ]
