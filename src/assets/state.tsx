import { create } from 'zustand';
import { grabClip } from '../utils';
import { RecognitionInfo } from '../types';
import socket from './client';
import noAudio from "./no-audio.wav";
import longAudio from "./long-query.wav";
import shortAudio from "./short-query.wav";

type SelectedCamState = {
    deviceId: string | null;
    label: string;
    selectDevice: (deviceId: string, label: string) => void;
    clearDevice: () => void;
}

type MediaStreamState = {
    stream: MediaStream | null;
    setStream: (stream: MediaStream) => void;
    clearStream: () => void;
}

type WebCamCaptureState = {
    captured: Blob | null;
    capturing: boolean;
    capture: (stream: MediaStream, duration: number, flash?: FlashlightState) => Promise<Blob>;
    clearCapture: () => void;
}

type ObjectRecognitionState = {
    objects: RecognitionInfo[];
    running: boolean;
    run: (clip: Blob) => void;
    clear: () => void;
}

type MicRecorderState = {
    recorder: MediaRecorder | null;
    recording: boolean;
    blob: Blob | null;
    getRecorder: (stream: MediaStream) => void;
    start: () => void;
    stop: () => void;
    clear: () => void;
}

type FlashlightState = {
    on: boolean;
    stream: MediaStream | null;
    toggle: () => void;
    switch(on: boolean): void;
    setStream: (stream: MediaStream | null) => void;
}


export const useSelectedCam = create<SelectedCamState>((set) => ({
    deviceId: null,
    label: "",
    selectDevice: (deviceId: string, label: string) => set({ deviceId, label }),
    clearDevice: () => set({ deviceId: null, label: "" }),
}));

export const useWebcamStream = create<MediaStreamState>((set) => ({
    stream: null,
    setStream: (stream: MediaStream) => set({ stream }),
    clearStream: () => set((state: MediaStreamState) => {
        if (state.stream) {
            state.stream.getTracks().forEach((track) => track.stop());
        }
        return { stream: null}
    }),
}));

export const useWebcamCapture = create<WebCamCaptureState>((set) => {
    return {
        captured: null,
        capturing: false,
        capture: async (stream: MediaStream, duration: number, flash?: FlashlightState) => {
            flash?.switch(true);
            set({ capturing: true });
            const clip = await grabClip(stream, duration);
            set({ captured: clip, capturing: false });
            flash?.switch(false);
            return clip;
        },
        clearCapture: () => set({ captured: null, capturing: false }),
    }
});


export const useObjectSearch = create<ObjectRecognitionState>((set) => {
    socket.on("recognition", (objects: RecognitionInfo[]) => {
        console.log(objects);
        set({ objects, running: false });
    });
    return { 
        objects: [],
        running: false,
        run: async (clip: Blob) => {
            set({ running: true });
            socket.emit("recognize", clip);
        },
        clear: () => set({ objects: [], running: false }),
    }
});

export const useObstacleDetection = create<ObjectRecognitionState>((set) => {
    socket.on("detection", (objects: RecognitionInfo[]) => {
        console.log(objects);
        set({ objects, running: false });
    });
    return {
        objects: [],
        running: false,
        run: async (clip: Blob) => {
            set({ running: true });
            socket.emit("detect", clip);
        },
        clear: () => set({ objects: [], running: false }),
    }
});

export const useMicRecorder = create<MicRecorderState>((set) => {
    socket.on("audio", (buffer: ArrayBuffer) => {
        console.log("Got audio");
        // console.log(buffer);
        const blob = new Blob([buffer], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
    });

    socket.on("no-audio", () => {
        console.log("No audio");
        const audio = new Audio(noAudio);
        audio.play();
    });

    socket.on("long-audio", () => {
        console.log("Long audio");
        const audio = new Audio(longAudio);
        audio.play();
    });

    socket.on("short-audio", () => {
        console.log("Short audio");
        const audio = new Audio(shortAudio);
        audio.play();
    });


    return {
        recorder: null,
        recording: false,
        blob: null,
        getRecorder: (stream: MediaStream) => set((state: MicRecorderState) => {
            if (state.recorder) {
                return {}
            }
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];
            recorder.ondataavailable = (ev) => {
                console.log("Got data");
                chunks.push(ev.data);
            };
            recorder.onstop = () => {
                console.log("Stopped recording");
                set({ blob: new Blob(chunks, { type: "audio/webm" }) });
                stream.getAudioTracks()[0].stop();
            }
            recorder.onerror = (err) => {
                console.error(err);
            }
            recorder.onstart = () => {
                console.log("Started recording");
            }
            return { recorder };
        }),
        start: () => set((state: MicRecorderState) => {
            if (state.recorder) {
                state.recorder.start();
            }
            return { recording: true };
        }),
        stop: () => set((state: MicRecorderState) => {
            if (state.recorder) {
                state.recorder.stop();
            }
            return { recording: false, recorder: null };
        }),
        clear: () => set((state: MicRecorderState) => {
            if (state.recorder) {
                state.recorder.stop();
            }
            return { recorder: null, recording: false, blob: null };
        }),
    }
});

export const useFlashlight = create<FlashlightState>((set) => {
    
    return {
        on: false,
        stream: null,
        toggle: () => set((state: FlashlightState) => {
            state.switch(!state.on);
            return { on: !state.on };
        }),
        switch: (on: boolean) => set((state: FlashlightState) => {
            const stream = state.stream;
            if (!stream || on === state.on) {
                console.log(`Flashlight: ${!stream ? "No stream" : "Already on"}`)
                return { };
            }
            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();
            if (!capabilities.hasOwnProperty("torch")) {
                console.warn("Flashlight: No torch capability");
                return { on: false };
            }
            track.applyConstraints({
                // @ts-ignore
                advanced: [{torch: on}]
            });
            console.log(`Flashlight: ${on ? "On" : "Off"}`);
            return { on };
        }),
        setStream: (stream: MediaStream | null) => set(() => {
            return { stream };
        }),
    }
});