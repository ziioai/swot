export interface NoteVersion {
  version: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionNote {
  nnid: string;
  content: string;
  history: NoteVersion[];
}

export interface SWOTOptions {
  maxLoopCount: number;
  maxVerifyCount: number;
  maxCertifyCount: number;
  versionSimpleThreshold: number;
  totalSimpleThreshold: number;
  versionSkipThreshold: number;
  totalSkipThreshold: number;
}

export interface QuestionEntry {
  nnid: string;
  content: string;
  answer: string;
}

export interface QuestionTrainingState {
  nnid: string;
  trainedCountV: number;
  trainedCountT: number;
  correctCountV: number;
  correctCountT: number;
  errorCountV: number;
  errorCountT: number;
  isSimpleV: boolean;
  isSimpleT: boolean;
  isSkipV: boolean;
  isSkipT: boolean;
}

export interface SWOTState {
  totalCount: number;
  versionCount: number;
  versionCertifyCount: number;
  quStateDict: Record<string, QuestionTrainingState>;
  ended: boolean;
  endReason?: string;
  endTime?: string;
  startTime: string;
}

export interface QuestionDisplay extends QuestionEntry {
  status: 'processing' | 'simple' | 'active' | 'skipped';
  aiThinking: string;
  errorAnalysis?: string;
  userAnswer?: string;
  isCorrect?: boolean;
}