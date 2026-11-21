(() => {
  const carousel = document.querySelector('#our-services .service-carousel');
  if (!carousel) return;
  const track = carousel.querySelector('.inner');
  const cards = [...track.children];
  const group = document.createElement('div');
  group.className = 'service-loop-group';
  group.append(...cards);
  track.append(group);

  // Copies remain pointer-operable, but only the original eight cards appear
  // in the keyboard order and accessibility tree. Existing detail dialogs stay intact.
  function copyCard(card) {
    const copy = card.cloneNode(true);
    copy.classList.add('service-loop-copy');
    copy.setAttribute('aria-hidden', 'true');
    const button = copy.querySelector('button');
    button.tabIndex = -1;
    button.addEventListener('click', () => card.querySelector('button').click());
    return copy;
  }
  let frame;
  function sizeLoop() {
    track.querySelectorAll('.service-loop-copy').forEach(copy => copy.remove());
    track.querySelectorAll('[data-loop-copy]').forEach(copy => copy.remove());
    // Both halves must cover even an ultrawide viewport at every loop position.
    const baseWidth = group.getBoundingClientRect().width;
    if (!baseWidth) return;
    const repetitions = Math.max(1, Math.ceil((carousel.clientWidth + cards[0].offsetWidth) / baseWidth));
    for (let i = 1; i < repetitions; i++) group.append(...cards.map(copyCard));
    const duplicate = document.createElement('div');
    duplicate.className = 'service-loop-group service-loop-copy';
    duplicate.dataset.loopCopy = '';
    duplicate.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < repetitions; i++) duplicate.append(...cards.map(copyCard));
    track.append(duplicate);
    track.style.setProperty('--loop-duration', `${group.getBoundingClientRect().width / 40}s`);
    carousel.classList.add('is-looping');
  }
  carousel.addEventListener('focusin', event => {
    const card = event.target.closest('.card');
    if (!card || card.classList.contains('service-loop-copy')) return;
    track.style.setProperty('animation', 'none', 'important');
    track.style.transform = `translateX(-${card.offsetLeft}px)`;
  });
  carousel.addEventListener('focusout', event => {
    if (carousel.contains(event.relatedTarget)) return;
    track.style.removeProperty('animation');
    track.style.removeProperty('transform');
  });
  sizeLoop();
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(sizeLoop);
  });
  observer.observe(carousel);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  // Move around the visible front of a shallow cylinder. The fixed track pitch
  // and identical repeated halves preserve the same gap across the loop seam.
  let arcFrame;
  function drawArc() {
    arcFrame = undefined;
    if (document.hidden || reducedMotion.matches || carousel.closest('.motion-dormant')) return;
    const bounds = carousel.getBoundingClientRect();
    const center = bounds.left + bounds.width / 2;
    const trackLeft = track.getBoundingClientRect().left;
    for (const card of track.querySelectorAll('.card')) {
      const x = trackLeft + card.offsetLeft + card.offsetWidth / 2;
      const u = Math.max(-1, Math.min(1, (x - center) / (bounds.width / 2 + card.offsetWidth / 2)));
      card.style.transform = `translateY(${14 * (1 - u * u)}px) rotateY(${-18 * u}deg)`;
    }
    arcFrame = requestAnimationFrame(drawArc);
  }
  function resumeArc() {
    if (arcFrame === undefined) drawArc();
  }
  new MutationObserver(resumeArc).observe(carousel.closest('section'), {attributes: true, attributeFilter: ['class']});
  document.addEventListener('visibilitychange', resumeArc);
  reducedMotion.addEventListener('change', resumeArc);
  resumeArc();
})();
