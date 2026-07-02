/* ==========================================================================
   COCKPIT-SCENE v3 — approaching the Moon (index.html)
   The visitor pilots a ship closing in on the Moon. Holo destination panels
   float outside the canopy; the active one is lock-on targeted. Selecting a
   destination launches a warp fly-through. Cockpit frame is an HTML overlay.
   Requires: three.min.js (global THREE)
   ========================================================================== */
(function () {
    'use strict';

    if (typeof THREE === 'undefined') return;

    var mount = document.getElementById('dock-canvas');
    if (!mount) return;

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) { return; }

    var isMobile = window.innerWidth < 768;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    var BASE_FOV = 55;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(BASE_FOV, mount.clientWidth / mount.clientHeight, 0.1, 600);
    var CAM_HOME = new THREE.Vector3(0, 2.2, isMobile ? 17 : 14);
    camera.position.copy(CAM_HOME);
    scene.add(camera);

    /* ============================== LIGHTS ============================== */
    scene.add(new THREE.AmbientLight(0x39415e, 1.0));
    var sun = new THREE.DirectionalLight(0xfff6e8, 1.5);
    sun.position.set(-30, 40, 15);
    scene.add(sun);
    var cyanFill = new THREE.PointLight(0x00d2ff, 0.7, 50);
    cyanFill.position.set(0, 6, 8);
    scene.add(cyanFill);

    /* ============================== WORLD =============================== */
    var world = new THREE.Group();
    scene.add(world);

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

    /* --- stars --- */
    (function addStars() {
        var count = isMobile ? 600 : 1400;
        var geo = new THREE.BufferGeometry();
        var pos = new Float32Array(count * 3);
        for (var i = 0; i < count; i++) {
            var r = 120 + Math.random() * 220;
            var theta = Math.random() * Math.PI * 2;
            var phi = Math.acos(2 * Math.random() - 1);
            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = r * Math.cos(phi);
            pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        world.add(new THREE.Points(geo, new THREE.PointsMaterial({
            size: 1.2, map: dotTexture('rgba(255,255,255,1)', 'rgba(190,220,255,0.4)'),
            transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending
        })));
    })();

    /* ============================== THE MOON ============================ */
    var moon;
    (function addMoon() {
        var c = document.createElement('canvas');
        c.width = 1024; c.height = 512;
        var ctx = c.getContext('2d');
        var g = ctx.createLinearGradient(0, 0, 0, 512);
        g.addColorStop(0, '#b4b7c1');
        g.addColorStop(0.55, '#9da0ab');
        g.addColorStop(1, '#83868f');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 1024, 512);

        // maria (dark plains)
        for (var m = 0; m < 9; m++) {
            ctx.fillStyle = 'rgba(88, 92, 106, ' + (0.25 + Math.random() * 0.3) + ')';
            ctx.beginPath();
            ctx.ellipse(Math.random() * 1024, Math.random() * 512,
                60 + Math.random() * 130, 40 + Math.random() * 80,
                Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
        // craters
        for (var cr = 0; cr < 110; cr++) {
            var x = Math.random() * 1024, y = Math.random() * 512;
            var r = 3 + Math.random() * 20;
            ctx.fillStyle = 'rgba(66, 70, 84, ' + (0.25 + Math.random() * 0.35) + ')';
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(205, 210, 222, ' + (0.25 + Math.random() * 0.3) + ')';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x, y, r, Math.PI * 0.9, Math.PI * 1.9);
            ctx.stroke();
        }
        var tex = new THREE.CanvasTexture(c);
        moon = new THREE.Mesh(
            new THREE.SphereGeometry(60, 64, 64),
            new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 })
        );
        moon.position.set(0, -58, -60);
        world.add(moon);
    })();

    /* --- small Earth far behind --- */
    (function addEarth() {
        var c = document.createElement('canvas');
        c.width = c.height = 128;
        var ctx = c.getContext('2d');
        var g = ctx.createLinearGradient(0, 0, 0, 128);
        g.addColorStop(0, '#2a6fc9');
        g.addColorStop(1, '#0d3b7a');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = 'rgba(80, 160, 100, 0.8)';
        for (var b = 0; b < 5; b++) {
            ctx.beginPath();
            ctx.ellipse(Math.random() * 128, Math.random() * 128, 12 + Math.random() * 18, 8 + Math.random() * 10, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        for (var w = 0; w < 12; w++) {
            ctx.beginPath();
            ctx.ellipse(Math.random() * 128, Math.random() * 128, 8 + Math.random() * 12, 2 + Math.random() * 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        var earth = new THREE.Mesh(
            new THREE.SphereGeometry(5, 32, 32),
            new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), roughness: 0.9 })
        );
        earth.position.set(26, 18, -160);
        world.add(earth);

        var ac = document.createElement('canvas');
        ac.width = ac.height = 128;
        var actx = ac.getContext('2d');
        var ag = actx.createRadialGradient(64, 64, 34, 64, 64, 64);
        ag.addColorStop(0, 'rgba(0,0,0,0)');
        ag.addColorStop(0.7, 'rgba(100,170,255,0.3)');
        ag.addColorStop(1, 'rgba(0,0,0,0)');
        actx.fillStyle = ag;
        actx.fillRect(0, 0, 128, 128);
        var glow = new THREE.Sprite(new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(ac), transparent: true,
            depthWrite: false, blending: THREE.AdditiveBlending
        }));
        glow.position.copy(earth.position);
        glow.scale.set(16, 16, 1);
        world.add(glow);
    })();

    /* --- a distant shuttle crossing the moon horizon now and then --- */
    var shuttle = new THREE.Group();
    (function buildShuttle() {
        var white = new THREE.MeshStandardMaterial({ color: 0xe8e9ee, roughness: 0.5, metalness: 0.4 });
        var body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 3.0, 10), white);
        body.rotation.z = Math.PI / 2;
        shuttle.add(body);
        var nose = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.9, 10), white);
        nose.rotation.z = -Math.PI / 2;
        nose.position.x = 1.95;
        shuttle.add(nose);
        var flame = new THREE.Mesh(
            new THREE.ConeGeometry(0.3, 1.6, 8),
            new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.85 })
        );
        flame.rotation.z = Math.PI / 2;
        flame.position.x = -2.3;
        shuttle.add(flame);
        shuttle.userData.flame = flame;
        shuttle.scale.setScalar(0.9);
        world.add(shuttle);
    })();

    /* ============================== HOLO PANELS ========================= */
    var PROJECTS = [
        { title: 'ミーミルの手', sub: '3-AXIS ROBOT ARM // AUTO SORTING', tag: 'WORK 01', href: 'works.html#modal-mimir' },
        { title: '自動運転ミニカー', sub: 'ROS 2 × END-TO-END AI DRIVING', tag: 'WORK 02', href: 'works.html#modal-minicar' },
        { title: '活動実績', sub: 'EXHIBITIONS & HACKATHONS', tag: 'LOG 03', href: 'activities.html' },
        { title: 'プロフィール', sub: 'OPERATOR IDENTIFICATION', tag: 'ID 04', href: 'profile.html' }
    ];

    function panelTexture(pj, active) {
        var c = document.createElement('canvas');
        c.width = 512; c.height = 300;
        var ctx = c.getContext('2d');
        ctx.fillStyle = active ? 'rgba(4, 30, 52, 0.88)' : 'rgba(3, 14, 28, 0.72)';
        ctx.fillRect(0, 0, 512, 300);
        ctx.fillStyle = 'rgba(0, 210, 255, 0.05)';
        for (var y = 0; y < 300; y += 6) ctx.fillRect(0, y, 512, 2);
        ctx.strokeStyle = active ? 'rgba(141, 242, 255, 0.95)' : 'rgba(0, 210, 255, 0.45)';
        ctx.lineWidth = active ? 4 : 2;
        ctx.strokeRect(6, 6, 500, 288);
        ctx.lineWidth = 5;
        ctx.strokeStyle = active ? '#8df2ff' : 'rgba(0, 210, 255, 0.8)';
        ctx.beginPath(); ctx.moveTo(6, 40); ctx.lineTo(6, 6); ctx.lineTo(40, 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(472, 294); ctx.lineTo(506, 294); ctx.lineTo(506, 260); ctx.stroke();
        ctx.font = '600 20px "JetBrains Mono", monospace';
        ctx.fillStyle = active ? '#8df2ff' : 'rgba(0, 210, 255, 0.75)';
        ctx.fillText(pj.tag, 30, 52);
        ctx.font = '700 52px "Zen Kaku Gothic Antique", sans-serif';
        ctx.fillStyle = active ? '#ffffff' : 'rgba(220, 230, 245, 0.85)';
        ctx.fillText(pj.title, 30, 150);
        ctx.font = '400 19px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(160, 175, 200, 0.9)';
        ctx.fillText(pj.sub, 30, 200);
        if (active) {
            ctx.fillStyle = 'rgba(255, 184, 107, 0.14)';
            ctx.fillRect(22, 228, 300, 44);
            ctx.strokeStyle = '#ffb86b';
            ctx.lineWidth = 2;
            ctx.strokeRect(22, 228, 300, 44);
            ctx.font = '700 22px "Zen Kaku Gothic Antique", sans-serif';
            ctx.fillStyle = '#ffb86b';
            ctx.fillText('▶ クリックで発進', 40, 258);
        } else {
            ctx.font = '600 20px "JetBrains Mono", monospace';
            ctx.fillStyle = 'rgba(255, 184, 107, 0.5)';
            ctx.fillText('ACCESS ▸', 30, 258);
        }
        return new THREE.CanvasTexture(c);
    }

    var panels = [];
    var PANEL_W = 3.6, PANEL_H = 2.1;
    var PANEL_POS = [
        [-6.2, 4.2, -8.0],
        [-2.1, 2.6, -5.5],
        [2.3, 3.4, -6.5],
        [6.4, 2.4, -8.5]
    ];

    PROJECTS.forEach(function (pj, i) {
        var texOff = panelTexture(pj, false);
        var texOn = panelTexture(pj, true);
        var mat = new THREE.MeshBasicMaterial({
            map: texOff, transparent: true, opacity: 0.9,
            side: THREE.DoubleSide, depthWrite: false
        });
        var mesh = new THREE.Mesh(new THREE.PlaneGeometry(PANEL_W, PANEL_H), mat);
        mesh.position.set(PANEL_POS[i][0], PANEL_POS[i][1], PANEL_POS[i][2]);
        mesh.userData = {
            href: pj.href, texOff: texOff, texOn: texOn,
            basePos: mesh.position.clone(), baseScale: 1, i: i
        };
        world.add(mesh);
        panels.push(mesh);
    });

    // where the locked-on panel drifts to (closer to the canopy)
    var FOCUS = new THREE.Vector3(isMobile ? 0 : 1.6, 2.8, isMobile ? 8 : 5.5);

    /* ============================== LOCK-ON RETICLE ====================== */
    var reticle = new THREE.Group();
    (function buildReticle() {
        var matY = new THREE.MeshBasicMaterial({
            color: 0xffd75e, transparent: true, opacity: 0.9,
            depthWrite: false, side: THREE.DoubleSide
        });
        // outer ring
        var ringO = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.028, 6, 48), matY);
        reticle.add(ringO);
        // dashed inner ring (segments)
        var dashed = new THREE.Group();
        for (var d = 0; d < 8; d++) {
            var seg = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.02, 4, 8, Math.PI / 9), matY);
            seg.rotation.z = d * Math.PI / 4;
            dashed.add(seg);
        }
        reticle.add(dashed);
        reticle.userData.dashed = dashed;
        // corner brackets
        [[-1, 1], [1, 1], [1, -1], [-1, -1]].forEach(function (q) {
            var h = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.02), matY);
            h.position.set(q[0] * 2.15 - q[0] * 0.25, q[1] * 2.15, 0);
            reticle.add(h);
            var v = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.02), matY);
            v.position.set(q[0] * 2.15, q[1] * 2.15 - q[1] * 0.25, 0);
            reticle.add(v);
        });
        // tick marks
        for (var tm = 0; tm < 4; tm++) {
            var tick = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.02), matY);
            var ta = tm * Math.PI / 2;
            tick.position.set(Math.cos(ta) * 1.7, Math.sin(ta) * 1.7, 0);
            tick.rotation.z = ta;
            reticle.add(tick);
        }
        world.add(reticle);
    })();

    /* ============================== TARGET HUD LABELS ==================== */
    var tagEl = document.getElementById('target-tag');
    var distEl = document.getElementById('target-dist');

    function updateTargetHUD() {
        if (!tagEl || !distEl || activeIdx < 0) return;
        var p = panels[activeIdx];
        var v = p.position.clone().project(camera);
        var w = mount.clientWidth, h = mount.clientHeight;
        var sx = (v.x * 0.5 + 0.5) * w;
        var sy = (-v.y * 0.5 + 0.5) * h;
        var onScreen = v.z < 1 && sx > 0 && sx < w && sy > 0 && sy < h;
        tagEl.style.display = onScreen && !flying ? 'flex' : 'none';
        distEl.style.display = onScreen && !flying ? 'block' : 'none';
        if (!onScreen) return;
        tagEl.style.left = (sx - 30) + 'px';
        tagEl.style.top = (sy - h * 0.16 - 46) + 'px';
        tagEl.querySelector('.tt-name').textContent = PROJECTS[activeIdx].tag;
        distEl.style.left = (sx + w * 0.09) + 'px';
        distEl.style.top = (sy - 12) + 'px';
        var dist = camera.position.distanceTo(p.position) * 42.195;
        distEl.querySelector('.td-val').textContent = dist.toFixed(2) + ' m';
    }

    /* ============================== WARP STREAKS ======================== */
    var warp = { lines: null, offs: [] };
    (function buildWarp() {
        var n = isMobile ? 70 : 150;
        var pos = new Float32Array(n * 6);
        for (var i = 0; i < n; i++) {
            var r = 1.8 + Math.random() * 9;
            var a = Math.random() * Math.PI * 2;
            var x = Math.cos(a) * r;
            var y = Math.sin(a) * r * 0.7;
            var z = -(6 + Math.random() * 40);
            var len = 3 + Math.random() * 7;
            pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z;
            pos[i * 6 + 3] = x; pos[i * 6 + 4] = y; pos[i * 6 + 5] = z - len;
            warp.offs.push({ x: x, y: y, z: z, len: len });
        }
        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        warp.lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
            color: 0x9be8ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        }));
        warp.lines.frustumCulled = false;
        warp.lines.visible = false;
        camera.add(warp.lines);
    })();

    /* ============================== ACTIVE PANEL CYCLE =================== */
    var CYCLE = 5.0;
    var activeIdx = -1;
    var navBtns = [];

    function setActive(idx) {
        if (activeIdx === idx) return;
        if (activeIdx >= 0) {
            var prev = panels[activeIdx];
            prev.material.map = prev.userData.texOff;
            prev.material.needsUpdate = true;
        }
        activeIdx = idx;
        var p = panels[idx];
        p.material.map = p.userData.texOn;
        p.material.needsUpdate = true;
        for (var nb = 0; nb < navBtns.length; nb++) {
            navBtns[nb].classList.toggle('active', nb === idx);
        }
    }

    /* --- destination selector buttons (cockpit console) --- */
    (function buildDockNav() {
        var wrap = document.getElementById('dock-nav-btns');
        if (!wrap) return;
        PROJECTS.forEach(function (pj, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'dock-nav-btn';
            b.innerHTML = '<span class="dnb-tag">' + pj.tag + '</span><span class="dnb-title">' + pj.title + '</span>';
            b.addEventListener('click', function () { startFly(panels[i]); });
            wrap.appendChild(b);
            navBtns.push(b);
        });
    })();

    /* ============================== FLY / WARP =========================== */
    var flying = null;
    var fadeEl = document.createElement('div');
    fadeEl.style.cssText = 'position:fixed;inset:0;background:#020409;opacity:0;pointer-events:none;transition:opacity 0.45s ease;z-index:9000;';
    document.body.appendChild(fadeEl);

    function startFly(panel) {
        if (flying) return;
        if (reduced) { window.location.href = panel.userData.href; return; }
        var toCam = camera.position.clone().sub(panel.position).normalize();
        flying = {
            panel: panel,
            href: panel.userData.href,
            p: 0,
            camFrom: camera.position.clone(),
            camTo: panel.position.clone().sub(toCam.multiplyScalar(1.2)),
            look: panel.position.clone()
        };
        panel.material.map = panel.userData.texOn;
        panel.material.needsUpdate = true;
        renderer.domElement.style.cursor = 'default';
        if (tagEl) tagEl.style.display = 'none';
        if (distEl) distEl.style.display = 'none';
        document.body.classList.add('launching');
    }

    /* ============================== INTERACTION ========================= */
    var raycaster = new THREE.Raycaster();
    var pointer = new THREE.Vector2();
    var hovered = null;

    var dragging = false, dragMoved = false;
    var dragStartX = 0, worldYawTarget = 0, worldYaw = 0, yawAtDragStart = 0;
    var parallaxX = 0, parallaxY = 0;

    function toNDC(e) {
        var rect = renderer.domElement.getBoundingClientRect();
        var cx = (e.touches ? e.touches[0].clientX : e.clientX);
        var cy = (e.touches ? e.touches[0].clientY : e.clientY);
        pointer.x = ((cx - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((cy - rect.top) / rect.height) * 2 + 1;
        return { x: cx, y: cy };
    }

    renderer.domElement.style.touchAction = 'pan-y';

    renderer.domElement.addEventListener('pointerdown', function (e) {
        dragging = true; dragMoved = false;
        dragStartX = e.clientX;
        yawAtDragStart = worldYawTarget;
    });

    window.addEventListener('pointermove', function (e) {
        var pos = toNDC(e);
        if (dragging) {
            var dx = pos.x - dragStartX;
            if (Math.abs(dx) > 4) dragMoved = true;
            worldYawTarget = Math.max(-0.35, Math.min(0.35, yawAtDragStart + dx * 0.0016));
        } else {
            parallaxX = pointer.x;
            parallaxY = pointer.y;
        }
    }, { passive: true });

    window.addEventListener('pointerup', function (e) {
        var wasDrag = dragMoved;
        dragging = false; dragMoved = false;
        if (wasDrag) return;
        toNDC(e);
        raycaster.setFromCamera(pointer, camera);
        var hits = raycaster.intersectObjects(panels);
        if (hits.length > 0 && hits[0].object.userData.href) {
            startFly(hits[0].object);
        }
    });

    renderer.domElement.addEventListener('mousemove', function (e) {
        toNDC(e);
        raycaster.setFromCamera(pointer, camera);
        var hits = raycaster.intersectObjects(panels);
        var h = hits.length > 0 ? hits[0].object : null;
        if (h !== hovered) {
            hovered = h;
            renderer.domElement.style.cursor = h ? 'pointer' : 'grab';
        }
    }, { passive: true });

    /* ============================== RESIZE / RESTORE ===================== */
    window.addEventListener('resize', function () {
        var w = mount.clientWidth, h = mount.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });

    window.addEventListener('pageshow', function (e) {
        if (e.persisted) {
            fadeEl.style.transition = 'none';
            fadeEl.style.opacity = '0';
            flying = null;
            camera.position.copy(CAM_HOME);
            camera.fov = BASE_FOV;
            camera.updateProjectionMatrix();
            warp.lines.visible = false;
            warp.lines.material.opacity = 0;
            document.body.classList.remove('launching');
            for (var pi = 0; pi < panels.length; pi++) panels[pi].material.opacity = 0.72;
            requestAnimationFrame(function () { fadeEl.style.transition = 'opacity 0.45s ease'; });
        }
    });

    /* ============================== LOOP ================================ */
    var clock = new THREE.Clock();
    var running = true;
    var lastT = 0;

    document.addEventListener('visibilitychange', function () {
        running = !document.hidden;
        if (running) { clock.getDelta(); animate(); }
    });

    function animate() {
        if (!running) return;
        requestAnimationFrame(animate);
        var t = clock.getElapsedTime();
        var dt = Math.min(t - lastT, 0.05);
        lastT = t;

        /* --- warp launch to destination --- */
        if (flying) {
            flying.p = Math.min(flying.p + dt / 1.5, 1);
            var fk = flying.p * flying.p * (3 - 2 * flying.p);
            var accel = flying.p * flying.p;

            camera.position.lerpVectors(flying.camFrom, flying.camTo, fk);
            var sh = accel * 0.055;
            camera.position.x += (Math.random() - 0.5) * sh;
            camera.position.y += (Math.random() - 0.5) * sh;
            camera.lookAt(flying.look);
            camera.fov = BASE_FOV + accel * 24;
            camera.updateProjectionMatrix();

            warp.lines.visible = true;
            warp.lines.material.opacity = Math.min(1, accel * 1.8);
            var wArr = warp.lines.geometry.attributes.position.array;
            var wSpeed = dt * (12 + accel * 95);
            for (var wi = 0; wi < warp.offs.length; wi++) {
                var wo = warp.offs[wi];
                wo.z += wSpeed;
                if (wo.z > -2) wo.z = -46;
                wArr[wi * 6 + 2] = wo.z;
                wArr[wi * 6 + 5] = wo.z - wo.len * (0.6 + accel * 1.4);
            }
            warp.lines.geometry.attributes.position.needsUpdate = true;

            reticle.visible = false;
            for (var fi = 0; fi < panels.length; fi++) {
                var fp = panels[fi];
                fp.material.opacity = fp === flying.panel ? 1 : Math.max(0, fp.material.opacity - dt * 2.2);
            }
            if (flying.p > 0.62 && fadeEl.style.opacity !== '1') fadeEl.style.opacity = '1';
            if (flying.p >= 1) {
                var href = flying.href;
                flying = null;
                window.location.href = href;
                return;
            }
            renderer.render(scene, camera);
            return;
        }

        /* --- active destination cycle --- */
        var idx = Math.floor(t / CYCLE) % panels.length;
        setActive(idx);

        if (!reduced) {
            /* --- panels: active one drifts closer, others hold formation --- */
            for (var i = 0; i < panels.length; i++) {
                var p = panels[i];
                var isA = (i === activeIdx);
                var goal = isA ? FOCUS : p.userData.basePos;
                var bob = Math.sin(t * 0.8 + i * 1.7) * 0.12;
                p.position.x += (goal.x - p.position.x) * 0.05;
                p.position.y += (goal.y + bob - p.position.y) * 0.05;
                p.position.z += (goal.z - p.position.z) * 0.05;
                p.lookAt(camera.position.x, camera.position.y - 0.4, camera.position.z);
                p.rotation.z = Math.sin(t * 0.5 + i) * 0.01;
                var targetS = isA ? 1.05 : (p === hovered ? 1.06 : 1.0);
                p.userData.baseScale += (targetS - p.userData.baseScale) * 0.08;
                p.scale.setScalar(p.userData.baseScale);
                p.material.opacity = isA ? 1.0 : 0.72;
            }

            /* --- lock-on reticle follows the active panel --- */
            var ap = panels[activeIdx];
            reticle.visible = true;
            reticle.position.lerp(ap.position, 0.12);
            reticle.quaternion.copy(ap.quaternion);
            var pulse = 1 + Math.sin(t * 4) * 0.03;
            reticle.scale.setScalar(ap.userData.baseScale * pulse * 1.05);
            reticle.userData.dashed.rotation.z = t * 0.9;

            /* --- the moon slowly grows: approach --- */
            var approach = Math.min(t * 0.22, 16);
            moon.position.z = -60 + approach;
            moon.rotation.y = t * 0.004;

            /* --- shuttle crossing --- */
            var st = (t * 0.03) % 1.3;
            if (st < 1.0) {
                shuttle.visible = true;
                shuttle.position.set(-45 + st * 90, 6 + Math.sin(st * Math.PI) * 4, -70);
                shuttle.userData.flame.scale.y = 0.8 + Math.sin(t * 20) * 0.3;
            } else {
                shuttle.visible = false;
            }

            /* --- cruise feel: gentle ship sway + drag yaw + parallax --- */
            worldYaw += (worldYawTarget - worldYaw) * 0.06;
            world.rotation.y = worldYaw;
            var swayY = Math.sin(t * 0.5) * 0.12;
            camera.position.x += ((parallaxX * 0.7) - camera.position.x + CAM_HOME.x) * 0.03 - CAM_HOME.x * 0.03;
            camera.position.y += ((CAM_HOME.y + swayY - parallaxY * 0.4) - camera.position.y) * 0.03;
            camera.position.z = CAM_HOME.z;
            camera.lookAt(0, 2.4, 0);
        }

        updateTargetHUD();
        renderer.render(scene, camera);
    }
    animate();
})();
