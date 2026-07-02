/* ==========================================================================
   MAIN — nav, scroll animations, HUD telemetry
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // Current Year
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Responsive Navigation
    const burger = document.querySelector('.hamburger');
    const nav = document.querySelector('.nav-links');
    if (burger && nav) {
        const navLinks = nav.querySelectorAll('li');
        burger.addEventListener('click', () => {
            nav.classList.toggle('nav-active');
            navLinks.forEach((link, index) => {
                if (link.style.animation) {
                    link.style.animation = '';
                } else {
                    link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
                }
            });
            burger.classList.toggle('toggle');
        });
    }

    // Navbar hide/show on scroll
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;
    if (navbar) {
        window.addEventListener('scroll', () => {
            const cur = window.pageYOffset;
            navbar.style.boxShadow = cur <= 0 ? 'none' : '0 10px 30px -10px rgba(0, 10, 20, 0.7)';
            navbar.style.transform = (cur > lastScroll && cur > 80) ? 'translateY(-100%)' : 'translateY(0)';
            lastScroll = cur;
        }, { passive: true });
    }

    // Fade-in on scroll
    const appearOnScroll = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('appear');
            obs.unobserve(entry.target);
        });
    }, { threshold: 0, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.fade-in').forEach(el => appearOnScroll.observe(el));

    // HUD telemetry (elements with .hud-dyn get animated fake telemetry)
    const hudEls = document.querySelectorAll('.hud-dyn');
    if (hudEls.length > 0) {
        const pad = (n, l) => String(n).padStart(l, '0');
        setInterval(() => {
            const d = new Date();
            hudEls.forEach(el => {
                const type = el.dataset.hud;
                if (type === 'clock') {
                    el.textContent = `${pad(d.getHours(),2)}:${pad(d.getMinutes(),2)}:${pad(d.getSeconds(),2)} JST`;
                } else if (type === 'alt') {
                    el.textContent = `ALT ${ (408 + Math.sin(Date.now()/4000)*2).toFixed(1) } km`;
                } else if (type === 'vel') {
                    el.textContent = `VEL ${ (7.66 + Math.sin(Date.now()/3000)*0.01).toFixed(2) } km/s`;
                } else if (type === 'sig') {
                    el.textContent = `SIG ${ (92 + Math.floor(Math.random()*7)) }%`;
                }
            });
        }, 500);
    }
});

// Extra keyframes
const style = document.createElement('style');
style.innerHTML = `
    @keyframes navLinkFade {
        from { opacity: 0; transform: translateX(50px); }
        to { opacity: 1; transform: translateX(0); }
    }
    .toggle .line1 { transform: rotate(-45deg) translate(-5px, 6px); }
    .toggle .line2 { opacity: 0; }
    .toggle .line3 { transform: rotate(45deg) translate(-5px, -6px); }
`;
document.head.appendChild(style);
