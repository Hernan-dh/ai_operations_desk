'use strict';

const translations = {
  en: {
    connection: 'Connection', simulation: 'Managed n8n', live: 'Custom n8n', eyebrow: 'N8N-ORCHESTRATED AUTOMATION / CASE 001', demoNotice: 'Every request is processed by n8n. This page uses synthetic data.',
    title: 'Route an unstructured request through an actionable n8n workflow.', lede: 'The application sends every request to n8n for validation, classification, procedure retrieval, and policy enforcement.',
    incoming: 'Incoming request', synthetic: 'Synthetic data only', requestLabel: 'What does the operations team need to resolve?', tryExample: 'Try an example', accessExample: 'Repository access', billingExample: 'Incorrect invoice', technicalExample: 'Service unavailable', analyze: 'Analyze request', caseAnalysis: 'Case analysis', empty: 'Submit a request to inspect its route, evidence, and decision.', processing: 'Validating and routing request…', category: 'Category', priority: 'Priority', review: 'Human review', engine: 'Decision engine', summary: 'Operational summary', nextAction: 'Next action', missing: 'Missing information', retrievedProcedure: 'Retrieved procedure', auditTrail: 'Audit trail', errorTitle: 'The request could not be processed.', boundedTitle: 'Bounded decisions', boundedText: 'Deterministic rules control sensitive actions and escalation.', evidenceTitle: 'Visible evidence', evidenceText: 'Every recommendation identifies its supporting procedure.', fallbackTitle: 'Fail closed', fallbackText: 'If n8n is unavailable, no local decision is generated.', connectionTitle: 'n8n connection', simulationMode: 'Managed n8n via server', webhookMode: 'Custom n8n webhook', webhookLabel: 'n8n production webhook URL', connectionHelp: 'Both modes require n8n. The custom URL stays only in this browser.', save: 'Save connection', yes: 'Required', no: 'Not required', none: 'None',
    placeholder: 'Example: I cannot access the analytics repository and I need to deliver a change today.', useLocalAi: 'Use local AI workflow',
    examples: { access: 'I cannot access the analytics repository and I need to deliver a change today.', billing: 'Invoice INV-204 has an incorrect amount of USD 480.', technical: 'The client portal service is unavailable for the whole support team.' }
  },
  es: {
    connection: 'Conexión', simulation: 'n8n administrado', live: 'n8n externo', eyebrow: 'AUTOMATIZACIÓN ORQUESTADA CON N8N / CASO 001', demoNotice: 'Todas las solicitudes son procesadas por n8n. Esta página usa datos ficticios.',
    title: 'Enrutá una solicitud desestructurada mediante un workflow accionable de n8n.', lede: 'La aplicación envía cada solicitud a n8n para su validación, clasificación, recuperación de procedimientos y aplicación de políticas.',
    incoming: 'Solicitud recibida', synthetic: 'Solo datos ficticios', requestLabel: '¿Qué necesita resolver el equipo de operaciones?', tryExample: 'Probar un ejemplo', accessExample: 'Acceso a repositorio', billingExample: 'Factura incorrecta', technicalExample: 'Servicio no disponible', analyze: 'Analizar solicitud', caseAnalysis: 'Análisis del caso', empty: 'Enviá una solicitud para inspeccionar su ruta, evidencia y decisión.', processing: 'Validando y enrutando la solicitud…', category: 'Categoría', priority: 'Prioridad', review: 'Revisión humana', engine: 'Motor de decisión', summary: 'Resumen operativo', nextAction: 'Próxima acción', missing: 'Información faltante', retrievedProcedure: 'Procedimiento recuperado', auditTrail: 'Registro de auditoría', errorTitle: 'No se pudo procesar la solicitud.', boundedTitle: 'Decisiones limitadas', boundedText: 'Las reglas deterministas controlan las acciones sensibles y el escalamiento.', evidenceTitle: 'Evidencia visible', evidenceText: 'Cada recomendación identifica el procedimiento que la fundamenta.', fallbackTitle: 'Fallo seguro', fallbackText: 'Si n8n no está disponible, no se genera ninguna decisión local.', connectionTitle: 'Conexión de n8n', simulationMode: 'n8n administrado vía servidor', webhookMode: 'Webhook personalizado de n8n', webhookLabel: 'URL del webhook de producción de n8n', connectionHelp: 'Ambos modos requieren n8n. La URL personalizada queda sólo en este navegador.', save: 'Guardar conexión', yes: 'Requerida', no: 'No requerida', none: 'Ninguna',
    placeholder: 'Ejemplo: No puedo acceder al repositorio de analítica y necesito entregar un cambio hoy.', useLocalAi: 'Usar workflow AI local',
    examples: { access: 'No puedo acceder al repositorio de analítica y necesito entregar un cambio hoy.', billing: 'La factura INV-204 tiene un importe incorrecto de USD 480.', technical: 'El servicio del portal de clientes no está disponible para todo el equipo de soporte.' }
  }
};

let language = localStorage.getItem('ops-language') || 'en';
let theme = localStorage.getItem('ops-theme') || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
let connection = readConnection();
const elements = Object.fromEntries(['triageForm','requestText','resultPanel','emptyState','loadingState','resultContent','errorState','errorMessage','caseId','category','priority','review','engine','summary','nextAction','missing','sourceTitle','sourceExcerpt','sourceId','auditTrail','themeButton','languageButton','connectionButton','connectionDialog','connectionForm','webhookUrl','useLocalAiButton','modeLabel'].map((id) => [id, document.getElementById(id)]));

function applyTheme() {
  document.documentElement.dataset.theme = theme;
  elements.themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
  elements.themeButton.textContent = theme === 'dark' ? '☼' : '◐';
}

function readConnection() {
  try { return JSON.parse(localStorage.getItem('ops-connection')) || { mode: 'server', webhookUrl: '' }; }
  catch { return { mode: 'server', webhookUrl: '' }; }
}

function applyLanguage() {
  const copy = translations[language];
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = copy[node.dataset.i18n]; });
  elements.requestText.placeholder = copy.placeholder;
  elements.languageButton.textContent = language === 'en' ? 'ES' : 'EN';
  updateModeLabel();
}

function updateModeLabel() {
  elements.modeLabel.textContent = connection.mode === 'webhook' && connection.webhookUrl ? translations[language].live : translations[language].simulation;
}

function setView(view) {
  ['emptyState','loadingState','resultContent','errorState'].forEach((key) => { elements[key].hidden = key !== view; });
  elements.resultPanel.setAttribute('aria-busy', view === 'loadingState' ? 'true' : 'false');
}

async function analyze(request) {
  const endpoint = connection.mode === 'webhook' && connection.webhookUrl ? connection.webhookUrl : '/api/triage';
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request }) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `Service returned HTTP ${response.status}.`);
    return body;
  } catch (error) {
    throw error;
  }
}

function render(result) {
  const copy = translations[language];
  elements.caseId.textContent = result.caseId;
  elements.category.textContent = result.category;
  elements.priority.textContent = result.priority;
  elements.review.textContent = result.humanReview ? copy.yes : copy.no;
  elements.engine.textContent = result.engine || 'deterministic-browser-v1';
  elements.summary.textContent = result.summary;
  elements.nextAction.textContent = result.nextAction;
  elements.missing.replaceChildren(...(result.missing.length ? result.missing : [copy.none]).map((item) => Object.assign(document.createElement('span'), { textContent: item })));
  elements.sourceTitle.textContent = result.procedure.title;
  elements.sourceExcerpt.textContent = result.procedure.excerpt;
  elements.sourceId.textContent = result.procedure.id;
  elements.auditTrail.replaceChildren(...result.audit.map((item) => { const li = document.createElement('li'); li.textContent = item; return li; }));
  setView('resultContent');
}

elements.triageForm.addEventListener('submit', async (event) => {
  event.preventDefault(); setView('loadingState'); elements.caseId.textContent = 'ROUTING';
  try { render(await analyze(elements.requestText.value)); }
  catch (error) { elements.caseId.textContent = 'ERROR'; elements.errorMessage.textContent = error.message; setView('errorState'); }
});

document.querySelectorAll('[data-example]').forEach((button) => button.addEventListener('click', () => { elements.requestText.value = translations[language].examples[button.dataset.example]; elements.requestText.focus(); }));
elements.languageButton.addEventListener('click', () => { language = language === 'en' ? 'es' : 'en'; localStorage.setItem('ops-language', language); applyLanguage(); });
elements.themeButton.addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('ops-theme', theme); applyTheme(); });
elements.connectionButton.addEventListener('click', () => {
  elements.connectionForm.elements.mode.value = connection.mode; elements.webhookUrl.value = connection.webhookUrl; elements.connectionDialog.showModal();
});
elements.connectionForm.addEventListener('submit', (event) => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault();
  const data = new FormData(elements.connectionForm);
  connection = { mode: data.get('mode'), webhookUrl: String(data.get('webhookUrl') || '').trim() };
  localStorage.setItem('ops-connection', JSON.stringify(connection)); updateModeLabel(); elements.connectionDialog.close();
});
elements.useLocalAiButton.addEventListener('click', () => {
  connection = { mode: 'webhook', webhookUrl: 'http://localhost:5678/webhook/operations-desk-triage-ai' };
  localStorage.setItem('ops-connection', JSON.stringify(connection)); updateModeLabel(); elements.connectionDialog.close();
});

applyTheme();
applyLanguage();
