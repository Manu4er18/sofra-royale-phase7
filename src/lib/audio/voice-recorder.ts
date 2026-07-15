"use client";

type AudioContextConstructor = typeof AudioContext;

function getAudioContextConstructor(): AudioContextConstructor {
  return (
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: AudioContextConstructor })
      .webkitAudioContext
  );
}

function floatTo16BitPcm(view: DataView, offset: number, input: Float32Array) {
  let writeOffset = offset;
  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index] ?? 0));
    view.setInt16(
      writeOffset,
      sample < 0 ? sample * 0x8000 : sample * 0x7fff,
      true,
    );
    writeOffset += 2;
  }
}

function writeString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function encodeWav(samples: Float32Array, sampleRate: number) {
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * bytesPerSample, true);
  floatTo16BitPcm(view, 44, samples);

  return new Blob([view], { type: "audio/wav" });
}

export type VoiceRecorder = {
  stop: () => Promise<Blob>;
};

export async function createVoiceRecorder(stream: MediaStream): Promise<VoiceRecorder> {
  const AudioContextImpl = getAudioContextConstructor();
  if (!AudioContextImpl) {
    throw new DOMException("AudioContext is not supported", "NotSupportedError");
  }

  const context = new AudioContextImpl();
  if (context.state === "suspended") await context.resume();

  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  let sampleCount = 0;
  let stopped = false;

  processor.onaudioprocess = (event) => {
    if (stopped) return;
    const channel = event.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(channel));
    sampleCount += channel.length;
  };

  source.connect(processor);
  processor.connect(context.destination);

  return {
    stop: async () => {
      stopped = true;
      processor.disconnect();
      source.disconnect();
      await context.close();

      const samples = new Float32Array(sampleCount);
      let offset = 0;
      for (const chunk of chunks) {
        samples.set(chunk, offset);
        offset += chunk.length;
      }
      return encodeWav(samples, context.sampleRate);
    },
  };
}
