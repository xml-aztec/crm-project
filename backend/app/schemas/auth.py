from pydantic import BaseModel, EmailStr, Field
from typing import Annotated


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: Annotated[str, Field(min_length=8)]
