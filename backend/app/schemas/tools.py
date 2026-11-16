from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class ToolExecutionRequest(BaseModel):
    tool_name: str
    incident_id: str
    parameters: Dict[str, Any] = Field(default_factory=dict)


class ToolExecutionResponse(BaseModel):
    tool_name: str
    status: str  # SUCCESS, FAILED, PENDING_APPROVAL
    message: str
    output: Dict[str, Any] = Field(default_factory=dict)

