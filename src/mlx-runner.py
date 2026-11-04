"""Optional local MLX Whisper runner. Requires an existing user environment/model."""
import json
import os
import sys
from pathlib import Path

# Set before importing any HF-dependent module; no downloads or bytecode writes.
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ['PYTHONDONTWRITEBYTECODE'] = '1'


def main():
    if len(sys.argv) != 3:
        raise ValueError('INVALID_LOCAL_ASR_ARGUMENTS')
    audio, model = Path(sys.argv[1]), Path(sys.argv[2])
    if not audio.is_file() or not model.is_dir():
        raise ValueError('LOCAL_ASR_INPUT_MISSING')
    if not (model / 'config.json').is_file() or not (model / 'weights.safetensors').is_file():
        raise ValueError('LOCAL_ASR_MODEL_MISSING')
    import mlx_whisper
    result = mlx_whisper.transcribe(
        str(audio), path_or_hf_repo=str(model), temperature=0,
        condition_on_previous_text=False, verbose=None,
    )
    payload = {
        'text': result.get('text', ''),
        'language': result.get('language'),
        'segments': [
            {'start': s['start'], 'end': s['end'], 'text': s['text']}
            for s in result.get('segments', [])
        ],
    }
    print(json.dumps(payload, allow_nan=False))


if __name__ == '__main__':
    main()
