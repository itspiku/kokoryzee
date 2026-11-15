import { useMemo } from 'react';
import { generateSeries, tmsSessions } from '../data/signals.js';
import { analysePatient, driftSeries } from './baseline.js';
import { PATIENTS, patientById } from '../data/content.js';
import { startOfDay } from '../lib/util.js';

const cache = new Map();
function dayKey() {
  return startOfDay(new Date()).getTime();
}

export function getPatientData(id = 'alex') {
  const key = `${id}:${dayKey()}`;
  if (cache.has(key)) return cache.get(key);
  const p = patientById(id) || PATIENTS[0];
  const series = generateSeries({ seed: p.seed, archetype: p.archetype });
  const analysis = analysePatient(series);
  const drift = driftSeries(series);
  const tms = tmsSessions(p.tmsStart, new Date(), 30);
  const data = { patient: p, series, analysis, drift, tms };
  cache.set(key, data);
  return data;
}

export function usePatientData(id = 'alex') {
  return useMemo(() => getPatientData(id), [id]);
}

export function allPatientData() {
  return PATIENTS.map((p) => getPatientData(p.id));
}
