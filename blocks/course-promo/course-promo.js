import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/ue-utils.js';

/**
 * Converts key-value rows into a field map.
 *
 * Expected row structure:
 *
 * <div>
 *   <div>fieldName</div>
 *   <div>fieldValue</div>
 * </div>
 *
 * @param {HTMLElement} block Block root.
 * @returns {Record<string, HTMLElement>} Indexed field values.
 */
function indexFields(block) {
  const fields = {};

  [...block.children].forEach((row) => {
    const [keyCell, valueCell] = [...row.children];
    const key = keyCell?.textContent.trim().toLowerCase();

    if (key && valueCell) {
      fields[key] = valueCell;
    }
  });

  return fields;
}

/**
 * Preserves existing Universal Editor instrumentation.
 *
 * When ?authoring=1 is present, debug attributes are added locally.
 * They simulate editable properties but cannot save anything because
 * there is no real AEM resource connected.
 *
 * @param {HTMLElement} source Original authored element.
 * @param {HTMLElement} target Final decorated element.
 * @param {string} property Property name.
 * @param {'text'|'richtext'} type Editable content type.
 * @param {string} label Author-facing label.
 */
function preserveInlineEditing(source, target, property, type, label) {
  moveInstrumentation(source, target);

  const params = new URL(window.location.href).searchParams;

  if (!params.has('authoring')) {
    return;
  }

  const attributes = {
    'data-aue-prop': property,
    'data-aue-type': type,
    'data-aue-label': label,
  };

  Object.entries(attributes).forEach(([name, value]) => {
    if (!target.hasAttribute(name)) {
      target.setAttribute(name, value);
    }
  });
}

/**
 * Decorates the course promo block.
 *
 * Expected fields:
 * - image
 * - title
 * - body
 * - ctaText
 * - ctaLink
 *
 * @param {HTMLElement} block Block root.
 */
export default function decorate(block) {
  const fields = indexFields(block);

  const authoredImage = fields.image?.querySelector('img');
  const titleText = fields.title?.textContent.trim();
  const ctaText = fields.ctatext?.textContent.trim();

  const ctaHref = fields.ctalink?.querySelector('a')?.getAttribute('href')
    || fields.ctalink?.textContent.trim()
    || '';

  const media = document.createElement('div');
  media.className = 'course-promo__media';

  if (authoredImage) {
    const picture = createOptimizedPicture(
      authoredImage.src,
      authoredImage.alt || '',
      false,
      [
        {
          media: '(min-width: 900px)',
          width: '1200',
        },
        {
          width: '750',
        },
      ],
    );

    const optimizedImage = picture.querySelector('img');

    if (optimizedImage) {
      moveInstrumentation(authoredImage, optimizedImage);
    }

    media.append(picture);
  }

  const content = document.createElement('div');
  content.className = 'course-promo__content';

  if (titleText) {
    const title = document.createElement('h2');
    title.className = 'course-promo__title';
    title.textContent = titleText;

    preserveInlineEditing(
      fields.title,
      title,
      'title',
      'text',
      'Titular',
    );

    content.append(title);
  }

  if (fields.body?.hasChildNodes()) {
    const body = document.createElement('div');
    body.className = 'course-promo__body';

    preserveInlineEditing(
      fields.body,
      body,
      'body',
      'richtext',
      'Contenido',
    );

    body.append(...fields.body.childNodes);
    content.append(body);
  }

  if (ctaText && ctaHref) {
    const actions = document.createElement('div');
    actions.className = 'course-promo__actions';

    const link = document.createElement('a');
    link.className = 'button primary';
    link.href = ctaHref;
    link.textContent = ctaText;

    actions.append(link);
    content.append(actions);
  }

  const children = [];

  if (media.hasChildNodes()) {
    children.push(media);
  }

  if (content.hasChildNodes()) {
    children.push(content);
  }

  block.replaceChildren(...children);

  if (new URL(window.location.href).searchParams.has('authoring')) {
    block.classList.add('authoring-debug');
  }
}
