/* Inky — shared stick-figure mascot controller */
const Inky = (function(){

  const SVG = `
  <svg viewBox="0 0 200 220" role="img" aria-label="Inky, a friendly doodled stick figure">
    <g class="inky-dots">
      <circle cx="130" cy="18" r="4"></circle>
      <circle cx="145" cy="10" r="4"></circle>
      <circle cx="160" cy="4" r="4"></circle>
    </g>

    <g class="inky-zzz" font-family="Kalam, cursive" font-weight="700" fill="#14172e">
      <text x="128" y="30" font-size="18">z</text>
      <text x="142" y="18" font-size="14">z</text>
      <text x="154" y="8" font-size="10">z</text>
    </g>

    <polygon class="inky-star" points="30,20 33,28 42,28 35,33 38,42 30,36 22,42 25,33 18,28 27,28"></polygon>
    <polygon class="inky-star" points="170,30 172,36 179,36 173,40 175,47 170,43 165,47 167,40 161,36 168,36"></polygon>
    <polygon class="inky-star" points="100,4 102,10 109,10 103,14 105,21 100,17 95,21 97,14 91,10 98,10"></polygon>

    <g class="inky-body-grp">
      <g class="inky-head-grp">
        <circle class="inky-head" cx="100" cy="50" r="29"></circle>

        <g class="inky-hat">
          <path class="inky-hat-dome" d="M74,33 Q74,9 100,7 Q126,9 126,33 Q100,25 74,33 Z"></path>
          <path class="inky-hat-band" d="M72,32 Q100,42 128,32"></path>
          <circle class="inky-hat-pompom" cx="100" cy="7" r="5"></circle>
        </g>

        <path class="inky-brow inky-brow-l" d="M79,39 L93,36"></path>
        <path class="inky-brow inky-brow-r" d="M107,35 L121,40"></path>

        <g class="inky-eyes-normal">
          <g class="inky-eye-l-grp"><circle class="inky-eye inky-eye-l" cx="89" cy="47" r="3"></circle></g>
          <g class="inky-eye-r-grp"><circle class="inky-eye inky-eye-r" cx="111" cy="47" r="3"></circle></g>
        </g>
        <g class="inky-eyes-x">
          <path d="M83,43 L91,51 M91,43 L83,51"></path>
          <path d="M109,43 L117,51 M117,43 L109,51"></path>
        </g>

        <path class="inky-mouth" d="M86 59 Q100 70 114 58"></path>
        <path class="inky-tongue" d="M95,66 Q100,75 105,66 Z"></path>
      </g>

      <path class="inky-line inky-spine" d="M100 79 Q97 112 100 149"></path>

      <g class="inky-arm-l">
        <line class="inky-line" x1="100" y1="95" x2="64" y2="130"></line>
        <g class="inky-hand-l" transform="translate(64 130)">
          <circle class="inky-hand-shape" cx="0" cy="0" r="8"></circle>
          <line class="inky-hand-thumb" x1="-5" y1="-6" x2="2" y2="-12"></line>
        </g>
        <g class="inky-prop-notepad" transform="translate(64 130)">
          <rect class="inky-prop-fill" x="-6" y="-4" width="30" height="22" rx="2" transform="rotate(12)"></rect>
        </g>
      </g>
      <g class="inky-arm-r">
        <line class="inky-line" x1="100" y1="95" x2="136" y2="130"></line>
        <g class="inky-hand-r" transform="translate(136 130)">
          <g class="inky-hand-mitten">
            <circle class="inky-hand-shape" cx="0" cy="0" r="8"></circle>
            <line class="inky-hand-thumb" x1="-5" y1="-6" x2="2" y2="-12"></line>
          </g>
          <g class="inky-hand-point">
            <line class="inky-finger" x1="0" y1="-2" x2="21" y2="-8"></line>
            <line class="inky-finger" x1="1" y1="3" x2="23" y2="1"></line>
            <line class="inky-finger" x1="0" y1="7" x2="18" y2="13"></line>
          </g>
        </g>
        <g class="inky-prop-magnifier" transform="translate(136 130)">
          <circle class="inky-prop" cx="14" cy="-4" r="12"></circle>
          <line class="inky-prop" x1="22" y1="4" x2="34" y2="16"></line>
        </g>
        <g class="inky-prop-pencil" transform="translate(136 130)">
          <line class="inky-prop-fill" x1="0" y1="0" x2="24" y2="-16" stroke-width="5"></line>
        </g>
      </g>

      <g class="inky-leg-l">
        <line class="inky-line" x1="100" y1="149" x2="74" y2="205"></line>
        <ellipse class="inky-shoe" cx="72" cy="208" rx="15" ry="7" transform="rotate(-6 72 208)"></ellipse>
      </g>
      <g class="inky-leg-r">
        <line class="inky-line" x1="100" y1="149" x2="126" y2="205"></line>
        <ellipse class="inky-shoe" cx="128" cy="208" rx="15" ry="7" transform="rotate(6 128 208)"></ellipse>
      </g>
    </g>
  </svg>`;

  const KEEP_CLASSES = ['inky-wrap', 'inky-fast', 'inky-clickable', 'inky-face-bump'];

  // ---------------- expressions ----------------
  // Each expression redraws the brows/mouth/eyes so Inky can look happy,
  // goofy, surprised, focused, annoyed, sleepy... independent of whatever
  // pose (walk, think, sad...) his body is currently doing.
  const EXPRESSIONS = {
    happy: {
      mouth: 'M86 59 Q100 70 114 58', mouthFill: false,
      browL: 'M79,39 L93,36', browR: 'M107,35 L121,40',
      eyeL: { x: 1, y: 1 }, eyeR: { x: 1, y: 1 }, tongue: false, xEyes: false
    },
    grin: {
      mouth: 'M83 56 Q100 80 117 56 Q100 68 83 56 Z', mouthFill: true,
      browL: 'M78,38 L94,33', browR: 'M106,33 L122,38',
      eyeL: { x: 1, y: 1 }, eyeR: { x: 1, y: 1 }, tongue: false, xEyes: false
    },
    surprised: {
      mouth: 'M94 59 Q100 73 106 59 Q100 67 94 59 Z', mouthFill: true,
      browL: 'M78,32 L93,29', browR: 'M107,29 L122,32',
      eyeL: { x: 1.3, y: 1.3 }, eyeR: { x: 1.3, y: 1.3 }, tongue: false, xEyes: false
    },
    silly: {
      mouth: 'M84 58 Q100 64 100 58 Q100 72 88 68 Z', mouthFill: true,
      browL: 'M78,42 L94,31', browR: 'M106,37 L122,39',
      eyeL: { x: 1, y: 1 }, eyeR: { x: 1, y: 1 }, tongue: true, xEyes: false
    },
    dizzy: {
      mouth: 'M85 60 Q92 66 100 60 Q108 66 115 60', mouthFill: false,
      browL: 'M79,39 L93,36', browR: 'M107,35 L121,40',
      eyeL: { x: 1, y: 1 }, eyeR: { x: 1, y: 1 }, tongue: false, xEyes: true
    },
    // determined / concentrating — used when the person scrolls
    focused: {
      mouth: 'M89,63 L111,63', mouthFill: false,
      browL: 'M78,35 L94,38', browR: 'M106,38 L122,35',
      eyeL: { x: 0.9, y: 0.5 }, eyeR: { x: 0.9, y: 0.5 }, tongue: false, xEyes: false
    },
    // furrowed / cross — used after a stretch of inactivity
    angry: {
      mouth: 'M88,64 Q100,60 112,64', mouthFill: false,
      browL: 'M79,33 L95,41', browR: 'M105,41 L121,33',
      eyeL: { x: 1, y: 1 }, eyeR: { x: 1, y: 1 }, tongue: false, xEyes: false
    },
    sleepy: {
      mouth: 'M92,61 Q100,64 108,61', mouthFill: false,
      browL: 'M80,40 L93,38', browR: 'M107,38 L120,40',
      eyeL: { x: 0.9, y: 0.18 }, eyeR: { x: 0.9, y: 0.18 }, tongue: false, xEyes: false
    },
    wink: {
      mouth: 'M84 57 Q100 72 116 57 Q100 64 84 57 Z', mouthFill: true,
      browL: 'M79,37 L93,34', browR: 'M106,32 L121,38',
      eyeL: { x: 1, y: 1 }, eyeR: { x: 1, y: 0.15 }, tongue: false, xEyes: false
    }
  };
  const EXPRESSION_NAMES = Object.keys(EXPRESSIONS);

  function applyEyeScale(grp, cx, cy, scale){
    if(!grp) return;
    grp.style.transformOrigin = `${cx}px ${cy}px`;
    grp.style.transform = `scale(${scale.x}, ${scale.y})`;
  }

  function setFace(host, name){
    const ex = EXPRESSIONS[name] || EXPRESSIONS.happy;

    const mouth = host.querySelector('.inky-mouth');
    if(mouth){
      mouth.setAttribute('d', ex.mouth);
      mouth.style.fill = ex.mouthFill ? 'var(--ink-900)' : 'none';
    }
    const browL = host.querySelector('.inky-brow-l');
    const browR = host.querySelector('.inky-brow-r');
    if(browL) browL.setAttribute('d', ex.browL);
    if(browR) browR.setAttribute('d', ex.browR);

    const eyesNormal = host.querySelector('.inky-eyes-normal');
    const eyesX = host.querySelector('.inky-eyes-x');
    if(eyesNormal) eyesNormal.style.opacity = ex.xEyes ? '0' : '1';
    if(eyesX) eyesX.style.opacity = ex.xEyes ? '1' : '0';
    applyEyeScale(host.querySelector('.inky-eye-l-grp'), 89, 47, ex.eyeL);
    applyEyeScale(host.querySelector('.inky-eye-r-grp'), 111, 47, ex.eyeR);

    const tongue = host.querySelector('.inky-tongue');
    if(tongue) tongue.style.opacity = ex.tongue ? '1' : '0';

    host.dataset.face = name;
  }

  function face(selector, name){
    document.querySelectorAll(selector).forEach(host => setFace(host, name));
  }

  // Picks a different random expression than whatever is currently showing.
  // Accepts either a CSS selector (applies to every match) or a single host element.
  function cycleFace(selectorOrHost){
    const hosts = typeof selectorOrHost === 'string'
      ? document.querySelectorAll(selectorOrHost)
      : [selectorOrHost];
    hosts.forEach(host => {
      const current = host.dataset.face || 'happy';
      let next = current;
      while(next === current && EXPRESSION_NAMES.length > 1){
        next = EXPRESSION_NAMES[Math.floor(Math.random() * EXPRESSION_NAMES.length)];
      }
      setFace(host, next);
      host.classList.remove('inky-face-bump');
      // eslint-disable-next-line no-unused-expressions
      void host.offsetWidth; // restart the animation if clicked again quickly
      host.classList.add('inky-face-bump');
    });
  }

  function setPoseClass(host, name){
    Array.from(host.classList).forEach(c => {
      if(c.startsWith('inky-') && !KEEP_CLASSES.includes(c)) host.classList.remove(c);
    });
    host.classList.add('inky-' + name);
  }

  function mount(selector, initialPose){
    const hosts = document.querySelectorAll(selector);
    hosts.forEach(host => {
      host.classList.add('inky-wrap');
      host.innerHTML = SVG;
      setPoseClass(host, initialPose || 'idle');
      setFace(host, 'happy');
      host.classList.add('inky-clickable');
      host.setAttribute('title', 'Click Inky to change his expression');
      host.addEventListener('click', () => cycleFace(host));
    });
  }

  function pose(selector, name, opts){
    const hosts = document.querySelectorAll(selector);
    hosts.forEach(host => {
      setPoseClass(host, name);
      if(opts && opts.revertTo){
        window.setTimeout(() => setPoseClass(host, opts.revertTo), opts.duration || 1200);
      }
    });
  }

  // Cycles a host through a list of poses forever, so Inky stays alive on
  // screens where nothing else is triggering a pose change (login/register).
  // Returns { pause, resume } so a form can hand control back to explicit
  // poses (e.g. "sad" on a bad login) without the cycle overwriting it mid-flight.
  function cycle(selector, poses, opts){
    const gap = (opts && opts.interval) || 3200;
    const hold = (opts && opts.hold) || 1300;
    let i = 0;
    let paused = false;

    function apply(name){
      document.querySelectorAll(selector).forEach(host => setPoseClass(host, name));
    }

    function step(){
      window.setTimeout(() => {
        if(paused){ step(); return; }
        apply(poses[i % poses.length]);
        i++;
        window.setTimeout(() => {
          if(!paused) apply(poses[0]);
          step();
        }, hold);
      }, gap);
    }
    step();

    return {
      pause(){ paused = true; },
      resume(){ paused = false; }
    };
  }

  return { mount, pose, cycle, face, cycleFace };
})();