const fs = require("fs");
const http = require("http");
const https = require("https");
const WebSocket = require("ws");
const client = require("prom-client");

// Create a Registry which registers the metrics
const register = new client.Registry();
// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: "clocktower-online"
});

const PING_INTERVAL = 30000; // 30 seconds

// Golem fork: how long a second host connection waits for the INCUMBENT host
// to prove it is still there before the newcomer is allowed to take the
// channel. See the reclaim block in the connection handler below.
//
// 2s is chosen against three bounds. It must beat the round trip to a live
// browser (a pong is answered by the protocol stack itself, not by page code,
// so it costs one RTT — tens of ms on a wire, under a second on bad mobile);
// it must stay under the point where a storyteller reloading their own town
// notices a wait (the bundle is still booting at 2s, so the grace is spent in
// parallel with work the client is doing anyway); and erring long is the SAFE
// direction, because a grace too short evicts a live storyteller mid-game
// while a grace too long only delays a reload.
const HOST_RECLAIM_GRACE = 2000; // 2 seconds

const options = {};

// Golem fork: BEHIND_PROXY=1 runs a PLAIN ws server on PORT — the reverse
// proxy (Caddy) terminates TLS and forwards /ws, so the upstream cert.pem /
// key.pem self-termination path is skipped entirely. NODE_ENV=development
// keeps upstream's local behaviour.
const behindProxy =
  process.env.BEHIND_PROXY === "1" || process.env.NODE_ENV === "development";

if (!behindProxy) {
  options.cert = fs.readFileSync("cert.pem");
  options.key = fs.readFileSync("key.pem");
}

const server = https.createServer(options);

// Golem fork: the town status API. The relay is the only thing that knows
// which towns are awake, so in proxy mode the ws port answers plain GETs too
// (Caddy already forwards all of /ws* here — upgrades and GETs alike).
//   GET /ws/status?towns=a,b,c → { a: { players, host }, ... }
function handleStatus(req, res) {
  const url = new URL(req.url, "http://relay");
  if (req.method === "GET" && url.pathname.replace(/\/+$/, "") === "/ws/status") {
    const out = {};
    (url.searchParams.get("towns") || "")
      .toLocaleLowerCase()
      .split(",")
      .map(town => town.trim())
      .filter(Boolean)
      .slice(0, 20)
      .forEach(town => {
        const live = (channels[town] || []).filter(
          ws => ws && ws.readyState === WebSocket.OPEN
        );
        out[town] = {
          players: live.length,
          host: live.some(ws => ws.playerId === "host")
        };
      });
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(out));
  } else {
    res.statusCode = 404;
    res.end();
  }
}

// In proxy mode the relay owns a plain HTTP server (status + ws upgrades);
// standalone keeps upstream's TLS self-termination.
const proxyServer = behindProxy ? http.createServer(handleStatus) : null;
const wss = new WebSocket.Server({
  ...(behindProxy ? { server: proxyServer } : { server }),
  verifyClient: info =>
    info.origin &&
    !!info.origin.match(
      // Golem fork: our domains admitted alongside upstream's.
      /^https?:\/\/([^.]+\.github\.io|localhost|clocktower\.online|eddbra1nprivatetownsquare\.xyz|([^.]+\.)?golem-studios?\.com)/i
    )
});
if (proxyServer) proxyServer.listen(Number(process.env.PORT) || 8081);

function noop() {}

// calculate latency on heartbeat
function heartbeat() {
  this.latency = Math.round((new Date().getTime() - this.pingStart) / 2);
  this.counter = 0;
  this.isAlive = true;
}

// map of channels currently in use
const channels = {};

// metrics
const metrics = {
  players_concurrent: new client.Gauge({
    name: "players_concurrent",
    help: "Concurrent Players",
    collect() {
      this.set(wss.clients.size);
    }
  }),
  channels_concurrent: new client.Gauge({
    name: "channels_concurrent",
    help: "Concurrent Channels",
    collect() {
      this.set(Object.keys(channels).length);
    }
  }),
  channels_list: new client.Gauge({
    name: "channel_players",
    help: "Players in each channel",
    labelNames: ["name"],
    collect() {
      for (let channel in channels) {
        this.set(
          { name: channel },
          channels[channel].filter(
            ws =>
              ws &&
              (ws.readyState === WebSocket.OPEN ||
                ws.readyState === WebSocket.CONNECTING)
          ).length
        );
      }
    }
  }),
  messages_incoming: new client.Counter({
    name: "messages_incoming",
    help: "Incoming messages"
  }),
  messages_outgoing: new client.Counter({
    name: "messages_outgoing",
    help: "Outgoing messages"
  }),
  connection_terminated_host: new client.Counter({
    name: "connection_terminated_host",
    help: "Terminated connection due to host already present"
  }),
  // Golem fork: the other half of the duplicate-host decision — the incumbent
  // did not answer its liveness ping, so the newcomer took the channel. The
  // two counters together say whether a channel is being fought over or simply
  // reloaded, which the single counter above could never distinguish.
  connection_reclaimed_host: new client.Counter({
    name: "connection_reclaimed_host",
    help: "Host channel reclaimed from an unresponsive host connection"
  }),
  connection_terminated_spam: new client.Counter({
    name: "connection_terminated_spam",
    help: "Terminated connection due to message spam"
  }),
  connection_terminated_timeout: new client.Counter({
    name: "connection_terminated_timeout",
    help: "Terminated connection due to timeout"
  })
};

// register metrics
for (let metric in metrics) {
  register.registerMetric(metrics[metric]);
}

// Golem fork: channels with a duplicate-host liveness probe in flight, so two
// tabs arriving together cannot both be admitted while the answer is pending.
const hostProbes = new Set();

// Golem fork: the pong that answers a duplicate-host liveness probe. Separate
// from `heartbeat` because that one speaks about the 30s sweep; this one is
// read once, by the timeout that asked the question.
function answerReclaimProbe() {
  this.reclaimAnswered = true;
}

// Golem fork: refuse a second host — upstream's original behaviour, unchanged,
// now reached only when a host has actually proven it is still there.
function refuseDuplicateHost(ws, why) {
  console.log(new Date(), ws.channel, "duplicate host REFUSED —", why);
  ws.close(1000, `The channel "${ws.channel}" already has a host`);
  metrics.connection_terminated_host.inc();
}

// a new client connects
wss.on("connection", function connection(ws, req) {
  // url pattern: clocktower.online/<channel>/<playerId|host>
  const url = req.url.toLocaleLowerCase().split("/");
  ws.playerId = url.pop();
  ws.channel = url.pop();
  // check for another host on this channel
  const incumbents =
    ws.playerId === "host" && channels[ws.channel]
      ? channels[ws.channel].filter(
          client =>
            client !== ws &&
            client.readyState === WebSocket.OPEN &&
            client.playerId === "host"
        )
      : [];
  if (!incumbents.length) {
    admitClient(ws);
    return;
  }

  // Golem fork: A HOST MAY RECLAIM ITS OWN DEAD SOCKET.
  //
  // `readyState === OPEN` is a CACHED fact, not a live one. A browser reload
  // does not always deliver a clean close, and nothing notices until the
  // liveness sweep below — which needs up to TWO PING_INTERVALs (60s) to
  // terminate a silent socket. For that whole window the storyteller's own
  // abandoned socket held the channel and locked its owner out of their town.
  //
  // So stop trusting the cache and ASK. Ping the incumbent and give it a short
  // grace to answer:
  //   silence → it is gone; terminate it and admit the newcomer
  //   a pong  → a live storyteller really is there; refuse, exactly as before
  //
  // Note what this deliberately does NOT do: let the newest host win. That
  // would hand anyone holding the invite link the power to evict a storyteller
  // mid-game. The incumbent keeps the channel for as long as it can still
  // speak for itself.
  if (hostProbes.has(ws.channel)) {
    // Another newcomer is already deciding this channel. Whichever way that
    // lands there will be a host here, so this one is refused either way.
    refuseDuplicateHost(ws, "a reclaim probe is already in flight");
    return;
  }

  // Hold this client's frames while we decide. Its `open` has already fired at
  // the protocol level, so a host starts publishing its gamestate immediately;
  // without this they would be dropped on the floor during the grace and the
  // town would keep the pre-reload picture until the storyteller next acted.
  const held = [];
  const hold = data => {
    // Capped: the grace is a window nobody is reading, and a client that
    // floods it would trip the rate limit on replay anyway.
    if (held.length < 50) held.push(data);
  };
  ws.on("message", hold);

  hostProbes.add(ws.channel);
  incumbents.forEach(client => {
    client.reclaimAnswered = false;
    client.once("pong", answerReclaimProbe);
    try {
      client.ping(noop);
    } catch (e) {
      // A socket torn down under us throws instead of answering — which is
      // itself an answer, and the one we are testing for.
    }
  });

  setTimeout(() => {
    hostProbes.delete(ws.channel);
    incumbents.forEach(client =>
      client.removeListener("pong", answerReclaimProbe)
    );
    ws.removeListener("message", hold);
    // The newcomer gave up while we were asking; there is nobody to admit.
    if (ws.readyState !== WebSocket.OPEN) return;
    const living = incumbents.filter(
      client => client.readyState === WebSocket.OPEN && client.reclaimAnswered
    );
    if (living.length) {
      refuseDuplicateHost(ws, "the incumbent answered its liveness ping");
      return;
    }
    incumbents.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.terminate();
    });
    console.log(
      new Date(),
      ws.channel,
      `duplicate host RECLAIMED — incumbent silent for ${HOST_RECLAIM_GRACE}ms`
    );
    metrics.connection_reclaimed_host.inc();
    admitClient(ws, held);
  }, HOST_RECLAIM_GRACE);
});

/**
 * Golem fork: everything that happens once a connection is allowed into its
 * channel — upstream's connection handler from `isAlive` down, lifted out
 * whole because admission is no longer always synchronous. `held` carries the
 * frames a reclaiming host sent while its liveness probe was still running.
 */
function admitClient(ws, held) {
  ws.isAlive = true;
  ws.pingStart = new Date().getTime();
  ws.counter = 0;
  // add channel to list
  if (!channels[ws.channel]) {
    channels[ws.channel] = [];
  }
  channels[ws.channel].push(ws);
  // start ping pong
  ws.ping(noop);
  ws.on("pong", heartbeat);
  // handle message
  ws.on("message", function incoming(data) {
    // Golem fork: ws v8 delivers a Buffer where v7 delivered a string; the
    // string methods below crashed the whole relay on the FIRST message.
    // Normalising here makes the ws major version irrelevant.
    data = data.toString();
    metrics.messages_incoming.inc();
    // check rate limit (max 5msg/second)
    ws.counter++;
    if (ws.counter > (5 * PING_INTERVAL) / 1000) {
      console.log(ws.channel, "disconnecting user due to spam");
      ws.close(
        1000,
        "Your app seems to be malfunctioning, please clear your browser cache."
      );
      metrics.connection_terminated_spam.inc();
      return;
    }
    const messageType = data
      .toLocaleLowerCase()
      .substr(1)
      .split(",", 1)
      .pop();
    switch (messageType) {
      case '"ping"':
        // ping messages will only be sent host -> all or all -> host
        channels[ws.channel].forEach(function each(client) {
          if (
            client !== ws &&
            client.readyState === WebSocket.OPEN &&
            (ws.playerId === "host" || client.playerId === "host")
          ) {
            client.send(
              data.replace(/latency/, (client.latency || 0) + (ws.latency || 0))
            );
            metrics.messages_outgoing.inc();
          }
        });
        break;
      case '"callback"':
        // FT-880: the town summons travels host -> players and NEVER the other
        // way — the same one-way rule ping has above, for the same reason.
        //
        // Both clients already refuse it (the sender will not send one unless
        // it is the host; a host's client will not act on one arriving), but
        // neither of them can tell who a broadcast came FROM: the relay hands
        // every client the same frame with no sender on it. Without this
        // branch a hand-written ["callback",null] from any player's console
        // would fall through to the default below and ring the entire town.
        // The relay is the only participant that knows, so the last no is
        // here.
        if (ws.playerId !== "host") {
          console.log(new Date(), ws.channel, ws.playerId, "callback refused");
          break;
        }
        channels[ws.channel].forEach(function each(client) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(data);
            metrics.messages_outgoing.inc();
          }
        });
        break;
      case '"direct"':
        // handle "direct" messages differently
        console.log(
          new Date(),
          wss.clients.size,
          ws.channel,
          ws.playerId,
          data
        );
        try {
          const dataToPlayer = JSON.parse(data)[1];
          channels[ws.channel].forEach(function each(client) {
            if (
              client !== ws &&
              client.readyState === WebSocket.OPEN &&
              dataToPlayer[client.playerId]
            ) {
              client.send(JSON.stringify(dataToPlayer[client.playerId]));
              metrics.messages_outgoing.inc();
            }
          });
        } catch (e) {
          console.log("error parsing direct message JSON", e);
        }
        break;
      default:
        // all other messages
        console.log(
          new Date(),
          wss.clients.size,
          ws.channel,
          ws.playerId,
          data
        );
        channels[ws.channel].forEach(function each(client) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(data);
            metrics.messages_outgoing.inc();
          }
        });
        break;
    }
  });
  // Golem fork: the frames this client sent while its reclaim probe was
  // running, replayed in order now that there is a handler to receive them.
  if (held && held.length) {
    held.forEach(data => ws.emit("message", data));
  }
}

// start ping interval timer
const interval = setInterval(function ping() {
  // ping each client
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      metrics.connection_terminated_timeout.inc();
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.pingStart = new Date().getTime();
    ws.ping(noop);
  });
  // clean up empty channels
  for (let channel in channels) {
    if (
      !channels[channel].length ||
      !channels[channel].some(
        ws =>
          ws &&
          (ws.readyState === WebSocket.OPEN ||
            ws.readyState === WebSocket.CONNECTING)
      )
    ) {
      metrics.channels_list.remove({ name: channel });
      delete channels[channel];
    }
  }
}, PING_INTERVAL);

// handle server shutdown
wss.on("close", function close() {
  clearInterval(interval);
});

// prod mode with stats API
if (process.env.NODE_ENV !== "development") {
  console.log("server starting");
  server.listen(8080);
  server.on("request", (req, res) => {
    res.setHeader("Content-Type", register.contentType);
    register.metrics().then(out => res.end(out));
  });
}
