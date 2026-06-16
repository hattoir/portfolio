document.addEventListener('DOMContentLoaded', () => {
    // Current Year Update
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    // Responsive Navigation
    const navSlide = () => {
        const burger = document.querySelector('.hamburger');
        const nav = document.querySelector('.nav-links');
        const navLinks = document.querySelectorAll('.nav-links li');

        if (burger && nav) {
            burger.addEventListener('click', () => {
                // Toggle Nav
                nav.classList.toggle('nav-active');

                // Animate Links
                navLinks.forEach((link, index) => {
                    if (link.style.animation) {
                        link.style.animation = '';
                    } else {
                        link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
                    }
                });

                // Burger Animation
                burger.classList.toggle('toggle');
            });
        }
    }
    navSlide();

    // Navbar Scrolled Effect
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;

    if (navbar) {
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;

            if (currentScroll <= 0) {
                navbar.style.boxShadow = "none";
            } else {
                navbar.style.boxShadow = "0 10px 30px -10px rgba(8, 8, 12, 0.7)";
            }

            // Hide/Show navbar on scroll direction
            if (currentScroll > lastScroll && currentScroll > 80) {
                navbar.style.transform = "translateY(-100%)";
            } else {
                navbar.style.transform = "translateY(0)";
            }
            lastScroll = currentScroll;
        });
    }

    // Intersection Observer for scroll animations
    const appearOptions = {
        threshold: 0,
        rootMargin: "0px 0px -50px 0px"
    };

    const appearOnScroll = new IntersectionObserver(function(
        entries,
        appearOnScroll
    ) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add("appear");
                appearOnScroll.unobserve(entry.target);
            }
        });
    }, appearOptions);

    const faders = document.querySelectorAll(".fade-in");
    faders.forEach(fader => {
        appearOnScroll.observe(fader);
    });

    // =========================================================================
    // DYNAMIC STAR FIELD — monochrome lunar theme
    // =========================================================================
    const createStarField = () => {
        const body = document.body;
        const starContainer = document.createElement('div');
        starContainer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:-1;overflow:hidden;';
        body.appendChild(starContainer);

        const starCount = 50;
        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            const size = Math.random() * 1.5 + 0.5;
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const delay = Math.random() * 6;
            const duration = Math.random() * 4 + 3;
            const brightness = Math.floor(Math.random() * 40 + 200);
            const opacity = (Math.random() * 0.4 + 0.15).toFixed(2);

            star.style.cssText = `
                position: absolute;
                left: ${x}%;
                top: ${y}%;
                width: ${size}px;
                height: ${size}px;
                background: rgba(${brightness},${brightness + 5},${brightness + 15},${opacity});
                border-radius: 50%;
                box-shadow: 0 0 ${size * 2}px rgba(${brightness},${brightness + 5},${brightness + 15},0.15);
                animation: starTwinkle ${duration}s ease-in-out ${delay}s infinite alternate;
            `;
            starContainer.appendChild(star);
        }
    };
    createStarField();

    // Typewriter effect for Overview section (if present)
    const typeWriterText = "ハードウェア仕様を読み込み中...\nロボット制御ユニットを初期化中...\nシステム準備完了。ポートフォリオへようこそ。\n私はハードウェア設計とロボット開発を専門とするエンジニアです。\n物理的なメカニズムと高度なソフトウェアシステムを融合させます。";
    const element = document.getElementById('typewriter-text');
    
    if (element) {
        let i = 0;
        function typeWriter() {
            if (i < typeWriterText.length) {
                if (typeWriterText.charAt(i) === '\n') {
                    element.innerHTML += '<br>';
                } else {
                    element.innerHTML += typeWriterText.charAt(i);
                }
                i++;
                setTimeout(typeWriter, 30);
            }
        }
        
        const typeObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                typeWriter();
                typeObserver.disconnect();
            }
        });
        
        const aboutBrief = document.querySelector('.about-brief');
        if (aboutBrief) {
            typeObserver.observe(aboutBrief);
        } else {
            typeWriter();
        }
    }
});

// Adding extra keyframes dynamically
const style = document.createElement('style');
style.innerHTML = `
    @keyframes navLinkFade {
        from {
            opacity: 0;
            transform: translateX(50px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    @keyframes starTwinkle {
        0% { opacity: 0.2; transform: scale(0.8); }
        100% { opacity: 1; transform: scale(1.2); }
    }
    .toggle .line1 {
        transform: rotate(-45deg) translate(-5px, 6px);
    }
    .toggle .line2 {
        opacity: 0;
    }
    .toggle .line3 {
        transform: rotate(45deg) translate(-5px, -6px);
    }
`;
document.head.appendChild(style);
