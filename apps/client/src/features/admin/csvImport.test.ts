import { CsvImportError, csvToQuestionBatch } from './csvImport';

const header = [
  'oppositionId',
  'statement',
  'answerA',
  'answerB',
  'answerC',
  'correctAnswerId',
  'explanation',
  'categoryId',
  'difficulty',
  'scopeType',
  'country',
  'source',
  'sourcePage',
].join(',');

describe('CSV question conversion', () => {
  it('converts quoted CSV rows into safe pending questions', () => {
    const csv = [
      header,
      'firefighters_es,"¿Qué equipo, según el manual, debe revisarse?",Casco,Manguera,Botas,b,"La manguera, antes de usarla.",equipment,2,technical,es,Manual,14',
    ].join('\n');

    const batch = csvToQuestionBatch(csv, {
      batchId: 'csv-training-2026',
      sourceDocument: 'manual.csv',
    });

    expect(batch.batchId).toBe('csv-training-2026');
    expect(batch.sourceDocument).toBe('manual.csv');
    expect(batch.questions).toHaveLength(1);
    expect(batch.questions[0]).toMatchObject({
      oppositionId: 'firefighters_es',
      statement: '¿Qué equipo, según el manual, debe revisarse?',
      correctAnswerId: 'b',
      country: 'ES',
      sourcePage: 14,
      verified: false,
      status: 'pending_review',
    });
    expect(batch.questions[0].answers).toEqual([
      { id: 'a', text: 'Casco' },
      { id: 'b', text: 'Manguera' },
      { id: 'c', text: 'Botas' },
    ]);
  });

  it('supports multiline quoted fields and nullable metadata', () => {
    const csv = [
      header,
      'firefighters_es,"Primera línea\nsegunda línea",Uno,Dos,,A,Explicación,law,1,national,ES,Ley,',
    ].join('\n');

    const batch = csvToQuestionBatch(csv);
    expect(batch.questions[0]).toMatchObject({
      statement: 'Primera línea\nsegunda línea',
      correctAnswerId: 'a',
      sourcePage: null,
      year: null,
    });
  });

  it('reports missing required columns before import', () => {
    expect(() => csvToQuestionBatch('statement,answerA\nPregunta,Uno')).toThrow(CsvImportError);
    expect(() => csvToQuestionBatch('statement,answerA\nPregunta,Uno')).toThrow(
      /Faltan columnas obligatorias/,
    );
  });

  it('rejects non-integer numeric metadata', () => {
    const csv = [
      header,
      'firefighters_es,Pregunta,Uno,Dos,,a,Explicación,law,alta,national,ES,Ley,1',
    ].join('\n');
    expect(() => csvToQuestionBatch(csv)).toThrow(/difficulty debe ser un entero/);
  });

  it('rejects missing answers and invalid correct answer ids', () => {
    const missingAnswer = [
      header,
      'firefighters_es,Pregunta,Uno,,,a,Explicación,law,1,national,ES,Ley,1',
    ].join('\n');
    expect(() => csvToQuestionBatch(missingAnswer)).toThrow(/answerB es obligatorio/);

    const invalidCorrect = [
      header,
      'firefighters_es,Pregunta,Uno,Dos,,d,Explicación,law,1,national,ES,Ley,1',
    ].join('\n');
    expect(() => csvToQuestionBatch(invalidCorrect)).toThrow(/correctAnswerId no coincide/);
  });
});
