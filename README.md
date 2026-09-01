//active ngrok
ngrok http 8000

//backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
=====================================

//frontend
npm install
npm run dev

=========================

//active ngrok
install ngrok
->ngrok http 8000
->Payload URL: https://abc123456789.ngrok-free.app/webhook

*Cấu hình trên GitHub Repository để Test
- Thêm Repository vào Dashboard:
    Mở Dashboard http://localhost:3000 -> Connected Repositories
        ->Nhập Org/Owner và Repository Name 
        ->Nhấn Register to Database

- Cài Webhook trên GitHub:
    Mở GitHub Repository cần test 
        ->Add webhook

    Payload URL: https://<ngrok-id>.ngrok-free.app/webhook
    Content type: application/json
    Secret = WEBHOOK_SECRET đã đặt trong file .env
    SSL verification: Enable SSL verification.
    Which events would you like to trigger this webhook?:
        ->Let me select individual events.
        ->chọn: Workflow runs
    Add webhook->ping 200

=====================================================================

//GITHUB_TOKEN cần Permissions:
- Read access to metadata
- Read and Write access to actions, 
administration, code, Contents, 
commit statuses, issues, 
pull requests, and workflows

======================================

//.env
GITHUB_TOKEN=
CLAUDE_API_KEY=
WEBHOOK_SECRET=ABCXYZ

# Optional: Port and Host
PORT=8000
HOST=0.0.0.0

======================================

Mọi Repository liên kết với app để test cần kích hoạt CI pipeline qua .github/workflows/ci.yml


