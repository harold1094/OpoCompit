import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { Question } from '@/core/domain/types';
import { reportQuestionRemote } from '@/core/firebase/firebaseClient';
import { QuestionReportModal } from './components/QuestionReportModal';

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: () => null,
}));

jest.mock('@/core/firebase/firebaseClient', () => ({
  reportQuestionRemote: jest.fn(),
  readableFirebaseError: (error: Error) => error.message,
}));

const question: Question = {
  id: 'q_report',
  oppositionId: 'firefighters_es',
  statement: '¿Qué contenido debería revisarse?',
  answers: [{id: 'a', text: 'Respuesta'}],
  categoryId: 'legislation',
  difficulty: 1,
  scopeType: 'national',
  territoryKeys: ['ES'],
  source: 'test',
};

describe('QuestionReportModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (reportQuestionRemote as jest.Mock).mockResolvedValue({reportId: 'report-1', status: 'open'});
  });

  it('submits the selected reason and optional detail', async () => {
    const onClose = jest.fn();
    const onSubmitted = jest.fn();
    const screen = render(
      <QuestionReportModal question={question} onClose={onClose} onSubmitted={onSubmitted} />,
    );

    fireEvent.press(screen.getByText('Pregunta desactualizada'));
    fireEvent.changeText(
      screen.getByPlaceholderText('Añade un detalle (opcional)'),
      'Cambió la norma.',
    );
    fireEvent.press(screen.getByText('Enviar reporte'));

    await waitFor(() => {
      expect(reportQuestionRemote).toHaveBeenCalledWith('q_report', 'outdated', 'Cambió la norma.');
      expect(onSubmitted).toHaveBeenCalledWith('q_report');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('requires a detail for the other reason', async () => {
    const screen = render(
      <QuestionReportModal question={question} onClose={jest.fn()} onSubmitted={jest.fn()} />,
    );

    fireEvent.press(screen.getByText('Otro'));
    fireEvent.press(screen.getByText('Enviar reporte'));

    expect(screen.getByText('Cuéntanos brevemente qué debería revisarse.')).toBeTruthy();
    expect(reportQuestionRemote).not.toHaveBeenCalled();
  });
});
