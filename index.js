/**
 * Tommy Teja Landing Page - Interactive Script
 * Author: Antigravity pair programming agent
 */

/* =============================================================
   GSAP + LENIS: SCROLL ANIMATION ENGINE
   ============================================================= */
window.addEventListener('load', function initScrollEngine() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        const sb = document.querySelector('.sidebar-nav-container');
        if (sb) sb.style.opacity = '1';
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // ─────────────────────────────────────────────
    // 1. LENIS SMOOTH SCROLL
    // ─────────────────────────────────────────────
    if (typeof Lenis !== 'undefined') {
        const lenis = new Lenis({
            duration: 1.35,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smooth: true,
            smoothTouch: false,
        });
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
    }

    // ─────────────────────────────────────────────
    // 2. ELEMENT REFERENCES (null-guarded)
    // ─────────────────────────────────────────────
    const bgHero = document.querySelector('.slide-bg-hero');
    const bgNebula = document.querySelector('.slide-bg-nebula');
    const bgScholar = document.querySelector('.scholar-parallax-wrap');
    const bgNews = document.querySelector('.news-bg-layer');
    const nebulaSun = document.querySelector('#nebulaSun');
    const nebulaAngels = document.querySelector('.nebula-angels-img');
    const bgVentures = document.querySelector('.slide-bg-ventures'); // hidden, kept for compat
    const starsCanvas = document.getElementById('starsCanvas');
    const starsTextOverlay = document.getElementById('starsTextOverlay');
    const heroCard = document.querySelector('#heroFrameCard');
    const heroSection = document.querySelector('#home');
    const aboutSection = document.querySelector('#about');
    const newsSection = document.querySelector('#news');
    const sidebarNav = document.querySelector('.sidebar-nav-container');

    if (sidebarNav) gsap.set(sidebarNav, { opacity: 0, pointerEvents: 'none' });
    if (!bgHero || !heroSection) return;

    // ─────────────────────────────────────────────
    // 3. INITIAL STATE
    // ─────────────────────────────────────────────
    gsap.set(bgHero, { opacity: 1, scale: 1 });
    gsap.set(bgNebula, { opacity: 0 });
    if (starsTextOverlay) gsap.set(starsTextOverlay, { opacity: 0 });
    [document.getElementById('bgVentures'),
    document.getElementById('bgAchievements'), document.getElementById('bgContact')]
        .filter(Boolean).forEach(el => gsap.set(el, { opacity: 0 }));

    if (nebulaSun) gsap.set(nebulaSun, { opacity: 0, scale: 0.5, rotation: 0 });
    if (nebulaAngels) gsap.set(nebulaAngels, { opacity: 0, scale: 0.6 });
    if (heroCard) gsap.set(heroCard, { opacity: 1 });

    // ─────────────────────────────────────────────
    // 3b. PAPER BURN CANVAS (nebula → scholar)
    //
    // Natural paper burn: the nebula IMAGE itself burns away.
    // Canvas (paperBurnCanvas) sits on top of bgNebula in z-order.
    //   1. Draws nebula_galaxy_bg.png INTO the canvas
    //   2. Carves organic fire-shaped holes with destination-out
    //   3. Paints glowing amber/orange ember rim at the burn edge
    // Scholar bg is visible below through burned holes. No dark overlay.
    // ─────────────────────────────────────────────
    (function initPaperBurn() {
        const burnCvs = document.getElementById('paperBurnCanvas');
        if (!burnCvs) return;
        const burnCtx = burnCvs.getContext('2d');

        // Preload images for direct drawing on canvas to avoid CSS masking overhead
        const nebulaBgImg = new Image();
        nebulaBgImg.src = 'nebula_galaxy_bg.png?v=2';
        const angelsImg = new Image();
        angelsImg.src = 'nebula_galaxy_angels.png?v=2';
        const sunImg = new Image();
        sunImg.src = 'renaissance_sun.png?v=2';

        // Low-res burn map (upscaled with canvas smoothing for top-tier performance)
        const RES = 0.18;
        let W = 0, H = 0, BW = 0, BH = 0;
        let burnMap = null;
        let hImg = null;
        let eImg = null;

        // Pre-allocated offscreen canvases — never create in per-frame draw
        const holeCvs = document.createElement('canvas');
        const holeCt = holeCvs.getContext('2d');
        const blurCvs = document.createElement('canvas');
        const blurCt = blurCvs.getContext('2d');
        const emberCvs = document.createElement('canvas');
        const emberCt = emberCvs.getContext('2d');

        // ── Seeded PRNG (mulberry32) ──
        function prng(seed) {
            return function () {
                seed |= 0; seed = seed + 0x6D2B79F5 | 0;
                let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
                t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            };
        }

        // ── 3-octave value noise ──
        function makeNoise(seed) {
            const rand = prng(seed);
            const G = 32;
            const g1 = Float32Array.from({ length: (G + 2) * (G + 2) }, rand);
            const g2 = Float32Array.from({ length: (G * 2 + 2) * (G * 2 + 2) }, rand);
            const g3 = Float32Array.from({ length: (G * 4 + 2) * (G * 4 + 2) }, rand);
            function smp(g, gw, x, y) {
                const ix = Math.floor(x) % gw, iy = Math.floor(y) % gw;
                const ix1 = (ix + 1) % gw, iy1 = (iy + 1) % gw;
                const fx = x - Math.floor(x), fy = y - Math.floor(y);
                const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
                return g[iy * gw + ix] * (1 - ux) * (1 - uy) + g[iy * gw + ix1] * ux * (1 - uy) +
                    g[iy1 * gw + ix] * (1 - ux) * uy + g[iy1 * gw + ix1] * ux * uy;
            }
            return (nx, ny) =>
                smp(g1, G + 2, nx * G, ny * G) * 0.55 +
                smp(g2, G * 2 + 2, nx * G * 2, ny * G * 2) * 0.30 +
                smp(g3, G * 4 + 2, nx * G * 4, ny * G * 4) * 0.15;
        }

        function buildBurnMap() {
            W = window.innerWidth;
            H = window.innerHeight;
            BW = Math.ceil(W * RES);
            BH = Math.ceil(H * RES);

            burnCvs.width = W; burnCvs.height = H;
            holeCvs.width = BW; holeCvs.height = BH;
            blurCvs.width = BW; blurCvs.height = BH;
            emberCvs.width = BW; emberCvs.height = BH;
            burnMap = new Float32Array(BW * BH);

            const noise = makeNoise(0xCAFEF00D);

            for (let y = 0; y < BH; y++) {
                for (let x = 0; x < BW; x++) {
                    const nx = x / BW, ny = y / BH;
                    // Domain warp for organic flame tongues
                    const wx = noise(nx + 0.5, ny + 0.1);
                    const wy = noise(nx + 0.1, ny + 0.8);
                    const wnx = nx + (wx - 0.5) * 0.45;
                    const wny = ny + (wy - 0.5) * 0.30;
                    const dx = (wnx - 0.5) * 1.9, dy = (wny - 0.5) * 1.3;
                    const n = noise(nx * 4, ny * 4);
                    burnMap[y * BW + x] = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 0.66 + n * 0.34);
                }
            }

            // Pre-allocate ImageData to prevent garbage collection spikes
            hImg = holeCt.createImageData(BW, BH);
            eImg = emberCt.createImageData(BW, BH);
        }

        function drawImageCover(ctx, img, w, h) {
            if (!img.complete || img.naturalWidth === 0) return;
            const imgW = img.naturalWidth;
            const imgH = img.naturalHeight;
            const imgRatio = imgW / imgH;
            const canvasRatio = w / h;
            let sx, sy, sWidth, sHeight;
            if (imgRatio > canvasRatio) {
                sHeight = imgH;
                sWidth = imgH * canvasRatio;
                sx = (imgW - sWidth) / 2;
                sy = 0;
            } else {
                sWidth = imgW;
                sHeight = imgW / canvasRatio;
                sx = 0;
                sy = (imgH - sHeight) / 2;
            }
            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, w, h);
        }

        function drawAngels(ctx, img, w, h, opacity, scale) {
            if (!img.complete || img.naturalWidth === 0 || opacity <= 0) return;
            ctx.save();
            ctx.globalAlpha = opacity;
            const imgW = img.naturalWidth;
            const imgH = img.naturalHeight;
            const baseWidth = Math.min(780, w * 0.9);
            const baseHeight = baseWidth * (imgH / imgW);
            const drawW = baseWidth * scale;
            const drawH = baseHeight * scale;
            ctx.drawImage(img, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
            ctx.restore();
        }

        function drawSun(ctx, img, w, h, opacity, scale, angle) {
            if (!img.complete || img.naturalWidth === 0 || opacity <= 0) return;
            ctx.save();
            ctx.globalAlpha = opacity;
            const imgW = img.naturalWidth;
            const imgH = img.naturalHeight;
            const baseWidth = Math.min(520, w * 0.6);
            const baseHeight = baseWidth * (imgH / imgW);
            const drawW = baseWidth * scale;
            const drawH = baseHeight * scale;
            ctx.translate(w / 2, h / 2);
            ctx.rotate(angle);
            ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
            ctx.restore();
        }

        // ── Draw one frame of the paper burn. progress: 0→1 ──
        function drawBurn(progress) {
            if (!burnMap || !hImg || !eImg) return;

            // Enforce DOM layer opacities dynamically to prevent bleed-through
            if (progress > 0 && progress < 1) {
                if (bgNebula && bgNebula.style.opacity !== '0') {
                    bgNebula.style.opacity = '0';
                    bgNebula.style.pointerEvents = 'none';
                }
            } else if (progress <= 0) {
                if (bgNebula && bgNebula.style.opacity !== '1') {
                    bgNebula.style.opacity = '1';
                    bgNebula.style.pointerEvents = 'auto';
                }
                burnCtx.clearRect(0, 0, W, H);
                return;
            } else if (progress >= 1) {
                if (bgNebula && bgNebula.style.opacity !== '0') {
                    bgNebula.style.opacity = '0';
                    bgNebula.style.pointerEvents = 'none';
                }
                burnCtx.clearRect(0, 0, W, H);
                return;
            }

            const thr = progress * 1.12;
            const edge = 0.07 + 0.03 * (1 - progress);

            const hd = hImg.data;
            const ed = eImg.data;

            // Reuse pre-allocated ImageArrays to achieve zero memory garbage creation
            for (let i = 0; i < BW * BH; i++) {
                const t = burnMap[i];
                const i4 = i * 4;

                if (t < thr - edge) {
                    // Burned: mask = transparent (nebula clipped away), ember = none
                    hd[i4] = hd[i4 + 1] = hd[i4 + 2] = hd[i4 + 3] = 0;
                    ed[i4] = ed[i4 + 1] = ed[i4 + 2] = ed[i4 + 3] = 0;

                } else if (t < thr) {
                    const et = (t - (thr - edge)) / edge; // 0=inside(hot), 1=outside(cool)

                    // Mask: opaque = nebula visible, fades to transparent at inner rim
                    hd[i4] = hd[i4 + 1] = hd[i4 + 2] = 255;
                    hd[i4 + 3] = Math.round(et * et * 255);

                    // Fire rim color gradient: white-hot → amber → orange → dark red → char
                    let r, g, b, a;
                    if (et < 0.10) { r = 255; g = 252; b = 230; a = 255; }
                    else if (et < 0.28) { const f = (et - 0.10) / 0.18; r = 255; g = Math.round(252 - f * 157); b = Math.round(230 - f * 230); a = 255; }
                    else if (et < 0.52) { const f = (et - 0.28) / 0.24; r = 255; g = Math.round(95 - f * 80); b = 0; a = Math.round(255 - f * 60); }
                    else if (et < 0.78) { const f = (et - 0.52) / 0.26; r = Math.round(255 - f * 165); g = Math.round(15 - f * 15); b = 0; a = Math.round(195 - f * 145); }
                    else { const f = (et - 0.78) / 0.22; r = Math.round(90 - f * 90); g = 0; b = 0; a = Math.round(50 - f * 50); }
                    ed[i4] = r; ed[i4 + 1] = g; ed[i4 + 2] = b; ed[i4 + 3] = Math.max(0, a);

                } else {
                    // Unburned: mask fully opaque (nebula shows), ember none
                    hd[i4] = hd[i4 + 1] = hd[i4 + 2] = 255; hd[i4 + 3] = 255;
                    ed[i4] = ed[i4 + 1] = ed[i4 + 2] = ed[i4 + 3] = 0;
                }
            }

            holeCt.putImageData(hImg, 0, 0);
            emberCt.putImageData(eImg, 0, 0);

            // ── Blur the mask canvas (extremely smooth anti-aliased edges) ──
            blurCt.clearRect(0, 0, BW, BH);
            blurCt.filter = 'blur(3px)';
            blurCt.drawImage(holeCvs, 0, 0);

            // ── Draw main layers onto the canvas ──
            burnCtx.clearRect(0, 0, W, H);
            burnCtx.imageSmoothingEnabled = true;
            burnCtx.imageSmoothingQuality = 'high';

            // 1. Draw background cover
            drawImageCover(burnCtx, nebulaBgImg, W, H);

            // 2. Draw angels and sun (synced with outer GSAP timeline)
            const fadeProgress = Math.min(1, progress / 0.28);
            const opacity = 1 - fadeProgress;
            const angelsScale = 1.0 - 0.5 * fadeProgress;
            const sunScale = 1.1 - 0.7 * fadeProgress;
            const sunAngle = (360 + 360 * fadeProgress) * Math.PI / 180;

            drawAngels(burnCtx, angelsImg, W, H, opacity, angelsScale);
            drawSun(burnCtx, sunImg, W, H, opacity, sunScale, sunAngle);

            // 3. Composite mask to cut holes in the background and floating layers
            burnCtx.save();
            burnCtx.globalCompositeOperation = 'destination-in';
            burnCtx.drawImage(blurCvs, 0, 0, W, H);
            burnCtx.restore();

            // 4. Draw primary ember glow
            burnCtx.save();
            burnCtx.globalCompositeOperation = 'source-over';
            burnCtx.filter = 'blur(2px)';
            burnCtx.drawImage(emberCvs, 0, 0, W, H);
            burnCtx.restore();

            // 5. Draw glowing soft bloom
            burnCtx.save();
            burnCtx.globalCompositeOperation = 'screen';
            burnCtx.globalAlpha = 0.60;
            burnCtx.filter = 'blur(15px)';
            burnCtx.drawImage(emberCvs, 0, 0, W, H);
            burnCtx.restore();
        }

        buildBurnMap();
        window.addEventListener('resize', buildBurnMap, { passive: true });

        window._paperBurn = { p: 0 };
        window._paperBurnDraw = drawBurn;
    })();

    // ─────────────────────────────────────────────
    // 4. HERO SECTION: PIN + SCROLL TIMELINE
    // ─────────────────────────────────────────────
    const heroTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: heroSection,
            start: 'top top',
            end: '+=280%',
            pin: true,
            scrub: 1.2,
            anticipatePin: 1,
            onUpdate: (self) => {
                // Hard reset backgrounds when at the very top to prevent bleed-through or flashing
                if (self.progress < 0.02) {
                    gsap.set(bgNebula, { opacity: 0 });
                    if (starsCanvas) gsap.set(starsCanvas, { opacity: 0 });
                    if (starsTextOverlay) gsap.set(starsTextOverlay, { opacity: 0 });
                    gsap.set(bgHero, { opacity: 1 });
                }
            }
        }
    });

    heroTimeline
        // Phase 1: 3D Parallax for Hero layers, hero card fades
        .to('.hero-bg-layer', { scale: 1.15, duration: 0.3, ease: 'power2.inOut' }, 0)
        .to('.hero-god-layer', { y: '-6vh', x: '2vw', scale: 1.05, duration: 0.3, ease: 'power2.inOut' }, 0)
        .to('.hero-adam-layer', { y: '4vh', x: '-2vw', scale: 1.08, duration: 0.3, ease: 'power2.inOut' }, 0)
        .to(heroCard || {}, { opacity: 0, duration: 0.25, ease: 'power2.in' }, 0)

        // ── BURN TRANSITION: hero → nebula ──
        .to('.hero-bg-layer', { filter: 'brightness(3) saturate(0.4)', duration: 0.08, ease: 'power2.in' }, 0.23)
        .to('.hero-god-layer', { filter: 'brightness(3) saturate(0.4)', duration: 0.08, ease: 'power2.in' }, 0.23)
        .to('.hero-adam-layer', { filter: 'brightness(3) saturate(0.4)', duration: 0.08, ease: 'power2.in' }, 0.23)
        .to('#burnOverlay', { opacity: 1, duration: 0.06, ease: 'power3.in' }, 0.27)
        .to(bgHero, { opacity: 0, duration: 0.01 }, 0.31)
        .to(bgNebula, { opacity: 1, duration: 0.01 }, 0.31)
        .to('#burnOverlay', { opacity: 0, duration: 0.1, ease: 'power2.out' }, 0.32)

        // Nebula parallax
        .fromTo('.nebula-bg-layer', { y: '5vh' }, { y: '-5vh', ease: 'none', duration: 0.35 }, 0.32)
        .fromTo('.nebula-angels-layer', { y: '10vh' }, { y: '-10vh', ease: 'none', duration: 0.35 }, 0.32)
        .fromTo('.nebula-sun-layer', { y: '15vh' }, { y: '-15vh', ease: 'none', duration: 0.35 }, 0.32)
        .to(nebulaSun || {}, { opacity: 1, scale: 1.1, rotation: 360, duration: 0.25, ease: 'back.out(1.2)' }, 0.38)
        .to(nebulaAngels || {}, { opacity: 1, scale: 1.0, duration: 0.25, ease: 'back.out(1.2)' }, 0.38)

        // ── PAPER BURN: nebula → starfield (ventures) ──
        // Starfield fades in underneath the burn (scholar stays hidden — revealed only at About section)
        .to(window._starsHeroBurn = window._starsHeroBurn || { v: 0 }, {
            v: 1, duration: 0.01,
            onUpdate: function () {
                const v = this.targets()[0].v;
                if (starsCanvas && window._starsSetOpacity) window._starsSetOpacity(v);
                if (starsCanvas) starsCanvas.style.opacity = v;
                if (starsTextOverlay) starsTextOverlay.style.opacity = v;
            }
        }, 0.56)
        // Sun & angels fade as burn starts
        .to(nebulaSun || {}, { opacity: 0, scale: 0.4, rotation: 720, duration: 0.10 }, 0.57)
        .to(nebulaAngels || {}, { opacity: 0, scale: 0.5, duration: 0.10 }, 0.57)
        // Show burn canvas (it will replace the nebula visually)
        .to('#paperBurnCanvas', { opacity: 1, duration: 0.01 }, 0.57)
        // Drive the paper burn via GSAP proxy object (scrub-compatible)
        .to(window._paperBurn = window._paperBurn || { p: 0 }, {
            p: 1,
            duration: 0.36,
            ease: 'power1.inOut',
            onUpdate: function () {
                if (window._paperBurnDraw) window._paperBurnDraw(this.targets()[0].p);
            },
            onComplete: function () {
                // Burn done: hide canvas, starfield is now fully visible, hide static background
                gsap.set('#paperBurnCanvas', { opacity: 0 });
                gsap.set(bgNebula, { opacity: 0 });
            },
            onReverseComplete: function () {
                // Scrolled back: restore nebula, hide burn canvas, hide starfield
                gsap.set('#paperBurnCanvas', { opacity: 0 });
                gsap.set(bgNebula, { opacity: 1 });
                if (starsCanvas && window._starsSetOpacity) window._starsSetOpacity(0);
                if (starsCanvas) starsCanvas.style.opacity = 0;
                if (starsTextOverlay) starsTextOverlay.style.opacity = 0;
            }
        }, 0.57);

    // 5. ABOUT SECTION & NEWS SECTION BACKGROUND TRIGGERS (Handled dynamically by Ventures scroll triggers)

    // ─────────────────────────────────────────────
    // 6. SIDEBAR REVEAL: Fades in slowly starting from the News section
    // ─────────────────────────────────────────────
    if (sidebarNav) {
        gsap.fromTo(sidebarNav,
            { opacity: 0, pointerEvents: 'none' },
            {
                opacity: 1,
                pointerEvents: 'auto',
                scrollTrigger: {
                    trigger: '#news',
                    start: 'top 80%', // begins when the top of #news is 80% from the top of the viewport
                    end: 'top 40%',   // fully visible when top of #news reaches 40%
                    scrub: 1.2,       // smooth scroll scrub
                }
            }
        );
    }

    // ─────────────────────────────────────────────
    // 6a. DIORAMA BLOCKS INLINE PARALLAX TIMELINE
    // ─────────────────────────────────────────────
    const dioramaBlocks = document.querySelectorAll('.news-diorama-block');
    dioramaBlocks.forEach((block) => {
        const bannerLayer = block.querySelector('.parallax-layer:nth-child(1)');

        if (bannerLayer) {
            gsap.timeline({
                scrollTrigger: {
                    trigger: block,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1.2,
                }
            })
                .fromTo(bannerLayer,
                    { y: '5vh' },
                    { y: '-5vh', ease: 'none' }, 0
                );
        }
    });

    // Diorama Individual Background Parallax (Sharp & responsive backgrounds)
    const journeyBlocks = document.querySelectorAll('.journey-diorama-block');
    journeyBlocks.forEach(block => {
        const bgLayer = block.querySelector('.diorama-bg-layer');
        if (bgLayer) {
            gsap.timeline({
                scrollTrigger: {
                    trigger: block,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1.2,
                }
            })
            .fromTo(bgLayer,
                { y: '-10%' },
                { y: '10%', ease: 'none' }
            );
        }
    });

    // ─────────────────────────────────────────────
    // 6b. STARFIELD CANVAS (replaces ventures scene)
    // ─────────────────────────────────────────────
    (function initStarfield() {
        if (!starsCanvas) return;
        const ctx = starsCanvas.getContext('2d');
        let W = 0, H = 0;
        const STAR_COUNT = 520;
        const stars = [];

        function resize() {
            W = starsCanvas.width = window.innerWidth;
            H = starsCanvas.height = window.innerHeight * 2;
        }
        resize();
        window.addEventListener('resize', resize, { passive: true });

        // Seeded PRNG so star positions are stable across frames
        let seed = 0xABCDEF01;
        function rand() {
            seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5;
            return ((seed >>> 0) / 0xFFFFFFFF);
        }

        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push({
                x: rand(),          // 0-1 normalised
                y: rand(),
                r: rand() * 1.3 + 0.25,  // radius 0.25–1.55px
                base: rand() * 0.55 + 0.35,  // base opacity 0.35–0.90
                phase: rand() * Math.PI * 2,  // twinkle phase offset
                speed: rand() * 0.6 + 0.3,    // twinkle speed
            });
        }

        let rafId = null;
        let canvasOpacity = 0;  // driven by GSAP via proxy

        function drawStars(t) {
            ctx.clearRect(0, 0, W, H);
            if (canvasOpacity <= 0) return;

            // Deep space background – pure black with vignette
            ctx.fillStyle = '#000007';
            ctx.fillRect(0, 0, W, H);

            // Radial vignette – slightly lighter at center
            const vg = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
            vg.addColorStop(0, 'rgba(20,15,40,0.0)');
            vg.addColorStop(1, 'rgba(0,0,7,0.75)');
            ctx.fillStyle = vg;
            ctx.fillRect(0, 0, W, H);

            for (let i = 0; i < stars.length; i++) {
                const s = stars[i];
                const twinkle = Math.sin(t * s.speed + s.phase) * 0.22;
                const alpha = Math.max(0, Math.min(1, s.base + twinkle));
                const sx = s.x * W;
                const sy = s.y * H;

                // Soft glow halo for brighter stars
                if (s.r > 0.9) {
                    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.r * 4);
                    g.addColorStop(0, `rgba(220,230,255,${alpha * 0.45})`);
                    g.addColorStop(1, 'rgba(200,215,255,0)');
                    ctx.beginPath();
                    ctx.arc(sx, sy, s.r * 4, 0, Math.PI * 2);
                    ctx.fillStyle = g;
                    ctx.fill();
                }

                // Star core
                ctx.beginPath();
                ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(230,240,255,${alpha})`;
                ctx.fill();
            }

            // Apply the canvas-level opacity via CSS (GSAP targets starsCanvas.style.opacity)
            starsCanvas.style.opacity = canvasOpacity;
        }

        // GSAP proxy for smooth opacity animation
        window._starsProxy = { opacity: 0 };
        let isLoopRunning = false;

        window._starsSetOpacity = function (v) {
            canvasOpacity = v;
            if (canvasOpacity > 0 && !isLoopRunning) {
                isLoopRunning = true;
                if (!rafId) {
                    rafId = requestAnimationFrame(tick);
                }
            }
        };

        function tick(t) {
            if (canvasOpacity <= 0) {
                ctx.clearRect(0, 0, W, H);
                isLoopRunning = false;
                rafId = null;
                return; // Pause the animation loop
            }
            drawStars(t / 1000);
            rafId = requestAnimationFrame(tick);
        }
        // Do not start loop immediately, it will start automatically when opacity becomes > 0
    })();

    const venturesSection = document.querySelector('#ventures');

    if (venturesSection && starsCanvas) {
        // Fade in starfield when entering ventures, fade out when leaving
        const starsProxy = { v: 0 };
        function setStarsOpacity(val) {
            starsCanvas.style.opacity = val;
            if (starsTextOverlay) starsTextOverlay.style.opacity = val;
            if (window._starsSetOpacity) window._starsSetOpacity(val);
        }

        ScrollTrigger.create({
            trigger: venturesSection,
            start: 'top 75%',
            end: 'bottom 25%',
            onEnter: () => {
                gsap.to(starsProxy, {
                    v: 1, duration: 0.9, ease: 'power2.out',
                    onUpdate: () => setStarsOpacity(starsProxy.v)
                });
                if (bgScholar) gsap.to(bgScholar, { opacity: 0, duration: 0.6 });
                if (bgNebula) gsap.to(bgNebula, { opacity: 0, duration: 0.6 });
                if (bgHero) gsap.to(bgHero, { opacity: 0, duration: 0.6 });
                if (bgNews) gsap.to(bgNews, { opacity: 0, duration: 0.6 });
            },
            onLeave: () => {
                gsap.to(starsProxy, {
                    v: 0, duration: 0.7, ease: 'power2.in',
                    onUpdate: () => setStarsOpacity(starsProxy.v)
                });
            },
            onEnterBack: () => {
                gsap.to(starsProxy, {
                    v: 1, duration: 0.7, ease: 'power2.out',
                    onUpdate: () => setStarsOpacity(starsProxy.v)
                });
                if (bgScholar) gsap.to(bgScholar, { opacity: 0, duration: 0.6 });
                if (bgNebula) gsap.to(bgNebula, { opacity: 0, duration: 0.6 });
                if (bgHero) gsap.to(bgHero, { opacity: 0, duration: 0.6 });
                if (bgNews) gsap.to(bgNews, { opacity: 0, duration: 0.6 });
            },
            onLeaveBack: () => {
                gsap.to(starsProxy, {
                    v: 0, duration: 0.7, ease: 'power2.in',
                    onUpdate: () => setStarsOpacity(starsProxy.v)
                });
                if (bgScholar) gsap.to(bgScholar, { opacity: 1, duration: 0.8, ease: 'power2.out' });
                if (bgNews) gsap.to(bgNews, { opacity: 0.28, duration: 0.8, ease: 'power2.out' });
            },
        });
    }


    // ─────────────────────────────────────────────
    // 6.5 HORIZONTAL SCROLL GALLERY (VENTURES)
    // ─────────────────────────────────────────────
    const horizontalPin = document.querySelector('.ventures-horizontal-pin');
    const horizontalTrack = document.querySelector('.ventures-horizontal-track');

    if (horizontalPin && horizontalTrack) {
        // Calculate the amount to move based on the track width minus the window width
        function getScrollAmount() {
            let trackWidth = horizontalTrack.scrollWidth;
            return -(trackWidth - window.innerWidth);
        }

        const tween = gsap.to(horizontalTrack, {
            x: getScrollAmount,
            ease: "none"
        });

        ScrollTrigger.create({
            trigger: horizontalPin,
            start: "top top",
            end: () => `+=${getScrollAmount() * -1}`,
            pin: true,
            animation: tween,
            scrub: 1,
            invalidateOnRefresh: true
        });

        // Continuous starfield scroll timeline so stars scroll vertically in sync with the section
        const scrollAmount = getScrollAmount() * -1;
        const scrollRatio = scrollAmount / window.innerHeight;

        const starsTimeline = gsap.timeline({
            scrollTrigger: {
                trigger: '#ventures',
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
                invalidateOnRefresh: true
            }
        });

        starsTimeline
            // Phase 1: entering (hero to ventures vertical scroll)
            .to(starsCanvas, { y: () => -window.innerHeight, duration: 1, ease: 'none' }, 0)
            .fromTo(starsTextOverlay,
                { y: () => window.innerHeight * 0.45 },
                { y: 0, duration: 1, ease: 'none' }, 0)

            // Phase 2: stay fixed while horizontal scroll is active
            .to(starsCanvas, { y: () => -window.innerHeight, duration: scrollRatio, ease: 'none' }, 1)
            .to(starsTextOverlay, { y: 0, duration: scrollRatio, ease: 'none' }, 1)

            // Phase 3: leaving (ventures to about vertical scroll)
            .to(starsCanvas, { y: () => -window.innerHeight * 2, duration: 1, ease: 'none' }, 1 + scrollRatio)
            .to(starsTextOverlay, { y: () => -window.innerHeight * 1.5, duration: 1, ease: 'none' }, 1 + scrollRatio);
    }

    // ─────────────────────────────────────────────
    // 7. STAGGERED SECTION CONTENT REVEAL
    // ─────────────────────────────────────────────
    document.querySelectorAll('.bento-badge, .news-card, .achievement-card, .about-text').forEach(el => {
        gsap.from(el, {
            scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
            opacity: 0, y: 40, duration: 0.75, ease: 'power3.out'
        });
    });

    // ─────────────────────────────────────────────
    // 8. 3D SCHOLAR PARALLAX — Mouse Tracking
    // ─────────────────────────────────────────────
    const parallaxLayers = document.querySelectorAll('.parallax-layer');
    if (parallaxLayers.length === 0) return;

    let mouseX = 0, mouseY = 0, currentX = 0, currentY = 0;
    const lerp = (a, b, n) => (1 - n) * a + n * b;
    let parallaxRaf = null;

    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    function tickParallax() {
        currentX = lerp(currentX, mouseX, 0.07);
        currentY = lerp(currentY, mouseY, 0.07);
        parallaxLayers.forEach(layer => {
            const depth = parseFloat(layer.dataset.depth || 0.03);
            layer.style.transform = `translate(${currentX * depth * window.innerWidth * 0.4}px, ${currentY * depth * window.innerHeight * 0.4}px)`;
        });
        parallaxRaf = requestAnimationFrame(tickParallax);
    }

    if (aboutSection) {
        ScrollTrigger.create({
            trigger: aboutSection,
            start: 'top 95%', end: 'bottom 5%',
            onEnter: () => {
                if (bgScholar) gsap.to(bgScholar, { opacity: 1, duration: 0.6, ease: 'power2.out' });
                if (!parallaxRaf) tickParallax();
            },
            onEnterBack: () => {
                if (bgScholar) gsap.to(bgScholar, { opacity: 1, duration: 0.6, ease: 'power2.out' });
                if (!parallaxRaf) tickParallax();
            },
            onLeave: () => {
                if (bgScholar) gsap.to(bgScholar, { opacity: 0, duration: 0.6 });
                if (parallaxRaf) { cancelAnimationFrame(parallaxRaf); parallaxRaf = null; }
                parallaxLayers.forEach(l => l.style.transform = '');
            },
            onLeaveBack: () => {
                if (bgScholar) gsap.to(bgScholar, { opacity: 0, duration: 0.6 });
                if (parallaxRaf) { cancelAnimationFrame(parallaxRaf); parallaxRaf = null; }
                parallaxLayers.forEach(l => l.style.transform = '');
            },
        });
    }

    if (newsSection && bgNews) {
        ScrollTrigger.create({
            trigger: newsSection,
            start: 'top 95%', end: 'bottom 5%',
            onEnter: () => {
                gsap.to(bgNews, { opacity: 0.28, duration: 0.6, ease: 'power2.out' });
            },
            onEnterBack: () => {
                gsap.to(bgNews, { opacity: 0.28, duration: 0.6, ease: 'power2.out' });
            },
            onLeave: () => {
                gsap.to(bgNews, { opacity: 0, duration: 0.6 });
            },
            onLeaveBack: () => {
                gsap.to(bgNews, { opacity: 0, duration: 0.6 });
            }
        });
    }

    ScrollTrigger.create({
        trigger: heroSection,
        start: '60% top', end: 'bottom top',
        onEnter: () => { if (!parallaxRaf) tickParallax(); },
        onLeaveBack: () => { if (parallaxRaf) { cancelAnimationFrame(parallaxRaf); parallaxRaf = null; } },
    });
});

document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('js-enabled');

    // -------------------------------------------------------------
    // 1. MOBILE MENU TOGGLE
    // -------------------------------------------------------------
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            if (icon) {
                if (navLinks.classList.contains('active')) {
                    icon.classList.replace('fa-bars', 'fa-times');
                } else {
                    icon.classList.replace('fa-times', 'fa-bars');
                }
            }
        });
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                const icon = menuToggle.querySelector('i');
                if (icon) { icon.classList.replace('fa-times', 'fa-bars'); }
            });
        });
    }

    // -------------------------------------------------------------
    // 2. INTERACTIVE TOOLS / RESOURCES DATA & FILTER
    // -------------------------------------------------------------
    const toolsData = [
        { name: 'Shopify', category: 'ecommerce', description: 'Platform utama untuk membangun website e-commerce profesional, dropshipping, dan brand retail mandiri.', icon: 'fa-solid fa-store', rating: '4.8', link: 'https://shopify.com', badge: 'Sangat Direkomendasikan' },
        { name: 'ChatGPT Plus', category: 'ai', description: 'Asisten AI terbaik untuk menyusun copywriting iklan, skrip konten video edukasi, dan analisis pasar.', icon: 'fa-solid fa-robot', rating: '4.9', link: 'https://chat.openai.com', badge: 'Kecerdasan Buatan' },
        { name: 'MechaLens.ai', category: 'ai', description: 'Platform AI image & video kustom untuk mempercepat visual ideation, prototyping, dan creative workflows bisnis.', icon: 'fa-solid fa-wand-magic-sparkles', rating: '4.9', link: 'https://www.instagram.com/tommyteja', badge: 'Platform Tommy', isSpecial: true },
        { name: 'Midjourney', category: 'design', description: 'Generator gambar AI untuk membuat visual produk, desain kemasan, dan konsep visual kain kreatif secara instan.', icon: 'fa-solid fa-palette', rating: '4.7', link: 'https://midjourney.com', badge: 'Desain AI' },
        { name: 'CapCut Desktop', category: 'video', description: 'Software editing video andalan untuk membuat video pendek (Reels/TikTok) dengan cepat dan berkualitas tinggi.', icon: 'fa-solid fa-video', rating: '4.8', link: 'https://capcut.com', badge: 'Content Creation' },
        { name: 'Canva Pro', category: 'design', description: 'Tools desain grafis berbasis cloud terbaik untuk membuat materi promosi, proposal bisnis, dan feed Instagram estetik.', icon: 'fa-solid fa-wand-magic-sparkles', rating: '4.6', link: 'https://canva.com', badge: 'Desain Grafis' },
    ];

    const toolsGrid = document.getElementById('tools-grid');
    const filterButtons = document.querySelectorAll('.filter-btn');

    const renderTools = (data) => {
        if (!toolsGrid) return;
        toolsGrid.innerHTML = '';
        data.forEach(tool => {
            const card = document.createElement('div');
            card.className = 'tool-card fade-in';
            card.style.opacity = '0';
            card.style.transform = 'translateY(15px)';
            const badgeClass = tool.isSpecial ? 'tool-badge tool-badge-green' : 'tool-badge';
            card.innerHTML = `
                <div>
                    <div class="tool-header">
                        <span class="${badgeClass}">${tool.badge}</span>
                        <div class="tool-icon-wrapper"><i class="${tool.icon}"></i></div>
                    </div>
                    <h3>${tool.name}</h3>
                    <p>${tool.description}</p>
                </div>
                <div class="tool-footer">
                    <div class="tool-rating"><i class="fa-solid fa-star"></i><span>${tool.rating} <span>/ 5</span></span></div>
                    <a href="${tool.link}" target="_blank" class="tool-get-btn">Kunjungi <i class="fa-solid fa-arrow-up-right-from-square"></i></a>
                </div>`;
            toolsGrid.appendChild(card);
            setTimeout(() => {
                card.style.transition = 'opacity 0.4s ease, transform 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 50);
        });
    };

    if (toolsGrid) renderTools(toolsData);

    if (filterButtons.length > 0) {
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const v = btn.getAttribute('data-filter');
                renderTools(v === 'all' ? toolsData : toolsData.filter(t => t.category === v));
            });
        });
    }

    // -------------------------------------------------------------
    // 3. ANIMATED STATS COUNTER
    // -------------------------------------------------------------
    const stats = document.querySelectorAll('.stat-number');
    let animated = false;
    const animateCounters = () => {
        if (animated) return;
        animated = true;
        stats.forEach(stat => {
            const targetAttr = stat.getAttribute('data-target');
            const target = parseFloat(targetAttr);
            const suffix = stat.getAttribute('data-suffix') || '';
            const isFloat = targetAttr.includes('.');
            const steps = 50;
            let current = 0, step = 0;
            const timer = setInterval(() => {
                step++; current += target / steps;
                if (step >= steps || current >= target) {
                    clearInterval(timer);
                    stat.innerText = (isFloat ? target.toFixed(1) : Math.round(target)) + suffix;
                } else {
                    stat.innerText = (isFloat ? current.toFixed(1) : Math.round(current)) + suffix;
                }
            }, 30);
        });
    };
    const statsSection = document.querySelector('.stats-grid');
    if (statsSection) {
        new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) { animateCounters(); } });
        }, { threshold: 0.2 }).observe(statsSection);
    }

    // -------------------------------------------------------------
    // 4. SCROLL SLIDE-IN TIMELINE ITEMS
    // -------------------------------------------------------------
    const milestoneItems = document.querySelectorAll('.milestone-item');
    if (milestoneItems.length > 0) {
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
        }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
        milestoneItems.forEach(item => obs.observe(item));
    }

    // -------------------------------------------------------------
    // 5. SCROLL TIMELINE ACTIVE PROGRESS LINE
    // -------------------------------------------------------------
    const timeline = document.querySelector('.milestone-timeline');
    const activeLine = document.querySelector('.timeline-track-active');
    const dots = document.querySelectorAll('.milestone-dot');
    if (timeline && activeLine) {
        let timelineTop = 0;
        let timelineHeight = 0;
        let dotOffsets = [];

        function cacheTimelinePositions() {
            const rect = timeline.getBoundingClientRect();
            timelineTop = rect.top + window.pageYOffset;
            timelineHeight = rect.height;
            dotOffsets = Array.from(dots).map(dot => {
                return {
                    element: dot,
                    absoluteTop: dot.getBoundingClientRect().top + window.pageYOffset
                };
            });
        }

        // Cache positions once and update on resize to prevent layout thrashing (no getBoundingClientRect during scroll)
        cacheTimelinePositions();
        window.addEventListener('resize', cacheTimelinePositions, { passive: true });

        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const targetY = scrolled + window.innerHeight * 0.6;
            let progress = (targetY - timelineTop) / timelineHeight;
            progress = Math.max(0, Math.min(1, progress));
            activeLine.style.height = `${progress * 100}%`;
            
            dotOffsets.forEach(dot => {
                dot.absoluteTop < targetY
                    ? dot.element.classList.add('active')
                    : dot.element.classList.remove('active');
            });
        }, { passive: true });
    }

    // Cache liquid background element once
    const liquidBg = document.querySelector('.liquid-bg');
    if (liquidBg) {
        document.addEventListener('mousemove', (e) => {
            const percentX = e.clientX / window.innerWidth - 0.5;
            const percentY = e.clientY / window.innerHeight - 0.5;
            liquidBg.style.transform = `translate(${percentX * 20}px, ${percentY * 20}px)`;
        });
    }

    // Cache floating art elements and parse their scroll speeds once
    const floatingArtElements = Array.from(document.querySelectorAll('.floating-glass-art')).map(img => {
        const styleAttr = img.getAttribute('style') || '';
        const match = styleAttr.match(/animation-duration:\s*(\d+)s/);
        const duration = match ? parseFloat(match[1]) : 10;
        const speed = duration * 0.01;
        return {
            element: img,
            speed: speed
        };
    });

    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        floatingArtElements.forEach(item => {
            item.element.style.transform = `translateY(${scrolled * (item.speed - 0.05)}px)`;
        });
    }, { passive: true });

    // -------------------------------------------------------------
    // 7. 3D CARD TILT
    // -------------------------------------------------------------
    document.querySelectorAll('[data-tilt]').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const rotateX = ((rect.height / 2 - (e.clientY - rect.top)) / (rect.height / 2)) * 3;
            const rotateY = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 3;
            card.style.transform = `translateY(-6px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.008)`;
            card.style.transition = 'transform 0.08s ease';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) rotateX(0deg) rotateY(0deg) scale(1)';
            card.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        });
    });

    // -------------------------------------------------------------
    // 8. SCROLL SPY & COLOR MORPHING
    // -------------------------------------------------------------
    const sections = document.querySelectorAll('section');
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const sectionMeta = {
        'home': { glow: 'rgba(134, 51, 255, 0.18)', accent: '#8633ff' },
        'about': { glow: 'rgba(217, 119, 6, 0.15)', accent: '#d97706' },
        'news': { glow: 'rgba(59, 130, 246, 0.18)', accent: '#3b82f6' },
        'ventures': { glow: 'rgba(16, 185, 129, 0.18)', accent: '#10b981' },
        'achievements': { glow: 'rgba(236, 72, 153, 0.15)', accent: '#ec4899' },
        'contact': { glow: 'rgba(249, 115, 22, 0.18)', accent: '#f97316' },
    };

    new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const id = entry.target.getAttribute('id');
            if (!id || !sectionMeta[id]) return;
            sections.forEach(s => s.classList.remove('active-section'));
            entry.target.classList.add('active-section');
            sidebarItems.forEach(item => {
                item.getAttribute('data-section') === id
                    ? item.classList.add('active')
                    : item.classList.remove('active');
            });
            document.documentElement.style.setProperty('--section-glow', sectionMeta[id].glow);
            document.documentElement.style.setProperty('--section-accent', sectionMeta[id].accent);
        });
    }, { root: null, rootMargin: '-30% 0px -40% 0px', threshold: 0 });
    // Observe all sections
    // (observer stored so we can reference it; call observe on each section)
    (function () {
        const obs2 = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const id = entry.target.getAttribute('id');
                if (!id || !sectionMeta[id]) return;
                sections.forEach(s => s.classList.remove('active-section'));
                entry.target.classList.add('active-section');
                sidebarItems.forEach(item => {
                    item.getAttribute('data-section') === id
                        ? item.classList.add('active')
                        : item.classList.remove('active');
                });
                document.documentElement.style.setProperty('--section-glow', sectionMeta[id].glow);
                document.documentElement.style.setProperty('--section-accent', sectionMeta[id].accent);
            });
        }, { root: null, rootMargin: '-30% 0px -40% 0px', threshold: 0 });
        sections.forEach(s => obs2.observe(s));
    })();

    setTimeout(() => window.dispatchEvent(new Event('scroll')), 200);



    // -------------------------------------------------------------
    // 10. TILT-SHIFT VIEWPORT OVERLAYS CINEMATIC ENTRANCE
    // -------------------------------------------------------------
    setTimeout(() => {
        document.querySelectorAll('.tilt-shift-overlay').forEach(o => o.classList.add('active'));
    }, 400);
});

/* =============================================================
   11. MULTI-LANGUAGE TRANSLATOR (EN/ID)
   ============================================================= */
const TRANSLATIONS = {
    en: {
        // Navigation Links (Mobile dropdown & Hero Menu)
        "nav_home": "Home",
        "nav_about": "About",
        "nav_news": "News",
        "nav_ventures": "Ventures",
        "nav_journey": "Journey",
        "nav_contact": "Contact",

        // Hero
        "hero_title": "Tommy Teja <em>Adhiraja</em>",
        "hero_subtitle": "Finance | Technology | Creative Industries",
        "hero_btn_wa": "<i class=\"fa-brands fa-whatsapp\"></i> Contact Us",

        // Ventures
        "ventures_label": "// SEC_01 // MY VENTURES",
        "ventures_title": "Selected <em>Ventures</em> &amp; Impact",
        "ventures_desc": "Building technology platforms, community hubs, and advisory channels to drive digital transformation.",
        
        "ventures_zando_title": "Creative &amp; Social-Commerce",
        "ventures_zando_desc": "Leading this agency to drive exponential growth for local brands on TikTok through live shopping, viral content creation, and data-driven performance ads.",
        "ventures_zando_btn": "Explore Zando Agency <i class=\"fa-solid fa-arrow-right\"></i>",
        
        "ventures_aico_title": "Accelerating Artificial Intelligence",
        "ventures_aico_desc": "Indonesia's largest AI educational community to empower local talent, entrepreneurs, and creators to master automation and generative tools.",
        "ventures_aico_btn": "Explore AICO Community <i class=\"fa-solid fa-arrow-right\"></i>",
        
        "ventures_mecha_title": "Visual Automation &amp; Prototyping",
        "ventures_mecha_desc": "A cutting-edge generative AI platform providing high efficiency for the advertising industry in designing promotional assets (prototyping) at lightning speed.",
        "ventures_mecha_btn": "Explore MechaLens <i class=\"fa-solid fa-arrow-right\"></i>",

        // About
        "about_label": "// SEC_02 // GET TO KNOW ME",
        "about_title": "A Fusion of <em>Finance</em>, <em>Technology</em> &amp; <em>Creative Industries</em>",
        "about_p1": "I build the AI adoption ecosystem in Indonesia for business owners, creators, professionals, and young talents. As Co-Founder of AICO Community, I initiate practical, easy-to-understand, and accessible AI education programs for everyone.",
        "about_p2": "In the creative industry, I lead Zando Agency (an AI-based creative & social-commerce agency) as Co-Founder & CEO, and co-developed the visual generative AI platform MechaLens.ai to accelerate visual prototyping.",
        "about_p3": "With a finance and accounting background from The University of Melbourne, I view AI practically: not just a cool trend, but a tactical system to drive productivity, collaboration, and business execution.",
        "about_stat1": "Social Followers",
        "about_stat2": "Education Views",
        "about_stat3": "Business Partners",
        "about_quote": "\"The key to business success today is not just about how much capital you have, but how quickly you can adopt new technologies and adapt to digital market trends.\"",

        // News Header
        "news_label": "// SEC_03 // FEATURED PRESS",
        "news_title": "Tommy Teja in the <em>Media</em>",
        "news_desc": "National media coverage of Tommy Teja's contribution to fintech adoption and national digital economy empowerment.",

        // Journey Header
        "journey_label": "// SEC_04 // DIORAMA",
        "journey_title": "Professional Track Record",
        "journey_subtitle": "A journey of innovation, from the sky of imagination to grounded reality.",
        
        // Journey Blocks
        "journey_block1_badge": "Program Co-Organizer",
        "journey_block1_title": "AICO Voyage China",
        "journey_block1_desc": "Organizing robotics study excursions and artificial intelligence ecosystem visits in China.",
        "journey_block1_hl1": "Study Excursion",
        "journey_block1_hl2": "China AI",
        "journey_block1_hl3": "Robotics",

        "journey_block2_badge": "Invited Creator",
        "journey_block2_title": "Google I/O Watch Party | Singapore",
        "journey_block2_desc": "Exclusive coverage of Google's latest AI technology launches for the Indonesian market.",
        "journey_block2_hl1": "Google I/O",
        "journey_block2_hl2": "Google AI",
        "journey_block2_hl3": "Singapore",

        "journey_block3_badge": "Workshop Trainer",
        "journey_block3_title": "Bank Mandiri &amp; Danantara | Hong Kong",
        "journey_block3_desc": "Training Indonesian migrant workers in generative AI applications at Grand Hyatt Hong Kong.",
        "journey_block3_hl1": "Bank Mandiri",
        "journey_block3_hl2": "Danantara",
        "journey_block3_hl3": "Hong Kong",

        "journey_block4_badge": "Invited Speaker &amp; Host",
        "journey_block4_title": "AI: The Next Chapter | Sydney",
        "journey_block4_desc": "Discussing the future tech landscape and talent development with Macquarie University, Australia.",
        "journey_block4_hl1": "Macquarie Univ",
        "journey_block4_hl2": "AIFI",
        "journey_block4_hl3": "Cross-Border",

        // Contact
        "contact_label": "// SEC_05 // CONNECT WITH ME",
        "contact_title": "Let's <em>Connect!</em>",
        "contact_desc": "Want to discuss business, invite me to speak at a workshop/webinar, or collaborate? Feel free to reach out directly through any of these platforms!",
        "contact_wa_sub": "Connect via Chat",
        "contact_email_sub": "Send Inquiry",
        "contact_linkedin_sub": "Professional Connection"
    },
    id: {
        // Navigation Links (Mobile dropdown & Hero Menu)
        "nav_home": "Home",
        "nav_about": "Tentang",
        "nav_news": "Berita",
        "nav_journey": "Prestasi",
        "nav_ventures": "Bisnis",
        "nav_contact": "Hubungi",

        // Hero
        "hero_title": "Tommy Teja <em>Adhiraja</em>",
        "hero_subtitle": "Finansial | Teknologi | Industri Kreatif",
        "hero_btn_wa": "<i class=\"fa-brands fa-whatsapp\"></i> Contact Us",

        // Ventures
        "ventures_label": "// SEC_01 // BISNIS GW",
        "ventures_title": "Selected <em>Ventures</em> &amp; Impact",
        "ventures_desc": "Membangun platform teknologi, wadah komunitas, dan kanal penasihat untuk mendorong transformasi digital.",
        
        "ventures_zando_title": "Creative &amp; Social-Commerce",
        "ventures_zando_desc": "Memimpin agensi ini untuk mendorong pertumbuhan eksponensial brand lokal di platform TikTok melalui strategi live shopping, pembuatan konten viral, dan performance ads berbasis data.",
        "ventures_zando_btn": "Lihat Zando Agency <i class=\"fa-solid fa-arrow-right\"></i>",
        
        "ventures_aico_title": "Akselerasi Kecerdasan Buatan",
        "ventures_aico_desc": "Komunitas edukasi AI terbesar di Indonesia untuk memberdayakan talenta lokal, pengusaha, dan kreator agar menguasai automasi dan alat bantu generatif secara aplikatif.",
        "ventures_aico_btn": "Lihat AICO Community <i class=\"fa-solid fa-arrow-right\"></i>",
        
        "ventures_mecha_title": "Otomatisasi Visual &amp; Prototyping",
        "ventures_mecha_desc": "Platform generatif AI mutakhir untuk memberikan efisiensi tinggi bagi industri periklanan dalam merancang aset promosi (prototyping) dengan kecepatan kilat.",
        "ventures_mecha_btn": "Lihat MechaLens <i class=\"fa-solid fa-arrow-right\"></i>",

        // About
        "about_label": "// SEC_01 // MENGENAL LEBIH DEKAT",
        "about_title": "Kombinasi <em>Finansial</em>, <em>Teknologi</em> &amp; <em>Industri Kreatif</em>",
        "about_p1": "Gw membangun ekosistem adopsi AI di Indonesia untuk pelaku usaha, kreator, profesional, dan talenta muda. Sebagai Co-Founder AICO Community, gw menginisiasi program edukasi AI yang praktis, gampang dipahami, dan bisa diakses oleh siapa saja.",
        "about_p2": "Di industri kreatif, gw memimpin Zando Agency (agensi kreatif & social-commerce berbasis AI) sebagai Co-Founder & CEO, serta ikut mengembangkan platform visual generatif AI MechaLens.ai untuk mempercepat prototyping materi visual kreatif.",
        "about_p3": "Dengan latar belakang keuangan dan akuntansi dari The University of Melbourne, gw melihat teknologi AI secara praktis: bukan cuma sekadar tren keren, tapi sistem taktis buat ngedorong produktivitas, kolaborasi, dan eksekusi bisnis kita.",
        "about_stat1": "Pengikut Sosial",
        "about_stat2": "Edukasi Views",
        "about_stat3": "Partner Bisnis",
        "about_quote": "\"Kunci sukses bisnis hari ini bukan cuma soal seberapa gede modal yang kamu punya, tapi seberapa cepat kamu bisa adopsi teknologi baru dan adaptasi dengan tren pasar digital.\"",

        // News Header
        "news_label": "// SEC_03 // SOROTAN PUBLIKASI",
        "news_title": "Tommy Teja dalam <em>Berita</em>",
        "news_desc": "Liputan media nasional mengenai kontribusi Tommy Teja dalam adopsi teknologi finansial dan pemberdayaan ekonomi digital nasional.",

        // Journey Header
        "journey_label": "// SEC_04 // DIORAMA",
        "journey_title": "Rekam Jejak Profesional",
        "journey_subtitle": "Sebuah perjalanan inovasi, dari langit imajinasi hingga realitas membumi.",
        
        // Journey Blocks
        "journey_block1_badge": "Program Co-Organizer",
        "journey_block1_title": "AICO Voyage China",
        "journey_block1_desc": "Mengorganisasi studi ekskursi teknologi robotik dan ekosistem kecerdasan buatan di China.",
        "journey_block1_hl1": "Studi Ekskursi",
        "journey_block1_hl2": "China AI",
        "journey_block1_hl3": "Robotik",

        "journey_block2_badge": "Invited Creator",
        "journey_block2_title": "Google I/O Watch Party | Singapura",
        "journey_block2_desc": "Liputan eksklusif peluncuran inovasi teknologi AI terbaru Google untuk pasar Indonesia.",
        "journey_block2_hl1": "Google I/O",
        "journey_block2_hl2": "Google AI",
        "journey_block2_hl3": "Singapura",

        "journey_block3_badge": "Workshop Trainer",
        "journey_block3_title": "Bank Mandiri &amp; Danantara | Hong Kong",
        "journey_block3_desc": "Pelatihan pemanfaatan AI generatif untuk wirausaha mandiri pekerja migran Indonesia di Grand Hyatt Hong Kong.",
        "journey_block3_hl1": "Bank Mandiri",
        "journey_block3_hl2": "Danantara",
        "journey_block3_hl3": "Hong Kong",

        "journey_block4_badge": "Invited Speaker &amp; Host",
        "journey_block4_title": "AI: The Next Chapter | Sydney",
        "journey_block4_desc": "Diskusi lanskap teknologi dan talenta masa depan bersama Macquarie University, Australia.",
        "journey_block4_hl1": "Macquarie Univ",
        "journey_block4_hl2": "AIFI",
        "journey_block4_hl3": "Lintas Batas",

        // Contact
        "contact_label": "// SEC_05 // HUBUNGI GW",
        "contact_title": "Yuk, <em>Terkoneksi!</em>",
        "contact_desc": "Mau diskusi bisnis, undang gw jadi pembicara workshop/webinar, or kolaborasi bareng? Kontak gw langsung lewat platform di bawah ini ya!",
        "contact_wa_sub": "Hubungi via Chat",
        "contact_email_sub": "Kirim Inquiry",
        "contact_linkedin_sub": "Koneksi Profesional"
    }
};

function setLanguage(lang) {
    localStorage.setItem('site_lang', lang);

    // Update Toggle Button UI
    const langToggle = document.getElementById('langSwitchToggle');
    if (langToggle) {
        langToggle.querySelectorAll('.lang-option').forEach(opt => {
            if (opt.getAttribute('data-lang') === lang) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
    }

    // Translate all elements
    const elements = document.querySelectorAll('[data-translate]');
    elements.forEach(el => {
        const key = el.getAttribute('data-translate');
        if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key] !== undefined) {
            const translation = TRANSLATIONS[lang][key];
            if (translation.includes('<') || el.children.length > 0 || el.tagName === 'A' || el.tagName === 'H3' || el.tagName === 'H2' || el.tagName === 'H1') {
                el.innerHTML = translation;
            } else {
                el.textContent = translation;
            }
        }
    });
}

// Initialize Translator
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang === 'en' || urlLang === 'id') {
        localStorage.setItem('site_lang', urlLang);
    }
    const savedLang = localStorage.getItem('site_lang') || 'en';
    setLanguage(savedLang);
    
    // Add Click Listener to Toggle
    const langToggle = document.getElementById('langSwitchToggle');
    if (langToggle) {
        langToggle.addEventListener('click', () => {
            const currentLang = localStorage.getItem('site_lang') || 'en';
            const newLang = currentLang === 'en' ? 'id' : 'en';
            setLanguage(newLang);
        });
    }

    // ── Slideshow Controller for Professional Journey ──
    const slideshows = document.querySelectorAll('.journey-slideshow');
    slideshows.forEach(show => {
        const slides = show.querySelectorAll('.journey-photo-placeholder');
        if (slides.length <= 1) return;
        let index = 0;
        
        // Initialize first slide as active
        slides[0].classList.add('active-slide');
        
        let intervalId = setInterval(nextSlide, 4000);
        
        function nextSlide() {
            slides[index].classList.remove('active-slide');
            index = (index + 1) % slides.length;
            slides[index].classList.add('active-slide');
        }
        
        // Hover listeners to pause/resume
        show.parentElement.addEventListener('mouseenter', () => {
            clearInterval(intervalId);
        });
        show.parentElement.addEventListener('mouseleave', () => {
            clearInterval(intervalId);
            intervalId = setInterval(nextSlide, 4000);
        });
    });

    // ── Phone Video Slideshow Controller ──
    const phoneVideoSlideshows = document.querySelectorAll('.phone-video-slideshow');
    phoneVideoSlideshows.forEach(show => {
        const videos = show.querySelectorAll('.phone-video-player');
        if (videos.length <= 1) return;
        let index = 0;
        
        // Initialize first video as active
        videos[0].classList.add('active-video-slide');
        
        let intervalId = setInterval(nextVideo, 6000);
        
        function nextVideo() {
            videos[index].classList.remove('active-video-slide');
            index = (index + 1) % videos.length;
            videos[index].classList.add('active-video-slide');
        }
        
        // Hover listeners to pause/resume
        show.parentElement.addEventListener('mouseenter', () => {
            clearInterval(intervalId);
        });
        show.parentElement.addEventListener('mouseleave', () => {
            clearInterval(intervalId);
            intervalId = setInterval(nextVideo, 6000);
        });
    });
});
