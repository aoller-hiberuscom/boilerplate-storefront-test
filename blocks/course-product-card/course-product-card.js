import {
  getProductData,
  setEndpoint,
} from '@dropins/storefront-pdp/api.js';

import {
  CS_FETCH_GRAPHQL,
  getProductLink,
} from '../../scripts/commerce.js';

setEndpoint(CS_FETCH_GRAPHQL);

const NOT_AVAILABLE = 'No disponible';

/**
 * Converts key-value rows into a field map.
 *
 * Expected structure:
 *
 * <div>
 *   <div>sku</div>
 *   <div>PRODUCT-SKU</div>
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
 * Extracts plain text from a value that may contain HTML.
 *
 * @param {string|undefined} value Potential HTML value.
 * @returns {string} Plain text.
 */
function getPlainText(value) {
  if (!value) {
    return '';
  }

  const parsed = new DOMParser().parseFromString(
    String(value),
    'text/html',
  );

  return parsed.body.textContent?.trim() || '';
}

/**
 * Returns the most suitable product image.
 *
 * @param {object} product Product model.
 * @returns {object|null} Selected image.
 */
function getProductImage(product) {
  const images = Array.isArray(product?.images)
    ? product.images
    : [];

  return images.find(
    (image) => image.roles?.includes('thumbnail'),
  ) || images[0] || null;
}

/**
 * Normalizes the final price returned by simple and complex products.
 *
 * Simple product:
 * prices.final.amount
 *
 * Complex product:
 * prices.final.minimumAmount
 *
 * @param {object} product Product model.
 * @returns {{value: number, currency: string}|null} Normalized price.
 */
function getFinalPrice(product) {
  const finalPrice = product?.prices?.final;

  if (!finalPrice) {
    return null;
  }

  const value = finalPrice.minimumAmount
    ?? finalPrice.amount;

  const currency = finalPrice.currency
    ?? product?.prices?.regular?.currency;

  if (
    typeof value !== 'number'
    || !currency
  ) {
    return null;
  }

  return {
    value,
    currency,
  };
}

/**
 * Formats a Commerce price using the document locale.
 *
 * @param {{value: number, currency: string}|null} amount Price.
 * @returns {string} Localized price.
 */
function formatPrice(amount) {
  if (!amount) {
    return NOT_AVAILABLE;
  }

  return new Intl.NumberFormat(
    document.documentElement.lang || 'es-ES',
    {
      style: 'currency',
      currency: amount.currency,
    },
  ).format(amount.value);
}

/**
 * Returns a readable stock label.
 *
 * @param {boolean|undefined} inStock Product stock state.
 * @returns {string} Stock label.
 */
function getStockLabel(inStock) {
  if (inStock === true) {
    return 'En stock';
  }

  if (inStock === false) {
    return 'Sin stock';
  }

  return NOT_AVAILABLE;
}

/**
 * Adds one item to a description list.
 *
 * @param {HTMLDListElement} list Description list.
 * @param {string} label Item label.
 * @param {string} value Item value.
 */
function addDetail(list, label, value) {
  const term = document.createElement('dt');
  term.textContent = label;

  const description = document.createElement('dd');
  description.textContent = value || NOT_AVAILABLE;

  list.append(term, description);
}

/**
 * Returns the product path.
 *
 * Uses the URL supplied by Commerce when available. Otherwise,
 * it uses the storefront helper to build the localized PDP path.
 *
 * @param {object} product Product model.
 * @returns {string|null} Product path.
 */
function getProductPath(product) {
  if (product?.url) {
    return product.url;
  }

  if (product?.urlKey && product?.sku) {
    return getProductLink(
      product.urlKey,
      product.sku,
    );
  }

  return null;
}

/**
 * Creates a loading or error status.
 *
 * @param {string} message Visible message.
 * @param {'loading'|'error'} state Status type.
 * @returns {HTMLParagraphElement} Status element.
 */
function createStatus(message, state = 'loading') {
  const status = document.createElement('p');

  status.className = [
    'course-product-card__status',
    `course-product-card__status--${state}`,
  ].join(' ');

  status.textContent = message;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  return status;
}

/**
 * Creates the product image.
 *
 * @param {object} product Product model.
 * @returns {HTMLElement|null} Media element.
 */
function createProductMedia(product) {
  const imageData = getProductImage(product);

  if (!imageData?.url) {
    return null;
  }

  const media = document.createElement('div');
  media.className = 'course-product-card__media';

  const image = document.createElement('img');
  image.src = imageData.url;
  image.alt = imageData.label || product.name || '';
  image.loading = 'lazy';
  image.decoding = 'async';

  const width = Number(imageData.width);
  const height = Number(imageData.height);

  if (width > 0) {
    image.width = width;
  }

  if (height > 0) {
    image.height = height;
  }

  media.append(image);

  return media;
}

/**
 * Creates the product information.
 *
 * @param {object} product Product model.
 * @returns {HTMLElement} Information container.
 */
function createProductInformation(product) {
  const information = document.createElement('div');
  information.className = 'course-product-card__information';

  const title = document.createElement('h2');
  title.className = 'course-product-card__title';
  title.textContent = product.name
    || product.sku
    || 'Producto';

  const price = document.createElement('p');
  price.className = 'course-product-card__price';
  price.textContent = formatPrice(
    getFinalPrice(product),
  );

  information.append(title, price);

  const descriptionText = getPlainText(
    product.shortDescription,
  );

  if (descriptionText) {
    const description = document.createElement('p');
    description.className = 'course-product-card__description';
    description.textContent = descriptionText;

    information.append(description);
  }

  const details = document.createElement('dl');
  details.className = 'course-product-card__details';

  addDetail(
    details,
    'SKU',
    product.sku,
  );

  addDetail(
    details,
    'Disponibilidad',
    getStockLabel(product.inStock),
  );

  addDetail(
    details,
    'Tipo de producto',
    product.productType || NOT_AVAILABLE,
  );

  information.append(details);

  const productPath = getProductPath(product);

  if (productPath) {
    const actions = document.createElement('p');
    actions.className = 'course-product-card__actions';

    const link = document.createElement('a');
    link.className = 'button primary';
    link.href = productPath;
    link.textContent = 'Abrir ficha del producto';

    actions.append(link);
    information.append(actions);
  }

  return information;
}

/**
 * Creates the final product card.
 *
 * @param {object} product Product model.
 * @returns {HTMLElement} Product article.
 */
function createProductCard(product) {
  const article = document.createElement('article');
  article.className = 'course-product-card__content';

  const media = createProductMedia(product);

  if (media) {
    article.append(media);
  }

  article.append(
    createProductInformation(product),
  );

  return article;
}

/**
 * Returns a readable error message.
 *
 * @param {unknown} error Caught error.
 * @returns {string} Error message.
 */
function getErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'No se pudo cargar el producto.';
}

/**
 * Decorates a read-only product card.
 *
 * @param {HTMLElement} block Block root.
 */
export default async function decorate(block) {
  const fields = indexFields(block);
  const sku = fields.sku?.textContent.trim();

  block.setAttribute('aria-busy', 'true');

  if (!sku) {
    block.replaceChildren(
      createStatus(
        'El bloque necesita un SKU.',
        'error',
      ),
    );

    block.removeAttribute('aria-busy');
    return;
  }

  block.replaceChildren(
    createStatus(`Cargando producto ${sku}…`),
  );

  try {
    performance.clearMarks(
      'course-product-card:start',
    );

    performance.clearMarks(
      'course-product-card:end',
    );

    performance.clearMeasures(
      'course-product-card',
    );

    performance.mark(
      'course-product-card:start',
    );

    const product = await getProductData(
      sku,
      {
        preselectFirstOption: true,
      },
    );

    if (!product) {
      throw new Error(
        `No se encontró el producto ${sku}.`,
      );
    }

    block.replaceChildren(
      createProductCard(product),
    );

    block.dataset.productSku = product.sku;

    performance.mark(
      'course-product-card:end',
    );

    performance.measure(
      'course-product-card',
      'course-product-card:start',
      'course-product-card:end',
    );
  } catch (error) {
    console.error(
      'Unable to load course product:',
      error,
    );

    block.replaceChildren(
      createStatus(
        getErrorMessage(error),
        'error',
      ),
    );
  } finally {
    block.removeAttribute('aria-busy');
  }
}
