'use strict';

const translations = {
  en: {
    connection: 'Connection', simulation: 'Fallback', live: 'n8n primary', eyebrow: 'N8N-ORCHESTRATED AUTOMATION / CASE 001', demoNotice: 'n8n is the primary integration. This page uses synthetic data and falls back locally only when the workflow is unavailable.',
    title: 'Route an unstructured request through an actionable n8n workflow.', lede: 'n8n validates and routes the request, applies deterministic policy, and can enrich the case with Gemini. A local deterministic engine is retained only as a recoverable fallback.',
    incoming: 'Incoming request', synthetic: 'Synthetic data only', requestLabel: 'What does the operations team need to resolve?', tryExample: 'Try an example', accessExample: 'Repository access', billingExample: 'Incorrect invoice', technicalExample: 'Service unavailable', analyze: 'Analyze request', caseAnalysis: 'Case analysis', empty: 'Submit a request to inspect its route, evidence, and decision.', processing: 'Validating and routing request…', category: 'Category', priority: 'Priority', review: 'Human review', engine: 'Decision engine', summary: 'Operational summary', nextAction: 'Next action', missing: 'Missing information', retrievedProcedure: 'Retrieved procedure', auditTrail: 'Audit trail', errorTitle: 'The request could not be processed.', boundedTitle: 'Bounded decisions', boundedText: 'Deterministic rules control sensitive actions and escalation.', evidenceTitle: 'Visible evidence', evidenceText: 'Every recommendation identifies its supporting procedure.', fallbackTitle: 'Graceful fallback', fallbackText: 'The local engine keeps the demo usable when n8n is unavailable.', connectionTitle: 'Workflow connection', simulationMode: 'Deterministic fallback', webhookMode: 'n8n workflow (primary)', webhookLabel: 'n8n production webhook URL', connectionHelp: 'The URL stays in this browser and is never included in the repository. If it is unavailable, the deterministic fallback keeps the demo usable.', save: 'Save connection', yes: 'Required', no: 'Not required', none: 'None',
    placeholder: 'Example: I cannot access the analytics repository and I need to deliver a change today.', useLocalAi: 'Use local AI workflow',
    examples: { access: 'I cannot access the analytics repository and I need to deliver a change today.', billing: 'Invoice INV-204 has an incorrect amount of USD 480.', technical: 'The client portal service is unavailable for the whole support team.' }
  },
  es: {
    connection: 'Conexión', simulation: 'Fallback', live: 'n8n principal', eyebrow: 'AUTOMATIZACIÓN ORQUESTADA CON N8N / CASO 001', demoNotice: 'n8n es la integración principal. Esta página usa datos ficticios y aplica un fallback local sólo si el workflow no está disponible.',
    title: 'Enrutá una solicitud desestructurada mediante un workflow accionable de n8n.', lede: 'n8n valida y enruta la solicitud, aplica una política determinista y puede enriquecer el caso con Gemini. Un motor determinista local queda sólo como fallback recuperable.',
    incoming: 'Solicitud recibida', synthetic: 'Solo datos ficticios', requestLabel: '¿Qué necesita resolver el equipo de operaciones?', tryExample: 'Probar un ejemplo', accessExample: 'Acceso a repositorio', billingExample: 'Factura incorrecta', technicalExample: 'Servicio no disponible', analyze: 'Analizar solicitud', caseAnalysis: 'Análisis del caso', empty: 'Enviá una solicitud para inspeccionar su ruta, evidencia y decisión.', processing: 'Validando y enrutando la solicitud…', category: 'Categoría', priority: 'Prioridad', review: 'Revisión humana', engine: 'Motor de decisión', summary: 'Resumen operativo', nextAction: 'Próxima acción', missing: 'Información faltante', retrievedProcedure: 'Procedimiento recuperado', auditTrail: 'Registro de auditoría', errorTitle: 'No se pudo procesar la solicitud.', boundedTitle: 'Decisiones limitadas', boundedText: 'Las reglas deterministas controlan las acciones sensibles y el escalamiento.', evidenceTitle: 'Evidencia visible', evidenceText: 'Cada recomendación identifica el procedimiento que la fundamenta.', fallbackTitle: 'Fallback controlado', fallbackText: 'El motor local mantiene disponible la demo cuando n8n no responde.', connectionTitle: 'Conexión del workflow', simulationMode: 'Fallback determinista', webhookMode: 'Workflow de n8n (principal)', webhookLabel: 'URL del webhook de producción de n8n', connectionHelp: 'La URL permanece en este navegador y nunca se incluye en el repositorio. Si no está disponible, el fallback determinista mantiene utilizable la demo.', save: 'Guardar conexión', yes: 'Requerida', no: 'No requerida', none: 'Ninguna',
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
  try { return JSON.parse(localStorage.getItem('ops-connection')) || { mode: 'webhook', webhookUrl: '' }; }
  catch { return { mode: 'webhook', webhookUrl: '' }; }
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

function analyzeWithFallback(request, reason) {
  const result = window.TriageEngine.analyzeRequest(request);
  result.engine = 'deterministic-browser-fallback-v1';
  result.audit.push(reason || 'n8n webhook not configured; deterministic fallback applied');
  return result;
}

async function analyze(request) {
  if (connection.mode !== 'webhook' || !connection.webhookUrl) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return analyzeWithFallback(request);
  }
  try {
    const response = await fetch(connection.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request }) });
    if (!response.ok) throw new Error(`n8n returned HTTP ${response.status}.`);
    return response.json();
  } catch (error) {
    console.warn('n8n unavailable; applying deterministic fallback.', error);
    return analyzeWithFallback(request, 'n8n webhook unavailable; deterministic fallback applied');
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
