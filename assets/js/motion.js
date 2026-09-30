/* ==========================================================================
   MOTION — the layer that makes the instrument feel alive
   * staggered reveals for grids and timelines
   * cross-page transition (fade through the bench black)
   * instrument cursor: a small reticle that locks onto interactive targets
   * scroll progress rail on the sub pages
   All of it is disabled under prefers-reduced-motion.
   ========================================================================== */
(function () {
    'use strict';

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var coarse = window.matchMedia('(pointer: coarse)').matches;

    /* ---------------------------------------------------------------- */
    /* 1. staggered reveals                                              */
    /* ---------------------------------------------------------------- */
    function stagger() {
        var groups = document.querySelectorAll('.works-grid, .module-grid, .learning-grid, .timeline-container, .profile-details-grid, .tech-grid');
        Array.prototype.forEach.call(groups, function (g) {
            var kids = g.children;
            for (var i = 0; i < kids.length; i++) kids[i].style.setProperty('--stagger', (i * 90) + 'ms');
        });
    }

    /* ---------------------------------------------------------------- */
    /* 2. page transition                                                */
    /* ---------------------------------------------------------------- */
    function reveal() {
        requestAnimationFrame(function () { document.body.classList.add("is-loaded"); });
    }

    function transitions() {
        if (reduced) return;
        var veil = document.createElement('div');
        veil.className = 'page-veil';
        document.body.appendChild(veil);

        document.addEventListener('click', function (e) {
            var a = e.target.closest ? e.target.closest('a') : null;
            if (!a) return;
            var href = a.getAttribute('href');
            if (!href || a.target === '_blank' || href.charAt(0) === '#' || /^(mailto|tel|http)/.test(href)) return;
            if (href.indexOf('.html') === -1) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey) return;
            e.preventDefault();
            document.body.classList.add('is-leaving');
            setTimeout(function () { window.location.href = href; }, 260);
        });

        window.addEventListener('pageshow', function (e) {
            if (e.persisted) document.body.classList.remove('is-leaving');
        });
    }

    /* ---------------------------------------------------------------- */
    /* 3. instrument cursor                                              */
    /* ---------------------------------------------------------------- */
    function cursor() {
        if (reduced || coarse) return;
        var dot = document.createElement('div');
        dot.className = 'cursor-reticle';
        dot.innerHTML = '<i></i><i></i><i></i><i></i><span></span>';
        document.body.appendChild(dot);
        document.body.classList.add('has-reticle');

        var x = window.innerWidth / 2, y = window.innerHeight / 2, tx = x, ty = y, raf = null;
        function loop() {
            x += (tx - x) * 0.22;
            y += (ty - y) * 0.22;
            dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
            raf = requestAnimationFrame(loop);
        }
        document.addEventListener('mousemove', function (e) {
            tx = e.clientX; ty = e.clientY;
            if (!raf) loop();
            var t = e.target.closest ? e.target.closest('a, button, [data-modal], .plate-frame, .dock-nav-btn, input, .tech-tag') : null;
            dot.classList.toggle('is-lock', !!t);
        }, { passive: true });
        document.addEventListener('mouseleave', function () { dot.classList.add('is-out'); });
        document.addEventListener('mouseenter', function () { dot.classList.remove('is-out'); });
        document.addEventListener('mousedown', function () { dot.classList.add('is-press'); });
        document.addEventListener('mouseup', function () { dot.classList.remove('is-press'); });
    }

    /* ---------------------------------------------------------------- */
    /* 4. scroll progress rail                                           */
    /* ---------------------------------------------------------------- */
    function progress() {
        var main = document.querySelector('.page-main, .home-main');
        if (!main) return;
        var rail = document.createElement('div');
        rail.className = 'scroll-rail';
        rail.innerHTML = '<i></i>';
        document.body.appendChild(rail);
        var bar = rail.firstChild;
        var update = function () {
            var h = document.documentElement.scrollHeight - window.innerHeight;
            var p = h > 0 ? Math.min(1, window.pageYOffset / h) : 0;
            bar.style.transform = 'scaleY(' + p + ')';
        };
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        update();
    }

    /* ---------------------------------------------------------------- */
    /* 5. back to top                                                    */
    /* ---------------------------------------------------------------- */
    function toTop() {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "to-top";
        b.setAttribute("aria-label", "ページ先頭へ戻る");
        b.innerHTML = "&#9650;";
        document.body.appendChild(b);
        b.addEventListener("click", function () {
            window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
        });
        var sync = function () { b.classList.toggle("is-on", window.pageYOffset > 380); };
        window.addEventListener("scroll", sync, { passive: true });
        sync();
    }

    function init() {
        stagger();
        reveal();
        transitions();
        cursor();
        progress();
        toTop();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
