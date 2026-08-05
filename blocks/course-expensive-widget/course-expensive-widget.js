/**
 * Simulates loading a non-critical dependency.
 *
 * @param {HTMLElement} block Block root.
 * @param {HTMLElement} status Status element.
 */
function initializeWidget(block, status) {
  if (block.dataset.initializationStarted === 'true') {
    return;
  }

  block.dataset.initializationStarted = 'true';
  status.textContent = 'Inicializando recomendaciones…';

  performance.clearMarks('course-expensive-widget:start');
  performance.clearMarks('course-expensive-widget:end');
  performance.clearMeasures('course-expensive-widget');

  performance.mark('course-expensive-widget:start');

  window.setTimeout(() => {
    status.textContent = 'Recomendaciones inicializadas.';

    performance.mark('course-expensive-widget:end');

    performance.measure(
      'course-expensive-widget',
      'course-expensive-widget:start',
      'course-expensive-widget:end',
    );

    block.dataset.initializationStatus = 'ready';
  }, 1200);
}

/**
 * Decorates a non-critical widget without blocking the block lifecycle.
 *
 * @param {HTMLElement} block Block root.
 */
export default function decorate(block) {
  const label = block.textContent.trim()
    || 'Widget simulado';

  const panel = document.createElement('aside');
  panel.className = 'course-expensive-widget__content';

  const title = document.createElement('h2');
  title.textContent = label;

  const status = document.createElement('p');
  status.className = 'course-expensive-widget__status';
  status.textContent = 'Pendiente de entrar en el viewport.';
  status.setAttribute('aria-live', 'polite');

  panel.append(title, status);
  block.replaceChildren(panel);

  if (!('IntersectionObserver' in window)) {
    initializeWidget(block, status);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const isApproachingViewport = entries.some(
        (entry) => entry.isIntersecting,
      );

      if (!isApproachingViewport) {
        return;
      }

      observer.disconnect();
      initializeWidget(block, status);
    },
    {
      rootMargin: '200px 0px',
    },
  );

  observer.observe(block);
}
