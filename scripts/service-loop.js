(() => {
  const carousel = document.querySelector('#our-services .service-carousel');
  if (!carousel) return;
  const track = carousel.querySelector('.inner');
  const cards = [...track.children];
  const toggle = document.querySelector('.service-loop-toggle');
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
  toggle.addEventListener('click', () => {
    const paused = carousel.classList.toggle('is-user-paused');
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = paused ? 'Resume cards' : 'Pause cards';
  });
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
})();
