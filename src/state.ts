export interface PlayTone {
  kind: "calling",
  name: "playTone"
}

export enum MotorPort {
  A = "A",
  B = "B",
  C = "C"
}

export const MotorPorts = [MotorPort.A, MotorPort.B, MotorPort.C] as const;

export interface RunMotor {
  kind: "calling",
  name: "runMotor",
  port: MotorPort,
}

export interface IdleMotor {
  kind: "calling",
  name: "idleMotor",
  port: MotorPort,
}

export type DeviceCall = PlayTone | RunMotor | IdleMotor;

export type DeviceState = { kind: "start" }
  | { kind: "connecting" }
  | { kind: "ready" }
  | DeviceCall
  | { kind: "closing" }
  | { kind: "closed" }
  | { kind: "gone" }
  ;

export type Tab = "Buttons" | "Log";

export interface MotorReading {
  port: MotorPort,
  power: number,
  position: number
}

export interface AppProps {
  deviceState: DeviceState,
  tab: Tab,
  log: string[],
  motorStates: { [key in MotorPort]: MotorReading },

  chooseTab: (tab: Tab) => void;
  playTone: () => void;
  runMotor: (port: MotorPort) => void;
  idleMotor: (port: MotorPort) => void;
}

export interface DeviceOutput {
  motorChanged(reading: MotorReading): void;
  ready(): void;
  deviceClosed(): void;
  deviceCrashed(message: any): void;
  log(line: string): void;
}

export class State extends EventTarget {
  private state = { kind: "start" } as DeviceState;
  private tab = "Log" as Tab;
  private log = [] as string[];
  private motorStates = {A: null, B: null, C: null} as { [key in MotorPort]: MotorReading | null }

  get props(): AppProps {
    return {
      deviceState: this.state,
      tab: this.tab,
      log: this.log,
      motorStates: this.motorStates,

      chooseTab: (tab: Tab) => {
        this.tab = tab;
        this.render();
      },

      playTone: () => {
        if (this.state.kind == "ready") {
          this.stateChanged({kind: "calling", name: "playTone"});
        }
      },

      runMotor: (port: MotorPort) => {
        if (this.state.kind == "ready") {
          this.stateChanged({kind: "calling", name: "runMotor", port: port});
        }
      },

      idleMotor: (port: MotorPort) => {
        if (this.state.kind == "ready") {
          this.stateChanged({kind: "calling", name: "idleMotor", port: port});
        }
      }
    }
  }

  get deviceOutput(): DeviceOutput {
    return {
      motorChanged: (reading: MotorReading) => {
        this.motorStates[reading.port] = reading;
        this.pushLog(`read motor ${reading.port}`)
        this.render();
      },
      ready: () => {
        this.stateChanged({kind: "ready"});
      },
      deviceClosed: (): void => {
        this.stateChanged({kind: "closed"});
      },
      deviceCrashed: (message: any): void => {
        this.stateChanged({kind: "gone"}, {message: message})
      },
      log: (line: string): void => {
        this.pushLog(line);
      }
    }
  }

  start() {
    this.stateChanged({kind: "connecting"});
  }

  private stateChanged(state: DeviceState, options?: {message?: any}) {
    if (this.state.kind == state.kind) throw "invalid state change";

    this.state = state;
    switch (state.kind) {
      case "connecting":
        this.dispatchEvent(new CustomEvent("connect"));
        break;
      case "calling":
        this.dispatchEvent(new CustomEvent("call", {detail: state}));
        this.pushLog(`*** calling ${state.name} ***`);
        return;
    }

    const message = options?.message ?? state.kind;
    this.pushLog(`*** ${message} ***`)
  }

  private pushLog(message: string) {
    this.log.push(message);
    if (this.log.length > 20) {
      this.log = this.log.slice(-20);
    }
    this.render();
  }

  private render() {
    this.dispatchEvent(new CustomEvent("render"));
  }
}
