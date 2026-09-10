'use strict';

const translations = {
  en: {
    connection: 'Connection', simulation: 'Simulation', live: 'n8n live', eyebrow: 'AUDITABLE AUTOMATION / CASE 001', demoNotice: 'Public demo uses synthetic data and browser simulation by default.',
    title: 'Turn an unstructured request into an actionable case.', lede: 'Rules establish the safety boundary. The analysis classifies the request, retrieves a procedure, and explains when a person must intervene.',
    incoming: 'Incoming request', synthetic: 'Synthetic data only', requestLabel: 'What does the operations team need to resolve?', tryExample: 'Try an example', accessExample: 'Repository access', billingExample: 'Incorrect invoice', technicalExample: 'Service unavailable', analyze: 'Analyze request', caseAnalysis: 'Case analysis', empty: 'Submit a request to inspect its route, evidence, and decision.', processing: 'Validating and routing request…', category: 'Category', priority: 'Priority', review: 'Human review', engine: 'Decision engine', summary: 'Operational summary', nextAction: 'Next action', missing: 'Missing information', retrievedProcedure: 'Retrieved procedure', auditTrail: 'Audit trail', errorTitle: 'The request could not be processed.', boundedTitle: 'Bounded decisions', boundedText: 'Deterministic rules control sensitive actions and escalation.', evidenceTitle: 'Visible evidence', evidenceText: 'Every recommendation identifies its supporting procedure.', fallbackTitle: 'Graceful fallback', fallbackText: 'The workflow remains useful when an AI provider is unavailable.', connectionTitle: 'Connection', simulationMode: 'Browser simulation', webhookMode: 'n8n webhook', webhookLabel: 'Production webhook URL', connectionHelp: 'The URL stays in this browser and is never included in the repository.', save: 'Save connection', yes: 'Required', no: 'Not required', none: 'None',
    placeholder: 'Example: I cannot access the analytics repository and I need to deliver a change today.', useLocalAi: 'Use local AI workflow',
    examples: { access: 'I cannot access the analytics repository and I need to deliver a change today.', billing: 'Invoice INV-204 has an incorrect amount of USD 480.', technical: 'The client portal service is unavailable for the whole support team.' }
  },
  es: {
    connection: 'Conexión', simulation: 'Simulación', live: 'n8n activo', eyebrow: 'AUTOMATIZACIÓN AUDITABLE / CASO 001', demoNotice: 'La demo pública usa datos ficticios y simulación en el navegador de forma predeterminada.',
    title: 'Convertí una solicitud desestructurada en un caso accionable.', lede: 'Las reglas establecen el límite de seguridad. El análisis clasifica la solicitud, recupera un procedimiento y explica cuándo debe intervenir una persona.',
    incoming: 'Solicitud recibida', synthetic: 'Solo datos ficticios', requestLabel: '¿Qué necesita resolver el equipo de operaciones?', tryExample: 'Probar un ejemplo', accessExample: 'Acceso a repositorio', billingExample: 'Factura incorrecta', technicalExample: 'Servicio no disponible', analyze: 'Analizar solicitud', caseAnalysis: 'Análisis del caso', empty: 'Enviá una solicitud para inspeccionar su ruta, evidencia y decisión.', processing: 'Validando y enrutando la solicitud…', category: 'Categoría', priority: 'Prioridad', review: 'Revisión humana', engine: 'Motor de decisión', summary: 'Resumen operativo', nextAction: 'Próxima acción', missing: 'Información faltante', retrievedProcedure: 'Procedimiento recuperado', auditTrail: 'Registro de auditoría', errorTitle: 'No se pudo procesar la solicitud.', boundedTitle: 'Decisiones limitadas', boundedText: 'Las reglas deterministas controlan las acciones sensibles y el escalamiento.', evidenceTitle: 'Evidencia visible', evidenceText: 'Cada recomendación identifica el procedimiento que la fundamenta.', fallbackTitle: 'Fallback controlado', fallbackText: 'El flujo sigue siendo útil si un proveedor de IA no está disponible.', connectionTitle: 'Conexión', simulationMode: 'Simulación en el navegador', webhookMode: 'Webhook de n8n', webhookLabel: 'URL del webhook de producción', connectionHelp: 'La URL permanece en este navegador y nunca se incluye en el repositorio.', save: 'Guardar conexión', yes: 'Requerida', no: 'No requerida', none: 'Ninguna',
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
  try { return JSON.parse(localStorage.getItem('ops-connection')) || { mode: 'simulation', webhookUrl: '' }; }
  catch { return { mode: 'simulation', webhookUrl: '' }; }
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
  elements.modeLabel.textContent = connection.mode === 'webhook' ? translations[language].live : translations[language].simulation;
}

function setView(view) {
  ['emptyState','loadingState','resultContent','errorState'].forEach((key) => { elements[key].hidden = key !== view; });
  elements.resultPanel.setAttribute('aria-busy', view === 'loadingState' ? 'true' : 'false');
}

async function analyze(request) {
  if (connection.mode !== 'webhook') {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return window.TriageEngine.analyzeRequest(request);
  }
  if (!connection.webhookUrl) throw new Error('Configure the n8n production webhook URL first.');
  const response = await fetch(connection.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request }) });
  if (!response.ok) throw new Error(`n8n returned HTTP ${response.status}.`);
  return response.json();
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
