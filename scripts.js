(() => {
    const findEl = s => document.querySelector(s);
    const findAll = s => [...document.querySelectorAll(s)];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

    const rootStyle = document.documentElement.style;
    const body = document.body;
    const card = findEl('.card'), stage = findEl('.stage');
    const wide = () => matchMedia('(min-width: 760px) and (min-aspect-ratio: 1/1)').matches;

    // Size the address to fill the space: one line when wide, three rows in portrait.
    // Everything snaps to the column grid: the address spans whole columns,
    // its ink (not its glyph boxes) starts and ends on a column line, and each
    // vertical leader line drops onto a column line.
    const GAP = 20;
    // One line weight for the hand, arrows and bracket, set from the type size.
    // Each SVG scales its strokes, so convert the target pixels into its own units.
    function setStrokes(fsNow) {
        const px = Math.max(2, Math.min(3.6, fsNow * .028));
        rootStyle.setProperty('--stroke', px + 'px');
        findAll('.note svg.down, .note svg.left').forEach(svg => {
            const h = Number.parseFloat(getComputedStyle(svg).height);
            if (h) svg.style.strokeWidth = px * svg.viewBox.baseVal.height / h;
        });
        const hh = Number.parseFloat(getComputedStyle(findEl('.note .hand')).height);
        if (hh) rootStyle.setProperty('--hand-sw', px * 28 / hh);
    }

    const ctx = document.createElement('canvas').getContext('2d');

    const glyph = (ch, fs) => {
        ctx.font = `800 ${fs}px ${css('--display')}`;
        const m = ctx.measureText(ch);
        return {
            lsb: -m.actualBoundingBoxLeft,
            rsb: m.width + fs * parseFloat(css('--track')) - m.actualBoundingBoxRight
        };
    };

    const firstLast = seg => {
        const t = [...seg.querySelectorAll('.ch')].filter(c => !c.closest('.im')).map(c => (c.querySelector('.lo') || c).textContent);
        return [t[0], t[t.length - 1]];
    };

    function grid() {
        const n = wide() ? 12 : 4;
        const x0 = stage.getBoundingClientRect().left, W = stage.clientWidth;
        const colW = (W - GAP * (n - 1)) / n;
        const edges = [];
        for (let i = 0; i < n; i++) {
            const l = x0 + i * (colW + GAP);
            edges.push(l, l + colW);
        }
        return {n, W, colW, edges};
    }

    function fit() {
        const gridInfo = grid();
        const segs = findAll('.seg');
        const rows = wide() ? [segs] : segs.map(s => [s]);
        const fs = parseFloat(getComputedStyle(card).getPropertyValue('--fs')) || 64;
        // Ink width of the widest row at the current size.
        const ink = rows.map(r => {
            const box = r.reduce((w, s) => w + s.getBoundingClientRect().width, 0);
            const [a] = firstLast(r[0]), [, z] = firstLast(r[r.length - 1]);
            return box - glyph(a, fs).lsb - glyph(z, fs).rsb;
        });

        const inkW = Math.max(...ink);

        // Largest whole-column span whose card still fits the height.
        let span = gridInfo.W, next = fs;
        for (let k = gridInfo.n; k >= 1; k--) {
            span = k * gridInfo.colW + (k - 1) * GAP;
            next = Math.max(28, fs * span / inkW);
            card.style.setProperty('--fs', next + 'px');
            card.style.width = span + 'px';
            if ((card.offsetHeight <= stage.clientHeight && next <= 150) || next === 28) break;
        }
        // Pull each row left by its first glyph's side bearing so the ink sits on the line.
        if (wide()) {
            segs.forEach(s => s.style.marginLeft = '');
            segs[0].style.marginLeft = -glyph(firstLast(segs[0])[0], next).lsb + 'px';
        } else {
            segs.forEach(s => s.style.marginLeft = -glyph(firstLast(s)[0], next).lsb + 'px');
        }
        snapNotes(gridInfo);
        setStrokes(next);
        buildCols();
    }

    function snapNotes(g) {
        findAll('.note').forEach(n => {
            n.style.translate = '';
            const down = n.querySelector('svg.down');
            if (!down || getComputedStyle(down).display === 'none') return;
            const seg = n.closest('.seg').getBoundingClientRect();
            const x = down.getBoundingClientRect().left + down.getBoundingClientRect().width / 2;
            const inSeg = g.edges.filter(e => e > seg.left + 8 && e < seg.right - 8);
            if (!inSeg.length) return;
            const best = inSeg.reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a);
            n.style.translate = (best - x) + 'px 0';
        });
    }

    // Columns: 12 on wide screens, 4 on phones
    // Columns: 12 across the content on wide screens, 4 on phones; the rhythm repeats to the screen edges.
    function buildCols() {
        const g = grid();
        const bg = findEl('.b-cols');
        bg.style.setProperty('--colw', g.colW + 'px');
        bg.style.setProperty('--gap', GAP + 'px');
        bg.style.setProperty('--x0', (g.edges[0] % (g.colW + GAP)) + 'px');
    }

    buildCols();


    // Copy
    const reachText = findEl('.reach-text'), status = findEl('#status');
    let copyT;
    findEl('.reach').addEventListener('click', () => {
        const done = (label, msg) => {
            reachText.textContent = label;
            status.textContent = msg;
            clearTimeout(copyT);
            copyT = setTimeout(() => reachText.textContent = 'Reach out here', 2000);
        };
        const fallback = () => {
            try {
                const r = document.createRange();
                r.selectNodeContents(findEl('.email'));
                const s = getSelection();
                s.removeAllRanges();
                s.addRange(r);
            } catch (e) {
                // ignore
            }
            done('Selected, copy away', 'Email address selected');
        };
        try {
            navigator.clipboard
                .writeText('hello@seanthorne.co.uk')
                .then(() => done('Copied, speak soon', 'Email address copied'), fallback);
        } catch (e) {
            fallback();
        }
    });

    // Intro
    //
    // Opens on a greeting, "Hello, / I'm Sean" and a wave. Then each piece is carried to where it
    // lives: Hello becomes hello, Sean starts seanthorne, the hand becomes the note above hello.
    const EASE_IN = 'cubic-bezier(.16, 1, .3, 1)';     // arrivals
    const EASE_MOVE = 'cubic-bezier(.4, 0, .2, 1)';    // journeys
    const EASE_OUT = 'cubic-bezier(.4, 0, 1, 1)';      // exits
    let intro = false, anims = [], timers = [], refit = false;
    const greet = findEl('.greet');

    function finishIntro(e) {
        if (!intro) return;
        intro = false;
        timers.forEach(clearTimeout);
        anims.forEach(a => {
            try {
                a.finish();
                a.cancel();
            } catch (x) {
                // ignore
            }
        });
        anims = [];
        body.classList.remove('intro', 'greeting');
        findAll('.greet .fl').forEach(f => f.style.width = '');
        Object.assign(findEl('.g-hand').style, {position: '', left: '', top: '', marginLeft: ''});
        removeEventListener('pointerdown', finishIntro);
        // A tap that skips the intro must not also press whatever is under the finger.
        if (e && e.type === 'pointerdown') {
            const eat = ev => {
                ev.preventDefault();
                ev.stopPropagation();
            };
            addEventListener('click', eat, {capture: true, once: true});
            setTimeout(() => removeEventListener('click', eat, {capture: true}), 700);
        }
        if (refit) {
            refit = false;
            fit();
        }
        startWaves();
    }

    // The hand waves after the intro, when you point at it, and now and then after that.
    const hand = findEl('.hand');
    let waving = null, waveTimer = 0;
    const WAVE = [{rotate: '0deg'}, {rotate: '-20deg'}, {rotate: '16deg'}, {rotate: '-14deg'}, {rotate: '10deg'}, {rotate: '-5deg'}, {rotate: '0deg'}];

    function wave() {
        if (reduce || exploded || (waving && waving.playState === 'running')) return;
        waving = hand.animate(WAVE, {duration: 1400, easing: 'ease-in-out'});
    }

    function startWaves() {
        if (reduce || waveTimer) return;
        waveTimer = setInterval(() => {
            if (!document.hidden) wave();
        }, 9000);
        findEl('.seg-hello').addEventListener('pointerenter', wave);
    }

    const run = (el, kf, o) => {
        const a = el.animate(kf, Object.assign({fill: 'both'}, o));
        anims.push(a);
        return a;
    };

    function playIntro() {
        body.classList.remove('is-pending');
        if (reduce) return;
        intro = true;
        body.classList.add('intro', 'greeting');
        addEventListener('pointerdown', finishIntro);

        const vw = innerWidth, vh = innerHeight;
        const fs = parseFloat(getComputedStyle(card).getPropertyValue('--fs'));
        const box = el => el.getBoundingClientRect();

        // Where each traveller lands (the address is laid out, only hidden).
        const toHello = box(findAll('.txt')[0]);
        const toSean = {left: box(findEl('.ch.sean')).left, top: box(findAll('.txt')[1]).top};
        const toHand = box(hand);
        const cardBox = box(card);

        // Size and place the greeting: as big as the screen allows, laid out at that size.
        greet.style.fontSize = fs + 'px';
        const g0 = box(greet);
        const G = Math.min(vw * .9 / g0.width, vh * .5 / g0.height, 3.4, 300 / fs);
        greet.style.fontSize = fs * G + 'px';
        const gb = box(greet);
        const cy = wide() ? vh * .5 : Math.min(vh * .5, cardBox.top + cardBox.height * .5);
        greet.style.left = (vw - gb.width) / 2 + 'px';
        greet.style.top = Math.max(16, cy - gb.height / 2) + 'px';

        const gHello = findEl('.g-hello'), gSean = findEl('.g-sean'), gHand = findEl('.g-hand');
        const fromHello = box(gHello), fromSean = box(gSean), fromHand = box(gHand);
        // Pin the hand where it is, so the S to s change in "Sean" can't nudge it sideways mid-flight.
        const gBox = box(greet);
        Object.assign(gHand.style, {
            position: 'absolute',
            left: fromHand.left - gBox.left + 'px',
            top: fromHand.top - gBox.top + 'px',
            marginLeft: '0'
        });
        const fly = (from, to, k) => `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${k})`;
        const k = 1 / G;
        const rise = `translateY(${fs * G * .22}px)`;

        // Timeline (ms after start)
        const L1 = 100, L2 = 220, ENTER = 600;          // greeting enters, line by line
        const HAND_IN = 380, WAVE_AT = 420, WAVE_FOR = 700;
        const HELLO_GO = 1250, SEAN_GO = 1340, FLY = 800;
        // Desktop: the hand leaves first and arcs over the words. Phone: the greeting sits over the
        // address, so the hand waits for hello to shrink out of its way, then follows.
        const HAND_GO = wide() ? 1150 : SEAN_GO + 120, HAND_FLY = wide() ? 1050 : 900;
        const SEAN_LAND = SEAN_GO + FLY, HAND_LAND = HAND_GO + HAND_FLY;

        // Greeting lines enter.
        const enter = (el, at) => run(el, [{opacity: 0, transform: rise}, {
            opacity: 1,
            transform: 'translateY(0px)'
        }], {delay: at, duration: ENTER, easing: EASE_IN, fill: 'backwards'});
        // Words: enter, hold, then travel. One animation each.
        const word = (el, at, go, to) => {
            const d = go + FLY - at;
            run(el, [
                {opacity: 0, transform: rise, easing: EASE_IN},
                {opacity: 1, transform: 'translateY(0px)', offset: ENTER / d},
                {opacity: 1, transform: 'translateY(0px)', offset: (go - at) / d, easing: EASE_MOVE},
                {opacity: 1, transform: to}
            ], {delay: at, duration: d});
        };
        word(gHello, L1, HELLO_GO, fly(fromHello, toHello, k));
        word(gSean, L2, SEAN_GO, fly(fromSean, toSean, k));
        // Mid-flight, only the first letter changes case; the rest of the word slides to close the gap.
        [[gHello, HELLO_GO], [gSean, SEAN_GO]].forEach(([w, go]) => {
            const fl = w.querySelector('.fl'), cap = fl.querySelector('.cap'), low = fl.querySelector('.low');
            const capW = box(cap).width, lowW = box(low).width;
            const t = go + FLY * .35, d = FLY * .25;
            run(fl, [{width: capW + 'px'}, {width: lowW + 'px'}], {delay: t, duration: d, easing: EASE_MOVE});
            run(cap, [{opacity: 1}, {opacity: 0}], {delay: t, duration: d * .7});
            run(low, [{opacity: 0}, {opacity: 1}], {delay: t + d * .3, duration: d * .7});
        });
        // The comma travels with hello and fades early; "I'm" fades as sean pulls away from it.
        const comma = findEl('.g-comma'), im = findEl('.g-im');
        run(comma, [{opacity: 1}, {opacity: 0}], {delay: HELLO_GO, duration: FLY * .3, easing: EASE_OUT});
        enter(im, L2);
        run(im, [{opacity: 1, transform: 'translateY(0px)'}, {
            opacity: 0,
            transform: `translateY(${-fs * G * .12}px)`
        }], {delay: SEAN_GO, duration: FLY * .3, easing: EASE_OUT, fill: 'forwards'});

        // The hand: pops in, waves, then leaves first on an arc over the words, and settles.
        const hd = HAND_GO + HAND_FLY - HAND_IN;
        run(gHand, [
            {opacity: 0, transform: 'translate(0px, 0px) scale(.4)', easing: 'cubic-bezier(.34, 1.5, .64, 1)'},
            {opacity: 1, transform: 'translate(0px, 0px) scale(1)', offset: 450 / hd},
            {
                opacity: 1,
                transform: 'translate(0px, 0px) scale(1)',
                offset: (HAND_GO - HAND_IN) / hd,
                easing: EASE_MOVE
            },
            {opacity: 1, transform: fly(fromHand, toHand, toHand.height / fromHand.height)}
        ], {delay: HAND_IN, duration: hd});

        // Arc: on desktop it lifts over the words; on a phone it also holds out to the right a little
        // longer, so it rises past hello before turning left onto its note.
        const lift = -fromHand.height * (wide() ? .8 : 1);
        const push = wide() ? 0 : Math.abs(toHand.left - fromHand.left) * .45;
        run(findEl('.g-arc'), [
            {translate: '0 0', easing: 'cubic-bezier(.15, .6, .35, 1)'},
            {translate: `${push}px ${lift}px`, offset: .38, easing: 'cubic-bezier(.45, 0, .65, 1)'},
            {translate: '0 0'}
        ], {delay: HAND_GO, duration: HAND_FLY});
        run(findEl('.g-wave'), WAVE, {delay: WAVE_AT, duration: WAVE_FOR, easing: 'ease-in-out', fill: 'none'});

        // The address underneath. From the moment things start travelling it is shown, with every
        // part held back until its own beat, so each swap happens on the exact frame of landing.
        timers.push(setTimeout(() => {
            if (!intro) return;
            const base = HELLO_GO;
            const r = (el, kf, o) => run(el, kf, Object.assign({fill: 'backwards', easing: EASE_IN}, o));
            // Landings: hello and sean together when sean lands; the hand on its own landing.
            const show = (el, t) => run(el, [{opacity: 0}, {opacity: 1}], {
                delay: t - base,
                duration: 1,
                fill: 'backwards'
            });
            const hide = (el, t) => run(el, [{opacity: 1}, {opacity: 0}], {
                delay: t - base,
                duration: 1,
                fill: 'forwards'
            });
            [findAll('.txt')[0], ...findAll('.ch.sean')].forEach(el => show(el, SEAN_LAND));
            [gHello, gSean].forEach(el => hide(el, SEAN_LAND));
            show(hand, HAND_LAND);
            hide(gHand, HAND_LAND);
            run(hand, [{rotate: '0deg'}, {rotate: '-12deg'}, {rotate: '10deg'}, {rotate: '-6deg'}, {rotate: '0deg'}], {
                delay: HAND_LAND - base,
                duration: 650,
                easing: 'ease-in-out',
                fill: 'none'
            });
            
            // Beat A: the address completes in reading order.
            const L = SEAN_LAND - base;
            findAll('.ch.thorne').forEach((el, i) => r(el, [{opacity: 0, transform: 'translateX(-.2em)'}, {
                opacity: 1,
                transform: 'none'
            }], {delay: L - FLY * .3 + i * 25, duration: 380}));
            r(findEl('.at'), [{opacity: 0, transform: 'scale(.7)'}, {opacity: 1, transform: 'none'}], {
                delay: L - 280,
                duration: 450
            });
            r(findEl('.seg-tld'), [{opacity: 0, transform: 'translateX(.2em)'}, {
                opacity: 1,
                transform: 'none'
            }], {delay: L - 200, duration: 450});
            r(findEl('.hl'), [{transform: 'scaleX(0)'}, {transform: 'scaleX(1)'}], {delay: L + 50, duration: 500});
            
            // Beat B: the annotations and the frame, together.
            findAll('.n-wave svg.down path').forEach(p => r(p, [{
                strokeDasharray: '1 1',
                strokeDashoffset: 1
            }, {strokeDasharray: '1 1', strokeDashoffset: 0}], {delay: HAND_LAND - base + 120, duration: 400}));
            ['.n-me', '.n-place'].forEach((sel, i) => {
                findAll(sel + ' svg.down path, ' + sel + ' svg.left path').forEach(p => r(p, [{
                    strokeDasharray: '1 1',
                    strokeDashoffset: 1
                }, {strokeDasharray: '1 1', strokeDashoffset: 0}], {delay: L + 250 + i * 80, duration: 400}));
                findAll(sel + ' .lbl').forEach(el => r(el, [{opacity: 0, transform: 'translateY(.35em)'}, {
                    opacity: 1,
                    transform: 'none'
                }], {delay: L + 350 + i * 80, duration: 400}));
            });
            r(findEl('.brace'), [{clipPath: 'inset(-4px 50% -4px 50%)'}, {clipPath: 'inset(-4px -4px -4px -4px)'}], {
                delay: L + 400,
                duration: 450
            });
            r(findEl('.reach-label'), [{opacity: 0, transform: 'translateY(.35em)'}, {
                opacity: 1,
                transform: 'none'
            }], {delay: L + 500, duration: 400});
            findAll('.top > *, .links').forEach(el => r(el, [{opacity: 0}, {opacity: 1}], {
                delay: L + 300,
                duration: 400,
                easing: 'ease-out'
            }));
            body.classList.remove('intro');
            timers.push(setTimeout(finishIntro, L + 950));
        }, HELLO_GO));
    }

    // Don't press: everything with .bit becomes debris, then can be put back.
    const btn = findEl('.boom-btn');
    const label = findEl('.bb-text');
    let exploded = false, bits = [], raf = 0, presses = 0;

    function explode() {
        finishIntro();
        exploded = true;
        label.textContent = 'Put it back';
        const b = btn.getBoundingClientRect();
        const bx = b.left + b.width / 2, by = b.top + b.height / 2;
        const H = innerHeight, W = innerWidth;
        bits = findAll('.bit').map(el => {
            const r = el.getBoundingClientRect();
            const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            const dx = cx - bx, dy = cy - by, d = Math.hypot(dx, dy) || 1;
            const power = (1300 + Math.random() * 900) / (1 + d / 900);
            return {
                el, cx, cy, w: r.width, h: r.height,
                x: 0, y: 0,
                vx: dx / d * power + (Math.random() - .5) * 300,
                vy: dy / d * power - 500 - Math.random() * 500,
                r: 0, vr: (Math.random() - .5) * 900,
                rest: 0
            };
        });
        
        // A ring from the button and a shake of the page.
        const ring = document.createElement('div');
        ring.className = 'ring';
        ring.style.left = bx + 'px';
        ring.style.top = by + 'px';
        document.body.appendChild(ring);
        ring.animate([{transform: 'scale(.2)', opacity: 1}, {transform: 'scale(14)', opacity: 0}], {
            duration: 520,
            easing: 'cubic-bezier(.2,.8,.2,1)'
        }).onfinish = () => ring.remove();
        if (!reduce) findEl('.page').animate([{transform: 'translate(0,0)'}, {transform: 'translate(-8px,5px)'}, {transform: 'translate(7px,-6px)'}, {transform: 'translate(-4px,3px)'}, {transform: 'none'}], {duration: 300});

        let last = performance.now();
        cancelAnimationFrame(raf);
        
        const step = now => {
            const dt = Math.min(.033, (now - last) / 1000);
            last = now;
            let moving = 0;
            for (const p of bits) {
                if (p.rest > 60) continue;
                p.vy += 2600 * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.r += p.vr * dt;
                const left = p.cx + p.x - p.w / 2, right = p.cx + p.x + p.w / 2, bottom = p.cy + p.y + p.h / 2;
                if (left < 0) {
                    p.x -= left;
                    p.vx = Math.abs(p.vx) * .55;
                }
                if (right > W) {
                    p.x -= right - W;
                    p.vx = -Math.abs(p.vx) * .55;
                }
                if (bottom > H) {
                    p.y -= bottom - H;
                    p.vy = -Math.abs(p.vy) * .38;
                    p.vx *= .82;
                    p.vr *= .7;
                    if (Math.abs(p.vy) < 60) {
                        p.vy = 0;
                        p.rest++;
                    }
                }
                moving++;
                p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg)`;
            }
            if (moving && exploded) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
    }

    function putBack() {
        exploded = false;
        cancelAnimationFrame(raf);
        presses++;
        label.textContent = presses > 1 ? 'Seriously, don’t' : 'Don’t press';
        bits.forEach(p => {
            const from = p.el.style.transform;
            p.el.style.transform = '';
            if (!reduce) p.el.animate([{transform: from}, {transform: 'none'}], {
                duration: 650 + Math.random() * 250,
                delay: Math.random() * 200,
                easing: 'cubic-bezier(.3,1.3,.5,1)',
                fill: 'backwards'
            });
        });
    }

    // Pressing lights the fuse: 3, 2, 1, then it goes. Pressing again while it burns puts it out.
    let fuse = null;

    function lightFuse() {
        const FUSE = 3000;
        btn.style.minWidth = btn.offsetWidth + 'px';      // the label changes, the button doesn't
        btn.classList.add('lit');
        const w = btn.offsetWidth;
        const burn = findEl('.fuse').animate([{transform: 'scaleX(1)'}, {transform: 'scaleX(0)'}], {
            duration: FUSE,
            easing: 'linear',
            fill: 'forwards'
        });
        const ride = findEl('.spark').animate([{transform: `translateX(${w - 4}px)`}, {transform: "translateX(0px)"}], {
            duration: FUSE,
            easing: 'linear',
            fill: 'forwards'
        });
        const flicker = reduce ? null : findEl('.spark').animate([{scale: '.7'}, {scale: '1.35'}, {scale: '.85'}, {scale: '1.2'}, {scale: '.7'}], {
            duration: 260,
            iterations: Infinity
        });
        
        // The button gets twitchier as the fuse runs down.
        const shake = reduce ? null : btn.animate([
            {translate: '0 0'}, {translate: '0 0', offset: .66},
            {translate: '-1px 0', offset: .72}, {translate: '1px 0', offset: .76}, {translate: '-1.5px 0', offset: .82},
            {translate: '1.5px 0', offset: .86}, {translate: '-2px 0', offset: .9}, {
                translate: '2px 0',
                offset: .94
            }, {translate: '-2px 0', offset: .97}, {translate: '0 0'}
        ], {duration: FUSE});
        const tick = n => {
            label.textContent = String(n);
            if (!reduce) label.animate([{transform: 'scale(1.5)', opacity: .4}, {
                transform: 'scale(1)',
                opacity: 1
            }], {duration: 320, easing: 'cubic-bezier(.16, 1, .3, 1)'});
        };
        tick(3);
        const timers = [setTimeout(() => tick(2), 1000), setTimeout(() => tick(1), 2000), setTimeout(() => {
            stopFuse();
            explode();
        }, FUSE)];
        fuse = {burn, ride, flicker, shake, timers};
    }

    function stopFuse() {
        if (!fuse) return;
        fuse.timers.forEach(clearTimeout);
        [fuse.burn, fuse.ride, fuse.flicker, fuse.shake].forEach(a => a && a.cancel());
        fuse = null;
        btn.classList.remove('lit');
    }

    btn.addEventListener('click', () => {
        if (exploded) return putBack();
        if (fuse) {   // defused
            stopFuse();
            label.textContent = 'Phew';
            setTimeout(() => {
                if (!fuse && !exploded) {
                    label.textContent = presses ? 'Seriously, don’t' : 'Don’t press';
                    btn.style.minWidth = '';
                }
            }, 1400);
            return;
        }
        lightFuse();
    });

    addEventListener('resize', () => {
        buildCols();
        if (!exploded) fit();
    });
   
    // Measure only once the real fonts are in, or the address is sized for the fallback face.
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const fontsIn = document.fonts
        ? Promise.all([document.fonts.load(`800 64px ${css('--display')}`), document.fonts.load(`${css('--mono-w')} 12px ${css('--mono')}`)]).then(() => document.fonts.ready)
        : Promise.resolve();
    const archivoReady = () => !document.fonts || document.fonts.check(`800 64px ${css('--display')}`);
    const fontsSettled = Promise.race([fontsIn.then(async () => {
        for (let i = 0; i < 25 && !archivoReady(); i++) await wait(100);
    }), wait(2500)]);
    fontsSettled.then(() => {
        fit();
        fit();
        playIntro();
    });
    if (document.fonts) document.fonts.addEventListener('loadingdone', () => {
        if (exploded) return;
        if (intro) refit = true; else fit();
    });
})();