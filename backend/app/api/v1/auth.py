"""Authentication and Registration API router."""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.employee import Employee
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse, UserResponse
from app.core.security import hash_password, verify_password, generate_token

router = APIRouter(tags=["Authentication"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Registers a new user account as either an EMPLOYEE or IT ENGINEER (ADMIN)."""
    email_clean = payload.email.lower().strip()
    if len(payload.password) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 4 characters long."
        )

    # Check if email already exists
    stmt = select(Employee).where(Employee.email == email_clean)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email {email_clean} already exists. Please log in."
        )

    valid_role = "ADMIN" if payload.role == "ADMIN" else "EMPLOYEE"
    new_employee = Employee(
        id=str(uuid.uuid4()),
        email=email_clean,
        full_name=payload.full_name.strip(),
        department=payload.department.strip() if payload.department else "General",
        role=valid_role,
        hashed_password=hash_password(payload.password),
    )

    db.add(new_employee)
    await db.commit()
    await db.refresh(new_employee)

    token = generate_token(new_employee.id)
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=new_employee.id,
            email=new_employee.email,
            full_name=new_employee.full_name,
            department=new_employee.department,
            role=new_employee.role,
        )
    )


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticates an existing user via email and password."""
    email_clean = payload.email.lower().strip()
    stmt = select(Employee).where(Employee.email == email_clean)
    employee = (await db.execute(stmt)).scalar_one_or_none()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not found. Please check your email or register."
        )

    # If employee has no hashed_password set yet (seeded legacy), allow password123 and save hash
    if not employee.hashed_password:
        if payload.password == "password123":
            employee.hashed_password = hash_password("password123")
            await db.commit()
            await db.refresh(employee)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password. Default demo password is 'password123'."
            )
    else:
        if not verify_password(payload.password, employee.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password. Please try again."
            )

    token = generate_token(employee.id)
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=employee.id,
            email=employee.email,
            full_name=employee.full_name,
            department=employee.department,
            role=employee.role,
        )
    )


@router.get("/demo-accounts")
async def get_demo_accounts(db: AsyncSession = Depends(get_db)):
    """Returns available accounts for quick one-click demo login."""
    stmt = select(Employee).limit(10)
    employees = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": emp.id,
            "email": emp.email,
            "full_name": emp.full_name,
            "department": emp.department,
            "role": emp.role,
        }
        for emp in employees
    ]

