import { DeviceCall, DeviceOutput } from './state';

export interface FirmwareVersion {
  protocol: { major: number, minor: number };
  firmware: { major: number, minor: number };
}

export interface OutputState {
  port: "a" | "b" | "c",
  power: number,
  mode: number,
  regMode: number,
  runState: number
}

export class Device {
  private tasks = [] as Promise<any>[];
  private readers = [] as ReadableStreamDefaultReader[];
  private gotPacket = null as (packet: Uint8Array) => void;

  constructor(private port: SerialPort, private out: DeviceOutput) {}

  connect(): void {
    (async () => {
      try {
        await this.port.open({
          baudRate: 115200,
          bufferSize: 64,
        });

        this.tasks.push(this.readPackets(this.port.readable));

        const versions = await this.getFirmwareVersion();
        this.out.log(`firmware versions: ${JSON.stringify(versions)}`);

      } catch (e) {
        this.out.deviceCrashed(e);
      }
    })();
  }

  call(call: DeviceCall): void {
    switch (call.name) {
      case "playTone":
        this.playTone(256, 100);
        break;
      case "runMotor":
        this.setOutputState(call.port, "on", {power: 20});
        break;
      case "idleMotor":
        this.setOutputState(call.port, "coast");
        break;
    }
  }

  private async readPackets(stream: ReadableStream) {
    try {
      const reader = stream.getReader();
      this.readers.push(reader);

      for await (let packet of decodeBluetoothPackets(reader)) {
        if (this.gotPacket == null) {
          this.out.deviceCrashed("unexpected packet");
          return;
        }
        this.gotPacket(packet);
        this.gotPacket = null;
      }
    } catch (e) {
      this.out.deviceCrashed(e);
    } finally {
      await stream.cancel();
    }
  }

  private async getFirmwareVersion(): Promise<FirmwareVersion> {
    const command = new Uint8Array([0x01, 0x88]);
    try {
      const result = await this.callCommand(command);
      if (result.length != 7) throw "unexpected response length";
      if (result[0] != 0x02) throw "not a response packet";
      if (result[1] != 0x88) throw "not a response packet to getFirmewareVersion";
      if (result[2] != 0) throw "got error result";
      this.out.commandDone();
      return {
        protocol: {major: result[0], minor: result[3]},
        firmware: {major: result[6], minor: result[5]}
      };
    } catch (e) {
      this.out.deviceCrashed(e);
    }
  }

  private async getOutputState(port: "a" | "b" | "c"): Promise<OutputState> {
    const command = new Uint8Array([0x00, 0x06, {"a": 0, "b": 1, "c": 2}[port]]);
    try {
      const result = await this.callCommand(command);
      if (result.length != 25) throw `unexpected response length for getOutputState: ${result.length}`;
      if (result[0] != 0x02) throw "not a response packet";
      if (result[1] != 0x06) throw "not a response packet to getFirmewareVersion";
      if (result[2] != 0) throw "got error result";
      this.out.commandDone();

      const port = {0: "a", 1: "b", 2: "c"}[result[3]] as "a" | "b" | "c";
      return {
        port: port,
        power: result[4],
        mode: result[5],
        regMode: result[6],
        runState: result[8]
      };
    } catch (e) {
      this.out.deviceCrashed(e);
    }
  }

  private async playTone(hz: number, millis: number): Promise<void> {
    if (hz < 200 || hz > 14000) throw `frequency out of range: ${hz}`;

    const command = new Uint8Array([
      0x00, 0x03,
      hz & 0xff, hz >>> 8,
      millis & 0xff, millis >>> 8
    ]);

    try {
      const result = await this.callCommand(command);
      checkResult(result, 0x03);
      this.out.commandDone();
    } catch (e) {
      this.out.deviceCrashed(e);
    }
  }

  private async setOutputState(port: "a" | "b" | "c" | "all", mode: "on" | "coast",
    options?: {power?: number}): Promise<void> {

    const power = options?.power ?? 0;
    if (power < -100 || power > 100) throw `power out of range: ${power}`;

    const command = new Uint8Array([
      0x00, 0x04,
      {a: 0, b: 1, c: 2, all: 0xff}[port],
      power,
      {"on": 0x07, "coast": 0}[mode],
      0x01, // regulate power to try to match speed
      0, // turn ratio
      {"on": 0x20, "coast": 0}[mode], // run state
      0, 0, 0, 0 // run forever
    ])

    try {
      const result = await this.callCommand(command);
      checkResult(result, 0x04);

      if (port != "all") {
        const state = await this.getOutputState(port);
        this.out.log(JSON.stringify(state));
      }

      //this.out.commandDone();
    } catch (e) {
      this.out.deviceCrashed(e);
    }
  }

  private async callCommand(command: Uint8Array): Promise<Uint8Array> {
    const writer = this.port.writable.getWriter();
    try {
      await writeBluetoothPacket(command, writer);
    } finally {
      writer.releaseLock();
    }

    return new Promise<Uint8Array>((resolve) => {
      this.gotPacket = (packet) => {
        resolve(packet);
      }
    });
  }
}

const checkResult = (result: Uint8Array, expectedCommand: number) => {
  if (result.length != 3) throw "unexpected response length";
  if (result[0] != 0x02) throw "not a response packet";
  if (result[1] != expectedCommand) throw `response to unexpected command: ${result[1]}`;
  if (result[2] != 0) throw `got an error result: ${result[2]}`;
}

// All Bluetooth packets start with a two-byte length.
// See page 22 of "LEGO MINDSTORMS NXT Communication Protocol"
// http://www.smartlab.at/wp-content/uploads/2012/08/Appendix-1-LEGO-MINDSTORMS-NXT-Communication-protocol.pdf

const writeBluetoothPacket = async (command: Uint8Array, writer: WritableStreamDefaultWriter): Promise<void> => {
    if (command.length > 255) throw "command too long";
    const packet = new Uint8Array(command.length + 2);
    packet[0] = command.length;
    packet[1] = 0;
    packet.set(command, 2);
    await writer.ready;
    await writer.write(packet);
}

async function* decodeBluetoothPackets(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncIterable<Uint8Array> {
  let chunks = [] as Uint8Array[];
  let bufsize = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      chunks.push(value);
      bufsize += value.length;

      while (bufsize >= 2) {
        // get length of packet
        if (chunks[0].length < 2) {
          chunks = [concat(chunks)]; // defragment
        }
        const len = chunks[0][0] + chunks[0][1] * 256;

        if (bufsize < len + 2) {
          break; // packet is incomplete
        }

        // Remove and return next packet.
        if (chunks[0].length < len + 2) {
          chunks = [concat(chunks)]; // defragment
        }
        yield chunks[0].slice(2, len + 2);
        chunks[0] = chunks[0].slice(len + 2);
        bufsize -= len + 2;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

const concat = (chunks: Uint8Array[]): Uint8Array => {
  const len = chunks.map((ch) => ch.length).reduce((a, b) => a + b, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (let chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
