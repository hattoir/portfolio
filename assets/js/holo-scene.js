/* ==========================================================================
   HOLO-SCENE — holographic workbench hero (index.html)
   A wireframe of the Auto-Trash Navigator, modelled from real dimensions (mm),
   rotates above a projector pad. Part labels follow their 3D anchors and are
   tied back with SVG leader lines. Drag = rotate, wheel = zoom, mouse = parallax.
   Requires: three.min.js (global THREE). Falls back to a static SVG without WebGL.
   ========================================================================== */
(function () {
    'use strict';

    var mount = document.getElementById('dock-canvas');
    if (!mount) return;
    var hero = mount.parentElement;

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var isMobile = (window.innerWidth || document.documentElement.clientWidth || screen.width) < 768;

    /* ============================== NAV (works without WebGL) =========== */
    var PROJECTS = [
        { title: 'ミーミルの手', tag: 'WORK 01', href: 'works.html#modal-mimir' },
        { title: '自動運転ミニカー', tag: 'WORK 02', href: 'works.html#modal-minicar' },
        { title: '活動実績', tag: 'LOG 03', href: 'activities.html' },
        { title: 'プロフィール', tag: 'ID 04', href: 'profile.html' }
    ];

    var fadeEl = document.createElement('div');
    fadeEl.style.cssText = 'position:fixed;inset:0;background:#02060a;opacity:0;pointer-events:none;transition:opacity 0.4s ease;z-index:9000;';
    document.body.appendChild(fadeEl);

    function go(href) {
        if (reduced) { window.location.href = href; return; }
        fadeEl.style.opacity = '1';
        setTimeout(function () { window.location.href = href; }, 380);
    }

    (function buildDockNav() {
        var wrap = document.getElementById('dock-nav-btns');
        if (!wrap) return;
        PROJECTS.forEach(function (pj) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'dock-nav-btn';
            b.innerHTML = '<span class="dnb-tag">' + pj.tag + '</span><span class="dnb-title">' + pj.title + '</span>';
            b.addEventListener('click', function () { go(pj.href); });
            wrap.appendChild(b);
        });
    })();

    window.addEventListener('pageshow', function (e) {
        if (!e.persisted) return;
        fadeEl.style.transition = 'none';
        fadeEl.style.opacity = '0';
        requestAnimationFrame(function () { fadeEl.style.transition = 'opacity 0.4s ease'; });
    });

    /* ============================== FALLBACK ============================ */
    function showFallback() {
        mount.classList.add('holo-fallback');
        mount.innerHTML =
            '<svg viewBox="0 0 600 440" role="img" aria-label="ロボットのワイヤーフレーム（静止画）">' +
            '<g fill="none" stroke="#63e8ff" stroke-width="1.2" opacity="0.85">' +
            '<ellipse cx="300" cy="360" rx="250" ry="58" opacity="0.35"/><ellipse cx="300" cy="360" rx="205" ry="47" opacity="0.5"/>' +
            '<ellipse cx="300" cy="360" rx="160" ry="36" opacity="0.7"/>' +
            '<path d="M150 300 L300 250 L450 300 L300 350 Z"/><path d="M150 300 v12 L300 362 L450 312 v-12"/><path d="M300 350 v12"/>' +
            '<ellipse cx="190" cy="325" rx="16" ry="26"/><ellipse cx="410" cy="325" rx="16" ry="26"/>' +
            '<ellipse cx="250" cy="275" rx="12" ry="20" opacity="0.6"/><ellipse cx="350" cy="275" rx="12" ry="20" opacity="0.6"/>' +
            '<ellipse cx="285" cy="292" rx="62" ry="20"/><path d="M223 292 v-58 M347 292 v-58"/><ellipse cx="285" cy="234" rx="62" ry="20"/>' +
            '<path d="M372 300 v-34 l18 -64 l58 -18 l20 30 l-8 40" stroke-width="1.6"/>' +
            '<circle cx="390" cy="202" r="9"/><circle cx="448" cy="184" r="8"/><path d="M452 248 l-8 26 M468 244 l2 28"/>' +
            '<path d="M200 285 v-86"/><ellipse cx="200" cy="192" rx="30" ry="9"/><ellipse cx="200" cy="182" rx="26" ry="8"/>' +
            '<rect x="420" y="228" width="44" height="14" transform="rotate(25 442 235)"/>' +
            '</g></svg>' +
            '<div class="holo-fallback-note">STATIC VIEW // WebGL UNAVAILABLE</div>';
    }

    if (typeof THREE === 'undefined' || /[?&]nogl\b/.test(window.location.search)) { showFallback(); return; }

    var renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
        if (!renderer.getContext()) throw new Error('no gl');
    } catch (e) { showFallback(); return; }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.localClippingEnabled = true;
    mount.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, (mount.clientWidth / mount.clientHeight) || 1, 0.1, 200);

    /* ============================== LINE TOOLKIT ======================== */
    // Everything is authored in millimetres, robot frame z-up; S converts to scene units.
    var V = THREE.Vector3;
    var S = 0.01;
    var X = new V(1, 0, 0), Y = new V(0, 1, 0), Z = new V(0, 0, 1);

    function basis(ax) {
        var t = Math.abs(ax.z) < 0.9 ? new V(0, 0, 1) : new V(1, 0, 0);
        var u = new V().crossVectors(ax, t).normalize();
        var v = new V().crossVectors(ax, u).normalize();
        return [u, v];
    }

    function Seg() { this.a = []; }
    Seg.prototype.l = function (x1, y1, z1, x2, y2, z2) { this.a.push(x1, y1, z1, x2, y2, z2); return this; };
    Seg.prototype.lv = function (p, q) { return this.l(p.x, p.y, p.z, q.x, q.y, q.z); };
    Seg.prototype.poly = function (pts, closed) {
        var n = pts.length, last = closed ? n : n - 1;
        for (var i = 0; i < last; i++) {
            var p = pts[i], q = pts[(i + 1) % n];
            this.l(p[0], p[1], p[2], q[0], q[1], q[2]);
        }
        return this;
    };
    Seg.prototype.ring = function (c, u, v, r, n) {
        var pts = [];
        for (var i = 0; i < n; i++) {
            var a = i / n * Math.PI * 2, ca = Math.cos(a) * r, sa = Math.sin(a) * r;
            pts.push([c.x + u.x * ca + v.x * sa, c.y + u.y * ca + v.y * sa, c.z + u.z * ca + v.z * sa]);
        }
        return this.poly(pts, true);
    };
    Seg.prototype.ringAx = function (c, ax, r, n) { var b = basis(ax); return this.ring(c, b[0], b[1], r, n); };
    Seg.prototype.box = function (cx, cy, cz, sx, sy, sz) {
        var x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
        this.poly([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], true);
        this.poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], true);
        return this.l(x0, y0, z0, x0, y0, z1).l(x1, y0, z0, x1, y0, z1).l(x1, y1, z0, x1, y1, z1).l(x0, y1, z0, x0, y1, z1);
    };
    Seg.prototype.cyl = function (c, ax, r, h, n, vert) {
        var b = basis(ax), u = b[0], v = b[1];
        var c0 = c.clone().addScaledVector(ax, -h / 2), c1 = c.clone().addScaledVector(ax, h / 2);
        this.ring(c0, u, v, r, n).ring(c1, u, v, r, n);
        for (var i = 0; i < vert; i++) {
            var a = i / vert * Math.PI * 2;
            var o = u.clone().multiplyScalar(Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r);
            this.lv(c0.clone().add(o), c1.clone().add(o));
        }
        return this;
    };

    /* ============================== MATERIALS =========================== */
    // Pseudo-bloom: each part is drawn once thin & bright, then again as faint
    // offset copies (WebGL lines are always 1px, so "thick" = several offsets).
    var clipPlane = new THREE.Plane(new V(0, -1, 0), 0);    // materialise-from-below sweep
    var CLIP = [clipPlane];
    function lineMat(color, op) {
        return new THREE.LineBasicMaterial({
            color: color, transparent: true, opacity: op,
            blending: THREE.AdditiveBlending, depthWrite: false, clippingPlanes: CLIP
        });
    }
    var M = {
        bright: lineMat(0xa8f5ff, 0.82),
        halo: lineMat(0x63e8ff, isMobile ? 0.2 : 0.13),
        faint: lineMat(0x63e8ff, 0.26),
        amber: lineMat(0xffc47e, 0.95),
        amberHalo: lineMat(0xffb14d, 0.2)
    };
    var HALO_OFF = isMobile
        ? [[0.007, 0.007, 0], [-0.007, -0.007, 0]]
        : [[0.008, 0, 0], [-0.008, 0, 0], [0, 0.008, 0], [0, -0.008, 0]];

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
            HALO_OFF.forEach(function (o) {
                var h = new THREE.LineSegments(geo, mh);
                h.position.set(o[0], o[1], o[2]);
                g.add(h);
            });
        }
        return g;
    }
    function pos(obj, x, y, z) { obj.position.set(x * S, y * S, z * S); return obj; }
    function group(parent, x, y, z) { var g = new THREE.Group(); pos(g, x, y, z); parent.add(g); return g; }

    /* ============================== ROBOT (mm, z-up) ==================== */
    var stage = new THREE.Group();          // yaw from drag / auto-rotate
    scene.add(stage);
    var robot = new THREE.Group();
    robot.rotation.x = -Math.PI / 2;        // robot z-up  ->  scene y-up
    robot.position.x = -0.7;                // arm reaches forward; re-centre the silhouette
    stage.add(robot);

    /* --- chassis: 400 x 400 x 20 main plate (top z=60) with wheel notches --- */
    var ch = new Seg();
    var OUTLINE = [[-200, -200], [-170, -200], [-170, -158], [-70, -158], [-70, -200], [70, -200], [70, -158], [170, -158],
        [170, -200], [200, -200], [200, 200], [170, 200], [170, 158], [70, 158], [70, 200], [-70, 200], [-70, 158],
        [-170, 158], [-170, 200], [-200, 200]];
    [60, 40].forEach(function (z) { ch.poly(OUTLINE.map(function (p) { return [p[0], p[1], z]; }), true); });
    OUTLINE.forEach(function (p) { ch.l(p[0], p[1], 40, p[0], p[1], 60); });
    // lightening holes (both faces on desktop)
    [[160, -130], [160, 80], [160, 130], [-160, -130], [-160, -80], [-160, 80], [-160, 130],
        [-110, 135], [-50, 135], [10, 135], [-110, -135], [-50, -135], [10, -135]].forEach(function (h) {
        ch.ringAx(new V(h[0], h[1], 60), Z, 14, isMobile ? 10 : 16);
        if (!isMobile) ch.ringAx(new V(h[0], h[1], 40), Z, 14, 16);
    });
    // frame girders under the plate + lower deck
    ch.box(0, 90, 30, 380, 20, 20).box(0, -90, 30, 380, 20, 20);
    ch.box(60, 0, 30, 20, 160, 20).box(-60, 0, 30, 20, 160, 20);
    ch.box(0, 0, 17, 280, 190, 6);
    robot.add(part(ch));

    var plateFill = new THREE.Mesh(new THREE.BoxGeometry(400 * S, 400 * S, 20 * S), new THREE.MeshBasicMaterial({
        color: 0x63e8ff, transparent: true, opacity: 0.035, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide, clippingPlanes: CLIP
    }));
    pos(plateFill, 0, 0, 50);
    robot.add(plateFill);

    /* --- mecanum wheels: Ø80, 9 rollers at 45°, 6 spokes, hub --- */
    function buildWheel(hand) {
        var s = new Seg();
        var rn = isMobile ? 6 : 10;
        s.cyl(new V(0, 0, 0), Y, 10, 34, isMobile ? 8 : 12, 4);                      // hub
        [-16, 16].forEach(function (y) {
            s.ring(new V(0, y, 0), X, Z, 28, isMobile ? 14 : 24);                    // side plates
            for (var k = 0; k < 6; k++) {                                            // 6 spokes
                var a = k * Math.PI / 3;
                s.l(Math.cos(a) * 10, y, Math.sin(a) * 10, Math.cos(a) * 28, y, Math.sin(a) * 28);
            }
        });
        var PROF = [[-15, 4.5], [-7.5, 7.5], [0, 9], [7.5, 7.5], [15, 4.5]];         // barrel profile (t, r)
        for (var k = 0; k < 9; k++) {
            var a = k * 2 * Math.PI / 9;
            var er = new V(Math.cos(a), 0, Math.sin(a));
            var et = new V(-Math.sin(a), 0, Math.cos(a));
            // roller axis: 45° between the rim tangent and the wheel axle
            var d = et.clone().multiplyScalar(Math.SQRT1_2).add(new V(0, hand * Math.SQRT1_2, 0));
            var u = er, v = new V().crossVectors(d, u).normalize();
            var c = er.clone().multiplyScalar(31);
            var centres = PROF.map(function (p) { return c.clone().addScaledVector(d, p[0]); });
            PROF.forEach(function (p, i) { if (!isMobile || i % 2 === 0) s.ring(centres[i], u, v, p[1], rn); });
            for (var m = 0; m < 4; m++) {
                var ang = m * Math.PI / 2 + Math.PI / 4;
                var o = u.clone().multiplyScalar(Math.cos(ang)).addScaledVector(v, Math.sin(ang));
                for (var i = 0; i < PROF.length - 1; i++) {
                    s.lv(centres[i].clone().addScaledVector(o, PROF[i][1]), centres[i + 1].clone().addScaledVector(o, PROF[i + 1][1]));
                }
            }
        }
        return s;
    }
    var wheels = [];
    [[120, 180], [120, -180], [-120, 180], [-120, -180]].forEach(function (w) {
        var hand = (w[0] * w[1] > 0) ? 1 : -1;                       // X-pattern roller handedness
        var wg = part(buildWheel(hand));
        pos(wg, w[0], w[1], 40);
        robot.add(wg);
        wheels.push(wg);
        // drive: bracket, axle stub, gear-motor below the deck
        var sy = w[1] > 0 ? 1 : -1;
        var dm = new Seg();
        dm.box(w[0], w[1] - sy * 24, 33, 40, 4, 14);
        dm.l(w[0], w[1] - sy * 24, 40, w[0], w[1] - sy * 17, 40);
        dm.cyl(new V(w[0], w[1] - sy * 57, 24), Y, 12, 54, isMobile ? 8 : 12, 4);
        robot.add(part(dm));
    });

    /* --- 6-axis arm on a Ø100 base flange (4 bolt holes at 45°) --- */
    var AX = 140, AY = -40;
    var armBase = group(robot, AX, AY, 60);
    var sbase = new Seg();
    [0, 4].forEach(function (z) {
        sbase.ringAx(new V(0, 0, z), Z, 50, 32);
        for (var k = 0; k < 4; k++) {
            var a = Math.PI / 4 + k * Math.PI / 2;
            sbase.ringAx(new V(Math.cos(a) * 40, Math.sin(a) * 40, z), Z, 4, 8);
        }
    });
    sbase.cyl(new V(0, 0, 23.75), Z, 36, 39.5, 24, 8);
    armBase.add(part(sbase));

    // joint stack from the plate top: +43.5 / +64.45 / +100 / +97.55 / +42.45 / +68.55 mm
    var J1 = group(armBase, 0, 0, 43.5);   // yaw
    var J2 = group(J1, 0, 0, 64.45);       // shoulder pitch
    var J3 = group(J2, 0, 0, 100);         // elbow pitch
    var J4 = group(J3, 0, 0, 97.55);       // wrist roll
    var J5 = group(J4, 0, 0, 42.45);       // wrist pitch
    var J6 = group(J5, 0, 0, 68.55);       // tool roll

    var s1 = new Seg();                    // turntable ring, side brackets, shoulder servo
    s1.ringAx(new V(0, 0, 0), Z, 40, 28).ringAx(new V(0, 0, 3), Z, 32, 28);
    s1.box(0, 21, 32, 40, 4, 64).box(0, -21, 32, 40, 4, 64);
    s1.box(0, 0, 54, 40, 25, 36);
    J1.add(part(s1));

    var s2r = new Seg();                   // shoulder joint rings — amber: torque-critical joint
    [-24, 24].forEach(function (y) { s2r.ring(new V(0, y, 0), X, Z, 22, 24).ring(new V(0, y, 0), X, Z, 8, 12); });
    J2.add(part(s2r, 'amber'));
    var s2 = new Seg();                    // upper arm: twin side plates + ribs
    s2.box(0, 15, 50, 14, 4, 100).box(0, -15, 50, 14, 4, 100);
    [25, 75].forEach(function (z) { s2.l(-7, 15, z, -7, -15, z).l(7, 15, z, 7, -15, z); });
    J2.add(part(s2));

    var s3 = new Seg();                    // elbow: rings + servo + truss forearm
    [-20, 20].forEach(function (y) { s3.ring(new V(0, y, 0), X, Z, 20, 22); });
    s3.box(0, 0, 4, 34, 26, 44);
    s3.box(0, 0, 58, 22, 18, 78);
    for (var zi = 0; zi < 6; zi++) {
        var za = 19 + zi * 13, zb = za + 13;
        s3.l(-11, 9, za, 11, 9, zb).l(-11, -9, zb, 11, -9, za);
    }
    J3.add(part(s3));

    var s4 = new Seg();
    s4.ringAx(new V(0, 0, 0), Z, 17, 20).ringAx(new V(0, 0, 4), Z, 17, 20);
    s4.box(0, 0, 24, 26, 30, 36);
    J4.add(part(s4));

    var s5 = new Seg();
    [-15, 15].forEach(function (y) { s5.ring(new V(0, y, 0), X, Z, 16, 20); });
    s5.box(0, 0, 34, 20, 24, 56);
    J5.add(part(s5));

    var s6 = new Seg();                    // tool roll + gripper palm
    s6.ringAx(new V(0, 0, 0), Z, 15, 20).ringAx(new V(0, 0, 3), Z, 15, 20);
    s6.box(0, 0, 10, 24, 24, 18);
    s6.box(0, 0, 24, 54, 22, 10);
    J6.add(part(s6));

    var fingers = [];
    [1, -1].forEach(function (side) {       // two fingers, parallel jaw
        var fgp = group(J6, side * 14, 0, 29);
        var sf = new Seg();
        sf.box(0, 0, 24, 6, 16, 48);
        sf.l(-side * 3, -8, 44, -side * 7, -8, 50).l(-side * 3, 8, 44, -side * 7, 8, 50).l(-side * 7, -8, 50, -side * 7, 8, 50);
        fgp.add(part(sf));
        fingers.push({ g: fgp, side: side });
    });

    /* --- LiDAR: mast + body + spinning head at z=210 --- */
    var LX = -160, LY = 13;
    var sl = new Seg();
    sl.ringAx(new V(LX, LY, 61), Z, 20, 16);
    sl.cyl(new V(LX, LY, 122.5), Z, 8, 125, 10, 4);
    sl.cyl(new V(LX, LY, 194), Z, 35, 18, 28, 8);
    robot.add(part(sl));
    var lidarHead = group(robot, LX, LY, 210);
    var shd = new Seg();
    shd.cyl(new V(0, 0, 0), Z, 30, 14, 28, 6);
    shd.box(31, 0, 0, 5, 16, 9);
    lidarHead.add(part(shd));
    var sray = new Seg();
    sray.l(34, 0, 0, 520, 0, 0);
    lidarHead.add(part(sray, 'faint'));
    var sring = new Seg();
    sring.ringAx(new V(LX, LY, 210), Z, 520, isMobile ? 48 : 96);
    var scanRing = part(sring, 'faint');
    robot.add(scanRing);

    /* --- RGB-D camera at (189, 135, 180), pitched 25° down, with view frustum --- */
    var CX = 189, CY = 135, CZ = 180;
    var smast = new Seg();
    smast.box(CX - 6, CY, 62, 24, 24, 4);
    smast.cyl(new V(CX - 6, CY, 114), Z, 6, 104, 8, 4);
    robot.add(part(smast));
    var camG = group(robot, CX, CY, CZ);
    camG.rotation.y = 25 * Math.PI / 180;
    var scam = new Seg();
    scam.box(0, 0, 0, 18, 91, 28);
    [-37, 0, 37].forEach(function (y, i) { scam.ringAx(new V(9, y, 0), X, i === 1 ? 5 : 6.5, 14); });
    camG.add(part(scam));
    var FAR = 230, HY = Math.tan(36.5 * Math.PI / 180) * FAR, HZ = Math.tan(29 * Math.PI / 180) * FAR;
    var sfr = new Seg();
    var CORN = [[FAR, HY, HZ], [FAR, -HY, HZ], [FAR, -HY, -HZ], [FAR, HY, -HZ]];
    CORN.forEach(function (p) { sfr.l(9, 0, 0, p[0], p[1], p[2]); });
    sfr.poly(CORN, true);
    camG.add(part(sfr, 'faint'));
    var frustSweep = new THREE.Group();     // a depth slice travelling down the frustum
    camG.add(frustSweep);
    var ssw = new Seg();
    ssw.poly(CORN, true);
    frustSweep.add(part(ssw, 'faint'));

    /* --- dust box: Ø200 at x=-20, rim at z=160 --- */
    var DXB = -20;
    var sdb = new Seg();
    [60, 110, 160].forEach(function (z) { sdb.ringAx(new V(DXB, 0, z), Z, 100, isMobile ? 32 : 48); });
    sdb.ringAx(new V(DXB, 0, 160), Z, 94, isMobile ? 32 : 48);
    for (var dk = 0; dk < 16; dk++) {
        var da = dk / 16 * Math.PI * 2;
        sdb.l(DXB + Math.cos(da) * 100, Math.sin(da) * 100, 60, DXB + Math.cos(da) * 100, Math.sin(da) * 100, 160);
    }
    robot.add(part(sdb));

    /* ============================== PROJECTOR PAD ======================= */
    function canvasTex(w, h, paint) {
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        paint(c.getContext('2d'), w, h);
        return new THREE.CanvasTexture(c);
    }
    function addMat(op, extra) {
        var o = { color: 0x63e8ff, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false };
        for (var k in extra) o[k] = extra[k];
        return o;
    }
    function circlePts(r, n) {
        var pts = [];
        for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; pts.push(new V(Math.cos(a) * r, 0, Math.sin(a) * r)); }
        return new THREE.BufferGeometry().setFromPoints(pts);
    }

    var pad = new THREE.Group();            // stays fixed while the robot turns
    scene.add(pad);

    var ringMats = [];
    [2.5, 2.95, 3.4, 3.9].forEach(function (r) {
        var m = new THREE.LineBasicMaterial(addMat(0.3));
        pad.add(new THREE.LineLoop(circlePts(r, 128), m));
        ringMats.push(m);
    });

    var tickArr = [];
    for (var tk = 0; tk < 120; tk++) {
        var ta = tk / 120 * Math.PI * 2;
        var tl = tk % 10 === 0 ? 0.24 : (tk % 5 === 0 ? 0.13 : 0.06);
        tickArr.push(Math.cos(ta) * 4.05, 0, Math.sin(ta) * 4.05, Math.cos(ta) * (4.05 + tl), 0, Math.sin(ta) * (4.05 + tl));
    }
    var tickGeo = new THREE.BufferGeometry();
    tickGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tickArr), 3));
    var ticks = new THREE.LineSegments(tickGeo, new THREE.LineBasicMaterial(addMat(0.42)));
    pad.add(ticks);

    var disc = new THREE.Mesh(new THREE.CircleGeometry(4.4, 64), new THREE.MeshBasicMaterial(addMat(0.9, {
        color: 0xffffff,
        map: canvasTex(256, 256, function (ctx) {
            var g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
            g.addColorStop(0, 'rgba(99,232,255,0.28)');
            g.addColorStop(0.6, 'rgba(99,232,255,0.10)');
            g.addColorStop(0.93, 'rgba(99,232,255,0.16)');
            g.addColorStop(1, 'rgba(99,232,255,0)');
            ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
        })
    })));
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.01;
    pad.add(disc);

    var pulseMat = new THREE.LineBasicMaterial(addMat(0.4, { color: 0xb8f6ff }));
    var pulse = new THREE.LineLoop(circlePts(1, 128), pulseMat);
    pad.add(pulse);

    // light column: a camera-facing sprite with soft sides (a cylinder showed hard silhouette edges)
    var column = new THREE.Sprite(new THREE.SpriteMaterial(addMat(0.2, {
        map: canvasTex(128, 128, function (ctx) {
            var img = ctx.createImageData(128, 128);
            for (var y = 0; y < 128; y++) {
                var vy = Math.pow(y / 127, 1.8);                                   // bright at the pad
                for (var x = 0; x < 128; x++) {
                    var hx = 1 - Math.pow(Math.abs(x / 63.5 - 1), 2.4);             // soft left/right falloff
                    var o = (y * 128 + x) * 4;
                    img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
                    img.data[o + 3] = Math.round(255 * Math.max(0, hx) * vy);
                }
            }
            ctx.putImageData(img, 0, 0);
        })
    })));
    column.scale.set(7.6, 5.6, 1);
    column.position.y = 2.8;
    pad.add(column);

    /* ============================== DUST PARTICLES ====================== */
    var PN = isMobile ? 140 : 420;
    var dArr = new Float32Array(PN * 3), dSpd = new Float32Array(PN);
    for (var di = 0; di < PN; di++) {
        var rr = Math.sqrt(Math.random()) * 5.2, aa = Math.random() * Math.PI * 2;
        dArr[di * 3] = Math.cos(aa) * rr;
        dArr[di * 3 + 1] = Math.random() * 6;
        dArr[di * 3 + 2] = Math.sin(aa) * rr;
        dSpd[di] = 0.05 + Math.random() * 0.18;
    }
    var dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute('position', new THREE.BufferAttribute(dArr, 3));
    var dust = new THREE.Points(dGeo, new THREE.PointsMaterial(addMat(0.55, {
        color: 0xb8f6ff, size: isMobile ? 0.08 : 0.055,
        map: canvasTex(64, 64, function (ctx) {
            var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
            g.addColorStop(0, 'rgba(255,255,255,1)');
            g.addColorStop(0.3, 'rgba(180,245,255,0.45)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
        })
    })));
    scene.add(dust);

    /* ============================== PART LABELS ========================= */
    // anchors are in the owning object's local frame (mm); m = also shown on mobile
    var LABELS = [
        { obj: lidarHead, p: [0, 0, 10], name: 'LiDAR', val: 'SCAN z=210 mm · 9.1 Hz', m: 1 },
        { obj: J2, p: [0, 26, 0], name: 'SHOULDER J2', val: 'τ 1.32 N·m / 70 %', warn: 1, m: 1 },
        { obj: J6, p: [0, 0, 80], name: 'GRIPPER', val: '2-FINGER · REACH 0.45 m' },
        { obj: camG, p: [9, 0, 14], name: 'RGB-D CAM', val: 'TILT −25° · z=180 mm' },
        { obj: robot, p: [DXB, -100, 160], name: 'DUST BOX', val: 'Ø200 mm · RIM z=160 mm' },
        { obj: wheels[1], p: [0, -18, 0], name: 'MECANUM', val: 'Ø80 mm · 9 ROLLERS @45°' },
        { obj: armBase, p: [35, -35, 4], name: 'BASE FLANGE', val: 'Ø100 mm · 4× BOLT @45°' },
        { obj: robot, p: [-200, -200, 60], name: 'CHASSIS', val: '400 × 400 × 20 mm' }
    ];
    var compact = isMobile;                 // narrow viewport: only labels flagged m are shown (see layout)

    var SVGNS = 'http://www.w3.org/2000/svg';
    var layer = document.createElement('div');
    layer.className = 'holo-labels';
    layer.setAttribute('aria-hidden', 'true');
    var svg = document.createElementNS(SVGNS, 'svg');
    layer.appendChild(svg);
    hero.insertBefore(layer, mount.nextSibling);

    LABELS.forEach(function (L) {
        L.local = new V(L.p[0] * S, L.p[1] * S, L.p[2] * S);
        L.line = document.createElementNS(SVGNS, 'polyline');
        L.dot = document.createElementNS(SVGNS, 'circle');
        L.dot.setAttribute('r', '2.5');
        if (L.warn) { L.line.setAttribute('class', 'warn'); L.dot.setAttribute('class', 'warn'); }
        svg.appendChild(L.line);
        svg.appendChild(L.dot);
        L.el = document.createElement('div');
        L.el.className = 'holo-label' + (L.warn ? ' is-warn' : '');
        L.el.innerHTML = '<span class="hl-name">' + L.name + '</span><span class="hl-val">' + L.val + '</span>';
        layer.appendChild(L.el);
    });

    // right edge of the hero text block (desktop): left-hand callouts are kept clear of it
    var textRight = 0;
    function measureText() {
        textRight = 0;
        if (mount.clientWidth < 900) return;
        var hb = hero.getBoundingClientRect();
        hero.querySelectorAll('.hero-title, .hero-subtitle, .system-status, .hero-cta').forEach(function (n) {
            var r = document.createRange();
            r.selectNodeContents(n);
            textRight = Math.max(textRight, r.getBoundingClientRect().right - hb.left);
        });
    }
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { measureText(); LABELS.forEach(function (L) { L.w = 0; }); });
    }

    var tmpV = new V();
    function toScreen(v, w, h) { v.project(camera); return [(v.x * 0.5 + 0.5) * w, (-v.y * 0.5 + 0.5) * h]; }

    function updateLabels() {
        var w = mount.clientWidth, h = mount.clientHeight;
        if (!w || !h) return;
        var ctr = toScreen(tmpV.set(0, 1.5, 0), w, h);
        // callout columns sit at the projected body radius (2.9 units), independent of rotation
        var colOff = Math.abs(toScreen(tmpV.set(2.9, 1.5, 0), w, h)[0] - ctr[0]);
        var shown = LABELS.filter(function (L) { return !L.off; });
        shown.forEach(function (L) {
            tmpV.copy(L.local);
            L.obj.localToWorld(tmpV);
            var s = toScreen(tmpV, w, h);
            L.sx = s[0]; L.sy = s[1];
            L.side = L.sx >= ctr[0] ? 1 : -1;
        });
        [1, -1].forEach(function (side) {                       // stack each column without overlaps
            var prev = -1e9;
            shown.filter(function (L) { return L.side === side; })
                .sort(function (a, b) { return a.sy - b.sy; })
                .forEach(function (L) { L.ly = Math.max(L.sy - 16, prev + 42); prev = L.ly; });
        });
        shown.forEach(function (L) {
            var col = ctr[0] + L.side * colOff;
            var tx = L.side > 0 ? Math.max(col, L.sx + 26) : Math.min(col, L.sx - 26);
            if (!L.w || frame % 90 === 0) L.w = L.el.offsetWidth;       // re-measured: web fonts change widths
            var edge = w >= 900 ? 44 : 14;                              // desktop: clear the vertical side label
            tx = L.side > 0 ? Math.min(tx, w - edge - L.w) : Math.max(tx, edge + L.w);
            // a left callout that would reach the name / subtitle is nudged (≤ 48 px) toward the model;
            // if that is not enough it fades out rather than being pushed onto the model
            var blocked = false;
            if (L.side < 0) {
                var need = textRight + 16 + L.w + 6;
                if (tx < need) { if (need - tx <= 48) tx = need; else blocked = true; }
            }
            var op = blocked ? '0' : '1';
            if (L.el.style.opacity !== op) { L.el.style.opacity = op; L.line.style.opacity = op; L.dot.style.opacity = op; }
            var kx = tx - L.side * 14;
            L.line.setAttribute('points', L.sx.toFixed(1) + ',' + L.sy.toFixed(1) + ' ' + kx.toFixed(1) + ',' + L.ly.toFixed(1) + ' ' + tx.toFixed(1) + ',' + L.ly.toFixed(1));
            L.dot.setAttribute('cx', L.sx.toFixed(1));
            L.dot.setAttribute('cy', L.sy.toFixed(1));
            L.el.classList.toggle('is-left', L.side < 0);
            L.el.style.transform = 'translate(' + (tx + L.side * 6).toFixed(1) + 'px,' + L.ly.toFixed(1) + 'px) translate(' + (L.side > 0 ? '0' : '-100%') + ',-50%)';
        });
    }

    /* ============================== INTERACTION ========================= */
    var el = renderer.domElement;
    el.style.touchAction = 'pan-y';          // vertical swipes still scroll the page on touch
    el.style.cursor = 'grab';

    var BASE_DIST = isMobile ? 30 : 17.5, DIST_MIN = 8, DIST_MAX = 36;
    var yaw = -0.6, yawV = 0, pitch = 0.34, pitchT = 0.34, dist = BASE_DIST, distT = BASE_DIST;
    var px = 0, py = 0, pxT = 0, pyT = 0, idleT = 0;
    var dragging = false, lastX = 0, lastY = 0;
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    el.addEventListener('pointerdown', function (e) {
        dragging = true; lastX = e.clientX; lastY = e.clientY;
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        el.style.cursor = 'grabbing';
    });
    el.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var dx = e.clientX - lastX, dy = e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        yaw += dx * 0.006; yawV = dx * 0.006;
        if (e.pointerType === 'mouse') pitchT = clamp(pitchT + dy * 0.003, 0.1, 0.8);
        idleT = 0;
    });
    function endDrag() { dragging = false; el.style.cursor = 'grab'; }
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);

    // wheel zooms; once a zoom limit is reached the event is released so the page scrolls on
    el.addEventListener('wheel', function (e) {
        var next = clamp(distT * (1 + e.deltaY * 0.0012), DIST_MIN, DIST_MAX);
        if (Math.abs(next - distT) < 1e-3) return;
        e.preventDefault();
        distT = next;
    }, { passive: false });

    window.addEventListener('mousemove', function (e) {
        pxT = (e.clientX / window.innerWidth - 0.5) * 2;
        pyT = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    var laidW = 0, laidH = 0;
    function layout() {
        var w = mount.clientWidth, h = mount.clientHeight;
        if (!w || !h) return;
        laidW = w; laidH = h;
        camera.aspect = w / h;
        compact = w < 768;
        LABELS.forEach(function (L) {
            L.off = compact && !L.m;
            L.el.style.display = L.line.style.display = L.dot.style.display = L.off ? 'none' : '';
        });
        // push the model right of the title on desktop, up above the text on mobile
        if (w >= 900) camera.setViewOffset(w, h, -w * 0.2, h * 0.02, w, h);
        else camera.setViewOffset(w, h, 0, h * (w < 600 ? 0.29 : 0.21), w, h);
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        measureText();
    }
    layout();
    window.addEventListener('resize', layout);

    /* ============================== LOOP ================================ */
    var yawEl = document.querySelector('[data-holo="yaw"]');
    var zoomEl = document.querySelector('[data-holo="zoom"]');
    var clock = new THREE.Clock();
    var build = reduced ? 1 : 0;
    // start unconditionally (rAF already idles in hidden tabs); visibilitychange only pauses/resumes
    var pageVisible = true, inView = true, running = false, frame = 0;

    function setRunning() {
        var should = pageVisible && inView;
        if (should && !running) { running = true; clock.getDelta(); animate(); }
        else if (!should) running = false;
    }
    document.addEventListener('visibilitychange', function () { pageVisible = !document.hidden; setRunning(); });
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { inView = en[0].isIntersecting; setRunning(); }).observe(mount);
    }

    function animate() {
        if (!running) return;
        requestAnimationFrame(animate);
        var dt = Math.min(clock.getDelta(), 0.05);
        var t = clock.elapsedTime;
        if (mount.clientWidth !== laidW || mount.clientHeight !== laidH) layout();   // e.g. loaded while hidden

        // materialise: a cutting plane rises from the projector
        if (build < 1) {
            // wall-clock based, so a throttled / slow device still finishes the reveal
            build = Math.min(1, t / 2.4);
            if (build >= 1) layer.classList.add('is-on');
        }
        clipPlane.constant = build >= 1 ? 100 : -0.1 + build * 6.2;

        idleT += dt;
        if (!dragging) {
            yawV *= 0.93; yaw += yawV;
            if (idleT > 2.5 && !reduced) yaw += dt * 0.16;
        }
        stage.rotation.y = yaw;
        pitch += (pitchT - pitch) * 0.08;
        dist += (distT - dist) * 0.1;
        px += (pxT - px) * 0.04;
        py += (pyT - py) * 0.04;
        var ty = 1.55;
        camera.position.set(px * 0.45, ty + Math.sin(pitch) * dist - py * 0.3, Math.cos(pitch) * dist);
        camera.lookAt(0, ty, 0);

        if (!reduced) {
            J1.rotation.z = 0.25 * Math.sin(t * 0.3);
            J2.rotation.y = 0.55 + 0.18 * Math.sin(t * 0.5);
            J3.rotation.y = 1.15 + 0.22 * Math.sin(t * 0.5 + 0.8);
            J4.rotation.z = 0.4 * Math.sin(t * 0.35);
            J5.rotation.y = 0.85 + 0.2 * Math.sin(t * 0.5 + 1.6);
            J6.rotation.z = 0.6 * Math.sin(t * 0.4);
            var g = 14 + 8 * Math.sin(t * 1.1);
            fingers.forEach(function (f) { f.g.position.x = f.side * g * S; });
            wheels.forEach(function (w) { w.rotation.y = t * 1.2; });
            lidarHead.rotation.z = t * 3.2;
            var fp = (t * 0.45) % 1;
            frustSweep.scale.setScalar(Math.max(0.02, fp));
            ringMats.forEach(function (m, i) { m.opacity = 0.12 + 0.3 * Math.max(0, Math.sin(t * 1.6 - i * 0.7)); });
            var pp = (t * 0.32) % 1;
            pulse.scale.setScalar(0.5 + pp * 3.8);
            pulseMat.opacity = (1 - pp) * 0.45;
            ticks.rotation.y = -t * 0.05;
            var da = dGeo.attributes.position.array;
            for (var i = 0; i < PN; i++) {
                da[i * 3 + 1] += dSpd[i] * dt;
                if (da[i * 3 + 1] > 6) da[i * 3 + 1] = 0;
            }
            dGeo.attributes.position.needsUpdate = true;
        } else {
            // static but posed
            J2.rotation.y = 0.55; J3.rotation.y = 1.15; J5.rotation.y = 0.85;
            pulse.visible = false;
        }

        if (frame % 6 === 0) {
            var deg = ((yaw * 180 / Math.PI) % 360 + 360) % 360;
            if (yawEl) yawEl.textContent = 'YAW   ' + ('     ' + deg.toFixed(1)).slice(-5) + ' °';
            if (zoomEl) zoomEl.textContent = 'SCALE ' + (BASE_DIST / dist).toFixed(2) + ' ×';
        }
        frame++;

        renderer.render(scene, camera);
        updateLabels();
    }
    setRunning();

    window.__holoStats = { lineSegments: lineTotal, particles: PN, labels: LABELS.length, mobile: isMobile };})();
