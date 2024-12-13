export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified: boolean;
  isMfaEnabled: boolean;
  isActive: boolean;
  roles: string[];
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface UpdatePassword {
  currentPassword: string;
  newPassword: string;
}
