// ─────────────────────────────────────────────────────────────
// HexaGon Theory — Type Definitions
// All IDs are strings (MongoDB ObjectId.toString())
// ─────────────────────────────────────────────────────────────

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  role: "user" | "moderator" | "institution";
  created_at: string;
}

export interface UserPublic {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  role: string;
}

// Idea types
export interface Idea {
  id: string;
  slug: string;
  user_id: string;
  author: UserPublic;
  title: string;
  problem_statement: string;
  description: string;
  category: string;
  target_region?: string;
  target_community?: string;
  expected_impact?: string;
  cost_benefit_summary?: string;
  status: "draft" | "published" | "archived";
  video_url?: string;
  version: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  files: IdeaFile[];
  upvote_count: number;
  downvote_count: number;
}

export interface IdeaFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

export interface IdeaListItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  target_region?: string;
  status: string;
  view_count: number;
  created_at: string;
  author: UserPublic;
  upvote_count: number;
  downvote_count: number;
}

export interface IdeaVersion {
  id: string;
  version: number;
  title: string;
  description: string;
  problem_statement: string;
  changed_by: string;
  change_summary?: string;
  created_at: string;
}

// Vote types
export interface VoteSummary {
  idea_id: string;
  upvote_count: number;
  downvote_count: number;
  net_votes: number;
  user_vote?: "upvote" | "downvote" | null;
}

// Comment types
export interface Comment {
  id: string;
  user_id: string;
  idea_id: string;
  parent_id?: string;
  content: string;
  is_suggestion: boolean;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  user: UserPublic;
  replies: Comment[];
}

// Institutional types
export interface InstitutionalInterest {
  id: string;
  institution_id: string;
  idea_id: string;
  status: "interested" | "under_review" | "implemented";
  notes?: string;
  created_at: string;
  updated_at: string;
  institution: UserPublic;
}

// Form types
export interface RegisterFormData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface IdeaFormData {
  title: string;
  problem_statement: string;
  description: string;
  category: string;
  target_region?: string;
  target_community?: string;
  expected_impact?: string;
  cost_benefit_summary?: string;
  video_url?: string;
}

// API Response types
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface ApiError {
  detail: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  role: string;
  created_at: string;
  stats: {
    total_ideas: number;
    total_votes_received: number;
    total_comments: number;
  };
  ideas: IdeaListItem[];
}

export interface UserPublicProfile {
  id: string;
  username: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  role: string;
  created_at: string;
  stats: {
    total_ideas: number;
    total_votes_received: number;
    total_comments: number;
  };
  ideas: IdeaListItem[];
}

// Toast notification types
export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
}
