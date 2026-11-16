"""Pydantic schemas for authentication and registration."""

from pydantic import BaseModel
from typing import Optional


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    department: Optional[str] = "Engineering"
    role: Optional[str] = "EMPLOYEE"  # "EMPLOYEE" or "ADMIN"


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    department: str
    role: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
