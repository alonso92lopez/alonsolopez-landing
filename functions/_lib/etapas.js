// Etapas canónicas del proceso (campo 'Etapa portal' en la base Leads).
// Fuente de verdad del lado JS. Debe coincidir con comercial/portal/etapas.py
// y con el stepper de landing/portal/ y landing/estado/.

export const ETAPAS_PROCESO = [
  'Recibida',                  // el lead subió su propiedad
  'Validación',                // esperando la llamada de validación (gate 1)
  'En evaluación',             // publicada a las casas de remate
  'Propuesta en preparación',  // llegó proyección; Alonso arma la propuesta (gate 2)
  'Propuesta enviada',         // el lead puede aceptar o rechazar
];

export const ETAPAS_TERMINALES = [
  'Propuesta aceptada',
  'Propuesta rechazada',
  'No continúa',
];

export const ETAPAS_TODAS = [...ETAPAS_PROCESO, ...ETAPAS_TERMINALES];
