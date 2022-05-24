import { DeviceCommand, DeviceOutput } from './state';

export interface FirmwareVersion {
  protocol: { major: number, minor: number };
  firmware: { major: number, minor: number };
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

        if (this.out.deviceOpened()) {
          this.tasks.push(this.readPackets(this.port.readable));
          this.tasks.push(this.run());
        }

      } catch (e) {
        this.out.deviceCrashed(e);
      }
    })();
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
    } finally {
      await stream.cancel();
    }
  }

  private async run() {
    const versions = await this.getFirmwareVersion();
    this.out.pushDeviceOutput(`versions: ${JSON.stringify(versions)}`);
  }

  private async getFirmwareVersion(): Promise<FirmwareVersion> {
    const command = new Uint8Array([0x01, 0x88]);
    const result = await this.callCommand("getFirmwareVersion", command);
    if (result.length != 7) throw "unexpected response length";
    if (result[0] != 0x02) throw "not a response packet";
    if (result[1] != 0x88) throw "not a response packet to getFirmewareVersion";
    if (result[2] != 0) throw "got error result";
    return {
      protocol: {major: result[0], minor: result[3]},
      firmware: {major: result[6], minor: result[5]}
    };
  }

  private async callCommand(name: DeviceCommand, command: Uint8Array): Promise<Uint8Array> {
    const writer = this.port.writable.getWriter();

    writeBluetoothPacket(command, writer);
    this.out.sentCommand(name);

    return new Promise<Uint8Array>((resolve) => {
      this.gotPacket = (packet) => {
        resolve(packet);
      }
    });
  }
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
