export function validPickup(position, now = Date.now()) {
  const c = position?.coords;
  return Boolean(c && Number.isFinite(c.latitude) && Math.abs(c.latitude) <= 90 &&
    Number.isFinite(c.longitude) && Math.abs(c.longitude) <= 180 &&
    Number.isFinite(c.accuracy) && c.accuracy > 0 && c.accuracy <= 1000 &&
    Number.isFinite(position.timestamp) && position.timestamp <= now + 1000 && now - position.timestamp <= 30000);
}

export function findPickup({geolocation, success, failure, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout}) {
  let best = null, watch = null, done = false, timer = null;
  const finish = error => {
    if (done) return;
    done = true;
    if (timer !== null) clearTimer(timer);
    if (watch !== null) geolocation.clearWatch(watch);
    if (best) success(best);
    else failure(error || {code: 3});
  };
  const accept = position => {
    if (done || !validPickup(position, now())) return;
    if (!best || position.coords.accuracy < best.coords.accuracy) best = position;
    if (best.coords.accuracy <= 100) finish();
    else if (timer === null) timer = setTimer(() => finish(), 1500);
  };
  const options = {enableHighAccuracy: true, timeout: 8000, maximumAge: 10000};
  try {
    if (geolocation.watchPosition) {
      watch = geolocation.watchPosition(accept, finish, options);
      if (done && watch !== null) geolocation.clearWatch(watch);
    } else geolocation.getCurrentPosition(position => {accept(position);finish();}, finish, options);
  } catch { finish({code: 2}); }
  return () => { if (!done) {done = true;if (timer !== null) clearTimer(timer);if (watch !== null) geolocation.clearWatch(watch);} };
}
