import './app.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import { Ref, useEffect, useRef, useState } from "preact/hooks";
import { useFlashlight, useMicRecorder, useObjectSearch, useObstacleDetection, useSelectedCam, useWebcamCapture, useWebcamStream } from "./assets/state";
import { Button, Card, Col, Container, Row, Table } from "react-bootstrap";
import { AiFillAlert } from "react-icons/ai";
import { FaMicrophone, FaSearch } from "react-icons/fa";
import { RecognitionInfo } from "./types";
import socket from "./assets/client";

async function loadVideoDevices() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === "videoinput");
  } catch (err) {
    console.error(err);
    return [];
  }
}


function Microphone() {
  const [active, setActive] = useState(false);
  const { getRecorder, recorder, start, stop, blob, recording } = useMicRecorder();
  const { capture, capturing } = useWebcamCapture();
  const [clip, setClip] = useState<Blob | null>(null);
  const webcamStream = useWebcamStream((state) => state.stream);
  const micDisabled = (capturing && !recording) || !webcamStream;

  useEffect(() => {
    async function startRecording() {
      if (!recorder) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        getRecorder(stream);
      }
      start();
    }
    async function stopRecording() {
      stop();
    }
    if (active && !recording) {
      startRecording();
    } else if (!active && recording) {
      stopRecording();
    }
  }, [active]);

  useEffect(() => {
    if (blob) {
      // console.log(blob);
      // const audio = new Audio(URL.createObjectURL(blob));
      // audio.play();
      capture(webcamStream as MediaStream, 1000).then((clip) => {
        setClip(clip);
      });
    }
  }, [blob]);

  useEffect(() => {
    if (clip && blob) {
      console.log("Sending query");
      socket.emit("query", blob, clip);
    }
  }, [clip]);

  return (
    <Col md={6}>
      <Card>
        <Card.Body>
          <Card.Title>Microphone</Card.Title>
          <Card.Text>
            <p>Device: Microphone</p>
          </Card.Text>
          <button class="mic" disabled={micDisabled}
          onMouseDown={() => {
            !micDisabled && setActive(true);
          }} onMouseUp={() => {
            !micDisabled && setActive(false);
          }} onMouseLeave={() => {
            !micDisabled && setActive(false);
          }} onTouchStart={() => {
            !micDisabled && setActive(true);
          }} onTouchEnd={() => {
            !micDisabled && setActive(false);
          }} onTouchCancel={() => {
            !micDisabled && setActive(false);
          }}>
            <div className="pulse-ring"></div>
            <FaMicrophone />
          </button>
        </Card.Body>
      </Card>
    </Col>
  )
}



function CamDevice(props: { id: string, label: string, selected: boolean }) {
  const { id, label, selected } = props;
  return (
    <option selected={selected} value={id}>{label}</option>
  )
}

function CamDeviceList(props: { devices: MediaDeviceInfo[] }) {
  const { devices } = props;
  const { deviceId, selectDevice, clearDevice } = useSelectedCam();
  const { clearStream } = useWebcamStream();

  return (
    <select id="cam-list" class="form-select" onChange={(ev) => {
      // @ts-ignore
      const deviceId = ev.target.value;
      if (!deviceId) {
        clearDevice();
        clearStream();
        return;
      }
      // @ts-ignore
      const deviceLabel = ev.target.innerText;
      selectDevice(deviceId, deviceLabel);
    }}>
      <option value="">{deviceId ? "Clear Selected" : "Select Device"}</option>
      {devices.map((device) => (

        <CamDevice key={device.deviceId} id={device.deviceId} label={device.label}
          selected={device.deviceId === deviceId} />
      ))}
    </select>
  )
}


function WebCamStream(props: { deviceId: string | null, label: string, clearDevice: () => void, onDetect: () => void, onSearch: () => void }) {
  const { deviceId, label, clearDevice } = props;
  const videoRef = useRef<HTMLVideoElement>(null);
  const { setStream, stream } = useWebcamStream();
  const flash = useFlashlight();
  const { capturing, capture } = useWebcamCapture();
  const [searching, search] = useObjectSearch((state) => [state.running, state.run]);
  const [detecting, detect] = useObstacleDetection((state) => [state.running, state.run]);
  const disableBtn = capturing || searching || detecting || !stream;
  flash.setStream(stream);

  useEffect(() => {
    if (!(deviceId && videoRef.current)) {
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { deviceId: deviceId as string } }).then((stream) => {
      videoRef.current!.srcObject = stream;
      videoRef.current!.play().catch((err) => {
        console.error(err);
        clearDevice();
      });
      setStream(stream);
    }).catch((err) => {
      console.error(err);
      clearDevice();
    });
  }, [deviceId]);

  return (
    <Col md={6}>
      <Card>
        <Card.Body>
          <Card.Title>Camera</Card.Title>
          <Card.Text>
            <p>Device: {label}</p>
          </Card.Text>
          <video ref={videoRef} autoPlay playsInline />
        </Card.Body>
        <Card.Footer>
          <Button variant="danger" disabled={disableBtn} onClick={() => {
            if (stream) {
              capture(stream, 1111, flash).then((clip) => {
                detect(clip);
                props.onDetect();
              });
            }

          }}>
            <AiFillAlert />
            <span>&nbsp;Detect</span>
          </Button>
          &nbsp;&nbsp;
          <Button variant="primary" disabled={disableBtn} onClick={() => {
            if (stream) {
              capture(stream, 1111).then((clip) => {
                search(clip);
                props.onSearch();
              });

            }
          }}>
            <FaSearch />
            <span>&nbsp;Search</span>
          </Button>
        </Card.Footer>
      </Card>
    </Col>
  )
}

function WebCamCapture(props: { blob: Blob | null }) {
  const { blob } = props;
  const { capturing } = useWebcamCapture();

  return (
    <Col md={6}>
      <Card>
        <Card.Body>
          <Card.Title>Captured Clip</Card.Title>
          <Card.Text>
            <span>Capturing: {capturing ? "Yes" : "No"}&nbsp;&nbsp;</span>
            <span class="">Captured: {blob ? "Yes" : "No"}</span>
          </Card.Text>
          {blob ? (
            <video src={URL.createObjectURL(blob)} controls playsInline />
          ) : (
            <img src="https://placehold.co/600x400" />
          )}
        </Card.Body>
      </Card>
    </Col>
  )
}

function ObstacleDetections(props: { detections: RecognitionInfo[], ref: Ref<HTMLDivElement> }) {
  const { detections, ref } = props;
  return (
    <Col md={6} ref={ref}>
      <Card>
        <Card.Body>
          <Card.Title>Obstacle Detections</Card.Title>
          <Card.Text>
            {detections.length ? (
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Obstacle</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {detections.map((detection) => (
                    <tr>
                      <td>{detection.name}</td>
                      <td>{detection.confidence}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <h1>No Obstacles Detected</h1>
            )}
          </Card.Text>
        </Card.Body>
      </Card>
    </Col>
  )
}


function ObstacleSearch(props: { recognitions: RecognitionInfo[], ref: Ref<HTMLDivElement> }) {
  const { recognitions, ref } = props;
  return (
    <Col md={6} ref={ref}>
      <Card>
        <Card.Body>
          <Card.Title>Object Search</Card.Title>
          <Card.Text>
            {recognitions.length ? (
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Object</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {recognitions.map((recognition) => (
                    <tr>
                      <td>{recognition.name}</td>
                      <td>{recognition.confidence}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <h1>No Objects Recognized</h1>
            )}
          </Card.Text>
        </Card.Body>
      </Card>
    </Col>
  )
}

export function App() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const { label, deviceId, selectDevice, clearDevice } = useSelectedCam();
  const { captured } = useWebcamCapture();
  const { clearStream } = useWebcamStream();
  const [recognitions] = useObjectSearch((state) => [state.objects]);
  const [detections] = useObstacleDetection((state) => [state.objects]);
  const detectionRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadVideoDevices().then((devices) => {
      setDevices(devices);
      if (devices.length == 1) {
        selectDevice(devices[0].deviceId, devices[0].label || "Camera");
      } else if (devices.length > 1) {
        devices.forEach((device) => {
          if (device.label.includes("back")) {
            selectDevice(device.deviceId, device.label || "Back Camera");
          }
        }
        );
      } else {
        console.error("No video devices found");
      }
    });
  }, []);

  return (
    <Container class="mb-2">
      <Row className="mt-2 mb-2 align-items-center justify-content-center">
        <Microphone />
      </Row>
      <div class="form-floating mb-3">
        <CamDeviceList devices={devices} />
      </div>
      <Row className="mt-2 flex-nowrap overflow-auto">
        <WebCamStream deviceId={deviceId} label={label} onDetect={() => {
          // @ts-ignore
          detectionRef.current?.base.scrollIntoView({ behavior: "smooth" });
        }} onSearch={() => {
          // @ts-ignore
          searchRef.current?.base.scrollIntoView({ behavior: "smooth" });
        }} clearDevice={() => {
          clearDevice();
          clearStream();
        }} />
        <WebCamCapture blob={captured} />
      </Row>
      <Row className="mt-2 flex-nowrap overflow-auto">
        <ObstacleDetections detections={detections} ref={detectionRef} />
        <ObstacleSearch recognitions={recognitions} ref={searchRef} />
      </Row>


    </Container>
  );
}
