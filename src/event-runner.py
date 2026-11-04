"""Optional LiteRT fixed-classifier runner; only user-supplied local artifacts."""
import json
import sys
import wave
import zipfile
from pathlib import Path
import numpy as np
from ai_edge_litert.interpreter import Interpreter


def main():
    if len(sys.argv) != 3:
        raise ValueError('INVALID_EVENT_ARGUMENTS')
    audio, model = map(Path, sys.argv[1:])
    with wave.open(str(audio), 'rb') as reader:
        if reader.getframerate() != 16000 or reader.getnchannels() != 1 or reader.getsampwidth() != 2:
            raise ValueError('EVENT_REQUIRES_PCM16_MONO_16000')
        if reader.getnframes() > 960000:
            raise ValueError('EVENT_INPUT_LIMIT')
        signal = np.frombuffer(reader.readframes(reader.getnframes()), dtype='<i2').astype(np.float32) / 32768.0
    if not len(signal):
        raise ValueError('EMPTY_EVENT_INPUT')
    with zipfile.ZipFile(model) as archive:
        labels = archive.read('yamnet_label_list.txt').decode('utf8').splitlines()
    interpreter = Interpreter(model_path=str(model), num_threads=1)
    interpreter.allocate_tensors()
    inputs, outputs = interpreter.get_input_details(), interpreter.get_output_details()
    if len(inputs) != 1 or list(inputs[0]['shape']) != [15600] or len(outputs) != 1 or list(outputs[0]['shape']) != [1, len(labels)]:
        raise ValueError('UNSUPPORTED_EVENT_MODEL')
    window, hop = 15600, 7800
    count = max(1, int(np.ceil((len(signal) - window) / hop)) + 1)
    scores, windows = [], []
    for index in range(count):
        start = index * hop
        valid = min(window, len(signal) - start)
        chunk = np.zeros(window, dtype=np.float32)
        chunk[:valid] = signal[start:start + valid]
        interpreter.set_tensor(inputs[0]['index'], chunk)
        interpreter.invoke()
        scores.append(interpreter.get_tensor(outputs[0]['index'])[0].tolist())
        windows.append({'from': start / 16000, 'to': (start + valid) / 16000, 'padded_samples': window - valid})
    print(json.dumps({'labels': labels, 'scores': scores, 'windows': windows, 'sample_rate': 16000, 'window_samples': window, 'hop_samples': hop}, allow_nan=False))


if __name__ == '__main__':
    main()
