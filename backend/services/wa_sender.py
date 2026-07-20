import os
import httpx
from dotenv import load_dotenv

load_dotenv()


async def send_whatsapp(phone: str, message: str) -> dict:
    """
    Send a WhatsApp message via Fonnte API.
    Returns the API response dict.
    """
    token = os.getenv("WA_API_TOKEN", "")
    api_url = "https://api.fonnte.com/send"

    if not token:
        return {"success": False, "error": "WA_API_TOKEN belum dikonfigurasi"}

    # Ensure phone starts with country code
    if phone.startswith("0"):
        phone = "62" + phone[1:]

    headers = {"Authorization": token}
    payload = {"target": phone, "message": message}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(api_url, headers=headers, data=payload)
            result = response.json()
            return {"success": True, "response": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


def render_template(template: str, variables: dict) -> str:
    """
    Replace placeholders in template with actual values.
    Supported placeholders: {nama}, {status}, {sholat}, {tanggal}, {kamar}, {gender}
    """
    result = template
    for key, value in variables.items():
        result = result.replace(f"{{{key}}}", str(value))
    return result
