/* ==========================================================================
   VEHICLES — per-page holographic background projections
   works = ISS / profile = H3 launch / activities = BLACK HOLE + ring ship / learning = MMX at Phobos
   Mount: <div id="vehicle-canvas" data-vehicle="iss|h3|blackhole|mmx">
   Every vehicle is authored as line work in metres (S converts to scene units),
   drawn thin & bright plus faint offset copies (pseudo-bloom) — same language as holo-scene.js.
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

    var isMobile = (window.innerWidth || document.documentElement.clientWidth || screen.width) < 768;
    var LOW = isMobile;                     // lighter geometry on phones
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, (window.innerWidth / window.innerHeight) || 1, 0.1, 400);
    camera.position.set(0, 1.5, 13);

    /* ============================== LINE TOOLKIT ======================== */
    var V = THREE.Vector3;
    var X = new V(1, 0, 0), Y = new V(0, 1, 0), Z = new V(0, 0, 1);
    var S = 0.1;                            // metres -> scene units (set by each builder)

    function basis(ax) {
        var t = Math.abs(ax.y) < 0.9 ? new V(0, 1, 0) : new V(1, 0, 0);
        var u = new V().crossVectors(ax, t).normalize();
        var v = new V().crossVectors(ax, u).normalize();
        return [u, v];
    }
    function add(p, q, k) { return p.clone().addScaledVector(q, k === undefined ? 1 : k); }

    function Seg() { this.a = []; }
    Seg.prototype.l = function (x1, y1, z1, x2, y2, z2) { this.a.push(x1, y1, z1, x2, y2, z2); return this; };
    Seg.prototype.lv = function (p, q) { return this.l(p.x, p.y, p.z, q.x, q.y, q.z); };
    Seg.prototype.poly = function (pts, closed) {
        var n = pts.length, last = closed ? n : n - 1;
        for (var i = 0; i < last; i++) this.lv(pts[i], pts[(i + 1) % n]);
        return this;
    };
    Seg.prototype.arc = function (c, u, v, r, a0, a1, n) {
        var pts = [];
        for (var i = 0; i <= n; i++) {
            var a = a0 + (a1 - a0) * i / n;
            pts.push(c.clone().addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r));
        }
        return this.poly(pts, false);
    };
    Seg.prototype.ring = function (c, u, v, r, n) {
        var pts = [];
        for (var i = 0; i < n; i++) {
            var a = i / n * Math.PI * 2;
            pts.push(c.clone().addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r));
        }
        return this.poly(pts, true);
    };
    Seg.prototype.ringAx = function (c, ax, r, n) { var b = basis(ax); return this.ring(c, b[0], b[1], r, n); };
    // oriented box: centre c, unit axes u/v/w, half extents
    Seg.prototype.obox = function (c, u, v, w, hu, hv, hw) {
        var P = [];
        [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { [-1, 1].forEach(function (d) {
            P.push(c.clone().addScaledVector(u, a * hu).addScaledVector(v, b * hv).addScaledVector(w, d * hw));
        }); }); });
        var E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
        for (var i = 0; i < E.length; i++) this.lv(P[E[i][0]], P[E[i][1]]);
        return this;
    };
    Seg.prototype.box = function (cx, cy, cz, sx, sy, sz) { return this.obox(new V(cx, cy, cz), X, Y, Z, sx / 2, sy / 2, sz / 2); };
    // surface of revolution: prof = [[radius, height], ...] along axis ax from c
    Seg.prototype.lathe = function (c, ax, prof, n, vert) {
        var b = basis(ax), u = b[0], v = b[1], i, k;
        var cs = prof.map(function (p) { return add(c, ax, p[1]); });
        for (i = 0; i < prof.length; i++) if (prof[i][0] > 1e-3) this.ring(cs[i], u, v, prof[i][0], n);
        for (k = 0; k < vert; k++) {
            var a = k / vert * Math.PI * 2;
            var o = u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a));
            for (i = 0; i < prof.length - 1; i++) this.lv(add(cs[i], o, prof[i][0]), add(cs[i + 1], o, prof[i + 1][0]));
        }
        return this;
    };
    Seg.prototype.cyl = function (c, ax, r, h, n, vert) { return this.lathe(c, ax, [[r, -h / 2], [r, h / 2]], n, vert); };
    // pressurised module: end cones + berthing rings + ribs
    Seg.prototype.module = function (c, ax, r, L, ribs) {
        var prof = [[r * 0.55, -L / 2 - 0.6], [r * 0.82, -L / 2 - 0.2], [r, -L / 2]];
        for (var i = 1; i <= ribs; i++) prof.push([r, -L / 2 + L * i / (ribs + 1)]);
        prof.push([r, L / 2], [r * 0.82, L / 2 + 0.2], [r * 0.55, L / 2 + 0.6]);
        return this.lathe(c, ax, prof, LOW ? 10 : 16, LOW ? 4 : 8);
    };
    // flat panel with a cell grid, centred at c spanning u*w by v*h
    Seg.prototype.panel = function (c, u, v, w, h, nu, nv) {
        var i, p = function (a, b) { return c.clone().addScaledVector(u, a).addScaledVector(v, b); };
        for (i = 0; i <= nu; i++) { var a = -w / 2 + w * i / nu; this.lv(p(a, -h / 2), p(a, h / 2)); }
        for (i = 0; i <= nv; i++) { var b = -h / 2 + h * i / nv; this.lv(p(-w / 2, b), p(w / 2, b)); }
        return this;
    };
    // square lattice truss between two points (bays with alternating face diagonals)
    Seg.prototype.lattice = function (p0, p1, w, bays) {
        var ax = p1.clone().sub(p0), len = ax.length(); ax.normalize();
        var b = basis(ax), u = b[0].multiplyScalar(w / 2), v = b[1].multiplyScalar(w / 2);
        var C = [add(u, v), add(u, v, -1), add(u.clone().negate(), v, -1), add(u.clone().negate(), v)];
        var st = function (i) { return add(p0, ax, len * i / bays); };
        var i, k;
        for (i = 0; i <= bays; i++) { var s = st(i); for (k = 0; k < 4; k++) this.lv(add(s, C[k]), add(s, C[(k + 1) % 4])); }
        for (k = 0; k < 4; k++) this.lv(add(p0, C[k]), add(p1, C[k]));
        for (i = 0; i < bays; i++) {
            var s0 = st(i), s1 = st(i + 1);
            for (k = 0; k < 4; k++) {
                var c0 = C[k], c1 = C[(k + 1) % 4];
                if (i % 2) this.lv(add(s0, c0), add(s1, c1)); else this.lv(add(s0, c1), add(s1, c0));
            }
        }
        return this;
    };
    Seg.prototype.sphere = function (c, r, nLat, nLon, n) {
        var i;
        for (i = 1; i < nLat; i++) { var ph = i / nLat * Math.PI; this.ring(add(c, Y, r * Math.cos(ph)), X, Z, r * Math.sin(ph), n); }
        for (i = 0; i < nLon; i++) { var th = i / nLon * Math.PI; this.ring(c, new V(Math.cos(th), 0, Math.sin(th)), Y, r, n); }
        return this;
    };

    /* ============================== MATERIALS =========================== */
    var ADD = THREE.AdditiveBlending;
    function lineMat(color, op) {
        return new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: op, blending: ADD, depthWrite: false });
    }
    var M = {
        bright: lineMat(0x9ff3ff, 0.62),
        halo: lineMat(0x63e8ff, 0.1),
        faint: lineMat(0x63e8ff, 0.2),
        amber: lineMat(0xffc47e, 0.72),
        amberHalo: lineMat(0xffb14d, 0.13)
    };
    var HALO = LOW ? [] : [[0.012, 0, 0], [0, 0.012, 0]];
    var lineTotal = 0;

    function part(seg, kind) {
        var g = new THREE.Group();
        var arr = new Float32Array(seg.a.length);
        for (var i = 0; i < arr.length; i++) arr[i] = seg.a[i] * S;
        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
        lineTotal += arr.length / 6;
        var mb = kind === 'amber' ? M.amber : (kind === 'faint' ? M.faint : M.bright);
        var mh = kind === 'amber' ? M.amberHalo : M.halo;
        g.add(new THREE.LineSegments(geo, mb));
        if (kind !== 'faint') {
            HALO.forEach(function (o) {
                var h = new THREE.LineSegments(geo, mh);
                h.position.set(o[0], o[1], o[2]);
                g.add(h);
            });
        }
        return g;
    }
    function pos(o, x, y, z) { o.position.set(x * S, y * S, z * S); return o; }
    function group(parent, x, y, z) { var g = new THREE.Group(); pos(g, x, y, z); parent.add(g); return g; }
    function beacon(color, r) {
        return new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8),
            new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1, blending: ADD, depthWrite: false }));
    }

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
    var SOFT = dotTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0.35)');

    // particle pool with per-particle fade (vertex colour x additive blending); spawn in metres
    function Pool(n, rgb, size, opacity, parent) {
        var P = new Float32Array(n * 3), C = new Float32Array(n * 3), Vl = new Float32Array(n * 3);
        var age = new Float32Array(n), life = new Float32Array(n), next = 0, i;
        for (i = 0; i < n; i++) P[i * 3 + 1] = -1e5;
        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
        var pts = new THREE.Points(geo, new THREE.PointsMaterial({
            size: size, map: SOFT, vertexColors: true, transparent: true, opacity: opacity,
            blending: ADD, depthWrite: false
        }));
        pts.frustumCulled = false;
        parent.add(pts);
        return {
            spawn: function (x, y, z, vx, vy, vz, l) {
                var j = next; next = (next + 1) % n;
                P[j * 3] = x * S; P[j * 3 + 1] = y * S; P[j * 3 + 2] = z * S;
                Vl[j * 3] = vx * S; Vl[j * 3 + 1] = vy * S; Vl[j * 3 + 2] = vz * S;
                age[j] = 0; life[j] = l;
            },
            step: function (dt, drag, lift) {
                var k = Math.max(0, 1 - drag * dt);
                for (i = 0; i < n; i++) {
                    if (life[i] <= 0) continue;
                    age[i] += dt;
                    if (age[i] >= life[i]) { life[i] = 0; P[i * 3 + 1] = -1e5; C[i * 3] = C[i * 3 + 1] = C[i * 3 + 2] = 0; continue; }
                    Vl[i * 3] *= k; Vl[i * 3 + 1] = Vl[i * 3 + 1] * k + (lift || 0) * S * dt; Vl[i * 3 + 2] *= k;
                    P[i * 3] += Vl[i * 3] * dt; P[i * 3 + 1] += Vl[i * 3 + 1] * dt; P[i * 3 + 2] += Vl[i * 3 + 2] * dt;
                    var f = 1 - age[i] / life[i];
                    f = f * Math.min(1, age[i] * 6);                 // quick fade-in, slow fade-out
                    C[i * 3] = rgb[0] * f; C[i * 3 + 1] = rgb[1] * f; C[i * 3 + 2] = rgb[2] * f;
                }
                geo.attributes.position.needsUpdate = true;
                geo.attributes.color.needsUpdate = true;
            }
        };
    }

    /* ============================== STARFIELD / DUST ==================== */
    var starLayers = [];
    if (kind !== 'h3') {
        [[LOW ? 300 : 700, -30, 160, 0.9], [LOW ? 120 : 300, -8, 70, 1.5]].forEach(function (cfg) {
            var n = cfg[0];
            var geo = new THREE.BufferGeometry();
            var p = new Float32Array(n * 3);
            for (var i = 0; i < n; i++) {
                p[i * 3] = (Math.random() - 0.5) * 180;
                p[i * 3 + 1] = (Math.random() - 0.5) * 110;
                p[i * 3 + 2] = cfg[1] - Math.random() * cfg[2];
            }
            geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
            var pts = new THREE.Points(geo, new THREE.PointsMaterial({
                size: cfg[3], map: dotTexture('rgba(255,255,255,1)', 'rgba(190,220,255,0.4)'),
                transparent: true, opacity: 0.7, depthWrite: false, blending: ADD
            }));
            scene.add(pts);
            starLayers.push(pts);
        });
    }

    var root = new THREE.Group();
    // composition: vehicle sits centre-right and deep, page text stays readable on the left
    root.position.set(isMobile ? 0.4 : 4.6, isMobile ? 1.6 : -0.2, isMobile ? -9 : -3);
    if (!isMobile) root.scale.setScalar(0.8);   // smaller + further right: stays clear of the page header
    scene.add(root);

    var update = function () {};   // per-vehicle per-frame hook (t, dt)

    /* ====================================================================
       ISS — integrated truss, 8 solar wings, radiators, US / JP / EU / RU
       segments, visiting vehicles and Canadarm2  (works.html)
       frame: x = truss, z = pressurised stack, y = zenith (metres)
       ==================================================================== */
    function buildISS() {
        S = 0.1;
        var iss = new THREE.Group();
        iss.rotation.set(0.35, 0, 0.12);
        root.add(iss);

        // integrated truss (S6..P6) with SARJ rotary joints and mobile-transporter rails
        var tr = new Seg();
        tr.lattice(new V(-44, 0, 0), new V(44, 0, 0), 4.5, LOW ? 11 : 22);
        tr.lattice(new V(-56, 0, 0), new V(-44, 0, 0), 3.2, 3).lattice(new V(44, 0, 0), new V(56, 0, 0), 3.2, 3);
        [-30, 30].forEach(function (x) { tr.ringAx(new V(x - 0.5, 0, 0), X, 3.6, 24).ringAx(new V(x + 0.5, 0, 0), X, 3.6, 24); });
        tr.l(-40, 2.9, 1.4, 40, 2.9, 1.4).l(-40, 2.9, -1.4, 40, 2.9, -1.4);
        tr.box(3, 3.4, 0, 3, 1, 3.4);
        [[2, 1], [2, -1], [-2, 1], [-2, -1]].forEach(function (p) { tr.l(p[0], -2.25, p[1] * 2, p[0] * 0.6, -2.9, p[1] * 2 + 4); });
        iss.add(part(tr));

        // solar array wings: 4 IEAs x 2 SAWs x 2 blankets, each with a coilable mast
        var wings = [];
        [-51, -37, 37, 51].forEach(function (x) {
            var g = group(iss, x, 0, 0);
            var sw = new Seg();
            sw.box(0, 0, 0, 2.2, 2.2, 2.2);
            [-1, 1].forEach(function (d) {
                sw.l(0, 0, d * 1.2, 0, 0, d * 35.5);
                for (var m = 0; m < 12; m++) sw.l(-0.35, 0, d * (2.5 + m * 2.75), 0.35, 0, d * (2.5 + (m + 1) * 2.75));
                sw.box(0, 0, d * 2, 11.6, 0.5, 0.9);
                [-3.1, 3.1].forEach(function (bx) { sw.panel(new V(bx, 0, d * 18.9), X, Z, 4.6, 32.6, LOW ? 2 : 4, LOW ? 8 : 16); });
            });
            g.add(part(sw));
            wings.push(g);
        });

        // heat-rejection radiators (nadir) + photovoltaic radiators (zenith)
        var rad = new Seg();
        [-12, 12].forEach(function (x) {
            for (var p = 0; p < 3; p++) rad.panel(new V(x, -4.5 - p * 7.9, 0), X, Y, 3.2, 7.4, 1, LOW ? 4 : 8);
            rad.l(x, -2.3, 0, x, -0.8, 0);
        });
        [-44, 44].forEach(function (x) { rad.panel(new V(x, 8.5, -1.5), X, Y, 3.4, 11, 1, LOW ? 3 : 6); rad.l(x, 2.3, -1.5, x, 3, -1.5); });
        iss.add(part(rad));

        // pressurised modules
        var md = new Seg();
        md.module(new V(0, -5, 14), Z, 2.2, 7.2, 3);          // Harmony (Node 2)
        md.module(new V(8.5, -5, 14), X, 2.2, 11.2, 5);       // Kibo PM
        md.module(new V(6, -1.4, 14), Y, 2.1, 3.9, 1);        // Kibo ELM-PS
        md.box(17.4, -5, 14, 5.6, 1.2, 5).panel(new V(17.4, -4.4, 14), X, Z, 5.6, 5, 4, 3);   // Kibo exposed facility
        md.box(16.2, -3.6, 12.8, 1.4, 1.2, 1.4).box(18.6, -3.6, 15.2, 1.4, 1.2, 1.4);
        md.module(new V(-6.3, -5, 14), X, 2.2, 6.9, 3);       // Columbus
        md.module(new V(0, -5, 6.2), Z, 2.2, 8.5, 4);         // Destiny
        md.module(new V(0, -5, -1.3), Z, 2.3, 5.5, 2);        // Unity (Node 1)
        md.module(new V(5.3, -5, -1.3), X, 2.0, 5.5, 2);      // Quest airlock
        md.module(new V(-6.3, -5, -1.3), X, 2.2, 6.7, 3);     // Tranquility (Node 3)
        md.lathe(new V(-6.3, -7.3, -1.3), Y.clone().negate(), [[1.5, 0], [1.4, 0.9], [0.85, 1.4]], 6, 6);   // Cupola
        md.module(new V(0, -5, -11.9), Z, 2.05, 12.6, 5);     // Zarya
        md.module(new V(0, -5, -25), Z, 2.1, 12.6, 5);        // Zvezda
        md.module(new V(0, -13.8, -19.5), Y, 2.1, 12.6, 4);   // Nauka
        md.module(new V(0, -1.6, -19.5), Y, 1.3, 4, 1);       // Poisk
        md.module(new V(0, -5, -35.8), Z, 1.35, 6.4, 2);      // Progress
        [-1, 1].forEach(function (d) {
            md.l(d * 2.1, -5, -28, d * 3, -5, -28);
            md.panel(new V(d * 8.7, -5, -28), X, Y, 11.4, 3, LOW ? 4 : 8, 2);          // Zvezda arrays
            md.panel(new V(d * 4.3, -5, -37.5), X, Y, 5, 1.2, 3, 1);                   // Progress arrays
        });
        md.lathe(new V(0, -5, 18.2), Z, [[0.9, 0], [1.1, 0.6], [1.9, 2.3], [1.9, 2.5]], LOW ? 10 : 16, 8);   // Dragon capsule
        md.module(new V(0, -5, 22.1), Z, 1.85, 2.8, 2);       // Dragon trunk
        iss.add(part(md));

        // Canadarm2 on the mobile base
        var armBase = group(iss, 3, 3.9, 0);
        var sa = new Seg();
        sa.cyl(new V(0, 0.3, 0), Y, 0.5, 0.6, 10, 4).ringAx(new V(0, 0.6, 0), Z, 0.55, 10);
        armBase.add(part(sa));
        var a1 = group(armBase, 0, 0.6, 0), a2 = group(a1, 0, 8.4, 0);
        var s1 = new Seg();
        s1.cyl(new V(0, 4.2, 0), Y, 0.18, 8.4, 8, 4).ringAx(new V(0, 8.4, 0), Z, 0.5, 10);
        a1.add(part(s1));
        var s2 = new Seg();
        s2.cyl(new V(0, 4.2, 0), Y, 0.18, 8.4, 8, 4).cyl(new V(0, 8.9, 0), Y, 0.35, 1, 10, 4);
        a2.add(part(s2));

        var b1 = beacon(0xffb14d, 0.09), b2 = beacon(0x9ff3ff, 0.09);
        pos(b1, -56.8, 0, 0); pos(b2, 56.8, 0, 0);
        iss.add(b1, b2);

        camera.position.set(0, 1.2, 12);

        update = function (t) {
            iss.rotation.y = Math.sin(t * 0.12) * 0.35 + 0.25;
            iss.position.y = Math.sin(t * 0.5) * 0.25;
            wings.forEach(function (w, i) { w.rotation.x = t * 0.15 + i * 0.12; });
            armBase.rotation.y = t * 0.1;
            a1.rotation.z = 0.6 + Math.sin(t * 0.3) * 0.4;
            a2.rotation.z = -1.4 + Math.sin(t * 0.3 + 1) * 0.3;
            b1.material.opacity = 0.2 + Math.abs(Math.sin(t * 2.2)) * 0.8;
            b2.material.opacity = 0.2 + Math.abs(Math.sin(t * 2.2 + 1.4)) * 0.8;
        };
    }

    /* ====================================================================
       BLACK HOLE — photon ring, lensed disk image, wireframe accretion disk,
       spacetime well, and an Endurance-style ring ship  (activities.html)
       ==================================================================== */
    function buildBlackhole() {
        S = 1;
        var i, k;
        var hole = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        root.add(hole);

        var glowTex = (function () {
            var c = document.createElement('canvas');
            c.width = c.height = 256;
            var ctx = c.getContext('2d');
            var g = ctx.createRadialGradient(128, 128, 60, 128, 128, 128);
            g.addColorStop(0, 'rgba(0,0,0,0)');
            g.addColorStop(0.55, 'rgba(140,236,255,0.42)');
            g.addColorStop(0.75, 'rgba(99,232,255,0.16)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 256, 256);
            return new THREE.CanvasTexture(c);
        })();
        var halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: ADD }));
        halo.scale.set(6.4, 6.4, 1);
        root.add(halo);

        // photon ring + the far side of the disk lensed over / under the shadow (faces the viewer)
        var ph = new Seg();
        [1.56, 1.6, 1.66, 1.75].forEach(function (r) { ph.ring(new V(0, 0, 0), X, Y, r, 128); });
        var photon = part(ph);
        root.add(photon);
        var ln = new Seg();
        for (i = 0; i < 7; i++) {
            var r = 2.0 + i * 0.26;
            ln.arc(new V(0, 0, 0), X, Y, r, 0.08, Math.PI - 0.08, 64);
            ln.arc(new V(0, 0, 0), X, Y, r * 0.9, Math.PI + 0.25, 2 * Math.PI - 0.25, 48);
        }
        root.add(part(ln, 'faint'));

        // accretion disk plane: orbit rings + radial spokes + particles, spacetime well below
        var diskG = new THREE.Group();
        diskG.rotation.x = 0.42;
        root.add(diskG);
        var dk = new Seg(), spokes = LOW ? 24 : 48;
        for (i = 0; i < 9; i++) dk.ringAx(new V(0, 0, 0), Y, 2.1 + i * 0.43, 128);
        for (k = 0; k < spokes; k++) {
            var a = k / spokes * Math.PI * 2;
            dk.l(Math.cos(a) * 2.1, 0, Math.sin(a) * 2.1, Math.cos(a) * 5.6, 0, Math.sin(a) * 5.6);
        }
        var diskLines = part(dk, 'faint');
        diskG.add(diskLines);

        var wl = new Seg(), WR = [1.8, 2.2, 2.8, 3.5, 4.4, 5.5, 7, 9];
        var wy = function (r) { return -6.5 / r; };
        WR.forEach(function (r) { wl.ringAx(new V(0, wy(r), 0), Y, r, 96); });
        for (k = 0; k < 32; k++) {
            var wa = k / 32 * Math.PI * 2, ca = Math.cos(wa), sa = Math.sin(wa);
            for (i = 0; i < WR.length - 1; i++) wl.l(ca * WR[i], wy(WR[i]), sa * WR[i], ca * WR[i + 1], wy(WR[i + 1]), sa * WR[i + 1]);
        }
        var well = part(wl, 'faint');
        well.position.y = -0.4;
        diskG.add(well);

        var diskN = LOW ? 800 : 1600;
        var diskGeo = new THREE.BufferGeometry();
        var diskPos = new Float32Array(diskN * 3), diskAng = new Float32Array(diskN), diskRad = new Float32Array(diskN);
        for (i = 0; i < diskN; i++) {
            diskAng[i] = Math.random() * Math.PI * 2;
            diskRad[i] = 2.1 + Math.pow(Math.random(), 1.6) * 3.4;
            diskPos[i * 3 + 1] = (Math.random() - 0.5) * 0.12;
        }
        diskGeo.setAttribute('position', new THREE.BufferAttribute(diskPos, 3));
        var disk = new THREE.Points(diskGeo, new THREE.PointsMaterial({
            size: 0.08, map: dotTexture('rgba(230,252,255,1)', 'rgba(99,232,255,0.5)'),
            color: 0x9ff3ff, transparent: true, opacity: 0.8, depthWrite: false, blending: ADD
        }));
        diskG.add(disk);

        // ring ship: 12 modules (alternating habitat / lab), corridors, hub, spokes, docked craft
        var ship = new THREE.Group();
        root.add(ship);
        var es = new Seg(), R = 0.95;
        for (var m = 0; m < 12; m++) {
            var ma = m * Math.PI / 6;
            var er = new V(Math.cos(ma), Math.sin(ma), 0), et = new V(-Math.sin(ma), Math.cos(ma), 0);
            var c = er.clone().multiplyScalar(R), big = m % 2 === 0;
            var hu = big ? 0.12 : 0.08, hv = big ? 0.15 : 0.11, hw = big ? 0.1 : 0.07;
            es.obox(c, er, et, Z, hu, hv, hw);
            var o = add(c, er, hu);
            es.lv(add(add(o, et, -hv), Z, hw * 0.35), add(add(o, et, hv), Z, hw * 0.35));
            es.lv(add(add(o, et, -hv), Z, -hw * 0.35), add(add(o, et, hv), Z, -hw * 0.35));
            es.lv(add(o, Z, -hw), add(o, Z, hw));
            es.arc(new V(0, 0, 0.025), X, Y, R, ma + 0.14, ma + Math.PI / 6 - 0.14, 4);
            es.arc(new V(0, 0, -0.025), X, Y, R, ma + 0.14, ma + Math.PI / 6 - 0.14, 4);
        }
        es.cyl(new V(0, 0, 0), Z, 0.14, 0.5, 14, 6).ringAx(new V(0, 0, 0.28), Z, 0.09, 12).ringAx(new V(0, 0, -0.28), Z, 0.09, 12);
        for (k = 0; k < 4; k++) {
            var sp = Math.PI / 4 + k * Math.PI / 2, e = new V(Math.cos(sp), Math.sin(sp), 0);
            [-0.02, 0.02].forEach(function (z) { es.lv(add(new V(0, 0, z), e, 0.14), add(new V(0, 0, z), e, R - 0.1)); });
        }
        es.obox(new V(0, 0, 0.42), X, Y, Z, 0.09, 0.05, 0.14).obox(new V(0, 0, -0.4), X, Y, Z, 0.06, 0.04, 0.1);
        ship.add(part(es));
        var nav = beacon(0xffb14d, 0.035);
        nav.position.set(R + 0.13, 0, 0);
        ship.add(nav);

        camera.position.set(0, 1.6, 11.5);

        update = function (t) {
            var arr = disk.geometry.attributes.position.array;
            for (var i = 0; i < diskN; i++) {
                var w = 1.6 / Math.sqrt(diskRad[i]);
                var a = diskAng[i] + t * w;
                arr[i * 3] = Math.cos(a) * diskRad[i];
                arr[i * 3 + 2] = Math.sin(a) * diskRad[i];
            }
            disk.geometry.attributes.position.needsUpdate = true;
            diskLines.rotation.y = t * 0.05;
            well.rotation.y = -t * 0.02;

            var oa = t * 0.25;
            ship.position.set(Math.cos(oa) * 6.2, Math.sin(oa * 2) * 0.6 + 0.4, Math.sin(oa) * 3.4);
            ship.rotation.z = t * 0.6;
            ship.rotation.y = 0.4;
            nav.material.opacity = 0.2 + Math.abs(Math.sin(t * 3)) * 0.8;

            root.rotation.y = Math.sin(t * 0.05) * 0.1;
            halo.material.opacity = 0.85 + Math.sin(t * 1.7) * 0.15;
            photon.scale.setScalar(1 + Math.sin(t * 1.7) * 0.01);
        };
    }

    /* ====================================================================
       H3 LAUNCH — H3-22 (core + 2 x SRB-3, LE-9 x2) on the mobile launcher at
       Tanegashima: umbilical mast, red/white lightning tower (amber), plume,
       ground cloud and cryogenic venting  (profile.html)
       ==================================================================== */
    function buildH3() {
        S = 0.075;
        var i, y;
        var site = group(root, 0, -30, 0);
        site.rotation.y = -0.35;

        // ground grid + hills behind the pad
        var gd = new Seg(), G = 60, st = LOW ? 12 : 6;
        for (var g = -G; g <= G + 0.1; g += st) { gd.l(g, -3, -G, g, -3, G); gd.l(-G, -3, g, G, -3, g); }
        var hill = [];
        for (i = 0; i <= 24; i++) hill.push(new V(-G + i * G / 12, 3 + 5 * Math.sin(i * 0.7) + 3 * Math.sin(i * 1.9), -G));
        gd.poly(hill, false);
        site.add(part(gd, 'faint'));

        // mobile launcher: deck, flame holes, trench exits, umbilical mast with swing arms
        var ml = new Seg();
        ml.box(0, -1.5, 0, 26, 3, 20).panel(new V(0, 0.01, 0), X, Z, 26, 20, LOW ? 4 : 8, LOW ? 3 : 6);
        [-1.2, 1.2, -4.1, 4.1].forEach(function (x) { ml.ringAx(new V(x, 0.02, 0), Y, 1.5, 14); });
        ml.box(-17, -2, 0, 8, 2, 7).box(17, -2, 0, 8, 2, 7);
        ml.lattice(new V(10, 0, -4), new V(10, 60, -4), 3.2, LOW ? 10 : 20);
        [24, 40, 51].forEach(function (yy) { ml.lattice(new V(8.4, yy, -4), new V(2.9, yy, -1), 1, 3); });
        site.add(part(ml));

        // lightning / service tower — red & white in the photo, drawn as the amber "caution" structure
        var tw = new Seg();
        tw.lattice(new V(-22, -3, 6), new V(-22, 72, 6), 6, LOW ? 12 : 25);
        tw.l(-22, 72, 6, -22, 86, 6);
        for (y = 9; y < 72; y += 12) tw.box(-22, y, 6, 8, 0.4, 8);
        site.add(part(tw, 'amber'));

        // the vehicle (metres, base of core aft skirt at y = 3)
        var rk = group(site, 0, 0, 0);
        var rs = new Seg(), n = LOW ? 12 : 20, vt = LOW ? 6 : 12;
        var core = [[2.85, 3], [2.6, 4.2]];
        for (y = 6.5; y < 41; y += 2.5) core.push([2.6, y]);
        core.push([2.6, 41]);
        rs.lathe(new V(0, 0, 0), Y, core, n, vt);                                                   // 1st stage
        rs.lathe(new V(0, 0, 0), Y, [[2.6, 41.6], [2.6, 43], [2.6, 45.5], [2.6, 48], [2.6, 51.4]], n, vt);  // interstage + 2nd stage
        var fair = [[2.6, 52], [2.6, 55]];
        for (i = 1; i <= 7; i++) { var f = i / 7; fair.push([2.6 * Math.pow(Math.cos(f * Math.PI / 2), 0.75), 55 + f * 8]); }
        rs.lathe(new V(0, 0, 0), Y, fair, n, vt);                                                   // payload fairing
        rs.box(0, 22, 2.75, 0.5, 36, 0.35);                                                         // cable raceway
        [-1.2, 1.2].forEach(function (x) {                                                          // LE-9 x2
            rs.lathe(new V(x, 0, 0), Y, [[1.1, 0.9], [0.88, 1.9], [0.6, 2.9], [0.45, 3.6], [0.5, 4]], LOW ? 8 : 14, LOW ? 4 : 8);
        });
        [-4.1, 4.1].forEach(function (x) {                                                          // SRB-3 x2
            var p = [[1.05, 1.1], [0.8, 2.3], [1.25, 3.2]];
            for (var yy = 5.7; yy < 17.6; yy += 2.5) p.push([1.25, yy]);
            p.push([1.25, 17.6]);
            for (var j = 1; j <= 5; j++) { var fj = j / 5; p.push([Math.max(0.001, 1.25 * Math.pow(Math.cos(fj * Math.PI / 2), 0.7)), 17.6 + fj * 3.4]); }
            rs.lathe(new V(x, 0, 0), Y, p, LOW ? 10 : 14, LOW ? 4 : 8);
            var sx = Math.sign(x);
            [5, 16].forEach(function (ay) { rs.l(x - sx * 1.25, ay, 0, sx * 2.6, ay, 0).l(x - sx * 1.25, ay, 0.6, sx * 2.6, ay + 1.2, 0.6); });
        });
        rk.add(part(rs));

        var plume = new THREE.Group();
        rk.add(plume);
        var pl = new Seg(), DOWN = Y.clone().negate();
        [-1.2, 1.2].forEach(function (x) { pl.lathe(new V(x, 0.9, 0), DOWN, [[1.1, 0], [1.5, 5], [1.3, 12], [0.4, 22]], 12, 8); });
        [-4.1, 4.1].forEach(function (x) { pl.lathe(new V(x, 1.1, 0), DOWN, [[1.05, 0], [1.6, 6], [1.4, 14], [0.4, 26]], 12, 8); });
        plume.add(part(pl, 'amber'));

        var smoke = Pool(LOW ? 320 : 900, [0.75, 0.95, 1], LOW ? 0.9 : 0.75, 0.32, site);
        var exhaust = Pool(LOW ? 120 : 320, [1, 0.7, 0.3], 0.35, 0.6, site);

        camera.position.set(0, 1.4, 12);

        var CYC = 20, ACC = 1.15, smokeAcc = 0, exAcc = 0, NOZ = [-1.2, 1.2, -4.1, 4.1];
        var rnd = Math.random;
        update = function (t, dt) {
            var c = t % CYC, burn = 0, alt = 0;
            if (c >= 4 && c < 6) burn = (c - 4) / 2;                              // ignition, held down
            else if (c >= 6) { burn = 1; var tt = c - 6; alt = 0.5 * ACC * tt * tt; }   // lift-off
            rk.position.y = alt * S;
            rk.scale.y = Math.min(1, c / 0.6);                                   // re-projected on the pad each cycle
            plume.visible = burn > 0;
            // near the pad the exhaust is turned into the flame trench, so the visible plume stays short
            var reach = Math.min(1, Math.max(0.12, (alt + 3) / 26));
            plume.scale.set(1, reach * (0.2 + burn * (0.85 + 0.15 * Math.sin(t * 41))), 1);

            if (burn > 0) {
                exAcc += dt * (LOW ? 60 : 160) * burn;
                while (exAcc > 1) {
                    exAcc--;
                    var ex = NOZ[Math.floor(rnd() * 4)];
                    exhaust.spawn(ex + rnd() - 0.5, alt + 0.5, rnd() - 0.5, (rnd() - 0.5) * 4, -30 - rnd() * 25, (rnd() - 0.5) * 4, 0.5 + rnd() * 0.4);
                }
                smokeAcc += dt * (LOW ? 40 : 110) * burn * Math.max(0, 1 - alt / 70);
            } else if (c < 4) {
                smokeAcc += dt * (LOW ? 4 : 10);                                   // LOX / LH2 boil-off venting
            }
            while (smokeAcc > 1) {
                smokeAcc--;
                var sd = rnd() < 0.5 ? -1 : 1;
                if (burn > 0) smoke.spawn(sd * (13 + rnd() * 6), -1 + rnd() * 2, (rnd() - 0.5) * 6, sd * (8 + rnd() * 10), 2 + rnd() * 5, (rnd() - 0.5) * 5, 5 + rnd() * 3);
                else smoke.spawn(sd * 2.7, 32 + rnd() * 14, (rnd() - 0.5) * 2, sd * (0.6 + rnd()), -0.8 - rnd(), 0, 3 + rnd() * 2);
            }
            smoke.step(dt, 0.35, 0.6);
            exhaust.step(dt, 0.5, 0);
        };
    }

    /* ====================================================================
       MMX — Martian Moons eXploration at Phobos: propulsion / exploration /
       return modules, sample-return capsule, HGA, twin wings, landing legs,
       corer arm, IDEFIX rover; Mars behind  (learning.html)
       ==================================================================== */
    function buildMMX() {
        S = 0.36;
        var i, k;
        var OX = 5, OY = 9;                          // scene offset (m): lander sits right of / above the learning cards

        var marsG = group(root, 158, 80, -260);                   // upper right corner: clear of title / subtitle
        marsG.rotation.z = 0.44;                                   // ~25° axial tilt
        var ms = new Seg();
        ms.sphere(new V(0, 0, 0), 70, LOW ? 8 : 14, LOW ? 8 : 14, LOW ? 40 : 72);
        marsG.add(part(ms, 'faint'));

        // Phobos (stylised scale): displaced icosahedron wireframe, craters, grooves
        var PR = 45, phG = group(root, OX, -48 + OY, 0);
        phG.scale.y = 0.85;
        var dfun = function (p) { return 1 + 0.035 * Math.sin(p.x * 7 + p.z * 3) + 0.025 * Math.sin(p.y * 11 + p.x * 5) + 0.02 * Math.sin(p.z * 13); };
        var ico = new THREE.IcosahedronGeometry(PR * S, LOW ? 2 : 3);
        var pa = ico.attributes.position, pv = new V();
        for (i = 0; i < pa.count; i++) {
            pv.fromBufferAttribute(pa, i).normalize();
            pv.multiplyScalar(PR * S * dfun(pv));
            pa.setXYZ(i, pv.x, pv.y, pv.z);
        }
        phG.add(new THREE.LineSegments(new THREE.WireframeGeometry(ico), M.faint));
        var SY = -48 + OY + PR * 0.85 * dfun(new V(0, 1, 0));      // surface height under the lander

        var cr = new Seg();
        var crater = function (lat, lon, r) {
            var dir = new V(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
            var b = basis(dir), s = dfun(dir);
            cr.ring(dir.clone().multiplyScalar(PR * s + 0.3), b[0], b[1], r, 28).ring(dir.clone().multiplyScalar(PR * s - 0.4), b[0], b[1], r * 0.78, 22);
        };
        crater(1.2, 0.3, 9);                                        // Stickney-like
        [[1.35, 2.4, 3], [1.1, -1.2, 4], [1.45, -2.6, 2.2], [0.95, 1.6, 3.5], [1.25, -0.4, 1.8], [1.0, 3.0, 2.6]].forEach(function (c) { crater(c[0], c[1], c[2]); });
        for (k = 0; k < (LOW ? 4 : 7); k++) {                       // parallel grooves across the top
            var off = -12 + k * 4, gr = Math.sqrt(PR * PR - off * off) + 0.2;
            cr.arc(new V(0, 0, off), X, Y, gr, Math.PI / 2 - 0.5, Math.PI / 2 + 0.5, 20);
        }
        phG.add(part(cr));

        // spacecraft (metres, origin at propulsion-module base)
        var mmx = new THREE.Group();
        root.add(mmx);
        var sc = new Seg();
        sc.lathe(new V(0, 0, 0), Y, [[1.55, 0], [1.55, 0.8], [1.55, 1.6]], 8, 8);                 // propulsion module
        [[0.62, 0.62], [-0.62, 0.62], [0.62, -0.62], [-0.62, -0.62]].forEach(function (p) {       // propellant tanks
            sc.sphere(new V(p[0], 0.8, p[1]), 0.52, 3, 3, LOW ? 10 : 16);
        });
        sc.lathe(new V(0, 0, 0), Y.clone().negate(), [[0.22, 0], [0.3, 0.3], [0.45, 0.65], [0.55, 0.95]], 12, 8);   // main engine
        for (k = 0; k < 4; k++) {                                                                  // RCS clusters
            var ra = Math.PI / 4 + k * Math.PI / 2, re = new V(Math.cos(ra), 0, Math.sin(ra));
            [0.25, 1.35].forEach(function (yy) { sc.lathe(add(new V(0, yy, 0), re, 1.45), re, [[0.04, 0], [0.1, 0.2]], 6, 3); });
        }
        sc.box(0, 2.25, 0, 2.5, 1.3, 2.5);                                                         // exploration module
        [[X, Z], [X.clone().negate(), Z], [Z, X], [Z.clone().negate(), X]].forEach(function (f) {
            sc.panel(add(new V(0, 2.25, 0), f[0], 1.26), f[1], Y, 2.5, 1.3, LOW ? 3 : 5, LOW ? 2 : 3);  // MLI seams
        });
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (q) {                                // landing legs
            var hip = new V(q[0] * 1.2, 1.7, q[1] * 1.2), foot = new V(q[0] * 2.5, -1.25, q[1] * 2.5);
            sc.lv(hip, foot);
            sc.lv(new V(q[0] * 1.5, 0.2, q[1] * 0.55), foot).lv(new V(q[0] * 0.55, 0.2, q[1] * 1.5), foot);
            sc.cyl(hip.clone().lerp(foot, 0.45), foot.clone().sub(hip).normalize(), 0.09, 1.1, 8, 4);
            sc.lathe(foot, Y, [[0.42, 0], [0.3, 0.14]], 14, 6);
        });
        sc.lathe(new V(0, 2.9, 0), Y, [[1.1, 0], [1.1, 0.6], [1.1, 1.2]], 8, 8);                  // return module
        sc.lathe(new V(0, 4.1, 0), Y, [[0.35, 0], [0.62, 0.12], [0.6, 0.3], [0.42, 0.5], [0.2, 0.62]], 16, 8);   // return capsule
        sc.box(0.6, 2.35, 1.45, 0.42, 0.5, 0.4).ringAx(new V(0.6, 2.35, 1.66), Z, 0.14, 12);      // telescopic camera
        sc.box(-0.5, 1.95, 1.4, 0.3, 0.3, 0.3).ringAx(new V(-0.5, 1.95, 1.56), Z, 0.08, 10);      // wide camera
        sc.box(0.8, 1.45, -0.9, 0.4, 0.2, 0.4);                                                    // LIDAR
        sc.cyl(new V(-0.9, 2.5, -1.4), Z, 0.18, 0.4, 10, 4);                                       // spectrometer
        sc.l(-1.1, 3.5, 0, -1.1, 3.5, 0.75);                                                        // HGA boom
        mmx.add(part(sc));

        var hga = group(mmx, -1.1, 3.5, 0.9);                                                      // high-gain antenna
        var ds = new Seg(), F = 0.35, dp = [];
        for (i = 0; i <= 5; i++) { var r = 0.16 * i; dp.push([Math.max(0.001, r), r * r / (4 * F)]); }
        ds.lathe(new V(0, 0, 0), Z, dp, LOW ? 16 : 24, LOW ? 6 : 12);
        var hb = basis(Z);
        for (k = 0; k < 3; k++) {
            var fa = k * 2 * Math.PI / 3;
            ds.lv(add(add(new V(0, 0, dp[5][1]), hb[0], Math.cos(fa) * 0.8), hb[1], Math.sin(fa) * 0.8), new V(0, 0, F));
        }
        ds.ringAx(new V(0, 0, F), Z, 0.09, 10);
        hga.add(part(ds));

        var wingG = [];
        [-1, 1].forEach(function (d) {                                                             // solar array wings
            var wg = group(mmx, d * 1.25, 2.5, 0);
            var ws = new Seg();
            ws.l(0, 0, 0.35, d * 1.4, 0, 0).l(0, 0, -0.35, d * 1.4, 0, 0);
            for (var j = 0; j < 3; j++) {
                var cx = d * (1.4 + 1.15 + j * 2.35);
                ws.panel(new V(cx, 0, 0), X, Z, 2.2, 1.9, LOW ? 3 : 6, LOW ? 2 : 5);
                if (j < 2) ws.box(cx + d * 1.17, 0, 0, 0.12, 0.06, 0.3);
            }
            wg.add(part(ws));
            wingG.push(wg);
        });

        var sh = group(mmx, 1.25, 1.8, -0.8);                                                      // corer sampling arm
        var l1 = new THREE.Group();
        sh.add(l1);
        var sa = new Seg();
        sa.ringAx(new V(0, 0, 0), Z, 0.14, 12).cyl(new V(0.75, 0, 0), X, 0.07, 1.5, 8, 4);
        l1.add(part(sa));
        var l2 = group(l1, 1.5, 0, 0);
        var sb = new Seg();
        sb.ringAx(new V(0, 0, 0), Z, 0.12, 12).cyl(new V(0.65, 0, 0), X, 0.06, 1.3, 8, 4)
            .cyl(new V(1.3, -0.25, 0), Y, 0.1, 0.5, 10, 4).ringAx(new V(1.3, -0.52, 0), Y, 0.13, 12);
        l2.add(part(sb));

        var mplume = new THREE.Group();
        mmx.add(mplume);
        var mp = new Seg();
        mp.lathe(new V(0, -0.95, 0), Y.clone().negate(), [[0.55, 0], [0.8, 1.2], [0.5, 2.6], [0.1, 3.6]], 12, 6);
        mplume.add(part(mp, 'amber'));

        var rover = new THREE.Group();                                                             // IDEFIX
        rover.scale.setScalar(1.5);
        root.add(rover);
        var rv = new Seg();
        rv.box(0, 0.28, 0, 0.5, 0.26, 0.42).panel(new V(0, 0.42, 0), X, Z, 0.5, 0.42, 3, 2);
        [[0.28, 0.24], [0.28, -0.24], [-0.28, 0.24], [-0.28, -0.24]].forEach(function (p) {
            rv.ringAx(new V(p[0], 0.14, p[1]), Z, 0.14, 10).l(p[0], 0.14, p[1], p[0] * 0.8, 0.26, p[1] * 0.8);
        });
        rv.box(0.26, 0.36, 0, 0.06, 0.06, 0.12);
        rover.add(part(rv));

        var dust = Pool(LOW ? 80 : 220, [0.8, 0.95, 1], 0.12, 0.5, root);

        camera.position.set(0, 1.4, 11);

        var CYC = 24, H = 9, TD = SY + 1.25, dustAcc = 0;
        var ease = function (x) { return x * x * (3 - 2 * x); };
        update = function (t, dt) {
            var c = t % CYC, alt, s = 0;
            if (c < 8) alt = H * (1 - ease(c / 8));                                     // descent
            else if (c < 14) { alt = 0; s = Math.sin(Math.min(1, (c - 8) / 6) * Math.PI); }   // touchdown + coring
            else if (c < 22) alt = H * ease((c - 14) / 8);                              // ascent
            else alt = H;
            mmx.position.set(OX * S, (TD + alt) * S, 0);
            mmx.rotation.y = 0.6 + Math.sin(t * 0.05) * 0.2;
            l1.rotation.z = 1.2 - s * 2.1;
            l2.rotation.z = -2.6 + s * 3.0;
            wingG.forEach(function (w) { w.rotation.x = Math.sin(t * 0.08) * 0.35; });
            hga.rotation.y = -0.4 + Math.sin(t * 0.15) * 0.25;
            var firing = (c > 5 && c < 8) || (c > 14 && c < 17);
            mplume.visible = firing;
            if (firing) mplume.scale.set(1, 0.8 + 0.2 * Math.sin(t * 37), 1);
            if (alt < 2.5 && (c < 9 || (c > 14 && c < 16))) {
                dustAcc += dt * (LOW ? 30 : 80);
                while (dustAcc > 1) {
                    dustAcc--;
                    var a = Math.random() * Math.PI * 2, spd = 3 + Math.random() * 4;
                    dust.spawn(OX + Math.cos(a) * 1.5, SY + 0.2, Math.sin(a) * 1.5, Math.cos(a) * spd, 0.4 + Math.random() * 1.2, Math.sin(a) * spd, 1.5 + Math.random());
                }
            }
            dust.step(dt, 0.6, -0.3);                                                   // almost no gravity: slow settle
            var ra = t * 0.06;
            rover.position.set((OX + Math.cos(ra) * 7) * S, (SY - 0.42) * S, Math.sin(ra) * 7 * S);
            rover.rotation.y = -ra;
            marsG.rotation.y = t * 0.01;
        };
    }

    /* ====================================================================
       BUILD + LOOP
       ==================================================================== */
    if (kind === 'h3') buildH3();
    else if (kind === 'blackhole') buildBlackhole();
    else if (kind === 'mmx') buildMMX();
    else buildISS();
    window.__vehicleStats = { kind: kind, lineSegments: lineTotal, mobile: isMobile };

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
        if (running) { clock.getDelta(); animate(); }
    });

    function animate() {
        if (!running) return;
        if (!reduced) requestAnimationFrame(animate);
        var dt = Math.min(clock.getDelta(), 0.05);
        var t = clock.elapsedTime;
        if (window.innerWidth && (camera.aspect !== window.innerWidth / window.innerHeight)) {
            camera.aspect = window.innerWidth / window.innerHeight;          // e.g. loaded while hidden
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
        update(t, dt);

        // depth dolly: scrolling pushes the camera past the vehicle into the scene
        var depth = scrollY * 0.012;
        camera.position.x = baseCam.x + px * 1.1 + depth * 0.4;
        camera.position.y = baseCam.y - py * 0.7 + depth * 0.25;
        camera.position.z = baseCam.z - depth;
        camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z - depth * 0.5);

        // far stars drift slower than near ones — depth cue
        if (starLayers[0]) starLayers[0].position.y = scrollY * 0.002;
        if (starLayers[1]) starLayers[1].position.y = scrollY * 0.005;

        renderer.render(scene, camera);
    }
    animate();
})();
