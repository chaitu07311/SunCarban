from app.agents.workflow import run_agent_workflow


def test_workflow_returns_structured_result():
    result = run_agent_workflow(
        {
            "crop_type": "Cotton",
            "geography": "Maharashtra",
            "season": "Kharif",
            "acreage": 120,
            "number_of_farmers": 45,
            "soil_issues": "Low organic carbon",
            "trial_objective": "Improve yield and soil health",
            "application_method": "Soil drench",
            "duration_days": 90,
            "pricing_inputs": {"target_price": 4000},
            "commercial_notes": "Pilot with two clusters",
        }
    )

    assert result.proposal_plan["template"] == "crop_trial_standard"
    assert len(result.recommendations) >= 1
    assert len(result.sources) >= 1
    assert "executive_summary" in result.proposal


def test_workflow_adds_governance_flags_for_missing_inputs():
    result = run_agent_workflow(
        {
            "crop_type": "Cotton",
            "geography": "Maharashtra",
            "season": "Kharif",
            "acreage": 120,
            "number_of_farmers": 45,
            "soil_issues": "",
            "trial_objective": "",
            "application_method": "",
            "duration_days": 90,
            "pricing_inputs": {},
            "commercial_notes": "",
        }
    )

    assert "Incomplete brief fields" in result.governance_flags
    assert "Pricing inputs missing" in result.governance_flags
