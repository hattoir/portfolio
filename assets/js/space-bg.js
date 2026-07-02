/* ==========================================================================
   SPACE-BG — shared Three.js starfield background (all pages)
   Requires: three.min.js (global THREE)
   ========================================================================== */
(function () {
    'use strict';

    if (typeof THREE === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var mount = document.getElementById('space-bg');
    if (!mount) return;

    var renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch (e) { return; }

    var isMobile = window.innerWidth < 768;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);
    camera.position.z = 60;

    /* --- soft round particle texture --- */
    function dotTexture(color, glow) {
        var c = document.createElement('canvas');
        c.width = c.height = 64;
        var ctx = c.getContext('2d');
        var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, color);
        g.addColorStop(0.35, glow);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 64, 64);
        var t = new THREE.CanvasTexture(c);
        return t;
    }

    var starTexWhite = dotTexture('rgba(255,255,255,1)', 'rgba(190,220,255,0.4)');
    var starTexCyan = dotTexture('rgba(160,240,255,1)', 'rgba(0,210,255,0.35)');

    function makeStars(count, spread, size, tex, opacity) {
        var geo = new THREE.BufferGeometry();
        var pos = new Float32Array(count * 3);
        for (var i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * spread;
            pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
            pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        var mat = new THREE.PointsMaterial({
            size: size, map: tex, transparent: true, opacity: opacity,
            depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
        });
        return new THREE.Points(geo, mat);
    }

    var starsFar = makeStars(isMobile ? 500 : 1200, 300, 0.9, starTexWhite, 0.8);
    var starsNear = makeStars(isMobile ? 150 : 400, 200, 1.6, starTexCyan, 0.9);
    scene.add(starsFar);
    scene.add(starsNear);

    /* --- nebula sprites --- */
    function nebulaSprite(color, x, y, z, scale) {
        var c = document.createElement('canvas');
        c.width = c.height = 256;
        var ctx = c.getContext('2d');
        var g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 256);
        var mat = new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(c), transparent: true,
            opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending
        });
        var s = new THREE.Sprite(mat);
        s.position.set(x, y, z);
        s.scale.set(scale, scale, 1);
        return s;
    }
    scene.add(nebulaSprite('rgba(20,60,140,0.5)', -70, 40, -120, 180));
    scene.add(nebulaSprite('rgba(0,90,120,0.4)', 80, -50, -140, 200));
    scene.add(nebulaSprite('rgba(80,40,120,0.25)', 30, 60, -160, 160));

    /* --- drifting debris / dust --- */
    var debris = makeStars(isMobile ? 40 : 120, 90, 0.5, starTexCyan, 0.5);
    scene.add(debris);

    /* --- mouse parallax --- */
    var targetX = 0, targetY = 0, curX = 0, curY = 0;
    document.addEventListener('mousemove', function (e) {
        targetX = (e.clientX / window.innerWidth - 0.5) * 2;
        targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    /* --- scroll drift --- */
    var scrollY = 0;
    window.addEventListener('scroll', function () { scrollY = window.pageYOffset; }, { passive: true });

    var clock = new THREE.Clock();
    var running = true;

    document.addEventListener('visibilitychange', function () {
        running = !document.hidden;
        if (running) animate();
    });

    window.addEventListener('resize', function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    function animate() {
        if (!running) return;
        requestAnimationFrame(animate);
        var t = clock.getElapsedTime();

        starsFar.rotation.y = t * 0.005;
        starsNear.rotation.y = -t * 0.01;
        starsNear.rotation.x = Math.sin(t * 0.05) * 0.02;
        debris.rotation.y = t * 0.02;
        debris.position.y = Math.sin(t * 0.1) * 2;

        curX += (targetX - curX) * 0.03;
        curY += (targetY - curY) * 0.03;
        camera.position.x = curX * 4;
        camera.position.y = -curY * 3 - scrollY * 0.004;
        camera.lookAt(0, -scrollY * 0.004, 0);

        renderer.render(scene, camera);
    }
    animate();
})();
