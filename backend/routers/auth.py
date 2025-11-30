"""
Auth Router - Google OAuth 認證 API

提供 Google OAuth 2.0 認證流程，包含：
- 授權狀態查詢
- OAuth URL 取得
- OAuth 回調處理
- 登出和 Token 刷新
"""

from fastapi import APIRouter, HTTPException, status, Query
from fastapi.responses import HTMLResponse

from backend.models import GoogleAuthInfo, GoogleAuthCallbackRequest, ErrorResponse
from backend.google_auth_service import GoogleAuthService, GoogleAuthError
from backend.routers.dependencies import get_google_auth_service

router = APIRouter(prefix="/api/auth/google", tags=["Authentication"])

# 取得共用的 service 實例
google_auth_service = get_google_auth_service()


@router.get("/status", response_model=GoogleAuthInfo)
async def get_google_auth_status():
    """取得 Google 授權狀態"""
    try:
        auth_status = google_auth_service.get_auth_status()
        return auth_status
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="AUTH_STATUS_ERROR",
                message=f"取得授權狀態失敗: {str(e)}",
                details={}
            ).dict()
        )


@router.get("/authorize")
async def get_google_auth_url(redirect_uri: str = Query(..., description="OAuth 回調 URL")):
    """取得 Google OAuth 授權 URL"""
    try:
        auth_url = google_auth_service.get_auth_url(redirect_uri)
        return {"auth_url": auth_url}
    except GoogleAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error="AUTH_URL_ERROR",
                message=str(e),
                details={}
            ).dict()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="AUTH_URL_ERROR",
                message=f"產生授權 URL 失敗: {str(e)}",
                details={}
            ).dict()
        )


@router.get("/callback", response_class=HTMLResponse)
async def google_auth_callback_get(code: str = Query(...), state: str = Query(None)):
    """處理 Google OAuth GET 回調
    
    當使用者在 Google 授權頁面完成授權後，Google 會以 GET 方式重新導向到此端點，
    並帶上 authorization code。此端點會顯示一個中繼頁面，使用 JavaScript 將 code
    傳送給父視窗，然後關閉授權視窗。
    """
    # 回傳一個 HTML 頁面，用 JavaScript 處理 OAuth 回調
    html_content = f"""
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Google 授權中...</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background-color: #f5f5f5;
            }}
            .container {{
                text-align: center;
                padding: 40px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }}
            .spinner {{
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }}
            @keyframes spin {{
                0% {{ transform: rotate(0deg); }}
                100% {{ transform: rotate(360deg); }}
            }}
            .success {{
                color: #10b981;
            }}
            .error {{
                color: #ef4444;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="spinner" id="spinner"></div>
            <h2 id="status">正在完成授權...</h2>
            <p id="message">請稍候，正在處理您的 Google 授權...</p>
        </div>
        
        <script>
            const code = "{code}";
            const redirectUri = window.location.origin + '/api/auth/google/callback';
            
            async function completeAuth() {{
                try {{
                    // 呼叫後端 POST API 完成授權
                    const response = await fetch('/api/auth/google/callback', {{
                        method: 'POST',
                        headers: {{
                            'Content-Type': 'application/json'
                        }},
                        body: JSON.stringify({{
                            code: code,
                            redirect_uri: redirectUri
                        }})
                    }});
                    
                    const result = await response.json();
                    
                    if (response.ok) {{
                        document.getElementById('spinner').style.display = 'none';
                        document.getElementById('status').textContent = '授權成功！';
                        document.getElementById('status').className = 'success';
                        document.getElementById('message').textContent = '您可以關閉此視窗，或稍後會自動關閉...';
                        
                        // 嘗試通知父視窗
                        if (window.opener) {{
                            window.opener.postMessage({{ type: 'google-auth-success', data: result }}, window.location.origin);
                        }}
                        
                        // 2秒後自動關閉視窗
                        setTimeout(() => {{
                            window.close();
                        }}, 2000);
                    }} else {{
                        throw new Error(result.detail?.message || '授權失敗');
                    }}
                }} catch (error) {{
                    document.getElementById('spinner').style.display = 'none';
                    document.getElementById('status').textContent = '授權失敗';
                    document.getElementById('status').className = 'error';
                    document.getElementById('message').textContent = error.message || '發生未知錯誤，請關閉此視窗重試';
                    
                    // 通知父視窗錯誤
                    if (window.opener) {{
                        window.opener.postMessage({{ type: 'google-auth-error', error: error.message }}, window.location.origin);
                    }}
                }}
            }}
            
            // 頁面載入後執行授權
            completeAuth();
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@router.post("/callback", response_model=GoogleAuthInfo)
async def google_auth_callback(callback_request: GoogleAuthCallbackRequest):
    """處理 Google OAuth 回調"""
    try:
        auth_info = google_auth_service.handle_callback(
            code=callback_request.code,
            redirect_uri=callback_request.redirect_uri
        )
        return auth_info
    except GoogleAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error="AUTH_CALLBACK_ERROR",
                message=str(e),
                details={}
            ).dict()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="AUTH_CALLBACK_ERROR",
                message=f"處理授權回調失敗: {str(e)}",
                details={}
            ).dict()
        )


@router.post("/logout")
async def google_logout():
    """登出 Google 帳號"""
    try:
        success = google_auth_service.logout()
        if success:
            return {"message": "已成功登出 Google 帳號"}
        else:
            return {"message": "目前未連結 Google 帳號"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="LOGOUT_ERROR",
                message=f"登出失敗: {str(e)}",
                details={}
            ).dict()
        )


@router.post("/refresh", response_model=GoogleAuthInfo)
async def refresh_google_token():
    """刷新 Google Token"""
    try:
        token = google_auth_service.refresh_token()
        if token:
            return GoogleAuthInfo(
                status="connected",
                user_email=token.user_email,
                connected_at=token.created_at,
                expires_at=token.token_expiry
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ErrorResponse(
                    error="REFRESH_FAILED",
                    message="無法刷新 Token，請重新登入",
                    details={}
                ).dict()
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="REFRESH_ERROR",
                message=f"刷新 Token 失敗: {str(e)}",
                details={}
            ).dict()
        )
