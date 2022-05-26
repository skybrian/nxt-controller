import {h} from "preact";
import {AppProps, MotorPort, MotorPorts} from "./state";
import {TabView} from "./tabs";

export const Connect = (props: {onClick: (_) => void}) => {
  return <div class="connect-view">
    <p>
      This program can be used to control stepper motors using a Lego Mindstorms NXT Brick.
      Currently it only supports Bluetooth connections.
    </p>
    <p>
      Before using it, you will need to turn on the NXT Brick, turn on Bluetooth, and pair it with your
      computer. Then press "Connect" and choose the serial port with "NXT" in its name.
    </p>
    <p>
      The source is <a href="https://github.com/skybrian/nxt-controller">on Github.</a>
    </p>
    <div>
      <button class="pure-button pure-button-primary" onClick={props.onClick}>Connect</button>
    </div>
   </div>
}

export const App = (props: AppProps) => {

  const renderMotor = (port: MotorPort) => {
    const motor = props.motorStates[port];
    return <div class="motor-row">
      Motor {port}: <button class="pure-button" onClick={(e) => props.runMotor(port)} disabled={props.deviceState.kind != "ready"}
        >Run</button> <button class="pure-button" onClick={(e) => props.idleMotor(port)} disabled={props.deviceState.kind != "ready"}
        >Idle</button> {motor?.position}
      </div>
  }

  return <TabView labels={["Log", "Buttons"]} selected={props.tab} chooseTab={props.chooseTab} >
    <LogView log={props.log}/>
    <div>
      <div>
        <button class="pure-button" onClick={props.playTone} disabled={props.deviceState.kind != "ready"}>Play Tone</button>
      </div>
      <div>
        {MotorPorts.map(renderMotor)}
      </div>
    </div>
  </TabView>
}

export const LogView = (props: {log: string[]}) => {
  return <div>
    {props.log.map((line) => <div>{line}</div>)}
  </div>
}
