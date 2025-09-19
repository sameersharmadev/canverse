import { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'simple-peer';
import { Socket } from 'socket.io-client';

interface VoiceUser {
  id: string;
  name: string;
  color: string;
  isMuted: boolean;
  isSpeaking: boolean;
  lastSpeakTime: number;
}

interface UseVoiceChatProps {
  socket: Socket | null;
  roomId: string;
  userId: string;
  userName: string;
  userColor: string;
  isConnected: boolean;
}

export const useVoiceChat = ({
  socket,
  roomId,
  userId,
  userName,
  userColor,
  isConnected
}: UseVoiceChatProps) => {
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false); 
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([]);
  const [error, setError] = useState<string>('');

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, Peer.Instance>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speakingDetectionRef = useRef<boolean>(false);
  
  const hasJoinedVoiceRef = useRef(false);
  const socketListenersSetup = useRef(false);

  const initializeAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      microphone.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      startSpeakingDetection();
    } catch (err) {
      console.error('Error setting up audio analysis:', err);
    }
  }, []);

  const startSpeakingDetection = useCallback(() => {
    if (!analyserRef.current || speakingDetectionRef.current) return;

    speakingDetectionRef.current = true;
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const detectSpeaking = () => {
      if (!speakingDetectionRef.current || !isInCall) return;

      analyser.getByteFrequencyData(dataArray);
      
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      
      const speakingThreshold = isMuted ? 0 : 25;
      const currentlySpeaking = average > speakingThreshold;
      
      if (currentlySpeaking !== isSpeaking) {
        setIsSpeaking(currentlySpeaking);
        
        if (socket && isConnected) {
          socket.emit('voice-speaking', {
            roomId,
            userId,
            isSpeaking: currentlySpeaking
          });
        }
      }

      requestAnimationFrame(detectSpeaking);
    };

    detectSpeaking();
  }, [isInCall, isMuted, isSpeaking, socket, isConnected, roomId, userId]);

  const getUserMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      localStreamRef.current = stream;
      
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = true; 
      }
      
      initializeAudioAnalysis(stream);
      return stream;
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Failed to access microphone. Please check permissions.');
      throw err;
    }
  }, [initializeAudioAnalysis]);

  const cleanupPeer = useCallback((targetUserId: string) => {
    const peer = peersRef.current.get(targetUserId);
    const audio = audioElementsRef.current.get(targetUserId);
    
    if (peer) {
      peer.destroy();
      peersRef.current.delete(targetUserId);
    }
    
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      audioElementsRef.current.delete(targetUserId);
    }
  }, []);

  const createPeer = useCallback((targetUserId: string, isInitiator: boolean, stream: MediaStream) => {
    if (peersRef.current.has(targetUserId)) {
      cleanupPeer(targetUserId);
    }
    const peer = new Peer({
      initiator: isInitiator,
      trickle: false,
      stream: stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      }
    });

    peer.on('signal', (signal) => {
      if (socket && isConnected) {
        socket.emit('voice-signal', {
          roomId,
          targetUserId,
          signal,
          callerUserId: userId
        });
      }
    });

    peer.on('stream', (remoteStream) => {
      let audio = audioElementsRef.current.get(targetUserId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audio.volume = 1;
        audioElementsRef.current.set(targetUserId, audio);
      }
      audio.srcObject = remoteStream;
      audio.play().catch(() => {});
    });

    peer.on('error', () => {});
    peer.on('close', () => {
      cleanupPeer(targetUserId);
    });

    peersRef.current.set(targetUserId, peer);
    return peer;
  }, [socket, isConnected, roomId, userId, cleanupPeer]);

  const joinCall = useCallback(async () => {
    if (hasJoinedVoiceRef.current) {
      return;
    }
    try {
      setError('');
      const stream = await getUserMedia();
      setIsInCall(true);
      hasJoinedVoiceRef.current = true;
      if (socket && isConnected) {
        socket.emit('voice-join', {
          roomId,
          userId,
          userName,
          userColor
        });
      }
    } catch (err) {
      setIsInCall(false);
      hasJoinedVoiceRef.current = false;
    }
  }, [getUserMedia, socket, isConnected, roomId, userId, userName, userColor]);

  const leaveCall = useCallback(() => {
    if (!hasJoinedVoiceRef.current) {
      return;
    }
    hasJoinedVoiceRef.current = false;
    speakingDetectionRef.current = false;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    peersRef.current.forEach((peer, targetUserId) => {
      peer.destroy();
    });
    peersRef.current.clear();
    audioElementsRef.current.forEach(audio => {
      audio.pause();
      audio.srcObject = null;
    });
    audioElementsRef.current.clear();
    setIsInCall(false);
    setIsSpeaking(false);
    setIsMuted(true);
    setVoiceUsers([]);
    if (socket && isConnected) {
      socket.emit('voice-leave', {
        roomId,
        userId
      });
    }
  }, [socket, isConnected, roomId, userId]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        const newMutedState = !isMuted;
        audioTrack.enabled = !newMutedState;
        setIsMuted(newMutedState);
        if (socket && isConnected) {
          socket.emit('voice-mute', {
            roomId,
            userId,
            isMuted: newMutedState
          });
        }
      }
    }
  }, [isMuted, socket, isConnected, roomId, userId]);

  useEffect(() => {
    if (!socket || !isConnected || socketListenersSetup.current) return;
    socketListenersSetup.current = true;

    const handleVoiceUserJoined = (data: { userId: string; userName: string; userColor: string }) => {
      if (data.userId === userId) return;
      setVoiceUsers(prev => {
        const existing = prev.find(u => u.id === data.userId);
        if (existing) return prev;
        const newUser = {
          id: data.userId,
          name: data.userName,
          color: data.userColor,
          isMuted: true,
          isSpeaking: false,
          lastSpeakTime: 0
        };
        return [...prev, newUser];
      });
      if (isInCall && localStreamRef.current && hasJoinedVoiceRef.current) {
        createPeer(data.userId, true, localStreamRef.current);
      }
    };

    const handleVoiceUserLeft = (data: { userId: string }) => {
      cleanupPeer(data.userId);
      setVoiceUsers(prev => prev.filter(u => u.id !== data.userId));
    };

    const handleVoiceSignal = (data: { callerUserId: string; signal: any }) => {
      if (!isInCall || !localStreamRef.current || !hasJoinedVoiceRef.current) return;
      let peer = peersRef.current.get(data.callerUserId);
      if (!peer) {
        peer = createPeer(data.callerUserId, false, localStreamRef.current);
      }
      if (peer) {
        peer.signal(data.signal);
      }
    };

    const handleVoiceSpeaking = (data: { userId: string; isSpeaking: boolean }) => {
      setVoiceUsers(prev => prev.map(user => 
        user.id === data.userId 
          ? { 
              ...user, 
              isSpeaking: data.isSpeaking,
              lastSpeakTime: data.isSpeaking ? Date.now() : user.lastSpeakTime
            }
          : user
      ));
    };

    const handleVoiceMute = (data: { userId: string; isMuted: boolean }) => {
      setVoiceUsers(prev => prev.map(user => 
        user.id === data.userId ? { ...user, isMuted: data.isMuted } : user
      ));
    };

    const handleVoiceRoomState = (data: { voiceUsers: any[] }) => {
      const users = data.voiceUsers.map(u => ({
        id: u.userId,
        name: u.userName,
        color: u.userColor,
        isMuted: true,
        isSpeaking: false,
        lastSpeakTime: 0
      }));
      setVoiceUsers(users);
      if (isInCall && localStreamRef.current && hasJoinedVoiceRef.current) {
        users.forEach(user => {
          if (user.id !== userId) {
            createPeer(user.id, true, localStreamRef.current!);
          }
        });
      }
    };

    socket.on('voice-user-joined', handleVoiceUserJoined);
    socket.on('voice-user-left', handleVoiceUserLeft);
    socket.on('voice-signal', handleVoiceSignal);
    socket.on('voice-speaking', handleVoiceSpeaking);
    socket.on('voice-mute', handleVoiceMute);
    socket.on('voice-room-state', handleVoiceRoomState);

    return () => {
      socketListenersSetup.current = false;
      socket.off('voice-user-joined', handleVoiceUserJoined);
      socket.off('voice-user-left', handleVoiceUserLeft);
      socket.off('voice-signal', handleVoiceSignal);
      socket.off('voice-speaking', handleVoiceSpeaking);
      socket.off('voice-mute', handleVoiceMute);
      socket.off('voice-room-state', handleVoiceRoomState);
    };
  }, [socket, isConnected, userId, isInCall, createPeer, cleanupPeer]);

  useEffect(() => {
    return () => {
      hasJoinedVoiceRef.current = false;
      socketListenersSetup.current = false;
      leaveCall();
    };
  }, [leaveCall]);

  const sortedVoiceUsers = voiceUsers.sort((a, b) => {
    if (a.isSpeaking && !b.isSpeaking) return -1;
    if (!a.isSpeaking && b.isSpeaking) return 1;
    return b.lastSpeakTime - a.lastSpeakTime;
  });

  return {
    isInCall,
    isMuted,
    isSpeaking,
    voiceUsers: sortedVoiceUsers,
    error,
    joinCall,
    leaveCall,
    toggleMute,
    totalInCall: voiceUsers.length + (isInCall ? 1 : 0)
  };
};