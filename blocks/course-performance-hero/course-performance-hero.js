import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Checks whether the block belongs to the first section.
 *
 * @param {HTMLElement} block Block root.
 * @returns {boolean} Whether the block is in the first section.
 */
function isInFirstSection(block) {
  const main = block.closest('main');
  const currentSection = block.closest('.section');
  const firstSection = main?.querySelector(':scope > .section');

  return currentSection === firstSection;
}

/**
 * Decorates the performance hero.
 *
 * Expected rows:
 * 1. Image
 * 2. Title
 * 3. Body
 *
 * @param {HTMLElement} block Block root.
 */
export default function decorate(block) {
  const [imageRow, titleRow, bodyRow] = [...block.children];

  const authoredImage = imageRow?.querySelector('img');
  const titleText = titleRow?.textContent.trim();
  const bodyCell = bodyRow?.firstElementChild;

  const media = document.createElement('div');
  media.className = 'course-performance-hero__media';

  if (authoredImage) {
    const picture = createOptimizedPicture(
      authoredImage.src,
      authoredImage.alt || '',
      isInFirstSection(block),
      [
        {
          media: '(min-width: 900px)',
          width: '1600',
        },
        {
          width: '750',
        },
      ],
    );

    media.append(picture);
  }

  const content = document.createElement('div');
  content.className = 'course-performance-hero__content';

  if (titleText) {
    const title = document.createElement('h1');
    title.className = 'course-performance-hero__title';
    title.textContent = titleText;
    content.append(title);
  }

  if (bodyCell?.hasChildNodes()) {
    const body = document.createElement('div');
    body.className = 'course-performance-hero__body';
    body.append(...bodyCell.childNodes);
    content.append(body);
  }

  block.replaceChildren(media, content);
}
