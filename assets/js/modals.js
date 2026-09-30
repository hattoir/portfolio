/* ==========================================================================
   MODALS — shared dossier open/close for works + activities
   Replaces the per-page inline scripts. Adds keyboard and screen-reader
   support: Esc closes, Tab is trapped inside, focus returns to the card,
   and the dialog is announced. URL hash still auto-opens (works.html#modal-x).
   ========================================================================== */
(function () {
    'use strict';

    var FOCUSABLE = 'a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';
    var openModal = null, lastFocus = null;

    function trap(e) {
        if (!openModal || e.key !== 'Tab') return;
        var f = openModal.querySelectorAll(FOCUSABLE);
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    function open(modal, trigger) {
        if (!modal || openModal === modal) return;
        lastFocus = trigger || document.activeElement;
        openModal = modal;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        setTimeout(function () {
            var box = modal.querySelector('.modal-container');
            if (box) box.classList.add('appear');
            var close = modal.querySelector('.modal-close');
            if (close) close.focus();
        }, 50);
    }

    function close(modal) {
        modal = modal || openModal;
        if (!modal) return;
        var box = modal.querySelector('.modal-container');
        if (box) box.classList.remove('appear');
        setTimeout(function () {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }, 300);
        // pause any playing media in the dossier
        Array.prototype.forEach.call(modal.querySelectorAll('video'), function (v) { if (!v.paused) v.pause(); });
        if (modal === openModal) openModal = null;
        if (lastFocus && lastFocus.focus) lastFocus.focus();
        if (window.location.hash && document.querySelector(window.location.hash) === modal) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    }

    function init() {
        var modals = document.querySelectorAll('.modal-overlay');
        if (!modals.length) return;

        Array.prototype.forEach.call(modals, function (modal) {
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-hidden', 'true');
            var title = modal.querySelector('.modal-title');
            if (title) {
                if (!title.id) title.id = modal.id + '-title';
                modal.setAttribute('aria-labelledby', title.id);
            }
            modal.addEventListener('click', function (e) { if (e.target === modal) close(modal); });
            var btn = modal.querySelector('.modal-close');
            if (btn) {
                btn.setAttribute('aria-label', '閉じる');
                btn.addEventListener('click', function () { close(modal); });
            }
        });

        // cards / timeline items act as buttons
        var triggers = document.querySelectorAll('[data-modal]');
        Array.prototype.forEach.call(triggers, function (el) {
            var target = document.getElementById(el.getAttribute('data-modal'));
            if (!target) return;
            if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
            el.setAttribute('role', 'button');
            var label = el.querySelector('.card-title, .timeline-title');
            if (label) el.setAttribute('aria-label', label.textContent.trim() + ' の詳細を開く');
            el.addEventListener('click', function () { open(target, el); });
            el.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(target, el); }
            });
        });

        document.addEventListener('keydown', function (e) {
            if (!openModal) return;
            if (e.key === 'Escape') close();
            else trap(e);
        });

        // deep link: works.html#modal-gushin
        var hash = window.location.hash;
        if (hash) {
            var target = document.querySelector(hash);
            if (target && target.classList.contains('modal-overlay')) setTimeout(function () { open(target, null); }, 200);
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
