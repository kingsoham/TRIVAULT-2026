import { AuthResponse, FileDetail, FileListResponse, StoredFile, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

class ApiClient {
  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('trivault_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string'
            ? errorData.detail
            : JSON.stringify(errorData.detail);
        }
      } catch {
        // Fallback to status text
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // Health
  async checkHealth(): Promise<{ status: string; database: string; storage: string }> {
    const res = await fetch(`${API_BASE_URL}/health`);
    return this.handleResponse(res);
  }

  // Auth
  async register(username: string, email: string, password: string): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    return this.handleResponse<User>(res);
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return this.handleResponse<AuthResponse>(res);
  }

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        ...this.getAuthHeader(),
      },
    });
    return this.handleResponse<User>(res);
  }

  // Files
  async listFiles(search?: string): Promise<FileListResponse> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE_URL}/files${query}`, {
      headers: {
        ...this.getAuthHeader(),
      },
    });
    return this.handleResponse<FileListResponse>(res);
  }

  async getFileMetadata(fileId: number): Promise<FileDetail> {
    const res = await fetch(`${API_BASE_URL}/files/${fileId}`, {
      headers: {
        ...this.getAuthHeader(),
      },
    });
    return this.handleResponse<FileDetail>(res);
  }

  async uploadFile(file: File): Promise<StoredFile> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
      },
      body: formData,
    });
    return this.handleResponse<StoredFile>(res);
  }

  async downloadFile(fileId: number, filename: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/files/${fileId}/download`, {
      headers: {
        ...this.getAuthHeader(),
      },
    });

    if (!res.ok) {
      let errorMsg = `Download failed with HTTP ${res.status}`;
      try {
        const errorData = await res.json();
        if (errorData.detail) errorMsg = errorData.detail;
      } catch {
        // ignore
      }
      throw new Error(errorMsg);
    }

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  }

  async renameFile(fileId: number, newFilename: string): Promise<StoredFile> {
    const res = await fetch(`${API_BASE_URL}/files/${fileId}/rename`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify({ new_filename: newFilename }),
    });
    return this.handleResponse<StoredFile>(res);
  }

  async deleteFile(fileId: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        ...this.getAuthHeader(),
      },
    });
    return this.handleResponse<void>(res);
  }
}

export const api = new ApiClient();
