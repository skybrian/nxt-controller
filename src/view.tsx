import {h} from "preact";
import {AppProps} from "./state";

export const Connect = (props: {onClick: (_) => void}) => {
  return <button onClick={props.onClick}>Connect</button>
}

export const App = (props: AppProps) => {
  return <div>
    {props.log.map((line) => <div>{line}</div>)}
  </div>
}
