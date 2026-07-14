import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

interface Props {
  running: boolean;
  presenter: boolean;
  alias: string;
  model: string;
}

export function TerminalPanel({ running, presenter, alias, model }: Props) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current || !running) return;
    const terminal = new Terminal({
      cursorBlink: presenter,
      cursorStyle: "bar",
      disableStdin: !presenter,
      fontFamily: '"SFMono-Regular", "Cascadia Code", Menlo, monospace',
      fontSize: 13,
      lineHeight: 1.45,
      scrollback: 5000,
      theme: {
        background: "#06111c",
        foreground: "#d7e0e8",
        cursor: "#eef4f7",
        selectionBackground: "#26415b",
        green: "#83dd75",
        yellow: "#eab85e",
        red: "#f16c72",
        blue: "#70aeea",
      },
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(container.current);
    fit.fit();

    let socket: WebSocket | null = null;
    let retry: number | undefined;
    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(`${protocol}//${window.location.host}/ws/terminal`);
      socket.addEventListener("open", () => {
        socket?.send(JSON.stringify({ type: "resize", cols: terminal.cols, rows: terminal.rows }));
      });
      socket.addEventListener("message", (event) => terminal.write(String(event.data)));
      socket.addEventListener("close", () => {
        retry = window.setTimeout(connect, 1800);
      });
    };
    connect();
    const input = terminal.onData((data) => {
      if (presenter && socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "input", data }));
    });
    const resize = new ResizeObserver(() => {
      fit.fit();
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "resize", cols: terminal.cols, rows: terminal.rows }));
    });
    resize.observe(container.current);

    return () => {
      if (retry) window.clearTimeout(retry);
      resize.disconnect();
      input.dispose();
      socket?.close();
      terminal.dispose();
    };
  }, [presenter, running]);

  return (
    <section className="panel terminal-panel">
      <div className="panel-header terminal-header">
        <div>
          <h2>Claude Code</h2>
        </div>
        <div className="route-summary"><span>Harness: Claude Code</span><span>Verified route: {alias} → {model}</span></div>
      </div>
      <div className="terminal-stage" ref={container}>
        {!running && <div className="empty-terminal"><strong>Session stopped</strong><span>A presenter can start the disposable demo session.</span></div>}
      </div>
      <div className="terminal-footer"><span>{presenter ? "Keyboard enabled" : "Input locked"}</span><span>Terminal: xterm-256color</span></div>
    </section>
  );
}
