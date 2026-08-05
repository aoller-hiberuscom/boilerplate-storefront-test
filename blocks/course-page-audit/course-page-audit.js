const EMPTY_VALUE = '—';

const COMPARISON_FIELDS = [
  {
    key: 'pageType',
    label: 'Tipo de página detectado',
  },
  {
    key: 'title',
    label: 'Document title',
  },
  {
    key: 'sku',
    label: 'Metadata SKU',
  },
  {
    key: 'description',
    label: 'Meta description',
  },
  {
    key: 'ogType',
    label: 'Open Graph type',
  },
  {
    key: 'ogTitle',
    label: 'Open Graph title',
  },
  {
    key: 'ogImage',
    label: 'Open Graph image',
  },
  {
    key: 'canonical',
    label: 'Canonical',
  },
  {
    key: 'productJsonLd',
    label: 'JSON-LD Product',
  },
  {
    key: 'productBlock',
    label: 'Bloque product-details',
  },
  {
    key: 'productText',
    label: 'Texto dentro de product-details',
  },
];

/**
 * Reads a metadata value from a document.
 *
 * Metadata names containing ":" use the property attribute.
 * Other metadata uses the name attribute.
 *
 * @param {Document} doc Document to inspect.
 * @param {string} name Metadata name.
 * @returns {string} Metadata value.
 */
function getMetadata(doc, name) {
  const attribute = name.includes(':')
    ? 'property'
    : 'name';

  const metadata = doc.head.querySelector(
    `meta[${attribute}="${name}"]`,
  );

  return metadata?.content?.trim() || '';
}

/**
 * Detects the Commerce page type using the same block-based
 * rules as the storefront runtime.
 *
 * @param {Document} doc Document to inspect.
 * @returns {string} Detected page type.
 */
function detectPageType(doc) {
  if (doc.querySelector('main .product-details')) {
    return 'Product';
  }

  if (doc.querySelector('main .product-list-page')) {
    return 'Category';
  }

  if (doc.querySelector('main .commerce-cart')) {
    return 'Cart';
  }

  if (doc.querySelector('main .commerce-checkout')) {
    return 'Checkout';
  }

  return 'CMS';
}

/**
 * Determines whether the document contains Product JSON-LD.
 *
 * @param {Document} doc Document to inspect.
 * @returns {boolean} True when Product JSON-LD exists.
 */
function hasProductJsonLd(doc) {
  const scripts = [
    ...doc.querySelectorAll(
      'script[type="application/ld+json"]',
    ),
  ];

  return scripts.some((script) => {
    try {
      const data = JSON.parse(
        script.textContent || '{}',
      );

      if (data?.['@type'] === 'Product') {
        return true;
      }

      if (Array.isArray(data?.['@graph'])) {
        return data['@graph'].some(
          (item) => item?.['@type'] === 'Product',
        );
      }
    } catch {
      return false;
    }

    return false;
  });
}

/**
 * Reads the canonical URL.
 *
 * @param {Document} doc Document to inspect.
 * @returns {string} Canonical URL.
 */
function getCanonical(doc) {
  return doc.head
      .querySelector('link[rel="canonical"]')
      ?.href
    || '';
}

/**
 * Creates a diagnostic snapshot of a document.
 *
 * @param {Document} doc Document to inspect.
 * @returns {Record<string, string>} Snapshot values.
 */
function createSnapshot(doc) {
  const productBlock = doc.querySelector(
    'main .product-details',
  );

  const productTextLength = productBlock
      ?.textContent
      ?.trim()
      ?.length
    || 0;

  return {
    pageType: detectPageType(doc),
    title: doc.title || EMPTY_VALUE,
    sku: getMetadata(doc, 'sku') || EMPTY_VALUE,
    description:
      getMetadata(doc, 'description')
      || EMPTY_VALUE,
    ogType:
      getMetadata(doc, 'og:type')
      || EMPTY_VALUE,
    ogTitle:
      getMetadata(doc, 'og:title')
      || EMPTY_VALUE,
    ogImage: getMetadata(doc, 'og:image')
      ? 'Presente'
      : 'Ausente',
    canonical:
      getCanonical(doc)
      || EMPTY_VALUE,
    productJsonLd: hasProductJsonLd(doc)
      ? 'Presente'
      : 'Ausente',
    productBlock: productBlock
      ? 'Presente'
      : 'Ausente',
    productText: productBlock
      ? `${productTextLength} caracteres`
      : 'Bloque ausente',
  };
}

/**
 * Fetches the current page without executing its JavaScript.
 *
 * The returned HTML represents a new initial server response.
 *
 * @returns {Promise<Document>} Parsed initial document.
 */
async function fetchInitialDocument() {
  const url = new URL(window.location.href);
  url.hash = '';

  const response = await fetch(url, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `No se pudo obtener el HTML inicial: ${response.status}.`,
    );
  }

  const html = await response.text();

  return new DOMParser().parseFromString(
    html,
    'text/html',
  );
}

/**
 * Creates one comparison table cell.
 *
 * @param {string} value Cell value.
 * @returns {HTMLTableCellElement} Table cell.
 */
function createCell(value) {
  const cell = document.createElement('td');
  cell.textContent = value || EMPTY_VALUE;

  return cell;
}

/**
 * Creates the comparison table.
 *
 * @param {object} initial Initial-response snapshot.
 * @param {object} live Current live-DOM snapshot.
 * @returns {HTMLElement} Table wrapper.
 */
function createComparisonTable(initial, live) {
  const wrapper = document.createElement('div');
  wrapper.className = 'course-page-audit__table-wrapper';

  const table = document.createElement('table');
  table.className = 'course-page-audit__table';

  const caption = document.createElement('caption');
  caption.textContent = [
    'Comparación entre la respuesta HTML inicial',
    'y el DOM después de ejecutar JavaScript.',
  ].join(' ');

  const head = document.createElement('thead');
  const headerRow = document.createElement('tr');

  const fieldHeader = document.createElement('th');
  fieldHeader.scope = 'col';
  fieldHeader.textContent = 'Dato';

  const initialHeader = document.createElement('th');
  initialHeader.scope = 'col';
  initialHeader.textContent = 'HTML inicial';

  const liveHeader = document.createElement('th');
  liveHeader.scope = 'col';
  liveHeader.textContent = 'DOM actual';

  headerRow.append(
    fieldHeader,
    initialHeader,
    liveHeader,
  );

  head.append(headerRow);

  const body = document.createElement('tbody');

  COMPARISON_FIELDS.forEach(({ key, label }) => {
    const row = document.createElement('tr');

    const labelCell = document.createElement('th');
    labelCell.scope = 'row';
    labelCell.textContent = label;

    const initialCell = createCell(initial[key]);
    const liveCell = createCell(live[key]);

    if (initial[key] !== live[key]) {
      liveCell.dataset.changed = 'true';
    }

    row.append(
      labelCell,
      initialCell,
      liveCell,
    );

    body.append(row);
  });

  table.append(caption, head, body);
  wrapper.append(table);

  return wrapper;
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

  return 'No se pudo ejecutar la comparación.';
}

/**
 * Decorates the page-type and SEO diagnostics block.
 *
 * @param {HTMLElement} block Block root.
 */
export default function decorate(block) {
  const authoredTitle = block.textContent.trim();

  const panel = document.createElement('section');
  panel.className = 'course-page-audit__panel';

  const title = document.createElement('h2');
  title.className = 'course-page-audit__title';
  title.textContent = authoredTitle
    || 'Diagnóstico de página';

  const explanation = document.createElement('p');
  explanation.className = 'course-page-audit__description';
  explanation.textContent = [
    'La columna HTML inicial procede de una nueva petición',
    'que no ejecuta los scripts de la página.',
  ].join(' ');

  const route = document.createElement('p');
  route.className = 'course-page-audit__route';

  const routeLabel = document.createElement('strong');
  routeLabel.textContent = 'Ruta: ';

  const routeValue = document.createElement('code');
  routeValue.textContent = window.location.pathname;

  route.append(routeLabel, routeValue);

  const actions = document.createElement('div');
  actions.className = 'course-page-audit__actions';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button secondary';
  button.textContent = 'Volver a comparar';

  const status = document.createElement('p');
  status.className = 'course-page-audit__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const results = document.createElement('div');
  results.className = 'course-page-audit__results';

  actions.append(button);

  panel.append(
    title,
    explanation,
    route,
    actions,
    status,
    results,
  );

  block.replaceChildren(panel);

  async function runAudit() {
    button.disabled = true;
    block.setAttribute('aria-busy', 'true');
    status.textContent = 'Obteniendo el HTML inicial…';

    try {
      const initialDocument = await fetchInitialDocument();

      const initialSnapshot = createSnapshot(
        initialDocument,
      );

      const liveSnapshot = createSnapshot(document);

      results.replaceChildren(
        createComparisonTable(
          initialSnapshot,
          liveSnapshot,
        ),
      );

      status.textContent = 'Comparación terminada.';
    } catch (error) {
      status.textContent = getErrorMessage(error);
    } finally {
      button.disabled = false;
      block.removeAttribute('aria-busy');
    }
  }

  button.addEventListener('click', runAudit);

  runAudit();
}
