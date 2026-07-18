def _login(client, email: str, password: str):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_register_login_and_create_brief(client):
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": "sales1@suncarban.local",
            "password": "password1",
            "full_name": "Sales One",
            "role": "sales_user",
        },
    )
    assert register.status_code == 200

    token = _login(client, "sales1@suncarban.local", "password1").json()["access_token"]
    brief = client.post(
        "/api/v1/briefs",
        headers={"Authorization": f"Bearer {token}"},
        json={
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
        },
    )
    assert brief.status_code == 200
    body = brief.json()
    assert body["crop_type"] == "Cotton"


def test_proposal_and_review_flow(client):
    # Sales user creates a brief and generates proposal.
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "sales2@suncarban.local",
            "password": "password1",
            "full_name": "Sales Two",
            "role": "sales_user",
        },
    )
    sales_token = _login(client, "sales2@suncarban.local", "password1").json()["access_token"]

    brief_response = client.post(
        "/api/v1/briefs",
        headers={"Authorization": f"Bearer {sales_token}"},
        json={
            "crop_type": "Paddy",
            "geography": "Karnataka",
            "season": "Rabi",
            "acreage": 80,
            "number_of_farmers": 30,
            "soil_issues": "NA",
            "trial_objective": "Increase nutrient efficiency",
            "application_method": "Foliar spray",
            "duration_days": 60,
            "pricing_inputs": {},
            "commercial_notes": "TBD",
        },
    )
    brief_id = brief_response.json()["id"]

    validate_response = client.get(
        f"/api/v1/briefs/{brief_id}/validation",
        headers={"Authorization": f"Bearer {sales_token}"},
    )
    assert validate_response.status_code == 200
    assert validate_response.json()["is_ready_for_proposal"] is False
    assert "soil_issues" in validate_response.json()["ambiguous_fields"]

    proposal_response = client.post(
        "/api/v1/proposals",
        headers={"Authorization": f"Bearer {sales_token}"},
        json={"brief_id": brief_id},
    )
    assert proposal_response.status_code == 200
    proposal_id = proposal_response.json()["id"]
    assert proposal_response.json()["trace_id"].startswith("trace_")
    assert proposal_response.json()["model_route"]["selected_model"]

    citations = client.get(
        f"/api/v1/proposals/{proposal_id}/citations",
        headers={"Authorization": f"Bearer {sales_token}"},
    )
    assert citations.status_code == 200
    assert isinstance(citations.json(), list)

    loaded_proposal = client.get(
        f"/api/v1/proposals/{proposal_id}",
        headers={"Authorization": f"Bearer {sales_token}"},
    )
    assert loaded_proposal.status_code == 200
    assert loaded_proposal.json()["trace_id"].startswith("trace_")
    assert loaded_proposal.json()["model_route"]["selected_model"]

    audit_logs = client.get(
        "/api/v1/audit-logs",
        headers={"Authorization": f"Bearer {sales_token}"},
    )
    assert audit_logs.status_code == 403

    # Reviewer approves and can list review history.
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "reviewer1@suncarban.local",
            "password": "password1",
            "full_name": "Reviewer One",
            "role": "reviewer",
        },
    )
    reviewer_token = _login(client, "reviewer1@suncarban.local", "password1").json()["access_token"]

    submit_review = client.post(
        "/api/v1/reviews",
        headers={"Authorization": f"Bearer {reviewer_token}"},
        json={
            "proposal_id": proposal_id,
            "decision": "approved",
            "comments": "Looks good",
        },
    )
    assert submit_review.status_code == 200
    assert submit_review.json()["proposal_status"] == "approved"

    review_list = client.get(
        f"/api/v1/reviews/proposal/{proposal_id}",
        headers={"Authorization": f"Bearer {reviewer_token}"},
    )
    assert review_list.status_code == 200
    assert len(review_list.json()) >= 1

    reviewer_audit_logs = client.get(
        "/api/v1/audit-logs",
        headers={"Authorization": f"Bearer {reviewer_token}"},
    )
    assert reviewer_audit_logs.status_code == 200
    proposal_events = [
        row for row in reviewer_audit_logs.json()
        if row["action"] == "proposal_generated" and row["entity_id"] == proposal_id
    ]
    assert proposal_events
    assert proposal_events[0]["payload"]["trace_id"].startswith("trace_")
    assert proposal_events[0]["payload"]["model_route"]["selected_model"]


def test_admin_can_read_audit_logs(client):
    login = _login(client, "admin@suncarban.local", "admin123")
    assert login.status_code == 200
    token = login.json()["access_token"]
    proposals = client.get(
        "/api/v1/proposals",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert proposals.status_code == 200
    assert proposals.json()[0]["trace_id"].startswith("trace_")
    assert proposals.json()[0]["model_route"]["selected_model"]
    assert len(proposals.json()[0]["governance_flags"]) >= 1

    response = client.get(
        "/api/v1/audit-logs",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert "payload" in response.json()[0]


def test_document_upload_and_reindex_flow(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "sales3@suncarban.local",
            "password": "password1",
            "full_name": "Sales Three",
            "role": "sales_user",
        },
    )
    sales_token = _login(client, "sales3@suncarban.local", "password1").json()["access_token"]

    brief_response = client.post(
        "/api/v1/briefs",
        headers={"Authorization": f"Bearer {sales_token}"},
        json={
            "crop_type": "Maize",
            "geography": "Gujarat",
            "season": "Kharif",
            "acreage": 50,
            "number_of_farmers": 20,
            "soil_issues": "Low moisture retention",
            "trial_objective": "Improve crop vigor",
            "application_method": "Foliar spray",
            "duration_days": 45,
            "pricing_inputs": {"target_price": 3500},
            "commercial_notes": "Single district pilot",
        },
    )
    brief_id = brief_response.json()["id"]

    upload = client.post(
        f"/api/v1/documents/{brief_id}",
        headers={"Authorization": f"Bearer {sales_token}"},
        files={"file": ("guideline.txt", b"SunCarbon dosage guideline for foliar spray.", "text/plain")},
    )
    assert upload.status_code == 200
    document_id = upload.json()["document_id"]
    assert upload.json()["chunk_count"] >= 1

    list_docs = client.get(
        f"/api/v1/documents/brief/{brief_id}",
        headers={"Authorization": f"Bearer {sales_token}"},
    )
    assert list_docs.status_code == 200
    assert list_docs.json()[0]["chunk_count"] >= 1

    reindex = client.post(
        f"/api/v1/documents/{document_id}/reindex",
        headers={"Authorization": f"Bearer {sales_token}"},
    )
    assert reindex.status_code == 200
    assert reindex.json()["document_id"] == document_id

    summary = client.get(
        "/api/v1/documents/indexing/summary",
        headers={"Authorization": f"Bearer {sales_token}"},
    )
    assert summary.status_code == 200
    body = summary.json()
    assert body["total_documents"] >= 1
    assert body["indexed_documents"] >= 1
    assert body["total_chunks"] >= 1
    assert len(body["latest_indexed_documents"]) >= 1

    summary_filtered = client.get(
        f"/api/v1/documents/indexing/summary?brief_id={brief_id}&since_days=30",
        headers={"Authorization": f"Bearer {sales_token}"},
    )
    assert summary_filtered.status_code == 200
    filtered_body = summary_filtered.json()
    assert filtered_body["total_documents"] >= 1
    assert all(doc["brief_id"] == brief_id for doc in filtered_body["latest_indexed_documents"])
