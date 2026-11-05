import re
from typing import Set, List, Tuple, Any

# Matches standalone numbers only, avoiding chemical formulas like CO2, CO2e, H2O, etc.
NUMBER_REGEX = re.compile(r"(?<![A-Za-z_])[-+]?(?:\d+\.\d+|\d+)(?![A-Za-z_])")

def extract_numbers_from_text(text: str) -> List[float]:
    """Extracts all standalone numeric tokens from text."""
    matches = NUMBER_REGEX.findall(text)
    numbers = []
    for m in matches:
        try:
            numbers.append(float(m))
        except ValueError:
            pass
    return numbers

def validate_numbers_in_text(text: str, allowed_numbers: List[float], tolerance: float = 0.05) -> Tuple[bool, str]:
    """
    Checks that every number mentioned in the generated recommendation text is present
    in the allowed set computed by deterministic rules. Prevents hallucinations.
    """
    extracted = extract_numbers_from_text(text)
    if not extracted:
        return True, "No numbers present in text"

    unauthorized = []
    for num in extracted:
        # Check if num is close to any allowed number
        matched = False
        for allowed in allowed_numbers:
            # Check relative or absolute tolerance
            if abs(num - allowed) <= tolerance or (allowed != 0 and abs((num - allowed) / allowed) <= tolerance):
                matched = True
                break
        if not matched:
            unauthorized.append(num)

    if unauthorized:
        return False, f"Rejection: Text contains unverified numeric claim(s): {unauthorized}"

    return True, "Validation passed: All numbers correspond to verified rule calculations"
