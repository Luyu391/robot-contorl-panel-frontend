export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeCardCandidate {
  id: string;
  name: string;
  campus: string;
  academy: string;
  grade: string;
  intro: string;
  hobbies: string[];
  score: number;
  mbti?: string;
  archetype?: string;
}

export interface MatchRevealPayload {
  matchId: string;
  selfName: string;
  partnerName: string;
  score: number;
  highlights: string[];
}
