import React, { useState, useEffect, useRef } from 'react';
import { Play, Mic, MicOff, Check, X, Music, Home } from 'lucide-react';

const FreePitch = () => {
  const [currentScreen, setCurrentScreen] = useState('home');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {currentScreen === 'home' && <HomeScreen setCurrentScreen={setCurrentScreen} />}
      {currentScreen === 'pitchTrainer' && <PitchTrainer setCurrentScreen={setCurrentScreen} />}
    </div>
  );
};

const HomeScreen = ({ setCurrentScreen }) => {
  const [snowflakes, setSnowflakes] = useState([]);

  useEffect(() => {
    // Create snowflakes
    const flakes = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDuration: 10 + Math.random() * 20,
      animationDelay: Math.random() * 10,
      size: 10 + Math.random() * 20,
      opacity: 0.5 + Math.random() * 0.5,
    }));
    setSnowflakes(flakes);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Snowflakes */}
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute top-0 text-white pointer-events-none"
          style={{
            left: `${flake.left}%`,
            fontSize: `${flake.size}px`,
            opacity: flake.opacity,
            animation: `fall ${flake.animationDuration}s linear infinite`,
            animationDelay: `${flake.animationDelay}s`,
          }}
        >
          ❄
        </div>
      ))}

      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
          }
        }
      `}</style>

      <div className="max-w-2xl w-full text-center relative z-10">
        <div className="mb-12">
          <h1 className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 mb-4">
            FreePitch
          </h1>
          <p className="text-xl text-gray-600">Free vocal training tools for everyone</p>
        </div>

        <div className="grid gap-6 md:grid-cols-1 max-w-md mx-auto">
          <button
            onClick={() => setCurrentScreen('pitchTrainer')}
            className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95 group"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full p-4 group-hover:scale-110 transition-transform">
                <Music className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Pitch Trainer</h2>
            <p className="text-gray-600">Practice matching pitches and improve your vocal accuracy</p>
          </button>
        </div>

        <div className="mt-12 text-gray-500 text-sm">
          More tools coming soon...
        </div>
      </div>
    </div>
  );
};

const PitchTrainer = ({ setCurrentScreen }) => {
  const [currentNote, setCurrentNote] = useState('C4');
  const [isListening, setIsListening] = useState(false);
  const [detectedPitch, setDetectedPitch] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [minNoteIndex, setMinNoteIndex] = useState(12); // C4
  const [maxNoteIndex, setMaxNoteIndex] = useState(23); // B4
  const [practiceMode, setPracticeMode] = useState('random'); // 'random' or 'specific'
  const [specificNote, setSpecificNote] = useState('C4');
  const [holdTimeRequired, setHoldTimeRequired] = useState(0); // 0 means instant pass
  const [holdTimeStart, setHoldTimeStart] = useState(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const animationFrameRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  const allNotes = [
    'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
    'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
    'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5'
  ];

  const noteFrequencies = {
    'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61,
    'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23,
    'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46,
    'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77
  };

  const playNote = (note) => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.value = noteFrequencies[note];
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.5);
  };

  const getRandomNote = () => {
    if (practiceMode === 'specific') {
      return specificNote;
    }
    const availableNotes = allNotes.slice(minNoteIndex, maxNoteIndex + 1);
    return availableNotes[Math.floor(Math.random() * availableNotes.length)];
  };

  const nextNote = () => {
    setCurrentNote(getRandomNote());
    setIsCorrect(null);
    setDetectedPitch(null);
    setHoldTimeStart(null);
    setHoldProgress(0);
  };

  const frequencyToNote = (frequency) => {
    const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    const roundedNote = Math.round(noteNum) + 69;
    const octave = Math.floor(roundedNote / 12) - 1;
    const noteName = notes[roundedNote % 12];
    return noteName + octave;
  };

  const autoCorrelate = (buffer, sampleRate) => {
    let size = buffer.length;
    let maxSamples = Math.floor(size / 2);
    let bestOffset = -1;
    let bestCorrelation = 0;
    let rms = 0;

    for (let i = 0; i < size; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / size);
    
    if (rms < 0.01) return -1;

    let lastCorrelation = 1;
    for (let offset = 1; offset < maxSamples; offset++) {
      let correlation = 0;
      for (let i = 0; i < maxSamples; i++) {
        correlation += Math.abs(buffer[i] - buffer[i + offset]);
      }
      correlation = 1 - correlation / maxSamples;
      
      if (correlation > 0.9 && correlation > lastCorrelation) {
        const foundGoodCorrelation = correlation > bestCorrelation;
        if (foundGoodCorrelation) {
          bestCorrelation = correlation;
          bestOffset = offset;
        }
      }
      lastCorrelation = correlation;
    }
    
    if (bestCorrelation > 0.01) {
      return sampleRate / bestOffset;
    }
    return -1;
  };

  const detectPitch = () => {
    if (!analyser) return;

    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);
    
    const frequency = autoCorrelate(buffer, audioContext.sampleRate);
    
    if (frequency > 0) {
      const detected = frequencyToNote(frequency);
      setDetectedPitch(detected);
      
      if (detected === currentNote) {
        setIsCorrect(true);
        
        // Handle hold time
        if (holdTimeRequired === 0) {
          // Instant pass
          setTimeout(() => nextNote(), 1500);
        } else {
          // Need to hold the note
          if (holdTimeStart === null) {
            setHoldTimeStart(Date.now());
          } else {
            const elapsed = (Date.now() - holdTimeStart) / 1000;
            setHoldProgress(Math.min((elapsed / holdTimeRequired) * 100, 100));
            
            if (elapsed >= holdTimeRequired) {
              setTimeout(() => nextNote(), 500);
            }
          }
        }
      } else {
        setIsCorrect(false);
        setHoldTimeStart(null);
        setHoldProgress(0);
      }
    } else {
      // No pitch detected, reset hold time
      if (holdTimeStart !== null) {
        setHoldTimeStart(null);
        setHoldProgress(0);
      }
    }

    animationFrameRef.current = requestAnimationFrame(detectPitch);
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 2048;
      
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyserNode);
      
      setAudioContext(ctx);
      setAnalyser(analyserNode);
      setIsListening(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Please allow microphone access to use pitch detection.');
    }
  };

  const stopListening = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContext) {
      audioContext.close();
    }
    setIsListening(false);
    setAnalyser(null);
    setAudioContext(null);
    setDetectedPitch(null);
    setIsCorrect(null);
    setHoldTimeStart(null);
    setHoldProgress(0);
  };

  useEffect(() => {
    if (isListening && analyser) {
      detectPitch();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isListening, analyser, currentNote]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => {
              stopListening();
              setCurrentScreen('home');
            }}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">Home</span>
          </button>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            FreePitch
          </h1>
          <div className="w-20"></div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Pitch Trainer</h2>
          <p className="text-gray-600">Sing the note and match the pitch</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-6">
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <div className="flex justify-center space-x-2 mb-3">
              <button
                onClick={() => setPracticeMode('random')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  practiceMode === 'random'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                Random Notes
              </button>
              <button
                onClick={() => {
                  setPracticeMode('specific');
                  setCurrentNote(specificNote);
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  practiceMode === 'specific'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                Specific Note
              </button>
            </div>

            {practiceMode === 'random' ? (
              <>
                <h3 className="text-sm font-semibold text-gray-700 text-center">Note Range</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Min: {allNotes[minNoteIndex]}</span>
                    <span>Max: {allNotes[maxNoteIndex]}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="35"
                      value={minNoteIndex}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val < maxNoteIndex) setMinNoteIndex(val);
                      }}
                      className="w-full h-2 bg-gradient-to-r from-indigo-200 to-purple-300 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #818cf8 0%, #818cf8 ${(minNoteIndex/35)*100}%, #e0e7ff ${(minNoteIndex/35)*100}%, #e0e7ff 100%)`
                      }}
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="35"
                      value={maxNoteIndex}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val > minNoteIndex) setMaxNoteIndex(val);
                      }}
                      className="w-full h-2 bg-gradient-to-r from-purple-200 to-pink-300 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #c084fc 0%, #c084fc ${(maxNoteIndex/35)*100}%, #fae8ff ${(maxNoteIndex/35)*100}%, #fae8ff 100%)`
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-gray-700 text-center">Select Note to Practice</h3>
                <select
                  value={specificNote}
                  onChange={(e) => {
                    setSpecificNote(e.target.value);
                    setCurrentNote(e.target.value);
                  }}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-center text-lg font-semibold text-gray-700 focus:border-indigo-500 focus:outline-none"
                >
                  {allNotes.map((note) => (
                    <option key={note} value={note}>
                      {note}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 text-center">Hold Time (Optional)</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>{holdTimeRequired === 0 ? 'Instant Pass' : `Hold for ${holdTimeRequired}s`}</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={holdTimeRequired}
                onChange={(e) => setHoldTimeRequired(parseFloat(e.target.value))}
                className="w-full h-2 bg-gradient-to-r from-green-200 to-green-400 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #86efac 0%, #86efac ${(holdTimeRequired/5)*100}%, #dcfce7 ${(holdTimeRequired/5)*100}%, #dcfce7 100%)`
                }}
              />
              <div className="text-xs text-center text-gray-500">
                {holdTimeRequired === 0 ? 'Note passes immediately when matched' : `Must hold the correct note for ${holdTimeRequired} seconds`}
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="inline-block bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 mb-4 transform transition-all duration-300 hover:scale-105">
              <div className="text-7xl font-bold text-white">
                {currentNote}
              </div>
            </div>
            
            {detectedPitch && (
              <div className="mt-4 flex items-center justify-center space-x-2">
                <span className="text-gray-600">You sang:</span>
                <span className="text-2xl font-semibold text-gray-800">{detectedPitch}</span>
                {isCorrect !== null && (
                  isCorrect ? 
                    <Check className="text-green-500 w-6 h-6" /> : 
                    <X className="text-red-500 w-6 h-6" />
                )}
              </div>
            )}

            {/* Hold progress bar */}
            {isCorrect && holdTimeRequired > 0 && holdProgress > 0 && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-100"
                    style={{ width: `${holdProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Hold for {(holdTimeRequired - (holdProgress / 100 * holdTimeRequired)).toFixed(1)}s more...
                </p>
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => playNote(currentNote)}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl py-4 font-semibold flex items-center justify-center space-x-2 hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 active:scale-95"
            >
              <Play className="w-5 h-5" />
              <span>Play Note</span>
            </button>

            <button
              onClick={isListening ? stopListening : startListening}
              className={`flex-1 rounded-xl py-4 font-semibold flex items-center justify-center space-x-2 transition-all transform hover:scale-105 active:scale-95 ${
                isListening
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                  : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <span>{isListening ? 'Stop' : 'Start'}</span>
            </button>
          </div>

          <button
            onClick={nextNote}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl py-4 font-semibold hover:from-purple-600 hover:to-pink-700 transition-all transform hover:scale-105 active:scale-95"
          >
            {practiceMode === 'random' ? 'Next Note' : 'Refresh'}
          </button>

          {isCorrect === true && holdTimeRequired === 0 && (
            <div className="text-center text-green-600 font-semibold animate-pulse">
              ✨ Perfect! Moving to next note...
            </div>
          )}

          {isCorrect === true && holdTimeRequired > 0 && holdProgress >= 100 && (
            <div className="text-center text-green-600 font-semibold animate-pulse">
              ✨ Perfect hold! Moving to next note...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FreePitch;
