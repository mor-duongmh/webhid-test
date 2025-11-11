import { useEffect, useState, useRef } from "react";
export default function HidKeyboard() {
  const [supported, setSupported] = useState(false);
  const [value, setValue] = useState("");
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const lastReportRef = useRef(null);

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
  }, []);

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

  async function attachDevice(device) {
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
      <p>WebHID supported: {supported ? "yes" : "no"}</p>

      <div style={{ marginBottom: 8 }}>
        <button onClick={requestDevice}>Connect HID device</button>
        <button
          onClick={disconnect}
          disabled={!connectedDevice}
          style={{ marginLeft: 8 }}
        >
          Disconnect
        </button>
      </div>
      <div>{value}</div>
      {/* <div>
        <strong>Connected device:</strong>{" "}
        {connectedDevice ? `${connectedDevice.productName} (v:${connectedDevice.vendorId} p:${connectedDevice.productId})` : "None"}
      </div> */}

      <div style={{ marginTop: 12 }}>
        <strong>Lịch sử kết nối:</strong>
        <ul>
          {devices.length ? (
            devices.map((d, i) => (
              <li key={i}>
                {d.productName || "(unnamed)"} — vendorId: {d.vendorId},
                productId: {d.productId}
              </li>
            ))
          ) : (
            <li>No devices granted yet</li>
          )}
        </ul>
      </div>

      {/* <div style={{ marginTop: 12 }}>
        <small>
          Note: If your device doesn't produce the standard 8-byte keyboard report, inspect the raw
          bytes in console and adapt parsing accordingly.
        </small>
      </div> */}
    </div>
  );
}
