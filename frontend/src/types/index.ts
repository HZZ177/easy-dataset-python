export interface Question {
  id: string;
  content: string;
  answer: string;
  project_id: string;
  text_id: string;
  chunk_index: number;
  metadata: {
    type?: string;
    difficulty?: string;
    thought_chain?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  status: string;
  tags: string[];
} 