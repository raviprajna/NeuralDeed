#!/usr/bin/env python3
"""Generate a simple test PDF for testing."""

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter

    pdf_path = "test_lease.pdf"
    c = canvas.Canvas(pdf_path, pagesize=letter)

    # Add title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 750, "COMMERCIAL LEASE AGREEMENT")

    # Add content
    c.setFont("Helvetica", 12)
    y = 720
    lines = [
        "",
        "Section 1: Parties",
        "Landlord: ABC Properties LLC",
        "Tenant: XYZ Corporation",
        "",
        "Section 2: Premises",
        "Address: 123 Main Street, Suite 500",
        "",
        "Section 3: Term",
        "The lease term shall be five (5) years, commencing on January 1, 2026.",
        "",
        "Section 4: Rent",
        "Base rent shall be $50,000 per annum, payable monthly.",
        "Rent escalation: 3% per annum starting in year 2.",
        "",
        "Section 5: Indemnity",
        "Tenant shall indemnify Landlord against all claims arising from",
        "Tenant's use of the premises.",
    ]

    for line in lines:
        c.drawString(100, y, line)
        y -= 20

    c.save()
    print(f"✅ Created test PDF: {pdf_path}")

except ImportError:
    print("⚠️  reportlab not installed, creating fallback text file")
    # Create a simple text file as fallback
    with open("test_lease.txt", "w") as f:
        f.write("""COMMERCIAL LEASE AGREEMENT

Section 1: Parties
Landlord: ABC Properties LLC
Tenant: XYZ Corporation

Section 2: Premises
Address: 123 Main Street, Suite 500

Section 3: Term
The lease term shall be five (5) years, commencing on January 1, 2026.

Section 4: Rent
Base rent shall be $50,000 per annum, payable monthly.
Rent escalation: 3% per annum starting in year 2.

Section 5: Indemnity
Tenant shall indemnify Landlord against all claims arising from Tenant's use of the premises.
""")
    print("✅ Created test text file: test_lease.txt")
