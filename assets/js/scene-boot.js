/* ==========================================================================
   SCENE BOOT — decide whether this device should run the WebGL projection
   Phones, data-saver, low-memory devices and reduced-motion users get the
   static plate instead of a 600 KB renderer. The scene script is always
   loaded: without THREE it draws its own fallback and still builds the nav.
   ========================================================================== */
(function () {
    'use strict';

    var mount = document.getElementById('dock-canvas') || document.getElementById('vehicle-canvas');
    if (!mount) return;

    var scene = mount.id === 'dock-canvas' ? 'holo-scene.js' : 'vehicles.js';
    var nav = window.navigator;
    var conn = nav.connection || {};
    var heavyOk =
        window.innerWidth >= 600 &&
        !conn.saveData &&
        !(nav.deviceMemory && nav.deviceMemory <= 2) &&
        !(conn.effectiveType && /2g/.test(conn.effectiveType)) &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function load(src, cb) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = cb || null;
        s.onerror = function () { if (cb) cb(); };
        document.head.appendChild(s);
    }

    function start() {
        if (heavyOk) load('assets/js/three.min.js', function () { load('assets/js/' + scene); });
        else load('assets/js/' + scene);
    }

    // never compete with first paint
    if (document.readyState === 'complete') idle();
    else window.addEventListener('load', idle);

    function idle() {
        if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 2000 });
        else setTimeout(start, 900);
    }
})();
