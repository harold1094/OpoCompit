import { fireEvent, render, waitFor } from '@testing-library/react-native';

import {
  getQuestionReportsQueueRemote,
  resolveQuestionReportRemote,
} from '@/core/firebase/firebaseClient';
import { AdminQuestionReportsPanel } from './AdminQuestionReportsPanel';

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: () => null,
}));

jest.mock('@/core/firebase/firebaseClient', () => ({
  getQuestionReportsQueueRemote: jest.fn(),
  resolveQuestionReportRemote: jest.fn(),
  readableFirebaseError: (error: Error) => error.message,
}));

describe('AdminQuestionReportsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getQuestionReportsQueueRemote as jest.Mock).mockResolvedValue([{
      id: 'report-1',
      questionId: 'q1',
      reason: 'incorrect_answer',
      detail: 'La opción correcta parece ser otra.',
      status: 'open',
      createdAt: '2026-10-05T10:00:00.000Z',
      updatedAt: '2026-10-05T10:00:00.000Z',
      question: {
        statement: '¿Cuál es la respuesta correcta?',
        categoryId: 'legislation',
        source: 'Manual',
        officialExamId: null,
        status: 'published',
        validFrom: null,
        validUntil: null,
      },
    }]);
    (resolveQuestionReportRemote as jest.Mock).mockResolvedValue(undefined);
  });

  it('loads and dismisses a pending report', async () => {
    const screen = await render(<AdminQuestionReportsPanel />);

    await screen.findByText('¿Cuál es la respuesta correcta?');
    await fireEvent.press(screen.getByText('Descartar'));

    await waitFor(() => {
      expect(resolveQuestionReportRemote).toHaveBeenCalledWith('report-1', 'dismiss');
      expect(screen.queryByText('¿Cuál es la respuesta correcta?')).toBeNull();
      expect(screen.getByText('Reporte descartado.')).toBeTruthy();
    });
  });
});
