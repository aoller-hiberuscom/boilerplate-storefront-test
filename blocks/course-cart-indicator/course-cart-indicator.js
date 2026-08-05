import '../../scripts/initializers/cart.js';

import {
  getCartDataFromCache,
} from '@dropins/storefront-cart/api.js';

import {
  events,
} from '@dropins/tools/event-bus.js';

const EMPTY_VALUE = '—';

/**
 * Formats a Commerce price.
 *
 * @param {{value?: number, currency?: string}|null} price Price model.
 * @returns {string} Formatted price.
 */
function formatPrice(price) {
  if (
    typeof price?.value !== 'number'
    || !price.currency
  ) {
    return EMPTY_VALUE;
  }

  return new Intl.NumberFormat(
    document.documentElement.lang || 'es-ES',
    {
      style: 'currency',
      currency: price.currency,
    },
  ).format(price.value);
}

/**
 * Returns the preferred subtotal.
 *
 * @param {object|null} cart Cart model.
 * @returns {object|null} Price model.
 */
function getSubtotal(cart) {
  return cart?.subtotal?.includingTax
    || cart?.subtotal?.excludingTax
    || null;
}

/**
 * Returns a readable cart type.
 *
 * @param {object|null} cart Cart model.
 * @returns {string} Cart type.
 */
function getCartType(cart) {
  if (!cart?.id) {
    return 'Sin carrito';
  }

  if (cart.isGuestCart === true) {
    return 'Carrito invitado';
  }

  if (cart.isGuestCart === false) {
    return 'Carrito de cliente';
  }

  return 'Carrito activo';
}

/**
 * Creates one metric.
 *
 * @param {string} label Metric label.
 * @returns {{item: HTMLElement, value: HTMLElement}} Metric elements.
 */
function createMetric(label) {
  const item = document.createElement('div');
  item.className = 'course-cart-indicator__metric';

  const term = document.createElement('dt');
  term.className = 'course-cart-indicator__label';
  term.textContent = label;

  const value = document.createElement('dd');
  value.className = 'course-cart-indicator__value';
  value.textContent = EMPTY_VALUE;

  item.append(term, value);

  return {
    item,
    value,
  };
}

/**
 * Normalizes a numeric cart field.
 *
 * @param {unknown} value Potential number.
 * @param {number} fallback Fallback value.
 * @returns {number} Normalized number.
 */
function normalizeNumber(value, fallback = 0) {
  return Number.isFinite(value)
    ? Number(value)
    : fallback;
}

/**
 * Updates the indicator using the current CartModel.
 *
 * @param {object} elements Indicator elements.
 * @param {object|null} cart Cart model.
 */
function updateIndicator(elements, cart) {
  const itemCount = Array.isArray(cart?.items)
    ? cart.items.length
    : 0;

  const totalUniqueItems = normalizeNumber(
    cart?.totalUniqueItems,
    itemCount,
  );

  elements.quantity.textContent = String(
    normalizeNumber(cart?.totalQuantity),
  );

  elements.uniqueItems.textContent = String(
    totalUniqueItems,
  );

  elements.subtotal.textContent = formatPrice(
    getSubtotal(cart),
  );

  elements.cartType.textContent = getCartType(cart);

  elements.identifier.textContent = cart?.id
    ? 'Creado'
    : 'No creado';

  elements.root.dataset.cartState = cart?.id
    ? 'active'
    : 'empty';
}

/**
 * Updates the visible event log.
 *
 * @param {HTMLElement} element Event status element.
 * @param {string} eventName Event name.
 * @param {string} detail Optional event detail.
 */
function showEvent(element, eventName, detail = '') {
  const timestamp = new Intl.DateTimeFormat(
    document.documentElement.lang || 'es-ES',
    {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    },
  ).format(new Date());

  element.textContent = detail
    ? `${timestamp} · ${eventName} · ${detail}`
    : `${timestamp} · ${eventName}`;
}

/**
 * Decorates a reactive cart indicator.
 *
 * @param {HTMLElement} block Block root.
 */
export default function decorate(block) {
  const authoredTitle = block.textContent.trim();

  const panel = document.createElement('section');
  panel.className = 'course-cart-indicator__panel';

  const title = document.createElement('h2');
  title.className = 'course-cart-indicator__title';
  title.textContent = authoredTitle
    || 'Estado del carrito';

  const explanation = document.createElement('p');
  explanation.className = 'course-cart-indicator__description';
  explanation.textContent = [
    'Este bloque no consulta Commerce.',
    'Representa el último estado recibido mediante cart/data.',
  ].join(' ');

  const metrics = document.createElement('dl');
  metrics.className = 'course-cart-indicator__metrics';

  const quantity = createMetric('Unidades totales');
  const uniqueItems = createMetric('Líneas diferentes');
  const subtotal = createMetric('Subtotal');
  const cartType = createMetric('Tipo');
  const identifier = createMetric('Identificador');

  metrics.append(
    quantity.item,
    uniqueItems.item,
    subtotal.item,
    cartType.item,
    identifier.item,
  );

  const eventLog = document.createElement('div');
  eventLog.className = 'course-cart-indicator__event-log';

  const eventHeading = document.createElement('h3');
  eventHeading.className = 'course-cart-indicator__event-title';
  eventHeading.textContent = 'Último evento';

  const eventStatus = document.createElement('p');
  eventStatus.className = 'course-cart-indicator__event-status';
  eventStatus.textContent = 'Esperando eventos…';
  eventStatus.setAttribute('role', 'status');
  eventStatus.setAttribute('aria-live', 'polite');

  eventLog.append(eventHeading, eventStatus);

  panel.append(
    title,
    explanation,
    metrics,
    eventLog,
  );

  block.replaceChildren(panel);

  const elements = {
    root: block,
    quantity: quantity.value,
    uniqueItems: uniqueItems.value,
    subtotal: subtotal.value,
    cartType: cartType.value,
    identifier: identifier.value,
  };

  /*
   * Synchronous representation of the last cached cart.
   * This does not perform a network request.
   */
  updateIndicator(
    elements,
    getCartDataFromCache(),
  );

  /*
   * eager: true means that the handler is also executed immediately
   * when cart/data already has a previous payload.
   */
  events.on(
    'cart/data',
    (cart) => {
      updateIndicator(elements, cart);
      showEvent(eventStatus, 'cart/data');
    },
    {
      eager: true,
    },
  );

  events.on(
    'cart/product/added',
    (items) => {
      const count = Array.isArray(items)
        ? items.length
        : 0;

      showEvent(
        eventStatus,
        'cart/product/added',
        `${count} línea(s) nueva(s)`,
      );
    },
  );

  events.on(
    'cart/product/updated',
    (items) => {
      const count = Array.isArray(items)
        ? items.length
        : 0;

      showEvent(
        eventStatus,
        'cart/product/updated',
        `${count} línea(s) actualizada(s)`,
      );
    },
  );
}
