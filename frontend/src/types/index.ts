export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface StoredFile {
  id: number;
  filename: string;
  size: number;
  created_at: string;
  shard_count: number;
  content_type: string;
  user_id: number;
}

export interface ShardInfo {
  shard_index: number;
  size_bytes: number;
  sha256_hash: string;
}

export interface FileDetail extends StoredFile {
  shards: ShardInfo[];
}

export interface FileListResponse {
  files: StoredFile[];
  total_count: number;
  total_size_bytes: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
