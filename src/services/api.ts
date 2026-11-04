import { LiveParticipantMonitoring, Question, OlympiadCategory } from '../types';

export const ApiService = {
  // --- Participants ---
  async getParticipants(): Promise<LiveParticipantMonitoring[]> {
    try {
      const res = await fetch('/api/participants');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch {
      // Fallback to localStorage if server is unreachable
    }

    try {
      const stored = localStorage.getItem('mmo_live_participants');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  },

  async registerParticipant(participant: LiveParticipantMonitoring): Promise<LiveParticipantMonitoring[]> {
    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(participant),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch {
      // ignore
    }

    // Local fallback
    try {
      const stored = localStorage.getItem('mmo_live_participants');
      const list: LiveParticipantMonitoring[] = stored ? JSON.parse(stored) : [];
      const updated = [participant, ...list.filter((p) => p.id !== participant.id)];
      localStorage.setItem('mmo_live_participants', JSON.stringify(updated));
      return updated;
    } catch {
      return [participant];
    }
  },

  async updateParticipantProgress(
    id: string,
    data: Partial<LiveParticipantMonitoring>
  ): Promise<void> {
    try {
      await fetch(`/api/participants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {
      // Fallback
      try {
        const stored = localStorage.getItem('mmo_live_participants');
        if (stored) {
          const list: LiveParticipantMonitoring[] = JSON.parse(stored);
          const updated = list.map((p) => (p.id === id ? { ...p, ...data } : p));
          localStorage.setItem('mmo_live_participants', JSON.stringify(updated));
        }
      } catch {
        // ignore
      }
    }
  },

  async deleteParticipant(id: string): Promise<void> {
    try {
      await fetch(`/api/participants/${id}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
    try {
      const stored = localStorage.getItem('mmo_live_participants');
      if (stored) {
        const list: LiveParticipantMonitoring[] = JSON.parse(stored);
        const updated = list.filter((p) => p.id !== id);
        localStorage.setItem('mmo_live_participants', JSON.stringify(updated));
      }
    } catch {
      // ignore
    }
  },

  async clearAllParticipants(): Promise<void> {
    try {
      await fetch('/api/participants', { method: 'DELETE' });
    } catch {
      // ignore
    }
    localStorage.removeItem('mmo_live_participants');
  },

  // --- Questions ---
  async getQuestions(): Promise<Question[] | null> {
    try {
      const res = await fetch('/api/questions');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch {
      // ignore
    }
    return null;
  },

  async addQuestion(question: Question): Promise<Question[] | null> {
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(question),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch {
      // ignore
    }
    return null;
  },

  async deleteQuestion(id: string): Promise<Question[] | null> {
    try {
      const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch {
      // ignore
    }
    return null;
  },

  async updateQuestion(id: string, data: Partial<Question>): Promise<Question[] | null> {
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch {
      // ignore
    }
    return null;
  },

  async scrubQuestions(): Promise<Question[] | null> {
    try {
      const res = await fetch('/api/questions/scrub', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch {
      // ignore
    }
    return null;
  },

  async resetQuestions(): Promise<Question[] | null> {
    try {
      const res = await fetch('/api/questions/reset', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch {
      // ignore
    }
    return null;
  },

  // --- Proctor Broadcasts & Participant Warnings ---
  async sendBroadcast(message: string): Promise<void> {
    try {
      await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
    } catch {
      // ignore
    }
  },

  async getBroadcast(): Promise<string | null> {
    try {
      const res = await fetch('/api/broadcast');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data.message;
        }
      }
    } catch {
      // ignore
    }
    return null;
  },

  async sendWarning(participantId: string, message: string): Promise<void> {
    try {
      await fetch(`/api/warnings/${participantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
    } catch {
      // ignore
    }
  },

  async getWarning(participantId: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/warnings/${participantId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data.message;
        }
      }
    } catch {
      // ignore
    }
    return null;
  },

  async getNetworkInfo(): Promise<{ localIps: string[]; port: number } | null> {
    try {
      const res = await fetch('/api/network-info');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          return { localIps: json.localIps || [], port: json.port || 3000 };
        }
      }
    } catch {
      // ignore
    }
    return null;
  },

  async getProctorConfig(): Promise<{
    mode: 'CAMERA' | 'ZOOM' | 'BOTH';
    zoomMeetingUrl: string;
    zoomMeetingId: string;
    zoomPasscode: string;
    zoomInstructions: string;
  } | null> {
    try {
      const res = await fetch('/api/proctor-config');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch {
      // ignore
    }
    return null;
  },

  async updateProctorConfig(config: Partial<{
    mode: 'CAMERA' | 'ZOOM' | 'BOTH';
    zoomMeetingUrl: string;
    zoomMeetingId: string;
    zoomPasscode: string;
    zoomInstructions: string;
  }>): Promise<void> {
    try {
      await fetch('/api/proctor-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
    } catch {
      // ignore
    }
  },

  // Selective AI Incident Report (Invoked ONLY when participant strike count > 3)
  async generateAIViolationReport(data: {
    participantId: string;
    participantName: string;
    violations: any[];
    snapshotBase64?: string;
    strikeCount: number;
  }): Promise<{ success: boolean; report?: string; error?: string }> {
    try {
      const res = await fetch('/api/ai-violation-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal menghubungi server untuk laporan AI.' };
    }
  },

  // Upload and parse questions from MS Word (.docx) with AI KaTeX conversion
  async uploadWordQuestions(
    file: File,
    category: OlympiadCategory = 'SMA'
  ): Promise<{ success: boolean; count?: number; questions?: Question[]; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      const res = await fetch('/api/admin/upload-word', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      return json;
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Gagal mengunggah berkas Word ke server.',
      };
    }
  },

  // Save bulk questions to server (Append or Replace All)
  async bulkSaveQuestions(
    questions: Question[],
    mode: 'append' | 'replace' = 'append'
  ): Promise<{ success: boolean; count?: number; data?: Question[]; error?: string }> {
    try {
      const res = await fetch('/api/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions, mode }),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Gagal menyimpan paket soal ke server.',
      };
    }
  },
};
