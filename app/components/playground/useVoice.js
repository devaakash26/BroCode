'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

// STUN is enough for most networks; set a TURN server for strict NATs.
const ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ...(process.env.NEXT_PUBLIC_TURN_URL
    ? [
        {
          urls: process.env.NEXT_PUBLIC_TURN_URL.split(','),
          username: process.env.NEXT_PUBLIC_TURN_USERNAME,
          credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
        },
      ]
    : []),
];

const SPEAKING_LEVEL = 0.04;
// Mesh = every peer uploads to every other peer, so keep video modest.
const VIDEO_CONSTRAINTS = { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24, max: 24 } };
const VIDEO_MAX_BITRATE = 350_000;

async function capVideoBitrate(sender) {
  try {
    const params = sender.getParameters();
    params.encodings = params.encodings?.length ? params.encodings : [{}];
    params.encodings[0].maxBitrate = VIDEO_MAX_BITRATE;
    await sender.setParameters(params);
  } catch {
    // Not supported everywhere — the browser's default bitrate is fine.
  }
}

/**
 * Mesh voice + camera over WebRTC. The socket server only relays signalling.
 * Uses the "perfect negotiation" pattern so two peers joining (or toggling a
 * camera) at the same moment can't deadlock on crossing offers.
 */
export default function useVoice({ socket, peers, myPeerId }) {
  const [inVoice, setInVoice] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(false);
  const [joining, setJoining] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [streams, setStreams] = useState({}); // peerId → MediaStream
  const [speaking, setSpeaking] = useState(() => new Set()); // peerIds (and myPeerId)

  const localRef = useRef(null);
  const videoTrackRef = useRef(null);
  const pcsRef = useRef(new Map()); // peerId → { pc, polite, makingOffer, ignoreOffer, videoSender }
  const audioCtxRef = useRef(null);
  const analysersRef = useRef(new Map()); // peerId → { analyser, source, buf }
  const stateRef = useRef({ muted: false, camera: false });
  stateRef.current = { muted, camera };

  const signal = useCallback((to, data) => socket?.emit('pg:signal', { to, data }), [socket]);
  const announce = useCallback(
    (on, patch = {}) => socket?.emit('pg:voice', { on, ...stateRef.current, ...patch }),
    [socket],
  );

  const watchLevel = useCallback((peerId, stream) => {
    try {
      if (!stream.getAudioTracks().length) return;
      const ctx = (audioCtxRef.current ||= new (window.AudioContext || window.webkitAudioContext)());
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analysersRef.current.set(peerId, { analyser, source, buf: new Uint8Array(analyser.fftSize) });
    } catch {
      // Level meter is cosmetic — ignore failures.
    }
  }, []);

  const unwatchLevel = useCallback((peerId) => {
    const a = analysersRef.current.get(peerId);
    if (a) a.source.disconnect();
    analysersRef.current.delete(peerId);
  }, []);

  const closePeer = useCallback(
    (peerId) => {
      const entry = pcsRef.current.get(peerId);
      if (!entry) return;
      entry.pc.close();
      pcsRef.current.delete(peerId);
      unwatchLevel(peerId);
      setStreams((s) => {
        const { [peerId]: _gone, ...rest } = s;
        return rest;
      });
    },
    [unwatchLevel],
  );

  const ensurePeer = useCallback(
    (peerId) => {
      const existing = pcsRef.current.get(peerId);
      if (existing) return existing;
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const entry = { pc, polite: myPeerId < peerId, makingOffer: false, ignoreOffer: false, videoSender: null };
      pcsRef.current.set(peerId, entry);

      localRef.current?.getTracks().forEach((t) => {
        const sender = pc.addTrack(t, localRef.current);
        if (t.kind === 'video') {
          entry.videoSender = sender;
          capVideoBitrate(sender);
        }
      });

      pc.onicecandidate = ({ candidate }) => candidate && signal(peerId, { candidate });
      pc.ontrack = ({ streams: [stream] }) => {
        if (!stream) return;
        // New object so React re-renders even when the same stream gains a track.
        setStreams((s) => ({ ...s, [peerId]: stream }));
        if (!analysersRef.current.has(peerId)) watchLevel(peerId, stream);
      };
      pc.onnegotiationneeded = async () => {
        try {
          entry.makingOffer = true;
          await pc.setLocalDescription();
          signal(peerId, { description: pc.localDescription });
        } catch (err) {
          console.error('[call] negotiation error:', err);
        } finally {
          entry.makingOffer = false;
        }
      };
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') pc.restartIce();
      };
      return entry;
    },
    [myPeerId, signal, watchLevel],
  );

  // Incoming signalling.
  useEffect(() => {
    if (!socket) return;
    const onSignal = async ({ from, data }) => {
      if (!localRef.current) return; // not in the call
      const entry = ensurePeer(from);
      const { pc } = entry;
      try {
        if (data.description) {
          const collision =
            data.description.type === 'offer' && (entry.makingOffer || pc.signalingState !== 'stable');
          entry.ignoreOffer = !entry.polite && collision;
          if (entry.ignoreOffer) return;
          await pc.setRemoteDescription(data.description);
          if (data.description.type === 'offer') {
            await pc.setLocalDescription();
            signal(from, { description: pc.localDescription });
          }
        } else if (data.candidate) {
          try {
            await pc.addIceCandidate(data.candidate);
          } catch (err) {
            if (!entry.ignoreOffer) throw err;
          }
        }
      } catch (err) {
        console.error('[call] signal error:', err);
      }
    };
    socket.on('pg:signal', onSignal);
    return () => socket.off('pg:signal', onSignal);
  }, [socket, ensurePeer, signal]);

  // Keep one connection per peer that is in the call.
  useEffect(() => {
    if (!inVoice) return;
    const wanted = new Set(peers.filter((p) => p.voice && p.peerId !== myPeerId).map((p) => p.peerId));
    for (const id of [...pcsRef.current.keys()]) if (!wanted.has(id)) closePeer(id);
    // Only the "impolite" side dials, so we don't create two offers per pair.
    wanted.forEach((id) => {
      if (myPeerId > id) ensurePeer(id);
    });
  }, [peers, inVoice, myPeerId, ensurePeer, closePeer]);

  // After a reconnect we have a new peerId: re-announce call state.
  useEffect(() => {
    if (inVoice && myPeerId) announce(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPeerId]);

  // Speaking indicator.
  useEffect(() => {
    if (!inVoice) return;
    const id = setInterval(() => {
      const next = new Set();
      for (const [peerId, { analyser, buf }] of analysersRef.current) {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        if (Math.sqrt(sum / buf.length) > SPEAKING_LEVEL) next.add(peerId);
      }
      setSpeaking((prev) =>
        prev.size === next.size && [...next].every((x) => prev.has(x)) ? prev : next,
      );
    }, 200);
    return () => clearInterval(id);
  }, [inVoice]);

  const stopCameraTrack = useCallback(() => {
    const track = videoTrackRef.current;
    if (!track) return;
    track.stop();
    localRef.current?.removeTrack(track);
    videoTrackRef.current = null;
    for (const entry of pcsRef.current.values()) {
      if (entry.videoSender) {
        try {
          entry.pc.removeTrack(entry.videoSender);
        } catch {}
        entry.videoSender = null;
      }
    }
  }, []);

  const leave = useCallback(() => {
    stopCameraTrack();
    for (const id of [...pcsRef.current.keys()]) closePeer(id);
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    analysersRef.current.forEach((a) => a.source.disconnect());
    analysersRef.current.clear();
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setInVoice(false);
    setMuted(false);
    setCamera(false);
    setLocalStream(null);
    setSpeaking(new Set());
    socket?.emit('pg:voice', { on: false });
  }, [closePeer, stopCameraTrack, socket]);

  const join = useCallback(async () => {
    if (inVoice) return true;
    if (joining) return false;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Calls need a secure (https) connection and a supported browser');
      return false;
    }
    setJoining(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      localRef.current = stream;
      watchLevel(myPeerId, stream);
      setLocalStream(stream);
      setInVoice(true);
      setMuted(false);
      announce(true, { muted: false, camera: false });
      return true;
    } catch (err) {
      toast.error(err.name === 'NotAllowedError' ? 'Microphone permission denied' : 'Could not access microphone');
      return false;
    } finally {
      setJoining(false);
    }
  }, [inVoice, joining, myPeerId, watchLevel, announce]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    localRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
    announce(true, { muted: next });
  }, [muted, announce]);

  const toggleCamera = useCallback(async () => {
    if (camera) {
      stopCameraTrack();
      setCamera(false);
      setLocalStream(localRef.current ? new MediaStream(localRef.current.getTracks()) : null);
      announce(true, { camera: false });
      return;
    }
    // Turning the camera on joins the call first if needed.
    if (!localRef.current && !(await join())) return;
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS });
      const track = cam.getVideoTracks()[0];
      videoTrackRef.current = track;
      localRef.current.addTrack(track);
      // If the OS/browser stops the camera (e.g. unplugged), reflect it.
      track.onended = () => {
        if (videoTrackRef.current === track) {
          stopCameraTrack();
          setCamera(false);
          announce(true, { camera: false });
        }
      };
      for (const entry of pcsRef.current.values()) {
        entry.videoSender = entry.pc.addTrack(track, localRef.current);
        capVideoBitrate(entry.videoSender);
      }
      setCamera(true);
      setLocalStream(new MediaStream(localRef.current.getTracks()));
      announce(true, { camera: true });
    } catch (err) {
      toast.error(err.name === 'NotAllowedError' ? 'Camera permission denied' : 'Could not access camera');
    }
  }, [camera, join, stopCameraTrack, announce]);

  // Hang up when leaving the page.
  const leaveRef = useRef(leave);
  leaveRef.current = leave;
  useEffect(() => () => leaveRef.current(), []);

  return {
    inVoice,
    muted,
    camera,
    joining,
    localStream,
    streams,
    speaking,
    join,
    leave,
    toggleMute,
    toggleCamera,
  };
}
