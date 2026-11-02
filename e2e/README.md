Live end-to-end test (Python Playwright) used for QA against the deployed site.

`BASE=https://your-deploy python3 e2e/e2e.py OUT_DIR creds.json` where creds.json holds `{"admin":{"email","password"}}` for your own deployment. It registers fresh test accounts. Credentials are never stored in this repository.
