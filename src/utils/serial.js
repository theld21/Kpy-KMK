export class SerialManager {
  constructor() {
    this.port = null;
    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();
    this.reader = null;
    this.isReading = false;
    this.onLog = null; // Callback for log data
    this.onDisconnect = null; // Callback for disconnect
    this.pendingConfigResolve = null; // Resolve function for config promise
    this.currentLine = "";
  }

  async connect() {
    if (!navigator.serial) {
      throw new Error("Web Serial API not supported in this browser.");
    }

    // Request a port and open a connection.
    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 115200 });
    } catch (e) {
      console.error("Connection failed", e);
      throw e;
    }

    // Give it a moment to stabilize
    await new Promise((r) => setTimeout(r, 100));

    // Start reading loop
    this.startReadingLoop();
  }

  async startReadingLoop() {
    if (this.isReading || !this.port) return;
    this.isReading = true;

    while (this.port && this.port.readable && this.isReading) {
      try {
        this.reader = this.port.readable.getReader();
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) {
            const text = this.decoder.decode(value);
            this.processData(text);
          }
        }
      } catch (e) {
        console.error("Read Loop Error:", e);
        if (this.onLog) this.onLog(`[System] Read Error: ${e.message}`);
        break; // Break the loop on error (likely disconnect)
      } finally {
        if (this.reader) {
            this.reader.releaseLock();
            this.reader = null;
        }
      }
    }
    this.isReading = false;
    // Attempt to close port if loop exits
    if (this.port) {
        try {
            await this.port.close();
        } catch(e) {}
        this.port = null;
        if (this.onLog) this.onLog("[System] Port closed.");
        if (this.onDisconnect) this.onDisconnect();
        // We should notify app that we are disconnected, but we don't have a callback for that yet.
        // The App polls status or user clicks connect. 
        // Ideally App.vue should listen to navigator.serial 'disconnect' event.
    }
  }

  processData(text) {
    // Basic line buffering
    this.currentLine += text;

    // Check for Config Block (which might span multiple chunks)
    // Looking for JSON_START...JSON_END
    // Ideally this should be more robust, but simple string search works for now
    const startIdx = this.currentLine.indexOf("JSON_START");
    const endIdx = this.currentLine.indexOf("JSON_END");

    if (startIdx !== -1 && endIdx !== -1) {
      const jsonStr = this.currentLine.substring(startIdx + 10, endIdx);
      try {
        const configData = JSON.parse(jsonStr);
        if (this.pendingConfigResolve) {
          this.pendingConfigResolve(configData);
          this.pendingConfigResolve = null;
        }
      } catch (e) {
        console.error("Failed to parse config JSON", e);
      }
      // Remove the config block from buffer but keep the rest
      this.currentLine =
        this.currentLine.substring(0, startIdx) +
        this.currentLine.substring(endIdx + 8);
    }

    // Process logs line by line
    // We split by newline, emit complete lines, keep the last partial chunk
    const lines = this.currentLine.split("\n");
    if (lines.length > 1) {
      // All items except the last are complete lines
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (line && this.onLog) {
            // Filter out our protocol messages if desired, or show everything
            if (line !== "JSON_START" && line !== "JSON_END" && !line.startsWith("SET_CONFIG")) {
                 this.onLog(line);
            }
        }
      }
      // The last item is the remaining buffer
      this.currentLine = lines[lines.length - 1];
    }
  }

  async readConfig() {
    if (!this.port) throw new Error("Not connected");

    // Create a promise that resolves when config is received
    const configPromise = new Promise((resolve, reject) => {
      this.pendingConfigResolve = resolve;
      // Timeout after 3 seconds
      setTimeout(() => {
        if (this.pendingConfigResolve === resolve) {
          this.pendingConfigResolve = null;
          reject(new Error("Timeout waiting for config"));
        }
      }, 3000);
    });

    const writer = this.port.writable.getWriter();
    try {
      await writer.write(this.encoder.encode("GET_CONFIG\n"));
    } finally {
      writer.releaseLock();
    }

    return configPromise;
  }

  async sendConfig(configObj) {
    if (!this.port) throw new Error("Not connected");

    const jsonStr = JSON.stringify(configObj);
    const command = `SET_CONFIG${jsonStr}\n`;

    const writer = this.port.writable.getWriter();
    try {
      await writer.write(this.encoder.encode(command));
    } finally {
      writer.releaseLock();
    }
  }

  async sendRaw(text) {
    if (!this.port) throw new Error("Not connected");
    const writer = this.port.writable.getWriter();
    try {
        // Ensure newline
        if (!text.endsWith("\n")) text += "\n";
        await writer.write(this.encoder.encode(text));
    } finally {
        writer.releaseLock();
    }
  }

  setOnLog(callback) {
    this.onLog = callback;
  }

  setOnDisconnect(callback) {
    this.onDisconnect = callback;
  }
}
