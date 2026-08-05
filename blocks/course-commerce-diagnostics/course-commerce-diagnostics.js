import {
  getConfigValue,
  getHeaders,
  getRootPath,
} from '@dropins/tools/lib/aem/configs.js';

const NOT_CONFIGURED = 'No configurado';

/**
 * Returns a readable endpoint without query parameters.
 *
 * @param {string|undefined} endpoint Endpoint value.
 * @returns {string} Readable endpoint.
 */
function formatEndpoint(endpoint) {
  if (!endpoint) {
    return NOT_CONFIGURED;
  }

  try {
    const url = new URL(endpoint);
    return `${url.origin}${url.pathname}`;
  } catch {
    return String(endpoint);
  }
}

/**
 * Returns only the configured header names.
 *
 * Header values are deliberately omitted from the diagnostics.
 *
 * @param {string} scope Configuration header scope.
 * @returns {string} Comma-separated header names.
 */
function getHeaderNames(scope) {
  const headers = getHeaders(scope) || {};
  const names = Object.keys(headers).sort();

  return names.length > 0
    ? names.join(', ')
    : 'Ninguno';
}

/**
 * Reads the configuration cache metadata from sessionStorage.
 *
 * @returns {{status: string, remaining: string}} Cache information.
 */
function getConfigCacheDetails() {
  const cachedValue = window.sessionStorage.getItem('config');

  if (!cachedValue) {
    return {
      status: 'No disponible',
      remaining: '—',
    };
  }

  try {
    const config = JSON.parse(cachedValue);
    const expiry = Number(config[':expiry']);

    if (!expiry) {
      return {
        status: 'Sin caducidad conocida',
        remaining: '—',
      };
    }

    const now = Math.round(Date.now() / 1000);
    const remainingSeconds = Math.max(0, expiry - now);

    return {
      status: remainingSeconds > 0 ? 'Activa' : 'Caducada',
      remaining: `${Math.ceil(remainingSeconds / 60)} minutos`,
    };
  } catch {
    return {
      status: 'JSON inválido',
      remaining: '—',
    };
  }
}

/**
 * Adds one term and value to a description list.
 *
 * @param {HTMLDListElement} list Description list.
 * @param {string} label Diagnostic label.
 * @param {string} value Diagnostic value.
 */
function addDiagnostic(list, label, value) {
  const term = document.createElement('dt');
  term.textContent = label;

  const description = document.createElement('dd');
  description.textContent = value;

  list.append(term, description);
}

/**
 * Decorates the Commerce diagnostics block.
 *
 * @param {HTMLElement} block Block root.
 */
export default function decorate(block) {
  const authoredTitle = block.textContent.trim();
  const catalogEndpoint = getConfigValue('commerce-endpoint');
  const explicitCoreEndpoint = getConfigValue(
    'commerce-core-endpoint',
  );

  const coreEndpoint = explicitCoreEndpoint || catalogEndpoint;

  const storeCode = getConfigValue(
    'headers.cs.Magento-Store-Code',
  ) || getConfigValue('headers.all.Store')
  || NOT_CONFIGURED;

  const storeViewCode = getConfigValue(
    'headers.cs.Magento-Store-View-Code',
  ) || NOT_CONFIGURED;

  const websiteCode = getConfigValue(
    'headers.cs.Magento-Website-Code',
  ) || NOT_CONFIGURED;

  const locale = getConfigValue(
    'headers.cs.AC-Source-Locale',
  ) || document.documentElement.lang
  || window.navigator.language
  || NOT_CONFIGURED;

  const cache = getConfigCacheDetails();

  const panel = document.createElement('section');
  panel.className = 'course-commerce-diagnostics__panel';

  const title = document.createElement('h2');
  title.className = 'course-commerce-diagnostics__title';
  title.textContent = authoredTitle
    || 'Configuración Commerce';

  const description = document.createElement('p');
  description.className = 'course-commerce-diagnostics__description';
  description.textContent = [
    'Información obtenida del runtime ya inicializado.',
    'Los valores sensibles de los headers no se muestran.',
  ].join(' ');

  const diagnostics = document.createElement('dl');
  diagnostics.className = 'course-commerce-diagnostics__list';

  addDiagnostic(
    diagnostics,
    'Ruta raíz activa',
    getRootPath() || '/',
  );

  addDiagnostic(
    diagnostics,
    'Ruta actual',
    window.location.pathname,
  );

  addDiagnostic(
    diagnostics,
    'Endpoint de catálogo',
    formatEndpoint(catalogEndpoint),
  );

  addDiagnostic(
    diagnostics,
    'Endpoint de Core',
    formatEndpoint(coreEndpoint),
  );

  addDiagnostic(
    diagnostics,
    'Origen del endpoint Core',
    explicitCoreEndpoint
      ? 'commerce-core-endpoint'
      : 'Fallback a commerce-endpoint',
  );

  addDiagnostic(
    diagnostics,
    'Adobe Commerce Optimizer',
    getConfigValue('adobe-commerce-optimizer')
      ? 'Activado'
      : 'No activado',
  );

  addDiagnostic(
    diagnostics,
    'AEM Assets Commerce',
    getConfigValue('commerce-assets-enabled')
      ? 'Activado'
      : 'No activado',
  );

  addDiagnostic(
    diagnostics,
    'Website',
    websiteCode,
  );

  addDiagnostic(
    diagnostics,
    'Store',
    storeCode,
  );

  addDiagnostic(
    diagnostics,
    'Store View',
    storeViewCode,
  );

  addDiagnostic(
    diagnostics,
    'Locale',
    locale,
  );

  addDiagnostic(
    diagnostics,
    'Headers de Core',
    getHeaderNames('all'),
  );

  addDiagnostic(
    diagnostics,
    'Headers de catálogo',
    getHeaderNames('cs'),
  );

  addDiagnostic(
    diagnostics,
    'Caché de configuración',
    cache.status,
  );

  addDiagnostic(
    diagnostics,
    'Tiempo restante de caché',
    cache.remaining,
  );

  const actions = document.createElement('div');
  actions.className = 'course-commerce-diagnostics__actions';

  const clearCacheButton = document.createElement('button');
  clearCacheButton.type = 'button';
  clearCacheButton.className = 'button secondary';
  clearCacheButton.textContent = [
    'Vaciar caché de configuración y recargar',
  ].join('');

  clearCacheButton.addEventListener('click', () => {
    window.sessionStorage.removeItem('config');
    window.location.reload();
  });

  actions.append(clearCacheButton);

  panel.append(
    title,
    description,
    diagnostics,
    actions,
  );

  block.replaceChildren(panel);
}
