// The Sapphire Ledger — input: WASD or arrows to move, Shift to sneak, E to lift the
// loot, Q to throw a pebble where the mouse points, F for smoke, M to mute, P to pause,
// R to retry after being caught. The mouse also drives the menus by click.

export function makeInput(canvas) {
  const keys = new Set();
  // Keys pressed since the last read: a quick tap that lands between two frames
  // still counts once, instead of being lost when keyup beats the next frame.
  const tapped = new Set();
  const mouse = { x: 640, y: 360, down: false, clicked: false, clickX: 0, clickY: 0 };

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    const name = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    keys.add(name);
    tapped.add(name);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const p = canvasPoint(event);
    mouse.x = p.x;
    mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const p = canvasPoint(event);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.down = true;
    mouse.clicked = true;
    mouse.clickX = p.x;
    mouse.clickY = p.y;
  });
  window.addEventListener('mouseup', () => { mouse.down = false; });

  return { keys, tapped, mouse };
}

function held(input, ...names) {
  return names.some((name) => input.keys.has(name));
}

function wasTapped(input, ...names) {
  return names.some((name) => input.tapped.has(name));
}

export function readMove(input) {
  let mx = 0;
  let my = 0;
  if (held(input, 'a', 'ArrowLeft')) mx -= 1;
  if (held(input, 'd', 'ArrowRight')) mx += 1;
  if (held(input, 'w', 'ArrowUp')) my -= 1;
  if (held(input, 's', 'ArrowDown')) my += 1;
  return { mx, my, sneak: held(input, 'Shift') };
}

// Edge-triggered keys: call once per frame; the caller clears them after reading.
export function readActions(input) {
  const actions = {
    // E is held to channel the lift, so it reads the held set; the rest are
    // one-shot presses, read from the latched set.
    interact: held(input, 'e'),
    throwPebble: wasTapped(input, 'q'),
    smoke: wasTapped(input, 'f'),
    pause: wasTapped(input, 'p', 'Escape'),
    retry: wasTapped(input, 'r'),
    confirm: wasTapped(input, 'Enter', ' '),
    mute: wasTapped(input, 'm'),
    click: input.mouse.clicked,
    clickX: input.mouse.clickX,
    clickY: input.mouse.clickY,
  };
  input.mouse.clicked = false;
  input.tapped.clear();
  return actions;
}

export function consumeKey(input, name) {
  const had = input.keys.has(name);
  if (had) input.keys.delete(name);
  return had;
}
