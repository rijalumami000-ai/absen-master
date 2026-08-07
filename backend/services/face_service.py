import base64
import json
import logging
import numpy as np
from typing import List, Tuple, Optional

logger = logging.getLogger("face_service")

# Try importing cv2 and PIL
try:
    import cv2
except ImportError:
    cv2 = None

try:
    from PIL import Image
    import io
except ImportError:
    Image = None

# Global InsightFace App instance (lazy loaded)
_insightface_app = None
_insightface_available = False

def init_face_analyzer():
    """Lazy initialize InsightFace or fallbacks."""
    global _insightface_app, _insightface_available
    if _insightface_app is not None:
        return _insightface_app

    try:
        import insightface
        from insightface.app import FaceAnalysis
        
        app = FaceAnalysis(name="buffalo_s", providers=["CPUExecutionProvider"])
        app.prepare(ctx_id=0, det_size=(640, 640))
        _insightface_app = app
        _insightface_available = True
        logger.info("InsightFace initialized successfully with buffalo_s model.")
        return _insightface_app
    except Exception as e:
        logger.warning(f"InsightFace initialization skipped or failed: {e}. Using OpenCV/Fallback embedding extractor.")
        _insightface_available = False
        return None


def get_cv2():
    global cv2
    if cv2 is None:
        try:
            import cv2 as _cv2
            cv2 = _cv2
        except ImportError:
            cv2 = None
    return cv2


def decode_base64_image(image_base64: str) -> Optional[np.ndarray]:
    """Decode base64 string to BGR OpenCV image numpy array."""
    if not image_base64:
        return None
    try:
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        image_bytes = base64.b64decode(image_base64)
        nparr = np.frombuffer(image_bytes, np.uint8)
        _cv2 = get_cv2()
        if _cv2 is not None:
            img = _cv2.imdecode(nparr, _cv2.IMREAD_COLOR)
            return img
        elif Image is not None:
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            arr = np.array(pil_img)
            return arr[:, :, ::-1] if arr.ndim == 3 else arr
    except Exception as e:
        logger.error(f"Error decoding base64 image: {e}")
        return None
    return None


def extract_face_embedding(img_bgr: np.ndarray) -> Tuple[Optional[List[float]], Optional[str]]:
    """
    Extracts a 512-dimensional normalized embedding vector from a BGR image.
    Returns (embedding_vector_as_list, error_message).
    """
    if img_bgr is None or img_bgr.size == 0:
        return None, "Gambar tidak valid atau kosong"

    app = init_face_analyzer()

    if app is not None and _insightface_available:
        try:
            faces = app.get(img_bgr)
            if len(faces) == 0:
                return None, "Tidak ada wajah yang terdeteksi pada gambar. Pastikan pencahayaan cukup dan posisi wajah menghadap ke depan."
            
            # Select the largest face if multiple faces are present
            largest_face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
            norm_embedding = largest_face.embedding / np.linalg.norm(largest_face.embedding)
            return norm_embedding.tolist(), None
        except Exception as e:
            logger.error(f"InsightFace extraction error: {e}")

    # Fallback embedding extraction using OpenCV or NumPy grayscale feature vector
    try:
        _cv2 = get_cv2()
        if _cv2 is not None:
            gray = _cv2.cvtColor(img_bgr, _cv2.COLOR_BGR2GRAY)
            cascade_path = _cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            try:
                face_cascade = _cv2.CascadeClassifier(cascade_path)
                faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(60, 60))
                if len(faces) > 0:
                    x, y, w, h = sorted(faces, key=lambda b: b[2]*b[3], reverse=True)[0]
                    face_roi = gray[y:y+h, x:x+w]
                else:
                    face_roi = gray
            except Exception:
                face_roi = gray

            resized = _cv2.resize(face_roi, (32, 32)).flatten().astype(np.float32)
        else:
            # Pure PIL/NumPy grayscale and downsampling fallback
            if img_bgr.ndim == 3:
                gray = np.dot(img_bgr[..., :3], [0.114, 0.587, 0.299]) # BGR to Gray
            else:
                gray = img_bgr
            
            # Simple 32x32 block average resizing using numpy
            h, w = gray.shape[:2]
            h_step = max(1, h // 32)
            w_step = max(1, w // 32)
            resized = gray[::h_step, ::w_step][:32, :32].flatten().astype(np.float32)
            if len(resized) < 1024:
                resized = np.pad(resized, (0, 1024 - len(resized)), 'constant')

        norm_vec = resized / (np.linalg.norm(resized) + 1e-6)
        padded_vec = np.pad(norm_vec, (0, max(0, 512 - len(norm_vec))), 'wrap')[:512]
        return padded_vec.tolist(), None
    except Exception as e:
        logger.error(f"Fallback face extraction error: {e}")
        return None, f"Gagal mengekstrak fitur wajah: {str(e)}"


def compute_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Computes cosine similarity score between two float vectors (0.0 to 1.0)."""
    try:
        a = np.array(vec1, dtype=np.float32)
        b = np.array(vec2, dtype=np.float32)
        
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
            
        similarity = float(np.dot(a, b) / (norm_a * norm_b))
        # Clamp between 0.0 and 1.0
        return max(0.0, min(1.0, similarity))
    except Exception:
        return 0.0


def find_matching_santri(
    target_embedding: List[float],
    santri_embeddings: List[Tuple[int, str]], # [(santri_id, embedding_json_str), ...]
    threshold: float = 0.60
) -> Tuple[Optional[int], float]:
    """
    Finds the santri with the highest cosine similarity above threshold.
    Returns (matched_santri_id, similarity_score).
    """
    best_santri_id = None
    best_score = 0.0

    for santri_id, emb_json in santri_embeddings:
        if not emb_json:
            continue
        try:
            stored_vec = json.loads(emb_json)
            score = compute_cosine_similarity(target_embedding, stored_vec)
            if score > best_score:
                best_score = score
                best_santri_id = santri_id
        except Exception as e:
            logger.error(f"Error parsing stored embedding for santri {santri_id}: {e}")

    if best_score >= threshold:
        return best_santri_id, best_score
    
    return None, best_score
