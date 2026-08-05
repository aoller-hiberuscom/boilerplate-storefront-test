const status = document.querySelector('[data-course-delayed-status]');

if (status) {
  const elapsed = Math.round(performance.now());

  status.textContent = `La fase delayed se ha ejecutado a los ${elapsed} ms.`;
  status.dataset.delayedStatus = 'loaded';

  performance.mark('course-delayed-demo:loaded');
}
