const publications = window.PUBLICATIONS || [];
const escapeHtml = value => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const list = document.querySelector('#publication-list');
if (list) {
  const buttons = [...document.querySelectorAll('.filter')];
  buttons.forEach(button => {
    button.querySelector('span').textContent = button.dataset.filter === 'lead'
      ? publications.filter(item => item.lead).length : publications.length;
  });
  function renderPublications(filter) {
    const selected = publications.filter(item => filter === 'all' || item.lead);
    list.innerHTML = selected.map(item => {
      const title = item.titleHtml;
      const link = item.doi
        ? `<a class="pub-link" href="https://doi.org/${encodeURIComponent(item.doi)}" target="_blank" rel="noopener noreferrer" aria-label="Open DOI for ${escapeHtml(item.titleHtml.replace(/<[^>]*>/g, ''))}">DOI</a>`
        : `<span class="status">${escapeHtml(item.status)}</span>`;
      return `<article class="publication"><span class="pub-year">${escapeHtml(item.year)}</span><div><h3>${title}</h3><p class="pub-authors">${item.authorsHtml}</p><p class="pub-journal">${escapeHtml(item.source)}</p></div>${link}</article>`;
    }).join('');
    buttons.forEach(button => {
      const active = button.dataset.filter === filter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  buttons.forEach(button => button.addEventListener('click', () => renderPublications(button.dataset.filter)));
  renderPublications('lead');
}

const conferences = window.CONFERENCES || [];
for (const [kind, id] of [['talk', '#talk-list'], ['poster', '#poster-list']]) {
  const container = document.querySelector(id);
  if (!container) continue;
  container.innerHTML = conferences.filter(item => item.kind === kind).map(item => {
    const eventLabel = item.eventUrl && item.eventUrl.includes('.pdf#page=') ? 'CV record' : 'Event';
    const eventLink = item.eventUrl
      ? `<a href="${escapeHtml(item.eventUrl)}" target="_blank" rel="noopener noreferrer">${eventLabel}</a>` : '';
    const abstractLink = item.abstractUrl
      ? `<a href="${escapeHtml(item.abstractUrl)}" target="_blank" rel="noopener noreferrer">Abstract</a>` : '';
    const dateParts = item.date.match(/^(.*)\s(\d{4})$/);
    const eventDate = dateParts ? `<span class="conference-year">${escapeHtml(dateParts[2])}</span><span class="conference-days">${escapeHtml(dateParts[1])}</span>` : escapeHtml(item.date);
    const links = abstractLink + eventLink;
    const visit = links ? `<div class="visit">${links}</div>` : '';
    return `<article class="conference-row"><time>${eventDate}</time><div class="conference-main"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.presentation)}</p></div><p class="conference-place"><span>${escapeHtml(item.city)}</span><span>${escapeHtml(item.country)}</span></p>${visit}</article>`;
  }).join('');
}

const portals = [...document.querySelectorAll('.portal')];
const preview = document.querySelector('.explore-preview strong');
const gimbal = document.querySelector('.armillary-gimbal');
const pointer = document.querySelector('.armillary-pointer');
portals.forEach((portal, index) => {
  const activate = () => {
    preview.textContent = portal.querySelector('strong').textContent;
    portals.forEach(item => item.classList.toggle('is-active', item === portal));
    if (gimbal) gimbal.style.transform = `rotate(${index * 47 - 19}deg)`;
    if (pointer) pointer.style.transform = `rotate(${index * 73 - 62}deg)`;
    if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(preview, {y: 8, autoAlpha: .45}, {y: 0, autoAlpha: 1, duration: .38, ease: 'power2.out', overwrite: true});
    }
  };
  portal.addEventListener('pointerenter', activate);
  portal.addEventListener('focus', activate);
});

// Compact, accessible project galleries: pause on interaction and while off screen.
document.querySelectorAll('[data-carousel]').forEach(carousel => {
  const slides = [...carousel.querySelectorAll('.gallery-slide')];
  const dots = carousel.querySelector('.gallery-dots');
  const count = carousel.querySelector('.gallery-count');
  if (slides.length < 2) return;
  let active = 0;
  let timer;
  const buttons = slides.map((_, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gallery-dot';
    button.setAttribute('aria-label', `Show image ${index + 1} of ${slides.length}`);
    button.addEventListener('click', () => { show(index); restart(); });
    dots.append(button);
    return button;
  });
  function show(index) {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === active);
      slide.setAttribute('aria-hidden', String(i !== active));
    });
    buttons.forEach((button, i) => {
      button.classList.toggle('is-active', i === active);
      button.setAttribute('aria-current', String(i === active));
    });
    count.textContent = `${String(active + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  }
  function stop() { window.clearInterval(timer); }
  function start() {
    stop();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && !document.hidden) {
      timer = window.setInterval(() => show(active + 1), 5200);
    }
  }
  function restart() { start(); }
  carousel.querySelector('.gallery-prev').addEventListener('click', () => { show(active - 1); restart(); });
  carousel.querySelector('.gallery-next').addEventListener('click', () => { show(active + 1); restart(); });
  carousel.addEventListener('mouseenter', stop);
  carousel.addEventListener('mouseleave', start);
  carousel.addEventListener('focusin', stop);
  carousel.addEventListener('focusout', event => { if (!carousel.contains(event.relatedTarget)) start(); });
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  const observer = new IntersectionObserver(entries => entries[0].isIntersecting ? start() : stop(), {threshold: .15});
  observer.observe(carousel);
  show(0);
});

const homeHero = document.querySelector('.home-hero');
if (homeHero) {
  const header = document.querySelector('.site-header');
  const floor = document.querySelector('.home-floor');
  const measureHome = () => {
    document.body.style.setProperty('--home-header-height', `${header.getBoundingClientRect().height}px`);
    document.body.style.setProperty('--home-floor-height', `${floor.getBoundingClientRect().height}px`);
  };
  new ResizeObserver(measureHome).observe(header);
  new ResizeObserver(measureHome).observe(floor);
  measureHome();
}

const meteorEnabled = window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)').matches;
if (meteorEnabled) {
  const canvas = document.createElement('canvas');
  canvas.className = 'meteor-wash';
  const head = document.createElement('span');
  head.className = 'meteor-cursor';
  document.body.append(canvas, head);
  const ctx = canvas.getContext('2d');
  const points = Array.from({length: 16}, () => ({x: -100, y: -100}));
  let x = -100, y = -100, visible = false;
  function sizeMeteor() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * ratio;
    canvas.height = innerHeight * ratio;
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  sizeMeteor();
  window.addEventListener('resize', sizeMeteor);
  document.addEventListener('pointermove', event => {
    x = event.clientX; y = event.clientY;
    if (!visible) points.forEach(point => { point.x = x; point.y = y; });
    visible = true;
    head.classList.toggle('is-link', Boolean(event.target.closest('a,button')));
    head.style.transform = `translate3d(${x - 17}px,${y - 17}px,0)`;
    head.style.opacity = '1';
  }, {passive: true});
  document.addEventListener('pointerleave', () => { visible = false; });
  function drawMeteor() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (visible) {
      points[0].x = x; points[0].y = y;
      for (let i = 1; i < points.length; i++) {
        points[i].x += (points[i - 1].x - points[i].x) * .56;
        points[i].y += (points[i - 1].y - points[i].y) * .56;
      }
      // One continuous tapered ribbon avoids seams between trail segments.
      const normal = index => {
        const before = points[Math.max(0, index - 1)];
        const after = points[Math.min(points.length - 1, index + 1)];
        const dx = before.x - after.x, dy = before.y - after.y;
        const length = Math.hypot(dx, dy) || 1;
        return [-dy / length, dx / length];
      };
      ctx.beginPath();
      for (let i = points.length - 1; i >= 0; i--) {
        const [nx, ny] = normal(i), width = (1 - i / points.length) * 5.6;
        const px = points[i].x + nx * width, py = points[i].y + ny * width;
        if (i === points.length - 1) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      for (let i = 0; i < points.length; i++) {
        const [nx, ny] = normal(i), width = (1 - i / points.length) * 5.6;
        ctx.lineTo(points[i].x - nx * width, points[i].y - ny * width);
      }
      ctx.closePath();
      const gold = ctx.createLinearGradient(points.at(-1).x, points.at(-1).y, x, y);
      gold.addColorStop(0, 'rgba(184,161,121,0)');
      gold.addColorStop(.48, 'rgba(171,145,102,.35)');
      gold.addColorStop(1, 'rgba(103,82,52,.76)');
      ctx.fillStyle = gold;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(points.at(-1).x, points.at(-1).y);
      for (let i = points.length - 2; i >= 0; i--) ctx.lineTo(points[i].x, points[i].y);
      ctx.strokeStyle = 'rgba(219,201,165,.65)';
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    head.style.transform = `translate3d(${x - 17}px,${y - 17}px,0)`;
    head.style.opacity = visible ? '1' : '0';
    requestAnimationFrame(drawMeteor);
  }
  requestAnimationFrame(drawMeteor);
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (window.gsap && !reducedMotion) {
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  if (document.querySelector('.home-hero')) {
    gsap.timeline({defaults:{ease:'power3.out'}})
      .from('.home-hero h1', {y:26,duration:.85}, 0)
      .from('.hero-actions', {y:16,duration:.7}, .15);
    const path = document.querySelector('.orbit-track');
    const backStar = document.querySelector('.celestial .tracer-star');
    const frontStar = document.querySelector('.celestial-front .tracer-star');
    const length = path.getTotalLength();
    const travel = {progress:0};
    gsap.to(travel, {progress:1,duration:20,repeat:-1,ease:'none',onUpdate:() => {
      const point = path.getPointAtLength(length * travel.progress);
      const angle = travel.progress * 720;
      const transform = `translate(${point.x} ${point.y}) rotate(${angle})`;
      const shimmer = 0.2 * Math.sin(travel.progress * Math.PI * 2);
      document.querySelector('#orbit-star-metal').setAttribute('gradientTransform', `translate(${shimmer} 0)`);
      document.querySelector('#front-star-metal').setAttribute('gradientTransform', `translate(${shimmer} 0)`);
      backStar.setAttribute('transform', transform);
      frontStar.setAttribute('transform', transform);
      const depth = Math.max(0, Math.min(1, (point.y - 456) / 38));
      const near = depth * depth * (3 - 2 * depth);
      backStar.style.opacity = String(1 - near);
      frontStar.style.opacity = String(near);
    }});
    if (window.matchMedia('(pointer:fine)').matches) {
      const xTo = gsap.quickTo('.celestial, .celestial-front', 'x', {duration:1.1,ease:'power2.out'});
      const yTo = gsap.quickTo('.celestial, .celestial-front', 'y', {duration:1.1,ease:'power2.out'});
      const hero = document.querySelector('.home-hero');
      hero.addEventListener('pointermove', event => {
        xTo((event.clientX/window.innerWidth-.5)*16);
        yTo((event.clientY/window.innerHeight-.5)*12);
      });
      hero.addEventListener('pointerleave', () => {xTo(0);yTo(0)});
    }
  }
  if (window.ScrollTrigger) {
    gsap.to('.progress', {scaleX:1,ease:'none',scrollTrigger:{trigger:document.body,start:'top top',end:'bottom bottom',scrub:.2}});
    gsap.utils.toArray('.page-banner h1, .section-block h2, .conference-group h2, .home-portals h2').forEach(heading => {
      gsap.from(heading, {y:25,duration:.85,ease:'power2.out',scrollTrigger:{trigger:heading,start:'top 88%',once:true}});
    });
    if (document.querySelector('.portal-grid')) gsap.from('.portal', {y:18,stagger:.09,duration:.65,scrollTrigger:{trigger:'.portal-grid',start:'top 88%',once:true}});
    if (document.querySelector('.home-intro')) gsap.from('.home-intro p', {y:20,duration:.8,scrollTrigger:{trigger:'.home-intro',start:'top 82%',once:true}});
    if (document.querySelector('.feature-grid')) gsap.from('.feature-grid article', {y:25,stagger:.12,duration:.75,scrollTrigger:{trigger:'.feature-grid',start:'top 84%',once:true}});
  }
}
