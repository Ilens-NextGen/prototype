export function grabClip(stream: MediaStream, duration: number) {
    return new Promise<Blob>((resolve, reject) => {
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
    return { start, stop };
}


export function getImageLightness(src: HTMLVideoElement | HTMLImageElement) {
    var colorSum = 0;
    // create canvas
    var canvas = document.createElement("canvas");
    canvas.width = src.width;
    canvas.height = src.height;

    var ctx = (canvas.getContext("2d") as CanvasRenderingContext2D);
    ctx.drawImage(src, 0, 0);
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var data = imageData.data;
    var r, g, b, avg;

    for (var x = 0, len = data.length; x < len; x += 4) {
        r = data[x];
        g = data[x + 1];
        b = data[x + 2];

        avg = Math.floor((r + g + b) / 3);
        colorSum += avg;
    }

    var brightness = Math.floor(colorSum / (src.width * src.height));
    return brightness;
}
