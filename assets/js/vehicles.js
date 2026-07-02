/* ==========================================================================
   VEHICLES — per-page 3D space vehicle hero scenes
   works=ISS / profile=LEM (lunar module) / activities=BLACKHOLE / learning=ROVER
   Mount: <div id="vehicle-canvas" data-vehicle="iss|lem|blackhole|rover">
   Requires: three.min.js (global THREE)
   ========================================================================== */
(function () {
    'use strict';

    if (typeof THREE === 'undefined') return;

    var mount = document.getElementById('vehicle-canvas');
    if (!mount) return;

    var kind = mount.getAttribute('data-vehicle') || 'iss';
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) { return; }

    var isMobile = window.innerWidth < 768;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300);
    camera.position.set(0, 1.5, 13);

    scene.add(new THREE.AmbientLight(0x334466, 1.2));
    var sun = new THREE.DirectionalLight(0xfff2dd, 1.3);
    sun.position.set(-8, 10, 6);
    scene.add(sun);
    var fill = new THREE.PointLight(0x00d2ff, 0.7, 40);
    fill.position.set(4, 2, 8);
    scene.add(fill);

    /* --- shared helpers --- */
    var matHull = new THREE.MeshStandardMaterial({ color: 0xb8becd, roughness: 0.45, metalness: 0.8 });
    var matDark = new THREE.MeshStandardMaterial({ color: 0x2a3040, roughness: 0.6, metalness: 0.7 });
    var matGold = new THREE.MeshStandardMaterial({ color: 0xc59943, roughness: 0.35, metalness: 0.9 });
    var matSolar = new THREE.MeshStandardMaterial({
        color: 0xb8742f, roughness: 0.4, metalness: 0.6,
        emissive: 0x552200, emissiveIntensity: 0.25, side: THREE.DoubleSide
    });
    var matGlowCyan = new THREE.MeshStandardMaterial({
        color: 0x00d2ff, emissive: 0x00d2ff, emissiveIntensity: 1.8, roughness: 0.3
    });
    var matGlowRed = new THREE.MeshStandardMaterial({
        color: 0xff5050, emissive: 0xff3030, emissiveIntensity: 1.8, roughness: 0.3
    });

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
        return new THREE.CanvasTexture(c);
    }

    // full-screen starfield in two depth layers (parallax on scroll)
    var starLayers = [];
    (function localStars() {
        [[isMobile ? 300 : 700, -30, 160, 0.9], [isMobile ? 120 : 300, -8, 70, 1.5]].forEach(function (cfg) {
            var n = cfg[0];
            var geo = new THREE.BufferGeometry();
            var pos = new Float32Array(n * 3);
            for (var i = 0; i < n; i++) {
                pos[i * 3] = (Math.random() - 0.5) * 180;
                pos[i * 3 + 1] = (Math.random() - 0.5) * 110;
                pos[i * 3 + 2] = cfg[1] - Math.random() * cfg[2];
            }
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            var pts = new THREE.Points(geo, new THREE.PointsMaterial({
                size: cfg[3], map: dotTexture('rgba(255,255,255,1)', 'rgba(190,220,255,0.4)'),
                transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending
            }));
            scene.add(pts);
            starLayers.push(pts);
        });
    })();

    var root = new THREE.Group();
    // composition: vehicle sits centre-right and deep, page text stays readable on the left
    root.position.set(isMobile ? 0 : 3.4, isMobile ? 1.2 : -0.2, isMobile ? -6 : -3);
    scene.add(root);

    var update = function () {};   // per-vehicle per-frame hook

    /* ====================================================================
       ISS — truss, paired solar arrays, modules  (works.html)
       ==================================================================== */
    function buildISS() {
        var iss = new THREE.Group();

        // main truss
        var truss = new THREE.Mesh(new THREE.BoxGeometry(11, 0.35, 0.35), matHull);
        iss.add(truss);

        // solar array wings (4 pairs)
        var wings = [];
        [-4.4, -3.2, 3.2, 4.4].forEach(function (x) {
            var wing = new THREE.Group();
            [1, -1].forEach(function (dir) {
                var panel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 3.4), matSolar);
                panel.position.z = dir * 2.1;
                wing.add(panel);
                var boom = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.4, 6), matDark);
                boom.rotation.x = Math.PI / 2;
                wing.add(boom);
            });
            wing.position.x = x;
            iss.add(wing);
            wings.push(wing);
        });

        // habitation modules along centre
        var modA = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 3.2, 16), matHull);
        modA.rotation.z = Math.PI / 2;
        modA.position.y = -0.55;
        iss.add(modA);
        var modB = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.4, 16), matHull);
        modB.rotation.x = Math.PI / 2;
        modB.position.set(0.4, -0.55, 0);
        iss.add(modB);

        // radiators
        [-1.8, 1.8].forEach(function (x) {
            var rad = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 1.6),
                new THREE.MeshStandardMaterial({ color: 0xe8ecf4, roughness: 0.7, metalness: 0.3, side: THREE.DoubleSide }));
            rad.position.set(x, -0.15, 0.9);
            rad.rotation.x = 0.5;
            iss.add(rad);
        });

        // Kibo + small dish
        var kibo = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.7), matHull);
        kibo.position.set(-0.9, -0.9, 0.3);
        iss.add(kibo);
        var dish = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), matDark);
        dish.position.set(1.6, 0.5, 0);
        dish.rotation.x = -0.6;
        iss.add(dish);

        // beacons
        var b1 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), matGlowRed.clone());
        b1.position.set(-5.5, 0, 0);
        iss.add(b1);
        var b2 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), matGlowCyan.clone());
        b2.position.set(5.5, 0, 0);
        iss.add(b2);

        iss.rotation.z = 0.12;
        root.add(iss);
        camera.position.set(0, 1.2, 12);

        update = function (t) {
            iss.rotation.y = Math.sin(t * 0.12) * 0.35 + 0.25;
            iss.position.y = Math.sin(t * 0.5) * 0.25;
            wings.forEach(function (w, i) { w.rotation.x = t * 0.15 + i * 0.12; });
            b1.material.emissiveIntensity = 0.5 + Math.abs(Math.sin(t * 2.2)) * 1.8;
            b2.material.emissiveIntensity = 0.5 + Math.abs(Math.sin(t * 2.2 + 1.4)) * 1.8;
        };
    }

    /* ====================================================================
       LEM — lunar module hover-descending over the Moon (profile.html)
       ==================================================================== */
    function buildLEM() {
        var lem = new THREE.Group();

        // descent stage (gold octagon)
        var descent = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.75, 8), matGold);
        lem.add(descent);

        // ascent stage
        var ascent = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.8, 8), matHull);
        ascent.position.y = 0.8;
        lem.add(ascent);
        var hatch = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.06), matDark);
        hatch.position.set(0, 0.72, 0.83);
        lem.add(hatch);
        // triangular windows
        [-0.38, 0.38].forEach(function (x) {
            var win = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.05), matGlowCyan);
            win.position.set(x, 1.0, 0.78);
            win.rotation.z = x > 0 ? -0.4 : 0.4;
            lem.add(win);
        });
        // antenna
        var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), matDark);
        mast.position.set(0.3, 1.55, 0);
        lem.add(mast);
        var dish = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2), matHull);
        dish.position.set(0.3, 1.9, 0);
        dish.rotation.x = -0.7;
        lem.add(dish);

        // legs + footpads
        for (var l = 0; l < 4; l++) {
            var a = l * Math.PI / 2 + Math.PI / 4;
            var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6), matGold);
            leg.position.set(Math.cos(a) * 1.35, -0.75, Math.sin(a) * 1.35);
            leg.rotation.z = Math.cos(a) * 0.55;
            leg.rotation.x = -Math.sin(a) * 0.55;
            lem.add(leg);
            var pad = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.08, 10), matGold);
            pad.position.set(Math.cos(a) * 1.75, -1.42, Math.sin(a) * 1.75);
            lem.add(pad);
        }

        // descent engine flame
        var flame = new THREE.Mesh(
            new THREE.ConeGeometry(0.3, 1.1, 12),
            new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.85 })
        );
        flame.position.y = -0.95;
        flame.rotation.x = Math.PI;
        lem.add(flame);
        var flameLight = new THREE.PointLight(0xff9030, 1.4, 10);
        flameLight.position.y = -1.2;
        lem.add(flameLight);

        // lunar surface
        var moonMat = new THREE.MeshStandardMaterial({ color: 0x8a8d99, roughness: 1, metalness: 0 });
        var moon = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 0.5, 36), moonMat);
        moon.position.y = -3.6;
        root.add(moon);
        // craters
        for (var cr = 0; cr < 7; cr++) {
            var crater = new THREE.Mesh(new THREE.TorusGeometry(0.4 + Math.random() * 0.7, 0.08, 6, 16),
                new THREE.MeshStandardMaterial({ color: 0x6f7280, roughness: 1 }));
            crater.rotation.x = Math.PI / 2;
            crater.position.set((Math.random() - 0.5) * 16, -3.32, (Math.random() - 0.5) * 10);
            root.add(crater);
        }

        lem.position.y = 0.6;
        root.add(lem);
        camera.position.set(0, 1.8, 11);

        update = function (t) {
            // slow descent loop: hover down toward surface, then reset up
            var cycle = (t * 0.08) % 1;
            lem.position.y = 2.2 - cycle * 3.2 + Math.sin(t * 1.3) * 0.08;
            var landed = lem.position.y < -0.75;
            if (landed) lem.position.y = -0.75;
            flame.visible = !landed;
            flameLight.intensity = landed ? 0 : 1.0 + Math.sin(t * 25) * 0.5;
            flame.scale.y = 0.8 + Math.sin(t * 21) * 0.3;
            flame.scale.x = flame.scale.z = 1 + Math.sin(t * 17) * 0.2;
            lem.rotation.y = t * 0.1;
            root.rotation.y = Math.sin(t * 0.07) * 0.12;
        };
    }

    /* ====================================================================
       BLACK HOLE — accretion disk + orbiting ring ship (activities.html)
       ==================================================================== */
    function buildBlackhole() {
        // singularity
        var hole = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32),
            new THREE.MeshBasicMaterial({ color: 0x000000 }));
        root.add(hole);

        // photon ring glow
        var glowTex = (function () {
            var c = document.createElement('canvas');
            c.width = c.height = 256;
            var ctx = c.getContext('2d');
            var g = ctx.createRadialGradient(128, 128, 60, 128, 128, 128);
            g.addColorStop(0, 'rgba(0,0,0,0)');
            g.addColorStop(0.55, 'rgba(255,190,110,0.55)');
            g.addColorStop(0.75, 'rgba(255,150,70,0.25)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 256, 256);
            return new THREE.CanvasTexture(c);
        })();
        var halo = new THREE.Sprite(new THREE.SpriteMaterial({
            map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
        }));
        halo.scale.set(6.4, 6.4, 1);
        root.add(halo);

        // accretion disk: particle ring
        var diskN = 1600;
        var diskGeo = new THREE.BufferGeometry();
        var diskPos = new Float32Array(diskN * 3);
        var diskAng = new Float32Array(diskN);
        var diskRad = new Float32Array(diskN);
        for (var i = 0; i < diskN; i++) {
            diskAng[i] = Math.random() * Math.PI * 2;
            diskRad[i] = 2.1 + Math.pow(Math.random(), 1.6) * 3.4;
            diskPos[i * 3 + 1] = (Math.random() - 0.5) * 0.12;
        }
        diskGeo.setAttribute('position', new THREE.BufferAttribute(diskPos, 3));
        var disk = new THREE.Points(diskGeo, new THREE.PointsMaterial({
            size: 0.09, map: dotTexture('rgba(255,210,150,1)', 'rgba(255,150,60,0.5)'),
            color: 0xffc080, transparent: true, opacity: 0.95,
            depthWrite: false, blending: THREE.AdditiveBlending
        }));
        disk.rotation.x = 0.42;
        root.add(disk);

        // Endurance-style ring ship orbiting
        var ship = new THREE.Group();
        var shipRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.09, 8, 32), matHull);
        ship.add(shipRing);
        for (var m = 0; m < 12; m++) {
            var mod = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.18), m % 3 === 0 ? matDark : matHull);
            var ma = m * Math.PI / 6;
            mod.position.set(Math.cos(ma) * 0.85, Math.sin(ma) * 0.85, 0);
            mod.rotation.z = ma;
            ship.add(mod);
        }
        var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 10), matDark);
        hub.rotation.x = Math.PI / 2;
        ship.add(hub);
        var nav = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), matGlowCyan.clone());
        nav.position.set(0.85, 0, 0.15);
        ship.add(nav);
        root.add(ship);

        camera.position.set(0, 1.6, 11.5);

        update = function (t) {
            // disk swirl (inner particles orbit faster — Keplerian-ish)
            var arr = disk.geometry.attributes.position.array;
            for (var i = 0; i < diskN; i++) {
                var w = 1.6 / Math.sqrt(diskRad[i]);
                var a = diskAng[i] + t * w;
                arr[i * 3] = Math.cos(a) * diskRad[i];
                arr[i * 3 + 2] = Math.sin(a) * diskRad[i];
            }
            disk.geometry.attributes.position.needsUpdate = true;

            // ship orbit + self spin
            var oa = t * 0.25;
            ship.position.set(Math.cos(oa) * 6.2, Math.sin(oa * 2) * 0.6 + 0.4, Math.sin(oa) * 3.4);
            ship.rotation.z = t * 0.6;
            ship.rotation.y = 0.4;
            nav.material.emissiveIntensity = 0.6 + Math.abs(Math.sin(t * 3)) * 1.6;

            root.rotation.y = Math.sin(t * 0.05) * 0.1;
            halo.material.opacity = 0.85 + Math.sin(t * 1.7) * 0.15;
        };
    }

    /* ====================================================================
       MARS ROVER — rocker-bogie rover rolling the red desert (learning.html)
       ==================================================================== */
    function buildRover() {
        scene.fog = new THREE.FogExp2(0x1a0b06, 0.02);
        sun.color.setHex(0xffc9a0);
        fill.color.setHex(0xff7040);
        fill.intensity = 0.4;

        // terrain
        var groundGeo = new THREE.PlaneGeometry(60, 40, 40, 26);
        var gp = groundGeo.attributes.position;
        for (var v = 0; v < gp.count; v++) {
            gp.setZ(v, Math.sin(gp.getX(v) * 0.4) * 0.3 + Math.cos(gp.getY(v) * 0.5) * 0.35 + Math.random() * 0.12);
        }
        groundGeo.computeVertexNormals();
        var ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({
            color: 0x9c4522, roughness: 1, metalness: 0
        }));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -2.4;
        root.add(ground);

        // scattered rocks
        for (var r = 0; r < 14; r++) {
            var rock = new THREE.Mesh(
                new THREE.SphereGeometry(0.15 + Math.random() * 0.35, 5, 4),
                new THREE.MeshStandardMaterial({ color: 0x5e2812, roughness: 1 })
            );
            rock.position.set((Math.random() - 0.5) * 30, -2.25, -2 - Math.random() * 14);
            rock.scale.y = 0.6;
            root.add(rock);
        }

        // dusty sky glow
        var skyTex = (function () {
            var c = document.createElement('canvas');
            c.width = c.height = 256;
            var ctx = c.getContext('2d');
            var g = ctx.createRadialGradient(128, 200, 20, 128, 200, 220);
            g.addColorStop(0, 'rgba(230,120,60,0.5)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 256, 256);
            return new THREE.CanvasTexture(c);
        })();
        var sky = new THREE.Sprite(new THREE.SpriteMaterial({
            map: skyTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
        }));
        sky.position.set(0, 2, -25);
        sky.scale.set(70, 40, 1);
        scene.add(sky);

        // rover
        var rover = new THREE.Group();

        var body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 1.5), matGold);
        body.position.y = 0.45;
        rover.add(body);
        var deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.7),
            new THREE.MeshStandardMaterial({ color: 0x101320, roughness: 0.4, metalness: 0.8 }));
        deck.position.y = 0.85;
        rover.add(deck);

        // camera mast
        var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8), matDark);
        mast.position.set(0.8, 1.5, 0.2);
        rover.add(mast);
        var head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.25, 0.2), matDark);
        head.position.set(0.8, 2.15, 0.2);
        rover.add(head);
        var eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), matGlowRed.clone());
        eyeL.position.set(0.72, 2.15, 0.31);
        rover.add(eyeL);
        var eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), matGlowCyan.clone());
        eyeR.position.set(0.9, 2.15, 0.31);
        rover.add(eyeR);

        // whip antenna
        var whip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 4), matDark);
        whip.position.set(-0.9, 1.4, -0.4);
        whip.rotation.z = 0.15;
        rover.add(whip);

        // robot arm (front)
        var rArm = new THREE.Group();
        var seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8), matHull);
        seg1.rotation.z = 1.1;
        seg1.position.set(0.35, -0.05, 0);
        rArm.add(seg1);
        var seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), matHull);
        seg2.rotation.z = 2.2;
        seg2.position.set(0.85, -0.25, 0);
        rArm.add(seg2);
        rArm.position.set(1.2, 0.4, 0.3);
        rover.add(rArm);

        // rocker-bogie: 6 wheels
        var wheels = [];
        var wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14);
        [[-0.95, 0.75], [0, 0.85], [0.95, 0.75]].forEach(function (wx) {
            [1, -1].forEach(function (side) {
                var wheel = new THREE.Mesh(wheelGeo, matDark);
                wheel.rotation.x = Math.PI / 2;
                wheel.position.set(wx[0], -0.15, side * wx[1]);
                // treads
                for (var tr = 0; tr < 6; tr++) {
                    var tread = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.05, 0.31), matHull);
                    tread.rotation.z = tr * Math.PI / 6;
                    wheel.add(tread);
                }
                rover.add(wheel);
                wheels.push(wheel);
                // strut
                var strut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6), matHull);
                strut.position.set(wx[0], 0.22, side * wx[1]);
                strut.rotation.x = side * 0.35;
                rover.add(strut);
            });
        });

        rover.position.set(-0.5, -1.55, 1.5);
        rover.rotation.y = 0.35;
        root.add(rover);

        // drifting dust particles
        var dustN = 60;
        var dustGeo = new THREE.BufferGeometry();
        var dustPos = new Float32Array(dustN * 3);
        for (var d = 0; d < dustN; d++) {
            dustPos[d * 3] = (Math.random() - 0.5) * 30;
            dustPos[d * 3 + 1] = -2 + Math.random() * 4;
            dustPos[d * 3 + 2] = -10 + Math.random() * 14;
        }
        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
        var dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
            size: 0.35, map: dotTexture('rgba(255,170,110,0.8)', 'rgba(200,90,40,0.3)'),
            transparent: true, opacity: 0.4, depthWrite: false
        }));
        scene.add(dust);

        camera.position.set(0, 0.6, 10.5);

        update = function (t) {
            wheels.forEach(function (w) { w.rotation.y = -t * 1.6; });   // spin (local Y after X-rot)
            rover.position.y = -1.55 + Math.sin(t * 2.1) * 0.03;
            rover.rotation.z = Math.sin(t * 1.7) * 0.012;
            rover.rotation.x = Math.sin(t * 1.3) * 0.01;
            head.rotation.y = Math.sin(t * 0.4) * 0.5;
            eyeL.material.emissiveIntensity = 0.8 + Math.abs(Math.sin(t * 2.4)) * 1.4;
            // ground scrolls slowly to imply driving
            ground.position.x = -((t * 0.35) % 3);
            dust.position.x = -((t * 0.8) % 6);
            root.rotation.y = Math.sin(t * 0.06) * 0.08;
        };
    }

    /* ====================================================================
       BUILD + LOOP
       ==================================================================== */
    if (kind === 'lem') buildLEM();
    else if (kind === 'blackhole') buildBlackhole();
    else if (kind === 'rover') buildRover();
    else buildISS();

    /* mouse parallax */
    var px = 0, py = 0;
    document.addEventListener('mousemove', function (e) {
        px = (e.clientX / window.innerWidth - 0.5) * 2;
        py = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    /* scroll = dolly deeper into the scene (depth) */
    var scrollY = 0;
    window.addEventListener('scroll', function () { scrollY = window.pageYOffset; }, { passive: true });

    window.addEventListener('resize', function () {
        var w = window.innerWidth, h = window.innerHeight;
        if (w === 0 || h === 0) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });

    var clock = new THREE.Clock();
    var running = true;
    var baseCam = camera.position.clone();
    // look slightly toward the vehicle but keep it framed centre-right,
    // leaving the left side clear for the page text
    var lookTarget = root.position.clone().multiplyScalar(0.45);

    document.addEventListener('visibilitychange', function () {
        running = !document.hidden;
        if (running) animate();
    });

    function animate() {
        if (!running) return;
        if (!reduced) requestAnimationFrame(animate);
        var t = clock.getElapsedTime();
        update(t);

        // depth dolly: scrolling pushes the camera past the vehicle into the scene
        var depth = scrollY * 0.012;
        camera.position.x = baseCam.x + px * 1.1 + depth * 0.4;
        camera.position.y = baseCam.y - py * 0.7 + depth * 0.25;
        camera.position.z = baseCam.z - depth;
        camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z - depth * 0.5);

        // far stars drift slower than near ones — depth cue
        starLayers[0].position.y = scrollY * 0.002;
        if (starLayers[1]) starLayers[1].position.y = scrollY * 0.005;

        renderer.render(scene, camera);
    }
    animate();
})();
