RULES = [
    {
        "key": "required_fields",
        "label": "Required fields present",
        "description": "Name, ID number, date of birth and address are required.",
        "fields": ["name", "id_number", "date_of_birth", "address"],
        "weight": 20,
    },
    {
        "key": "expiry_date",
        "label": "Document within validity period",
        "description": "The document expiry date must not be in the past.",
        "fields": ["expiry_date"],
        "weight": 28,
    },
    {
        "key": "minimum_age",
        "label": "Applicant is at least 18",
        "description": "The applicant must be 18 years or older on the review date.",
        "fields": ["date_of_birth"],
        "weight": 24,
    },
    {
        "key": "date_order",
        "label": "Issue date precedes expiry",
        "description": "Issue date must be earlier than the expiry date.",
        "fields": ["issue_date", "expiry_date"],
        "weight": 15,
    },
]