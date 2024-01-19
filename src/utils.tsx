export function grabClip(stream: MediaStream, duration: number) {
    return new Promise < Blob > ((resolve, reject) => {
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        recorder.ondataavailable = (ev) => {
            chunks.push(ev.data);
        };
        recorder.onstop = () => {
            resolve(new Blob(chunks, { type: "video/webm" }));
        }
        recorder.onerror = (err) => {
            console.error(err);
            reject(err);
        }
        recorder.onstart = () => {
            console.log("Started recording video");
        }
        recorder.start();
        setTimeout(() => {
            recorder.stop();
            console.log("Stopped recording video");
        }, duration);
    });
}

export async function recordMicrophone() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    function start() {
        if (recorder.state === "recording") {
            return;
        }
        recorder.start();
    }
    function stop() {
        if (recorder.state !== "inactive") {
            stream.getAudioTracks()[0].stop();
            recorder.stop();
        }
        return new Blob(chunks, { type: "audio/webm" });
    }
    recorder.ondataavailable = (ev) => {
        console.log("Got data");
        chunks.push(ev.data);
    }
    recorder.onerror = (err) => {
        console.error(err);
        stop();
    }
    recorder.onstart = () => {
        console.log("Started recording audio");
    }
    recorder.onstop = () => {
        console.log("Stopped recording audio");
    }
    return {start, stop};
}