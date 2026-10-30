import React, { useState, useMemo, useEffect } from 'react';
import { TopNavbar } from './components/TopNavbar';
import { LandingPortal } from './components/LandingPortal';
import { ExamRoom } from './components/ExamRoom';
import { ExamReceiptView } from './components/ExamReceiptView';
import { ProctorDashboard } from './components/ProctorDashboard';
import { GuidelinesView } from './components/GuidelinesView';
import { AboutView } from './components/AboutView';
import { INITIAL_QUESTIONS_DATA } from './data/questions';
import { ParticipantProfile, UserAnswer, Question, LiveParticipantMonitoring, PerQuestionResult, ViolationRecord } from './types';
import { ApiService } from './services/api';

export default function App() {
  const [currentView, setCurrentView] = useState<
    'portal' | 'exam' | 'receipt' | 'proctor' | 'guidelines' | 'about'
  >(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view') || params.get('mode');
      if (viewParam === 'proctor' || viewParam === 'pengawas') return 'proctor';
      if (viewParam === 'guidelines') return 'guidelines';
      if (viewParam === 'about') return 'about';
    }
    return 'portal';
  });

  const [participant, setParticipant] = useState<ParticipantProfile>({
    id: '',
    fullName: '',
    school: '',
    nisnOrRegNumber: '',
    category: 'SMA',
    city: '',
  });

  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, UserAnswer>>({});

  // Questions bank state (customizable via Proctor Dashboard)
  const [allQuestions, setAllQuestions] = useState<Question[]>(() => {
    try {
      const stored = localStorage.getItem('mmo_bank_soal');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read stored questions:', e);
    }
    return INITIAL_QUESTIONS_DATA;
  });

  const handleAddQuestion = (newQ: Question) => {
    setAllQuestions((prev) => {
      const updated = [newQ, ...prev];
      try {
        localStorage.setItem('mmo_bank_soal', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save question to storage:', e);
      }
      return updated;
    });
  };

  // Filter questions by participant category and competition stage
  const activeQuestions = useMemo(() => {
    const byCategory = allQuestions.filter((q) => q.category === participant.category);
    if (participant.stage) {
      const byStage = byCategory.filter((q) => q.stage === participant.stage);
      if (byStage.length > 0) {
        return byStage;
      }
    }
    return byCategory;
  }, [allQuestions, participant.category, participant.stage]);

  const handleStartExam = async (newParticipant: ParticipantProfile) => {
    setParticipant(newParticipant);
    setSubmittedAnswers({});

    const newLiveEntry: LiveParticipantMonitoring = {
      id: newParticipant.id,
      name: newParticipant.fullName,
      school: newParticipant.school,
      category: newParticipant.category,
      email: newParticipant.email,
      city: newParticipant.city,
      nisnOrRegNumber: newParticipant.nisnOrRegNumber,
      answeredCount: 0,
      totalQuestions: allQuestions.filter((q) => q.category === newParticipant.category).length,
      strikeCount: 0,
      trustScore: 100,
      status: 'ACTIVE',
      lastActive: 'Baru saja',
      avatarSeed: newParticipant.fullName.toLowerCase().replace(/\s/g, ''),
      currentQuestion: 1,
      supervisionMode: newParticipant.supervisionMode || 'WEB_CAM',
      cameraStatus: 'ACTIVE',
    };

    // Register on multi-device server & local backup
    await ApiService.registerParticipant(newLiveEntry);

    setCurrentView('exam');
  };

  const handleSubmitExam = async (
    answers: Record<string, UserAnswer>,
    _violations: ViolationRecord[],
    _trustScore: number,
    durationSeconds?: number
  ) => {
    setSubmittedAnswers(answers);

    // Calculate score per question and total
    let totalScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;
    const perQuestionScores: Record<string, PerQuestionResult> = {};

    activeQuestions.forEach((q, idx) => {
      const userAnswerObj = answers[q.id];
      const ansVal = userAnswerObj?.value?.trim();
      const correctVal = q.correctAnswer?.trim();

      if (!ansVal) {
        blankCount++;
        const pts = q.points?.blank ?? 0;
        perQuestionScores[q.id] = {
          questionId: q.id,
          questionNumber: q.questionNumber || idx + 1,
          userAnswer: '-',
          correctAnswer: correctVal || '',
          isCorrect: false,
          score: pts,
        };
        totalScore += pts;
      } else if (ansVal.toUpperCase() === correctVal?.toUpperCase()) {
        correctCount++;
        const pts = q.points?.correct ?? 4;
        perQuestionScores[q.id] = {
          questionId: q.id,
          questionNumber: q.questionNumber || idx + 1,
          userAnswer: ansVal,
          correctAnswer: correctVal || '',
          isCorrect: true,
          score: pts,
        };
        totalScore += pts;
      } else {
        wrongCount++;
        const pts = q.points?.wrong ?? -1;
        perQuestionScores[q.id] = {
          questionId: q.id,
          questionNumber: q.questionNumber || idx + 1,
          userAnswer: ansVal,
          correctAnswer: correctVal || '',
          isCorrect: false,
          score: pts,
        };
        totalScore += pts;
      }
    });

    const durationTakenFormatted = durationSeconds !== undefined
      ? `${Math.floor(durationSeconds / 60)} mnt ${durationSeconds % 60} dtk`
      : 'Selesai';

    const now = new Date();
    const submittedAtTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    // Update status in shared server & storage to SUBMITTED
    await ApiService.updateParticipantProgress(participant.id, {
      status: 'SUBMITTED',
      answeredCount: Object.keys(answers).length,
      score: totalScore,
      correctCount,
      wrongCount,
      blankCount,
      durationTaken: durationTakenFormatted,
      submittedAtTime,
      perQuestionScores,
      lastActive: 'Selesai Dikumpulkan',
    });

    setCurrentView('receipt');
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <TopNavbar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        examInProgress={currentView === 'exam'}
      />

      {/* Main View Router */}
      <div className="flex-1">
        {currentView === 'portal' && (
          <LandingPortal
            onStartExam={handleStartExam}
            onOpenDashboard={() => setCurrentView('proctor')}
            onOpenGuidelines={() => setCurrentView('guidelines')}
          />
        )}

        {currentView === 'exam' && (
          <ExamRoom
            questions={activeQuestions}
            participant={participant}
            durationMinutes={45}
            onSubmitExam={handleSubmitExam}
            onExitExam={() => setCurrentView('portal')}
          />
        )}

        {currentView === 'receipt' && (
          <ExamReceiptView
            participant={participant}
            questions={activeQuestions}
            userAnswers={submittedAnswers}
            onReturnToHome={() => setCurrentView('portal')}
          />
        )}

        {currentView === 'proctor' && (
          <ProctorDashboard
            onBackToPortal={() => setCurrentView('portal')}
            questions={allQuestions}
            onAddQuestion={handleAddQuestion}
            onUpdateAllQuestions={(updated) => setAllQuestions(updated)}
          />
        )}

        {currentView === 'guidelines' && (
          <GuidelinesView onStartExamClick={() => setCurrentView('portal')} />
        )}

        {currentView === 'about' && <AboutView />}
      </div>
    </div>
  );
}
