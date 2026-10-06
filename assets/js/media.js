/* ==========================================================================
   MEDIA — mission-archive figures + full-screen plate viewer
   Every image inside a modal becomes a numbered figure with caption and credit
   (image-archive style), and opens in a viewer with keyboard navigation.
   No dependencies. Progressive: without JS the images still render.
   ========================================================================== */
(function () {
    'use strict';

    var CREDIT_DEFAULT = 'IMAGE: 服部 将眞';
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ------------------------------------------------------------------ */
    /* 1. wrap modal images in <figure> with caption / credit / plate id   */
    /* ------------------------------------------------------------------ */
    var plates = [];                      // {el, caption, credit, id, group}

    function enhance(scope) {
        var modals = scope.querySelectorAll('.modal-overlay');
        Array.prototype.forEach.call(modals, function (modal) {
            var group = modal.id || 'archive';
            var imgs = modal.querySelectorAll('.modal-body img');
            var n = 0;
            Array.prototype.forEach.call(imgs, function (img) {
                if (img.parentNode && img.parentNode.className === 'plate-frame') return;
                n++;
                var id = 'FIG. ' + (n < 10 ? '0' + n : String(n));
                var caption = img.getAttribute('data-caption') || img.getAttribute('alt') || '';
                var credit = img.getAttribute('data-credit') || CREDIT_DEFAULT;

                var fig = document.createElement('figure');
                fig.className = 'plate';
                var frame = document.createElement('button');
                frame.type = 'button';
                frame.className = 'plate-frame';
                frame.setAttribute('aria-label', id + ' ' + caption + ' — 拡大表示');

                img.parentNode.insertBefore(fig, img);
                frame.appendChild(img);
                fig.appendChild(frame);

                var cap = document.createElement('figcaption');
                cap.className = 'plate-cap';
                var sid = document.createElement('span');
                sid.className = 'plate-id';
                sid.textContent = id;
                var stx = document.createElement('span');
                stx.className = 'plate-text';
                stx.textContent = caption;
                var scr = document.createElement('span');
                scr.className = 'plate-credit';
                scr.textContent = credit;
                cap.appendChild(sid);
                cap.appendChild(stx);
                cap.appendChild(scr);
                fig.appendChild(cap);

                img.loading = 'lazy';
                img.decoding = 'async';

                var rec = { el: img, caption: caption, credit: credit, id: id, group: group };
                plates.push(rec);
                frame.addEventListener('click', function () { open(rec); });
            });
        });
    }

    /* ------------------------------------------------------------------ */
    /* 1b. videos: same plate language; YouTube loads only on click        */
    /* ------------------------------------------------------------------ */
    function enhanceVideos(scope) {
        var modals = scope.querySelectorAll(".modal-overlay");
        Array.prototype.forEach.call(modals, function (modal) {
            var vids = modal.querySelectorAll(".modal-body video");
            var n = 0;
            Array.prototype.forEach.call(vids, function (v) {
                if (v.parentNode && v.parentNode.className === "video-holder") return;
                n++;
                var id = "VIDEO " + (n < 10 ? "0" + n : String(n));
                var caption = v.getAttribute("data-caption") || "";
                var credit = v.getAttribute("data-credit") || "VIDEO: 服部 将眞";
                var yt = v.getAttribute("data-yt");
                var poster = v.getAttribute("poster") || "";

                var fig = document.createElement("figure");
                fig.className = "plate video-plate";
                var holder = document.createElement("div");
                holder.className = "video-holder";
                v.parentNode.insertBefore(fig, v);
                fig.appendChild(holder);

                if (yt) {
                    // facade: nothing from YouTube is requested until the visitor asks for it
                    var btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "yt-facade";
                    btn.setAttribute("aria-label", caption + " を再生");
                    if (poster) btn.style.backgroundImage = "url(" + poster + ")";
                    btn.innerHTML = "<span class=\"yt-play\"></span><span class=\"yt-note\">YouTube で再生</span>";
                    btn.addEventListener("click", function () {
                        var f = document.createElement("iframe");
                        f.src = "https://www.youtube-nocookie.com/embed/" + yt + "?autoplay=1&rel=0";
                        f.title = caption || "動画";
                        f.allow = "accelerometer; autoplay; encrypted-media; picture-in-picture";
                        f.allowFullscreen = true;
                        f.loading = "lazy";
                        holder.innerHTML = "";
                        holder.appendChild(f);
                    });
                    holder.appendChild(btn);
                    if (v.parentNode) v.parentNode.removeChild(v);
                } else {
                    holder.appendChild(v);
                }

                var cap = document.createElement("figcaption");
                cap.className = "plate-cap";
                var a = document.createElement("span"); a.className = "plate-id"; a.textContent = id;
                var b = document.createElement("span"); b.className = "plate-text"; b.textContent = caption;
                var c = document.createElement("span"); c.className = "plate-credit"; c.textContent = credit;
                cap.appendChild(a); cap.appendChild(b); cap.appendChild(c);
                fig.appendChild(cap);
            });
        });
    }

    /* ------------------------------------------------------------------ */
    /* 2. the viewer                                                       */
    /* ------------------------------------------------------------------ */
    var view, viewImg, viewId, viewCap, viewCredit, viewCount, current = null, lastFocus = null;

    function build() {
        view = document.createElement('div');
        view.className = 'plate-view';
        view.setAttribute('role', 'dialog');
        view.setAttribute('aria-modal', 'true');
        view.setAttribute('aria-label', '画像ビューア');
        view.hidden = true;
        view.innerHTML = [
            '<div class="pv-bar pv-top">',
            '<span class="pv-id"></span>',
            '<span class="pv-count"></span>',
            '<button type="button" class="pv-close" aria-label="閉じる (Esc)">&times;</button>',
            '</div>',
            '<button type="button" class="pv-nav pv-prev" aria-label="前の画像">&#10094;</button>',
            '<div class="pv-stage"><img alt=""></div>',
            '<button type="button" class="pv-nav pv-next" aria-label="次の画像">&#10095;</button>',
            '<div class="pv-bar pv-bottom"><span class="pv-cap"></span><span class="pv-credit"></span></div>'
        ].join('');
        document.body.appendChild(view);
        viewImg = view.querySelector('.pv-stage img');
        viewId = view.querySelector('.pv-id');
        viewCap = view.querySelector('.pv-cap');
        viewCredit = view.querySelector('.pv-credit');
        viewCount = view.querySelector('.pv-count');

        view.querySelector('.pv-close').addEventListener('click', close);
        view.querySelector('.pv-prev').addEventListener('click', function () { step(-1); });
        view.querySelector('.pv-next').addEventListener('click', function () { step(1); });
        view.addEventListener('click', function (e) {
            if (e.target === view || (e.target.className && e.target.className === 'pv-stage')) close();
        });
        viewImg.addEventListener('click', function () { view.classList.toggle('is-zoom'); });
    }

    // full-screen deserves the biggest variant, not the one picked for the thumbnail
    function largest(img) {
        var set = img.getAttribute("srcset");
        if (!set) return img.currentSrc || img.src;
        var best = null, bestW = 0;
        set.split(",").forEach(function (part) {
            var bits = part.trim().split(" ");
            var w = parseInt(bits[1] || "0", 10);
            if (w >= bestW) { bestW = w; best = bits[0]; }
        });
        return best || img.currentSrc || img.src;
    }

    function siblings(rec) {
        return plates.filter(function (p) { return p.group === rec.group; });
    }

    function show(rec) {
        current = rec;
        var list = siblings(rec), i = list.indexOf(rec);
        viewImg.src = largest(rec.el);
        viewImg.alt = rec.caption;
        viewId.textContent = rec.id;
        viewCap.textContent = rec.caption;
        viewCredit.textContent = rec.credit;
        viewCount.textContent = (i + 1) + ' / ' + list.length;
        view.classList.remove('is-zoom');
        view.classList.toggle('is-single', list.length < 2);
    }

    function open(rec) {
        if (!view) build();
        lastFocus = document.activeElement;
        view.hidden = false;
        document.body.classList.add('plate-open');
        show(rec);
        requestAnimationFrame(function () { view.classList.add('is-on'); });
        view.querySelector('.pv-close').focus();
    }

    function close() {
        if (!view || view.hidden) return;
        view.classList.remove('is-on');
        var done = function () { view.hidden = true; };
        if (reduced) done(); else setTimeout(done, 200);
        document.body.classList.remove('plate-open');
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function step(d) {
        if (!current) return;
        var list = siblings(current), i = list.indexOf(current);
        show(list[(i + d + list.length) % list.length]);
    }

    document.addEventListener('keydown', function (e) {
        if (!view || view.hidden) return;
        if (e.key === 'Escape') { e.stopPropagation(); close(); }
        else if (e.key === 'ArrowLeft') { step(-1); }
        else if (e.key === 'ArrowRight') { step(1); }
        else if (e.key === 'Tab') {                       // focus trap
            var f = view.querySelectorAll('button');
            var first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    }, true);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { enhance(document); enhanceVideos(document); });
    } else {
        enhance(document);
        enhanceVideos(document);
    }
})();
