import pytest
from hub.advisor.validator import extract_numbers_from_text, validate_numbers_in_text
from hub.advisor.advisor import generate_recommendations

def test_number_extraction():
    text = "Turning off the load saves 2.70 kWh/day and 1.93 kg CO2e over 6.0 hours."
    numbers = extract_numbers_from_text(text)
    assert numbers == [2.70, 1.93, 6.0]

def test_numeric_validator_accepts_valid():
    text = "Automating cutoff saves 3.5 kWh/day and avoids 2.5 kg CO2e/day."
    allowed = [3.5, 2.5]
    is_valid, msg = validate_numbers_in_text(text, allowed)
    assert is_valid is True

def test_numeric_validator_rejects_hallucinations():
    # Model claims a hallucinated 99.9% reduction or 45.0 kg not in calculated basis
    hallucinated_text = "Cutoff saves 3.5 kWh/day, reducing emissions by 45.0 kg and 99.9% overall."
    allowed = [3.5, 2.5]
    is_valid, msg = validate_numbers_in_text(hallucinated_text, allowed)
    assert is_valid is False
    assert "unverified numeric claim" in msg.lower()

def test_recommendation_generation_and_validation(db_conn):
    recs = generate_recommendations(db_conn)
    assert len(recs) >= 3
    # Every recommendation must have validated flag True
    for r in recs:
        assert r["validated"] is True
        assert r["saving_kg_day"] >= 0.0
        assert "basis" in r
