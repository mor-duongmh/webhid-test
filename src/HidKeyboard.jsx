import { useEffect, useState, useRef, useCallback } from "react";
export default function HidKeyboard() {
  const [supported, setSupported] = useState(false);
  const [value, setValue] = useState("");
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const lastReportRef = useRef(null);

  const attachDevice = useCallback(async (device) => {
    if (!device) return;
    try {
      if (!device.opened) await device.open();
      console.log(device);
      setConnectedDevice(device);
      device.addEventListener("inputreport", onInputReport);
      console.log(
        "Attached device:",
        device.productName,
        device.vendorId,
        device.productId
      );
    } catch (err) {
      console.error("attachDevice error:", err);
    }
  }, []);
  const handleEnter = () => {
    alert(`${value}`);
  };
  useEffect(() => {
    setSupported(Boolean(navigator.hid));
    async function fetchDevices() {
      if (!navigator.hid) return;
      try {
        const devs = await navigator.hid.getDevices();
        setDevices(devs);
        if (devs.length) attachDevice(devs[0]);
      } catch (err) {
        console.error("getDevices error:", err);
      }
    }
    fetchDevices();

    function onKey(e) {
      console.log("DOM key event", e.type, e.key, e.code);
      console.log(e);
      if (e.key.length === 1) {
        setValue((prev) => prev + e.key);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [attachDevice]);
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Enter") {
        handleEnter();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [value]);
  async function requestDevice() {
    if (!navigator.hid) {
      alert("WebHID not supported in this browser.");
      return;
    }

    try {
      const filters = [{ usagePage: 0x01, usage: 0x06 }];

      const chosen = await navigator.hid.requestDevice({ filters });
      if (!chosen || !chosen.length) {
        console.log("No device");
        return;
      }
      setDevices((prev) => [...prev, ...chosen]);
      await attachDevice(chosen[0]);
    } catch (err) {
      console.error("requestDevice error:", err);
    }
  }

  function onInputReport(event) {
    const { device, reportId, data } = event;
    lastReportRef.current = { device, reportId, data };
    try {
      const bytes = new Uint8Array(data.buffer);
      console.log("HID report:", reportId, bytes);
      if (bytes.length >= 8) {
        const modifiers = bytes[0];
        const keycodes = Array.from(bytes.slice(2, 8)).filter((k) => k !== 0);
        console.log("Modifiers:", modifiers, "Keycodes:", keycodes);
      } else {
        console.log("Raw HID bytes:", bytes);
      }
    } catch (err) {
      console.error("Error parsing input report:", err);
    }
  }

  async function disconnect() {
    if (!connectedDevice) return;
    try {
      connectedDevice.removeEventListener("inputreport", onInputReport);
      if (connectedDevice.opened) await connectedDevice.close();
      setConnectedDevice(null);
      console.log("Device disconnected");
    } catch (err) {
      console.error("disconnect error:", err);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h3>WebHID Keyboard demo</h3>
      <h4>Barcode value below</h4>
      <input value={value} />
      <button onClick={handleEnter}>Show alert</button>
      {/* <div>
        <strong>Connected device:</strong>{" "}
        {connectedDevice ? `${connectedDevice.productName} (v:${connectedDevice.vendorId} p:${connectedDevice.productId})` : "None"}
      </div> */}

      {/* <div style={{ marginTop: 12 }}>
        <small>
          Note: If your device doesn't produce the standard 8-byte keyboard report, inspect the raw
          bytes in console and adapt parsing accordingly.
        </small>
      </div> */}
    </div>
  );
}
