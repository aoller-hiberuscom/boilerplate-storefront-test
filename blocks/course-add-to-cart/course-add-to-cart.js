/**
 * Converts authored key-value rows into a field map.
 *
 * @param {HTMLElement} block Block root.
 * @returns {Record<string, HTMLElement>} Indexed fields.
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
 * Returns a valid positive quantity.
 *
 * @param {number|string|undefined} value Authored quantity.
 * @returns {number} Normalized quantity.
 */
function normalizeQuantity(value) {
  const quantity = Number.parseInt(value, 10);

  if (!Number.isFinite(quantity) || quantity < 1) {
    return 1;
  }

  return quantity;
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

  if (typeof error === 'string') {
    return error;
  }

  return 'No se pudo añadir el producto.';
}

/**
 * Changes the visible operation status.
 *
 * @param {HTMLElement} status Status element.
 * @param {'idle'|'loading'|'success'|'error'} state Status state.
 * @param {string} message Visible message.
 */
function setStatus(status, state, message) {
  status.dataset.status = state;
  status.textContent = message;
}

/**
 * Initializes the Cart drop-in and returns its API.
 *
 * The initializer configures Core GraphQL and initializes
 * the existing guest or customer cart.
 *
 * @returns {Promise<object>} Cart API module.
 */
async function getCartApi() {
  await import('../../scripts/initializers/cart.js');

  return import('@dropins/storefront-cart/api.js');
}

/**
 * Decorates the add-to-cart laboratory block.
 *
 * @param {HTMLElement} block Block root.
 */
export default async function decorate(block) {
  const fields = indexFields(block);

  const sku = fields.sku?.textContent.trim() || '';
  const initialQuantity = normalizeQuantity(
    fields.quantity?.textContent.trim(),
  );

  const buttonLabel = fields.label?.textContent.trim()
    || 'Añadir al carrito';

  const panel = document.createElement('section');
  panel.className = 'course-add-to-cart__panel';

  const title = document.createElement('h2');
  title.className = 'course-add-to-cart__title';
  title.textContent = 'Operación de carrito';

  const explanation = document.createElement('p');
  explanation.className = 'course-add-to-cart__description';
  explanation.textContent = [
    'Este bloque utiliza la API oficial del Cart drop-in.',
    'El estado se comparte mediante cart/data.',
  ].join(' ');

  /*
   * We use a div instead of a form to make this exercise
   * independent from native form submission and validation.
   */
  const controls = document.createElement('div');
  controls.className = 'course-add-to-cart__form';

  const skuGroup = document.createElement('div');
  skuGroup.className = 'course-add-to-cart__field';

  const skuLabel = document.createElement('span');
  skuLabel.className = 'course-add-to-cart__label';
  skuLabel.textContent = 'SKU';

  const skuValue = document.createElement('code');
  skuValue.className = 'course-add-to-cart__sku';
  skuValue.textContent = sku || 'No configurado';

  skuGroup.append(skuLabel, skuValue);

  const quantityLabel = document.createElement('label');
  quantityLabel.className = 'course-add-to-cart__field';

  const quantityText = document.createElement('span');
  quantityText.className = 'course-add-to-cart__label';
  quantityText.textContent = 'Cantidad';

  const quantityInput = document.createElement('input');
  quantityInput.className = 'course-add-to-cart__quantity';
  quantityInput.type = 'number';
  quantityInput.name = 'quantity';
  quantityInput.min = '1';
  quantityInput.step = '1';
  quantityInput.value = String(initialQuantity);

  quantityLabel.append(
    quantityText,
    quantityInput,
  );

  const button = document.createElement('button');
  button.className = 'button primary';
  button.type = 'button';
  button.textContent = buttonLabel;
  button.disabled = true;

  const status = document.createElement('p');
  status.className = 'course-add-to-cart__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  controls.append(
    skuGroup,
    quantityLabel,
    button,
    status,
  );

  panel.append(
    title,
    explanation,
    controls,
  );

  block.replaceChildren(panel);

  if (!sku) {
    setStatus(
      status,
      'error',
      'El bloque no ha recibido ningún SKU.',
    );

    return;
  }

  setStatus(
    status,
    'loading',
    'Inicializando el carrito…',
  );

  let cartApi;

  try {
    cartApi = await getCartApi();

    if (typeof cartApi.addProductsToCart !== 'function') {
      throw new Error(
        'La función addProductsToCart no está disponible.',
      );
    }

    button.disabled = false;

    setStatus(
      status,
      'idle',
      'Carrito preparado. Puedes añadir el producto.',
    );
  } catch (error) {
    console.error(
      'Unable to initialize Cart drop-in:',
      error,
    );

    setStatus(
      status,
      'error',
      `Error de inicialización: ${getErrorMessage(error)}`,
    );

    return;
  }

  button.addEventListener('click', async () => {
    const quantity = normalizeQuantity(
      quantityInput.value,
    );

    button.disabled = true;
    quantityInput.disabled = true;
    block.setAttribute('aria-busy', 'true');

    setStatus(
      status,
      'loading',
      `Añadiendo ${quantity} unidad(es) del SKU ${sku}…`,
    );

    console.info(
      'Course add-to-cart started:',
      {
        sku,
        quantity,
      },
    );

    try {
      performance.clearMarks(
        'course-add-to-cart:start',
      );

      performance.clearMarks(
        'course-add-to-cart:end',
      );

      performance.clearMeasures(
        'course-add-to-cart',
      );

      performance.mark(
        'course-add-to-cart:start',
      );

      const cart = await cartApi.addProductsToCart([
        {
          sku,
          quantity,
        },
      ]);

      console.info(
        'Course add-to-cart response:',
        cart,
      );

      if (!cart) {
        throw new Error(
          'Commerce no devolvió un carrito actualizado.',
        );
      }

      performance.mark(
        'course-add-to-cart:end',
      );

      performance.measure(
        'course-add-to-cart',
        'course-add-to-cart:start',
        'course-add-to-cart:end',
      );

      const totalQuantity = Number.isFinite(
        cart.totalQuantity,
      )
        ? cart.totalQuantity
        : 'desconocido';

      setStatus(
        status,
        'success',
        [
          `${quantity} unidad(es) añadida(s).`,
          `Total del carrito: ${totalQuantity}.`,
        ].join(' '),
      );
    } catch (error) {
      console.error(
        'Unable to add course product to cart:',
        error,
      );

      setStatus(
        status,
        'error',
        `Error al añadir: ${getErrorMessage(error)}`,
      );
    } finally {
      button.disabled = false;
      quantityInput.disabled = false;
      block.removeAttribute('aria-busy');
    }
  });
}
