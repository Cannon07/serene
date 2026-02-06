"""
Opik configuration and initialization.
"""
import os
import opik


def init_opik() -> bool:
    """
    Initialize Opik client. Call once at app startup.

    Returns:
        True if Opik was configured successfully, False otherwise.
    """
    api_key = os.getenv("OPIK_API_KEY")
    workspace = os.getenv("OPIK_WORKSPACE")
    if api_key and workspace:
        opik.configure(api_key=api_key, workspace=workspace)
        print("Opik configured successfully")
        return True
    else:
        if api_key and not workspace:
            print("Warning: OPIK_API_KEY set but OPIK_WORKSPACE missing. Tracing disabled.")
        else:
            print("Warning: OPIK_API_KEY not set. Tracing disabled.")
        return False


def is_opik_configured() -> bool:
    """Check if Opik is properly configured."""
    return os.getenv("OPIK_API_KEY") is not None
