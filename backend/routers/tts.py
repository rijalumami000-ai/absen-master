import io
import logging
from fastapi import APIRouter, Query, Response
from gtts import gTTS

logger = logging.getLogger("tts_router")

router = APIRouter(prefix="/api", tags=["Text To Speech"])

# Simple in-memory audio cache so repeat names play instantly (<10ms response time)
tts_cache = {}


@router.get("/tts")
def get_tts_audio(text: str = Query(..., min_length=1, max_length=200)):
    """Generate and return crystal-clear Indonesian MP3 voice audio directly from backend."""
    cleaned_text = text.strip()
    if cleaned_text in tts_cache:
        return Response(content=tts_cache[cleaned_text], media_type="audio/mpeg")

    try:
        tts = gTTS(text=cleaned_text, lang="id")
        mp3_fp = io.BytesIO()
        tts.write_to_fp(mp3_fp)
        audio_bytes = mp3_fp.getvalue()

        # Cache up to 150 recent audio snippets
        if len(tts_cache) > 150:
            tts_cache.clear()
        tts_cache[cleaned_text] = audio_bytes

        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        logger.error(f"gTTS Generation Error: {e}")
        return Response(content=b"", status_code=500)
