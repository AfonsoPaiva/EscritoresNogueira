// Theme manager for frontend
(function () {
    const defaultTexts = {
        heroTitle: 'Descubra o Universo dos Livros',
        heroSubtitle: 'Uma seleção única de obras literárias cuidadosamente escolhidas para si'
    };

    const themes = {
        default: {
            className: '',
            texts: defaultTexts
        },
        christmas: {
            className: 'theme-christmas',
            texts: {
                heroTitle: 'Aproveite as nossas promoções de Natal',
                heroSubtitle: 'Ofertas especiais e descontos para celebrar a época'
            }
        },
        newyear: {
            className: 'theme-newyear',
            texts: {
                heroTitle: 'Feliz Ano Novo! Aproveite as nossas novidades',
                heroSubtitle: 'Desejos de um ano cheio de leituras e inspiração'
            }
        }
    };

    const hero = document.querySelector('.hero');
    const heroTitleEl = document.querySelector('.hero-title');
    const heroSubtitleEl = document.querySelector('.hero-subtitle');

    // Snow/fireworks animation state
    let snow = { canvas: null, ctx: null, flakes: [], animId: null, resizeHandler: null };
    let fireworks = { canvas: null, ctx: null, particles: [], animId: null, resizeHandler: null, lastLaunch: 0 };

    function applyTexts(themeObj) {
        if (heroTitleEl) heroTitleEl.textContent = themeObj.texts.heroTitle || '';
        if (heroSubtitleEl) heroSubtitleEl.textContent = themeObj.texts.heroSubtitle || '';
    }

    function setBodyClass(className) {
        document.body.classList.remove(...Object.values(themes).map(t => t.className).filter(Boolean));
        if (className) document.body.classList.add(className);
    }

    /* -------------------- SNOW -------------------- */
    function startSnow() {
        if (!hero) return;
        if (snow.canvas) return;
        const canvas = document.createElement('canvas');
        canvas.id = 'snowCanvas';
        canvas.style.position = 'absolute';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '10';
        hero.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        snow.canvas = canvas; snow.ctx = ctx;
        function resize() {
            const rect = hero.getBoundingClientRect();
            canvas.width = Math.max(800, Math.floor(rect.width));
            canvas.height = Math.max(300, Math.floor(rect.height));
        }
        resize();
        snow.resizeHandler = resize;
        window.addEventListener('resize', resize);

        const flakesCount = Math.min(150, Math.floor((canvas.width * canvas.height) / 30000));
        snow.flakes = [];
        for (let i = 0; i < flakesCount; i++) {
            snow.flakes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: 0.8 + Math.random() * 3.2,
                d: Math.random() * flakesCount,
                vx: (Math.random() * 0.6) - 0.3,
                vy: 0.5 + Math.random() * 1.5
            });
        }

        function draw() {
            if (!snow.ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            for (let i = 0; i < snow.flakes.length; i++) {
                const f = snow.flakes[i];
                ctx.moveTo(f.x, f.y);
                ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2, true);
            }
            ctx.fill();
            for (let i = 0; i < snow.flakes.length; i++) {
                const f = snow.flakes[i];
                f.x += f.vx + Math.sin(f.d / 100) * 0.5;
                f.y += f.vy;
                if (f.y > canvas.height + 5) { f.x = Math.random() * canvas.width; f.y = -10; }
                if (f.x > canvas.width + 5) f.x = -5;
                if (f.x < -5) f.x = canvas.width + 5;
            }
            snow.animId = requestAnimationFrame(draw);
        }
        draw();
    }

    function stopSnow() {
        if (snow.animId) cancelAnimationFrame(snow.animId);
        if (snow.resizeHandler) window.removeEventListener('resize', snow.resizeHandler);
        if (snow.canvas && snow.canvas.parentNode) snow.canvas.parentNode.removeChild(snow.canvas);
        snow.canvas = null; snow.ctx = null; snow.flakes = []; snow.animId = null; snow.resizeHandler = null;
    }

    /* -------------------- FIREWORKS -------------------- */
    function startFireworks() {
        if (!hero) return;
        if (fireworks.canvas) return;
        const canvas = document.createElement('canvas');
        canvas.id = 'fireworksCanvas';
        canvas.style.position = 'absolute';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '12';
        hero.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        fireworks.canvas = canvas; fireworks.ctx = ctx;

        function resize() {
            const rect = hero.getBoundingClientRect();
            canvas.width = Math.max(800, Math.floor(rect.width));
            canvas.height = Math.max(300, Math.floor(rect.height));
        }
        resize();
        fireworks.resizeHandler = resize;
        window.addEventListener('resize', resize);

        fireworks.particles = [];

        function launchFirework() {
            const w = canvas.width;
            const h = canvas.height;
            // random launch position within hero
            const startX = Math.random() * (w * 0.9) + w * 0.05;
            const startY = h + 10;
            const peakY = Math.random() * (h * 0.5) + h * 0.1;
            const color = `hsl(${Math.floor(Math.random()*360)}, 85%, 55%)`;
            // create shell particle traveling up, which will explode
            fireworks.particles.push({
                type: 'shell',
                x: startX,
                y: startY,
                vx: (Math.random()-0.5) * 2,
                vy: - (4 + Math.random() * 6),
                peakY,
                color,
                life: 0
            });
        }

        function explode(x, y, color) {
            const count = 30 + Math.floor(Math.random() * 40);
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 3 + 1;
                fireworks.particles.push({
                    type: 'spark',
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    color: color,
                    life: 0,
                    ttl: 60 + Math.floor(Math.random() * 60),
                    alpha: 1
                });
            }
        }

        function draw() {
            if (!fireworks.ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // semi-trail background
            ctx.fillStyle = 'rgba(0,0,0,0)';
            ctx.fillRect(0,0,canvas.width,canvas.height);

            for (let i = fireworks.particles.length-1; i >= 0; i--) {
                const p = fireworks.particles[i];
                if (p.type === 'shell') {
                    // update
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.06; // gravity
                    // draw
                    ctx.beginPath();
                    ctx.fillStyle = p.color;
                    ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
                    ctx.fill();
                    if (p.vy >= 0 || p.y <= p.peakY) {
                        // explode
                        explode(p.x, p.y, p.color);
                        fireworks.particles.splice(i,1);
                    }
                } else if (p.type === 'spark') {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.03; // gravity
                    p.life++;
                    p.alpha = Math.max(0, 1 - p.life / p.ttl);
                    ctx.beginPath();
                    ctx.globalAlpha = p.alpha;
                    ctx.fillStyle = p.color;
                    ctx.arc(p.x, p.y, 1.5, 0, Math.PI*2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                    if (p.life >= p.ttl) fireworks.particles.splice(i,1);
                }
            }

            // occasionally launch new firework
            const now = Date.now();
            if (now - fireworks.lastLaunch > 700 + Math.random() * 1500) {
                launchFirework();
                fireworks.lastLaunch = now;
            }

            fireworks.animId = requestAnimationFrame(draw);
        }
        draw();
    }

    function stopFireworks() {
        if (fireworks.animId) cancelAnimationFrame(fireworks.animId);
        if (fireworks.resizeHandler) window.removeEventListener('resize', fireworks.resizeHandler);
        if (fireworks.canvas && fireworks.canvas.parentNode) fireworks.canvas.parentNode.removeChild(fireworks.canvas);
        fireworks.canvas = null; fireworks.ctx = null; fireworks.particles = []; fireworks.animId = null; fireworks.resizeHandler = null;
    }

    const ThemeManager = {
        current: 'default',
        selectTheme(name) {
            if (!themes[name]) name = 'default';
            this.current = name;
            const themeObj = themes[name];

            setBodyClass(themeObj.className);
            applyTexts(themeObj);

            // start/stop decorations
            if (name === 'christmas') { startSnow(); stopFireworks(); }
            else if (name === 'newyear') { startFireworks(); stopSnow(); }
            else { stopSnow(); stopFireworks(); }

            try { localStorage.setItem('site_theme', name); } catch (e) {}
            return themeObj;
        },
        loadFromStorage() {
            try {
                const t = localStorage.getItem('site_theme');
                if (t && themes[t]) this.selectTheme(t);
                else this.selectTheme('default');
            } catch (e) {
                this.selectTheme('default');
            }
        },
        available() {
            return Object.keys(themes);
        }
    };

    
    // init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            ThemeManager.loadFromStorage();
        });
    } else {
        ThemeManager.loadFromStorage();
    }

    window.ThemeManager = ThemeManager;
})();