# Backend notes

Architecture:

- FastAPI
- SQLAlchemy 2.0
- Alembic migrations
- PostgreSQL
- JWT auth
- Excel import through openpyxl
- QR + Code128 labels through reportlab/qrcode

Important endpoints:

- `POST /imports/1c-excel`
- `POST /imports/{batch_id}/confirm`
- `GET /projects`
- `GET /projects/{id}`
- `POST /boxes`
- `GET /boxes/{box_code}/label.pdf`
- `POST /scan/box`
- `POST /inventory`
- `POST /inventory/{id}/scan`
- `GET /inventory/{id}/report.xlsx`
