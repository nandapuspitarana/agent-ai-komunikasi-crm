from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import requests

try:
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    print("[AI Engine] Warning: PyTorch atau Transformers tidak terdeteksi. Hanya mode LM Studio yang dapat digunakan.")

app = FastAPI(title="AI Agent GPU Backend")

MODEL_NAME = os.getenv("MODEL_NAME", "TinyLlama/TinyLlama-1.1B-Chat-v1.0")

# LM Studio Auto-detection
LM_STUDIO_URL = "http://localhost:1234/v1"
USE_LM_STUDIO = False
LM_STUDIO_MODEL = ""

try:
    response = requests.get(f"{LM_STUDIO_URL}/models", timeout=1.5)
    if response.status_code == 200:
        models_data = response.json()
        if models_data.get("data") and len(models_data["data"]) > 0:
            USE_LM_STUDIO = True
            # Gunakan model pertama yang terdeteksi
            LM_STUDIO_MODEL = models_data["data"][0]["id"]
            print(f"[AI Engine] LM Studio terdeteksi aktif pada port 1234!")
            print(f"[AI Engine] Menggunakan model dari LM Studio: {LM_STUDIO_MODEL}")
except Exception:
    pass

# GPU detection
if HAS_TORCH:
    device = "cuda" if torch.cuda.is_available() else "cpu"
else:
    device = "cpu"

print(f"[AI Engine] Initializing on device: {device}")
if HAS_TORCH and device == "cuda" and not USE_LM_STUDIO:
    print(f"[AI Engine] GPU: {torch.cuda.get_device_name(0)}")
    print(f"[AI Engine] VRAM Available: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")

model = None
tokenizer = None


@app.on_event("startup")
def load_model():
    global model, tokenizer
    if USE_LM_STUDIO:
        print("[AI Engine] Melewati loading PyTorch lokal karena LM Studio aktif.")
        return

    if not HAS_TORCH:
        print("[AI Engine] ERROR: PyTorch/Transformers tidak terinstal. Jalankan `pip install torch transformers` untuk load lokal.")
        return

    try:
        print(f"[AI Engine] Loading model: {MODEL_NAME}...")
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        
        dtype = torch.float16 if device == "cuda" else torch.float32
        
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_NAME,
            torch_dtype=dtype,
            low_cpu_mem_usage=True,
        ).to(device)
        
        model.eval()
        print(f"[AI Engine] Model loaded successfully on {device}!")
        
        if device == "cuda":
            allocated = torch.cuda.memory_allocated(0) / 1e9
            print(f"[AI Engine] VRAM Used: {allocated:.2f} GB")
            
    except Exception as e:
        print(f"[AI Engine] CRITICAL ERROR loading model: {e}")


class GenerateRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = None
    max_tokens: int = 300
    temperature: float = 0.7
    use_chat_template: bool = False


class GenerateResponse(BaseModel):
    reply: str
    device_used: str
    session_id: Optional[str] = None


@app.get("/health")
def health_check():
    gpu_info = {}
    cuda_available = False
    if HAS_TORCH:
        cuda_available = torch.cuda.is_available()
        if cuda_available:
            gpu_info = {
                "gpu_name": torch.cuda.get_device_name(0),
                "vram_total_gb": round(torch.cuda.get_device_properties(0).total_memory / 1e9, 2),
                "vram_used_gb": round(torch.cuda.memory_allocated(0) / 1e9, 2),
            }
    status = "healthy" if (model is not None or USE_LM_STUDIO) else "loading_or_failed"
    return {
        "status": status,
        "device": "cuda (LM Studio)" if USE_LM_STUDIO else device,
        "cuda_available": cuda_available,
        "use_lm_studio": USE_LM_STUDIO,
        "lm_studio_model": LM_STUDIO_MODEL,
        "model_name": LM_STUDIO_MODEL if USE_LM_STUDIO else MODEL_NAME,
        **gpu_info,
    }


@app.post("/generate", response_model=GenerateResponse)
def generate_text(req: GenerateRequest):
    if USE_LM_STUDIO:
        try:
            payload = {
                "model": LM_STUDIO_MODEL,
                "messages": [
                    {"role": "user", "content": req.prompt}
                ],
                "temperature": req.temperature,
                "max_tokens": req.max_tokens
            }
            res = requests.post(f"{LM_STUDIO_URL}/chat/completions", json=payload, timeout=30)
            if res.status_code == 200:
                reply = res.json()["choices"][0]["message"]["content"]
                return GenerateResponse(
                    reply=reply.strip(),
                    device_used="cuda (LM Studio)",
                    session_id=req.session_id,
                )
            else:
                raise HTTPException(status_code=res.status_code, detail=f"LM Studio Error: {res.text}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"LM Studio Proxy Error: {str(e)}")

    if not HAS_TORCH or model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model is not fully loaded yet. Please wait.")

    try:
        inputs = tokenizer(req.prompt, return_tensors="pt", truncation=True, max_length=2048).to(device)

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=req.max_tokens,
                temperature=max(0.1, req.temperature),  # temperature harus > 0
                do_sample=req.temperature > 0,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id,
                repetition_penalty=1.1,  # Hindari pengulangan
            )

        # Decode hanya token baru (exclude input tokens)
        input_length = inputs.input_ids.shape[-1]
        generated_ids = outputs[0][input_length:]
        response_text = tokenizer.decode(generated_ids, skip_special_tokens=True)

        # Bersihkan output
        response_text = response_text.strip()
        
        # Potong jika ada "User:" atau "Bot:" di output (model kadang generate percakapan lanjutan)
        for stop_word in ["User:", "Bot:", "Human:", "\nUser", "\nBot"]:
            if stop_word in response_text:
                response_text = response_text[:response_text.index(stop_word)].strip()

        return GenerateResponse(
            reply=response_text or "Maaf, saya tidak bisa menghasilkan respons untuk permintaan ini.",
            device_used=device,
            session_id=req.session_id,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation error: {str(e)}")
