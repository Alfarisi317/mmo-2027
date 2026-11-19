import {
  CompetitionStage,
  LiveParticipantMonitoring,
  OlympiadCategory,
  Question,
  SiteFeedbackEntry,
} from '../types';
import { StructuredBankSoalItem, WordParseResult } from '../utils/wordEquationParser';

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

  // --- Questions (Full Bank Management & Word Importer) ---
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

  async parseWordDocx(
    file: File,
    category: OlympiadCategory,
    stage: CompetitionStage
  ): Promise<{ success: boolean; data?: WordParseResult; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('stage', stage);
      const res = await fetch('/api/admin/parse-docx', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Gagal memproses berkas .docx.' };
      }
      return { success: true, data: json.data };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal menghubungi server saat membaca berkas Word.' };
    }
  },

  async parseWordTextWithAI(
    rawText: string,
    category: OlympiadCategory,
    stage: CompetitionStage
  ): Promise<{
    success: boolean;
    data?: { jsonOutput: StructuredBankSoalItem[]; parseResult: WordParseResult };
    error?: string;
  }> {
    try {
      const res = await fetch('/api/admin/parse-word-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, category, stage }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return {
          success: false,
          error: json.error || 'Gagal mengurai teks soal menggunakan AI.',
        };
      }
      return { success: true, data: json.data };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Gagal menghubungi server saat memproses AI Word parser.',
      };
    }
  },

  async parsePdfOrImageWithAI(
    file: File,
    category: OlympiadCategory,
    stage: CompetitionStage
  ): Promise<{
    success: boolean;
    data?: { jsonOutput: StructuredBankSoalItem[]; parseResult: WordParseResult };
    error?: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('stage', stage);
      const res = await fetch('/api/admin/parse-pdf-image-ai', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return {
          success: false,
          error: json.error || 'Gagal mengekstrak soal dari PDF atau gambar.',
        };
      }
      return { success: true, data: json.data };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Gagal menghubungi server saat membaca berkas PDF/gambar.',
      };
    }
  },

  async fetchQuestionsFromGoogleSheets(
    url: string,
    category: OlympiadCategory,
    stage: CompetitionStage
  ): Promise<{ success: boolean; data?: WordParseResult; error?: string }> {
    try {
      const res = await fetch('/api/admin/fetch-sheets-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, category, stage }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return {
          success: false,
          error: json.error || 'Gagal menarik soal dari Google Sheets.',
        };
      }
      return { success: true, data: json.data };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Gagal menghubungi server saat mengakses Google Sheets.',
      };
    }
  },

  async bulkSaveQuestions(
    questions: Question[],
    mode: 'append' | 'replace_all' | 'replace_packet' = 'append',
    category?: OlympiadCategory,
    stage?: CompetitionStage
  ): Promise<{ success: boolean; data?: Question[]; error?: string }> {
    try {
      const res = await fetch('/api/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions, mode, category, stage }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Gagal menyimpan daftar soal.' };
      }
      return { success: true, data: json.data };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal menyimpan soal ke server.' };
    }
  },

  async addQuestion(question: Question): Promise<{ success: boolean; data?: Question[]; error?: string }> {
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(question),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Gagal menambahkan soal.' };
      }
      return { success: true, data: json.data };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal menghubungi server.' };
    }
  },

  async updateQuestion(id: string, question: Partial<Question>): Promise<{ success: boolean; data?: Question[]; error?: string }> {
    try {
      const res = await fetch(`/api/questions/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(question),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Gagal memperbarui soal.' };
      }
      return { success: true, data: json.data };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal menghubungi server.' };
    }
  },

  async deleteQuestion(id: string): Promise<{ success: boolean; data?: Question[]; error?: string }> {
    try {
      const res = await fetch(`/api/questions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Gagal menghapus soal.' };
      }
      return { success: true, data: json.data };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal menghubungi server.' };
    }
  },

  async clearAllQuestions(): Promise<{ success: boolean; data?: Question[]; error?: string }> {
    try {
      const res = await fetch('/api/questions/clear-all', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Gagal mengosongkan Bank Soal.' };
      }
      return { success: true, data: json.data || [] };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal menghubungi server.' };
    }
  },

  async resetQuestions(): Promise<{ success: boolean; data?: Question[]; error?: string }> {
    try {
      const res = await fetch('/api/questions/reset', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Gagal mereset Bank Soal.' };
      }
      return { success: true, data: json.data };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal menghubungi server.' };
    }
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

  // Post-Exam Website Feedback & Google Sheets Webhook
  async submitSiteFeedback(payload: {
    participantId?: string;
    participantName: string;
    school: string;
    nisnOrRegNumber: string;
    category: 'SMP' | 'SMA';
    stage: 'Penyisihan' | 'Semifinal';
    message: string;
  }): Promise<{ success: boolean; data?: SiteFeedbackEntry; error?: string }> {
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal mengirim pesan dan saran ke server.' };
    }
  },

  async getSiteFeedbackList(): Promise<{
    success: boolean;
    data: SiteFeedbackEntry[];
    webhookUrl: string;
  }> {
    try {
      const res = await fetch('/api/feedback');
      if (res.ok) {
        const json = await res.json();
        return {
          success: Boolean(json.success),
          data: Array.isArray(json.data) ? json.data : [],
          webhookUrl: typeof json.webhookUrl === 'string' ? json.webhookUrl : '',
        };
      }
    } catch {
      // ignore
    }
    return { success: false, data: [], webhookUrl: '' };
  },

  async deleteSiteFeedback(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/feedback/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async clearAllSiteFeedback(): Promise<boolean> {
    try {
      const res = await fetch('/api/feedback', {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async saveFeedbackWebhookUrl(webhookUrl: string): Promise<{
    success: boolean;
    webhookUrl?: string;
    error?: string;
  }> {
    try {
      const res = await fetch('/api/feedback/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl }),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal menyimpan URL Webhook.' };
    }
  },

  async testFeedbackWebhook(webhookUrl?: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const res = await fetch('/api/feedback/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl }),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal melakukan tes webhook Google Sheets.' };
    }
  },

  async syncAllFeedbackToWebhook(): Promise<{
    success: boolean;
    syncedCount?: number;
    failedCount?: number;
    lastError?: string;
    data?: SiteFeedbackEntry[];
    error?: string;
  }> {
    try {
      const res = await fetch('/api/feedback/sync-all', {
        method: 'POST',
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal menyinkronkan pesan ke Google Sheets.' };
    }
  },

  async syncSingleFeedbackToWebhook(id: string): Promise<{
    success: boolean;
    data?: SiteFeedbackEntry;
    error?: string;
  }> {
    try {
      const res = await fetch(`/api/feedback/${encodeURIComponent(id)}/sync`, {
        method: 'POST',
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal menyinkronkan baris ke Google Sheets.' };
    }
  },
};

