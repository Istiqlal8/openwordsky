// Wires PlayerState events to HUD feedback, sounds and the death/respawn flow.
function lostItems(player, fraction) {
  return Object.entries(player.inventory)
    .map(([name, n]) => [name, Math.floor(n * fraction)])
    .filter(([, n]) => n > 0)
    .map(([name, n]) => `${n} ${name}`);
}

function bindFeedback({ player, vitals, inventory, hud, sfx }) {
  player.on('shipHit', ({ shield }) => {
    vitals.damageFlash(shield ? 'shield' : 'hull');
    if (shield) sfx.shieldHit(); else sfx.hit();
  });
  let lastCause = '', lastAt = 0;
  player.on('suitHit', ({ cause }) => {
    vitals.damageFlash('suit');
    const now = performance.now();
    if (!cause || (cause === lastCause && now - lastAt < 4000)) return;
    lastCause = cause;
    lastAt = now;
    hud.toast(cause);
  });
  player.on('item', ({ name, n }) => {
    if (n > 0) { inventory.notify(name, n); sfx.pickup(); }
  });
  player.on('hitMarker', () => vitals.hitMarker());
  player.on('notice', ({ text }) => hud.toast(text));
  player.on('kill', ({ what }) => hud.toast(`${what} hancur`));
  player.on('pirates', ({ count }) => hud.toast(`${count} bajak laut mendekat!`));
}

function bindDeath({ player, death, sfx, input }, onRespawn) {
  const die = (title) => ({ cause }) => {
    sfx.explosion(1);
    sfx.death();
    sfx.alarm(false);
    sfx.mineBeam(false);
    input.unlock();
    death.show({ title, cause: cause ?? '', lost: lostItems(player, 0.5) }, () => {
      player.respawn(0.5);
      sfx.respawn();
      onRespawn();
      input.lock();
    });
  };
  player.on('shipDestroyed', die('Pesawat hancur'));
  player.on('playerDied', die('Kamu tewas'));
}

export function wirePlayerEvents(ctx, onRespawn) {
  bindFeedback(ctx);
  bindDeath(ctx, onRespawn);
}
