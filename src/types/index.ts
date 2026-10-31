export type OlympiadCategory = 'SMP' | 'SMA';

export type MathDomain = 'Aljabar' | 'Geometri' | 'Kombinatorika' | 'Teori Bilangan';

export type QuestionType = 'multiple_choice' | 'short_answer';

export interface QuestionOption {
  id: string; // 'A' | 'B' | 'C' | 'D' | 'E'
  text: string;
}

export type CompetitionStage = 'Penyisihan' | 'Semifinal' | 'Final';

export type QuestionFocus = 'Explore' | 'Explore + Think' | 'Think + Excel';

export interface Question {
  id: string;
  category: OlympiadCategory;
  domain: MathDomain;
  type: QuestionType;
  questionNumber: number;
  stage?: CompetitionStage;
  focus?: QuestionFocus;
  text: string;
  formulaLatex?: string;
  options?: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  points: {
    correct: number;
    wrong: number;
    blank: number;
  };
}

export type AnswerStatus = 'unanswered' | 'answered' | 'doubtful';

export interface UserAnswer {
  questionId: string;
  value: string; // option id or string value
  solutionStrategy?: string; // step-by-step reasoning for Final round essay/problem solving
  status: AnswerStatus;
  timestamp: number;
}

export type ViolationType = 
  | 'TAB_SWITCH' 
  | 'WINDOW_BLUR' 
  | 'FULLSCREEN_EXIT' 
  | 'COPY_PASTE_ATTEMPT' 
  | 'INSPECT_SHORTCUT' 
  | 'MULTIPLE_FACES' 
  | 'LOOKING_AWAY' 
  | 'NO_FACE'
  | 'SUSPICIOUS_AUDIO';

export interface ViolationRecord {
  id: string;
  timestamp: number;
  type: ViolationType;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface ProctorStatus {
  cameraActive: boolean;
  microphoneActive: boolean;
  faceDetected: boolean;
  faceCount: number;
  gazeDirection: 'CENTER' | 'LEFT' | 'RIGHT' | 'DOWN';
  headTurnAngle: number;
  trustScore: number; // 0 - 100
  ambientNoiseLevel: number; // 0 - 100
  violations: ViolationRecord[];
  strikeCount: number;
  isLocked: boolean;
  lockReason?: string;
}

export type SupervisionMode = 'WEB_CAM' | 'ZOOM_2_DEVICE';

export interface ParticipantProfile {
  id: string;
  fullName: string;
  school: string;
  nisnOrRegNumber: string;
  category: OlympiadCategory;
  stage?: CompetitionStage;
  city: string;
  email?: string;
  supervisionMode?: SupervisionMode;
}

export interface RegisteredParticipant {
  id: string;
  email: string;
  password: string;
  fullName: string;
  school: string;
  nisnOrRegNumber: string;
  category: OlympiadCategory;
  stage?: CompetitionStage;
  city: string;
  phone?: string;
  registeredAt?: string;
}

export interface PerQuestionResult {
  questionId: string;
  questionNumber: number;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  score: number; // e.g. +4, -1, 0
}

export interface LiveParticipantMonitoring {
  id: string;
  name: string;
  school: string;
  category: OlympiadCategory;
  stage?: CompetitionStage;
  email?: string;
  city?: string;
  nisnOrRegNumber?: string;
  answeredCount: number;
  totalQuestions: number;
  strikeCount: number;
  trustScore: number;
  status: 'ONLINE' | 'ACTIVE' | 'WARNING' | 'SUBMITTED' | 'DISQUALIFIED';
  lastActive: string;
  avatarSeed: string;
  currentQuestion: number;
  score?: number;
  correctCount?: number;
  wrongCount?: number;
  blankCount?: number;
  durationTaken?: string;
  submittedAtTime?: string;
  perQuestionScores?: Record<string, PerQuestionResult>;
  cameraSnapshot?: string; // base64 JPEG thumbnail of live webcam
  cameraStatus?: 'ACTIVE' | 'DENIED' | 'OFFLINE' | 'SIMULATED' | 'ZOOM';
  lastCameraSync?: number;
  supervisionMode?: SupervisionMode;
  aiIncidentReport?: string; // Selective AI Proctor report when strikes > 3
  incidentSnapshot?: string; // Snapshot photo captured during high-strike incident
}
