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
    if api_key:
        opik.configure(api_key=api_key)
        print("Opik configured successfully")
        return True
    else:
        print("Warning: OPIK_API_KEY not set. Tracing disabled.")
        return False


def is_opik_configured() -> bool:
    """Check if Opik is properly configured."""
    return os.getenv("OPIK_API_KEY") is not None
