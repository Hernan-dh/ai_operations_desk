(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TriageEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const procedures = {
    access: {
      id: 'OPS-ACC-003',
      title: 'Repository and system access',
      excerpt: 'Confirm the resource, business need, and accountable approver before granting access.',
      keywords: ['access', 'acceso', 'login', 'permission', 'permiso', 'repository', 'repositorio', 'password', 'contraseña'],
      required: [
        { key: 'resource', label: 'resource or repository', patterns: ['repository', 'repositorio', 'github', 'drive', 'system', 'sistema'] },
        { key: 'approver', label: 'responsible approver', patterns: ['approved by', 'aprobado por', 'manager', 'responsable', 'supervisor'] }
      ]
    },
    billing: {
      id: 'OPS-FIN-004',
      title: 'Invoice discrepancy review',
      excerpt: 'Record the invoice reference and disputed amount; finance must approve any correction.',
      keywords: ['invoice', 'factura', 'billing', 'cobro', 'amount', 'importe', 'payment', 'pago'],
      required: [
        { key: 'invoice', label: 'invoice reference', patterns: ['inv-', 'invoice #', 'factura ', 'número'] },
        { key: 'amount', label: 'disputed amount', patterns: ['$', 'usd', 'eur', 'ars', 'importe', 'amount'] }
      ]
    },
    technical: {
      id: 'OPS-TEC-002',
      title: 'Service incident response',
      excerpt: 'Identify the affected service, impact, and start time before assigning incident severity.',
      keywords: ['down', 'unavailable', 'caído', 'no funciona', 'error', 'service', 'servicio', 'server', 'servidor'],
      required: [
        { key: 'service', label: 'affected service', patterns: ['service', 'servicio', 'server', 'servidor', 'api', 'website', 'sitio'] },
        { key: 'impact', label: 'business impact', patterns: ['team', 'equipo', 'client', 'cliente', 'users', 'usuarios', 'delivery', 'entrega'] }
      ]
    }
  };

  function includesAny(text, patterns) {
    return patterns.some((pattern) => text.includes(pattern));
  }

  function analyzeRequest(input) {
    const request = String(input || '').trim();
    if (request.length < 12) throw new Error('Request must contain at least 12 characters.');
    if (request.length > 1200) throw new Error('Request exceeds the 1,200 character limit.');

    const normalized = request.toLocaleLowerCase();
    const ranked = Object.entries(procedures)
      .map(([category, procedure]) => ({ category, procedure, score: procedure.keywords.filter((word) => normalized.includes(word)).length }))
      .sort((a, b) => b.score - a.score);
    const match = ranked[0];
    const category = match.score ? match.category : 'general';
    const procedure = match.score ? match.procedure : {
      id: 'OPS-GEN-001', title: 'General request intake',
      excerpt: 'Confirm the objective, desired deadline, and accountable owner before routing the request.',
      required: [{ label: 'desired outcome', patterns: ['need', 'necesito', 'request', 'solicito'] }, { label: 'desired deadline', patterns: ['today', 'hoy', 'tomorrow', 'mañana', 'urgent', 'urgente'] }]
    };
    const missing = procedure.required.filter((field) => !includesAny(normalized, field.patterns)).map((field) => field.label);
    const urgent = includesAny(normalized, ['urgent', 'urgente', 'today', 'hoy', 'blocked', 'bloqueado', 'all users', 'todos los usuarios']);
    const sensitive = category === 'access' || category === 'billing';
    const priority = urgent ? 'high' : missing.length === 0 ? 'medium' : 'normal';
    const humanReview = sensitive || urgent;
    const nextAction = missing.length
      ? `Request clarification: ${missing.join(', ')}.`
      : humanReview ? 'Send the proposed action to an accountable reviewer.' : 'Route the case to the operations queue.';

    return {
      caseId: `OPS-${Date.now().toString(36).toUpperCase()}`,
      category,
      priority,
      humanReview,
      summary: `A ${priority}-priority ${category} request was identified from the submitted description.`,
      nextAction,
      missing,
      procedure: { id: procedure.id, title: procedure.title, excerpt: procedure.excerpt },
      audit: [
        'Input length and type validated',
        `Matched procedure ${procedure.id} using explicit keywords`,
        `${missing.length} required field(s) missing`,
        humanReview ? 'Human review required by safety policy' : 'Automatic routing allowed by safety policy'
      ],
      engine: 'deterministic-baseline-v1'
    };
  }

  return { analyzeRequest, procedures };
});
