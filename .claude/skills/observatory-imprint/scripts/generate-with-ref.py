# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10"]
# ///
"""
Observatory Imprint — reference-image-driven generation

Sends a reference image plus prompt to the OpenAI images-edit endpoint.
Needs OPENAI_API_KEY in the environment. Calls a paid API.

Supported providers:
  - OpenAI (gpt-image-2 via /v1/images/edits)
  - More to come (ComfyUI, Replicate, etc.)

Usage:
  uv run scripts/generate-with-ref.py [options]

Options:
  --prompt TEXT        Generation prompt (required)
  --reference PATH     Path to reference image (required)
  --aspect RATIO       landscape|portrait|square (default: landscape)
  --quality Q          low|medium|high (default: medium)
  --output PATH        Output file path (default: ./imprint_raw_<timestamp>.png)
  --dry-run            Print what would be sent without executing
  --debug              Print full request/response details
"""

import argparse
import base64
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------

CACHE_DIR = Path.cwd()

SIZES = {
    "landscape": (1536, 1024),
    "square": (1024, 1024),
    "portrait": (1024, 1536),
}

SIZE_STR = {
    "landscape": "1536x1024",
    "square": "1024x1024",
    "portrait": "1024x1536",
}


def read_env(key: str) -> Optional[str]:
    return os.environ.get(key)


def get_image_gen_config() -> Tuple[str, str]:
    return "openai", "gpt-image-2"


# ---------------------------------------------------------------------------
# Image helpers
# ---------------------------------------------------------------------------

def prepare_reference_image(path: str, aspect: str) -> bytes:
    """
    Load a reference image, crop to square (for edits endpoint),
    resize to 1024x1024, return PNG bytes.
    """
    try:
        from PIL import Image
    except ImportError:
        print("ERROR: PIL/Pillow is required. Install with: pip install Pillow",
              file=sys.stderr)
        sys.exit(1)

    img = Image.open(path).convert("RGB")

    # For edits endpoint, the image must be square. Crop center square.
    target_size = 1024
    sz = min(img.size)
    left = (img.width - sz) // 2
    top = (img.height - sz) // 2
    img_cropped = img.crop((left, top, left + sz, top + sz))
    img_resized = img_cropped.resize((target_size, target_size), Image.LANCZOS)

    import io
    buf = io.BytesIO()
    img_resized.save(buf, format="PNG")
    return buf.getvalue()


def save_output(b64: str, output_path: Optional[str] = None) -> str:
    """Save base64 image data to disk, return path."""
    if output_path is None:
        ts = time.strftime("%Y%m%d_%H%M%S")
        output_path = str(CACHE_DIR / f"imprint_raw_{ts}.png")
    with open(output_path, "wb") as f:
        f.write(base64.b64decode(b64))
    return output_path


def revised_prompt_from_meta(revised: Optional[str]) -> Optional[str]:
    """Return a revised_prompt if it differs meaningfully from original."""
    if revised and len(revised) > 10:
        return revised
    return None


# ---------------------------------------------------------------------------
# Provider handlers
# ---------------------------------------------------------------------------

def generate_openai(
    prompt: str,
    reference_bytes: bytes,
    aspect: str,
    quality: str,
    model: str,
    dry_run: bool = False,
    debug: bool = False,
) -> Dict[str, Any]:
    """
    Use OpenAI /v1/images/edits with a reference image.
    Supports gpt-image-2 (low/medium/high quality).
    """
    api_key = read_env("OPENAI_API_KEY")
    if not api_key:
        return {"error": "OPENAI_API_KEY not set in the environment"}

    # Strip quality suffix from model name to get the API model
    api_model = "gpt-image-2"

    # Build multipart form-data
    boundary = f"----ObservatoryFormBoundary{int(time.time())}x"

    def field(name: str, value: str) -> bytes:
        return f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode()

    body = b""
    body += field("model", api_model)
    body += f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="reference.png"\r\nContent-Type: image/png\r\n\r\n'.encode()
    body += reference_bytes
    body += b"\r\n"
    body += field("prompt", prompt)
    body += field("n", "1")
    body += field("size", SIZE_STR[aspect])
    body += field("quality", quality)
    body += f"--{boundary}--\r\n".encode()

    if dry_run:
        print(f"[DRY RUN] Would POST to https://api.openai.com/v1/images/edits")
        print(f"  Model: {api_model}")
        print(f"  Size: {SIZE_STR[aspect]}")
        print(f"  Quality: {quality}")
        print(f"  Prompt length: {len(prompt)} chars")
        print(f"  Image bytes: {len(reference_bytes)}")
        return {"status": "dry_run"}

    import urllib.request
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/edits",
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Authorization": f"Bearer {api_key}",
        },
    )

    if debug:
        print(f"POST https://api.openai.com/v1/images/edits")
        print(f"  Model: {api_model}, Size: {SIZE_STR[aspect]}, Quality: {quality}")
        print(f"  Prompt: {prompt[:120]}...")
        print(f"  Image bytes: {len(reference_bytes)}")
        sys.stdout.flush()

    try:
        resp = urllib.request.urlopen(req, timeout=180)
        result = json.loads(resp.read().decode())
    except Exception as exc:
        error_body = ""
        if hasattr(exc, "read"):
            try:
                error_body = exc.read().decode()[:2000]
            except Exception:
                pass
        return {"error": f"API call failed: {exc}", "detail": error_body}

    import logging
    data_list = result.get("data", [])
    if not data_list:
        return {"error": "API returned no image data"}

    first = data_list[0]
    b64_json = first.get("b64_json")
    revised = first.get("revised_prompt")

    if not b64_json:
        return {"error": "API response missing b64_json"}

    return {
        "b64_json": b64_json,
        "revised_prompt": revised,
        "model": model,
        "api_model": api_model,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

PROVIDER_HANDLERS = {
    "openai": generate_openai,
}


def main():
    parser = argparse.ArgumentParser(
        description="Generate images with reference image as context"
    )
    parser.add_argument("--prompt", required=True, help="Generation prompt")
    parser.add_argument("--reference", required=True, help="Path to reference image")
    parser.add_argument("--aspect", choices=["landscape", "portrait", "square"],
                        default="landscape", help="Aspect ratio")
    parser.add_argument("--quality", choices=["low", "medium", "high"],
                        default="medium", help="Quality tier")
    parser.add_argument("--output", help="Output file path")
    parser.add_argument("--dry-run", action="store_true", help="Preview without executing")
    parser.add_argument("--debug", action="store_true", help="Verbose output")

    args = parser.parse_args()

    provider, model = get_image_gen_config()

    if args.debug:
        print(f"Provider: {provider}")
        print(f"Model: {model}")
        print(f"Reference: {args.reference}")
        sys.stdout.flush()

    # Validate reference image exists
    ref_path = Path(args.reference)
    if not ref_path.exists():
        print(f"ERROR: Reference image not found: {ref_path}", file=sys.stderr)
        sys.exit(1)

    # Get handler for this provider
    handler = PROVIDER_HANDLERS.get(provider)
    if not handler:
        print(f"ERROR: Unsupported provider '{provider}'. "
              f"Supported: {list(PROVIDER_HANDLERS.keys())}", file=sys.stderr)
        sys.exit(1)

    # Prepare reference image
    try:
        ref_bytes = prepare_reference_image(str(ref_path), args.aspect)
    except Exception as exc:
        print(f"ERROR: Could not process reference image: {exc}", file=sys.stderr)
        sys.exit(1)

    if args.debug:
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(ref_bytes))
        print(f"Reference prepared: {img.size[0]}x{img.size[1]} PNG, "
              f"{len(ref_bytes) / 1024:.0f} KB")
        sys.stdout.flush()

    # Generate
    result = handler(
        prompt=args.prompt,
        reference_bytes=ref_bytes,
        aspect=args.aspect,
        quality=args.quality,
        model=model,
        dry_run=args.dry_run,
        debug=args.debug,
    )

    if args.dry_run:
        return

    if "error" in result:
        print(f"ERROR: {result['error']}", file=sys.stderr)
        if result.get("detail"):
            print(f"Detail: {result['detail']}", file=sys.stderr)
        sys.exit(1)

    # Save output
    out_path = save_output(result["b64_json"], args.output)

    # Print result (machine-readable JSON for the agent)
    output = {
        "image": out_path,
        "model": result.get("model", "unknown"),
        "aspect_ratio": args.aspect,
        "provider": provider,
    }
    revised = result.get("revised_prompt")
    if revised:
        output["revised_prompt"] = revised

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
