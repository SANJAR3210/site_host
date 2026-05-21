import React, { useState, useRef, useEffect, useCallback } from 'react';
import './index.css';

// === ИКОНКИ (без изменений) ===
const IconMic = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>;
const IconStop = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>;
const IconGuitar = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5-1-1"></path><path d="m15 5 1-1"></path><path d="M18.384 18.384a2 2 0 0 0 2.828-2.828c-5.657-5.657-14.142-5.657-19.8 0a2 2 0 0 0 2.828 2.828c4.243-4.243 11.314-4.243 14.142 0Z"></path><path d="M12 15v6"></path><path d="M12 3v9"></path></svg>;
const IconSearch = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const IconSave = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;
const IconTrash = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const IconCopy = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>;
const IconDownload = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const IconVolume = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>;
const IconVolumeX = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>;

// === ИСПРАВЛЕННЫЕ УТИЛИТЫ АУДИО ===

// Гитарный диапазон: 6-я струна (Ми) ~82 Гц, 1-я струна (Ми) ~330 Гц + обертоны до ~1000 Гц
const GUITAR_MIN_FREQ = 75;
const GUITAR_MAX_FREQ = 1000;
const CONFIDENCE_THRESHOLD = 0.8;
const STABILITY_COUNT = 12;

const autoCorrelate = (buf, sampleRate) => {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  
  // Повышенный порог шума для гитары
  if (rms < 0.025) return -1;
  
  // Обрезаем тишину по краям
  let r1 = 0, r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  
  const trimmed = buf.slice(r1, r2);
  const TSIZE = trimmed.length;
  if (TSIZE < 50) return -1;
  
  // Автокорреляция
  const c = new Float32Array(TSIZE);
  for (let i = 0; i < TSIZE; i++) {
    for (let j = 0; j < TSIZE - i; j++) {
      c[i] += trimmed[j] * trimmed[j + i];
    }
  }
  
  // Поиск пика
  let d = 0;
  while (d < TSIZE - 1 && c[d] > c[d + 1]) d++;
  
  let maxval = -1, maxpos = -1;
  for (let i = d; i < TSIZE; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  
  if (maxpos <= 0 || maxpos >= TSIZE - 1) return -1;
  
  // Интерполяция пика для точности
  const x1 = c[maxpos - 1], x2 = c[maxpos], x3 = c[maxpos + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  let T0 = maxpos;
  if (Math.abs(a) > 0.0001) T0 -= b / (2 * a);
  
  const freq = sampleRate / T0;
  const confidence = maxval / (c[0] || 1);
  
  // Дополнительная проверка: отбрасываем слабые сигналы и не-гитарные частоты
  if (confidence < CONFIDENCE_THRESHOLD) return -1;
  if (freq < GUITAR_MIN_FREQ || freq > GUITAR_MAX_FREQ) return -1;
  
  return freq;
};

const getNoteFromFrequency = (frequency) => {
  const noteStrings = ["До", "До#", "Ре", "Ре#", "Ми", "Фа", "Фа#", "Соль", "Соль#", "Ля", "Ля#", "Си"];
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  const noteIndex = Math.round(noteNum) + 69;
  
  // Ограничиваем диапазон для гитары (примерно 40-84 MIDI)
  if (noteIndex < 40 || noteIndex > 96) return { note: "--", cents: 0, octave: 0, valid: false };
  
  const note = noteStrings[noteIndex % 12];
  const octave = Math.floor(noteIndex / 12) - 1;
  const expectedFreq = 440 * Math.pow(2, (noteIndex - 69) / 12);
  const cents = Math.round(1200 * Math.log(frequency / expectedFreq) / Math.log(2));
  
  // Отбрасываем ноты с большим отклонением (>50 центов)
  if (Math.abs(cents) > 50) return { note: "--", cents: 0, octave: 0, valid: false };
  
  return { note, cents, octave, valid: true };
};

const detectChord = (frequencies) => {
  if (frequencies.length < 2) return null;
  const notes = [...new Set(frequencies.map(f => getNoteFromFrequency(f).note).filter(n => n !== '--'))];
  if (notes.length < 2) return null;
  
  const chordPatterns = { '': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'm7': [0, 3, 7, 10], 'maj7': [0, 4, 7, 11] };
  const noteToSemitone = { "До": 0, "До#": 1, "Ре": 2, "Ре#": 3, "Ми": 4, "Фа": 5, "Фа#": 6, "Соль": 7, "Соль#": 8, "Ля": 9, "Ля#": 10, "Си": 11 };
  
  for (const [suffix, pattern] of Object.entries(chordPatterns)) {
    for (const rootNote of notes) {
      const rootSemitone = noteToSemitone[rootNote];
      const expectedNotes = pattern.map(interval => {
        const semitone = (rootSemitone + interval) % 12;
        return Object.keys(noteToSemitone).find(n => noteToSemitone[n] === semitone);
      });
      const matches = expectedNotes.filter(n => notes.includes(n)).length;
      if (matches >= Math.min(3, expectedNotes.length) && matches >= notes.length - 1) return `${rootNote}${suffix}`;
    }
  }
  return null;
};

// === КОМПОНЕНТ ФОНА (ЗВЕЗДЫ) — без изменений ===
const StarryBackground = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const stars = Array.from({ length: 100 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2,
      speed: Math.random() * 0.5 + 0.1
    }));

    let animationId;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      stars.forEach(star => {
        ctx.globalAlpha = Math.random() * 0.5 + 0.3;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        star.y -= star.speed;
        if (star.y < 0) star.y = height;
      });
      animationId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  return <canvas ref={canvasRef} className="star-bg" />;
};

// === ВИЗУАЛИЗАТОР — без изменений ===
const SimpleVisualizer = ({ analyser, isListening }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!analyser || !isListening) return;
    const canvas = canvasRef.current, ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount, dataArray = new Uint8Array(bufferLength);
    let animationId;
    const draw = () => {
      animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5; 
      let x = 0;
      
      const average = dataArray.reduce((a,b)=>a+b,0)/bufferLength;
      const hue = (Date.now() / 50) % 360; 

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 1.2;
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        
        gradient.addColorStop(0, `hsla(${hue}, 80%, 40%, 0.8)`); 
        gradient.addColorStop(1, `hsla(${hue + 40}, 90%, 70%, 1)`);
        
        ctx.fillStyle = gradient; 
        ctx.beginPath();
        ctx.roundRect?.(x, canvas.height - barHeight, barWidth - 2, barHeight, 4) || ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        ctx.fill();
        x += barWidth;
      }
    };
    draw(); return () => cancelAnimationFrame(animationId);
  }, [analyser, isListening]);
  return <canvas ref={canvasRef} width={600} height={100} className="visualizer-container" />;
};

// === ТЮНЕР — минимальные правки ===
const TunerView = () => {
  const [note, setNote] = useState({ note: "--", cents: 0, octave: 0 });
  const [frequency, setFrequency] = useState(0);
  const [chord, setChord] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const audioCtxRef = useRef(null), analyserRef = useRef(null), sourceRef = useRef(null), rafRef = useRef(null), frequencyHistoryRef = useRef([]);
  const oscRef = useRef(null);

  const playTuningBeep = useCallback((cents) => {
    if (!soundEnabled || !audioCtxRef.current) return;
    if (Math.abs(cents) < 10) {
      if (!oscRef.current) {
        const ctx = audioCtxRef.current;
        oscRef.current = ctx.createOscillator();
        const gain = ctx.createGain();
        oscRef.current.connect(gain);
        gain.connect(ctx.destination);
        oscRef.current.type = 'sine';
        oscRef.current.frequency.value = 880;
        gain.gain.value = 0.1;
        oscRef.current.start();
      }
    } else {
      if (oscRef.current) {
        oscRef.current.stop();
        oscRef.current = null;
      }
    }
  }, [soundEnabled]);

  const processAudio = useCallback(() => {
    if (!analyserRef.current || !audioCtxRef.current) return;
    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) sum += Math.abs(buffer[i]);
    const currentVolume = sum / buffer.length;
    
    const freq = autoCorrelate(buffer, audioCtxRef.current.sampleRate);
    
    if (freq !== -1) {
      frequencyHistoryRef.current.push(freq);
      if (frequencyHistoryRef.current.length > 7) frequencyHistoryRef.current.shift();
      
      // Используем медиану для стабильности
      const sorted = [...frequencyHistoryRef.current].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      
      const noteData = getNoteFromFrequency(median);
      
      if (noteData.valid) {
        setFrequency(Math.round(median)); 
        setNote(noteData);
        playTuningBeep(noteData.cents);

        if (frequencyHistoryRef.current.length >= 4) { 
          const detected = detectChord(frequencyHistoryRef.current); 
          if (detected) setChord(detected); 
        }
      }
    } else if (currentVolume < 0.02) { 
      setNote({ note: "--", cents: 0, octave: 0 }); 
      setFrequency(0); 
      setChord(null); 
      frequencyHistoryRef.current = []; 
      if(oscRef.current) { oscRef.current.stop(); oscRef.current = null; }
    }
    rafRef.current = requestAnimationFrame(processAudio);
  }, [playTuningBeep]);
  
  const startListening = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096; 
      analyserRef.current.smoothingTimeConstant = 0.2;
      sourceRef.current = audioCtxRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      setIsListening(true); 
      frequencyHistoryRef.current = []; 
      processAudio();
    } catch (err) { 
      console.error("Audio error:", err); 
      setError(err.name === 'NotAllowedError' ? 'Доступ к микрофону запрещен' : 'Ошибка аудио'); 
    }
  };
  
  const stopListening = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current.mediaStream.getTracks().forEach(track => track.stop()); }
    if (audioCtxRef.current) audioCtxRef.current.close();
    if(oscRef.current) { oscRef.current.stop(); oscRef.current = null; }
    setIsListening(false); 
    setNote({ note: "--", cents: 0, octave: 0 }); 
    setFrequency(0); 
    setChord(null); 
    frequencyHistoryRef.current = [];
  };
  
  useEffect(() => { return () => { if (isListening) stopListening(); }; }, []);
  
  const isInTune = note.note !== '--' && Math.abs(note.cents) < 10;

  return (
    <div className="view-container">
      <div className={`tuner-card ${isInTune ? 'in-tune-glow' : ''}`}>
        <div className="settings-row">
           <button className="icon-btn" onClick={() => setSoundEnabled(!soundEnabled)} title="Звук настройки">
             {soundEnabled ? <IconVolume /> : <IconVolumeX />}
           </button>
        </div>

        <div className={`note-display ${note.note === '--' ? 'inactive' : ''}`}>
          <span className="note-name">{note.note}</span>
          <span className="note-octave">{note.octave}</span>
        </div>
        
        <div className="strobe-container">
            <div className={`strobe-bar ${isInTune ? 'active' : ''}`} style={{ transform: `translateX(${note.cents * 2}px)` }}></div>
            <div className="center-marker"></div>
        </div>

        <div className="tuner-details">
          <div className="frequency">{frequency > 0 ? `${frequency} Гц` : '...'}</div>
          {note.note !== '--' && (
            <div className={`cents-text ${isInTune ? 'text-success' : ''}`}>
              {note.cents > 0 ? '+' : ''}{note.cents}
            </div>
          )}
        </div>

        {chord && <div className="chord-pill active">Аккорд: {chord}</div>}
        {error && <div className="chord-pill error">{error}</div>}

        <SimpleVisualizer analyser={analyserRef.current} isListening={isListening} />

        <button 
          className={`main-btn ${isListening ? 'btn-stop' : 'btn-start'}`} 
          onClick={isListening ? stopListening : startListening}
        >
          {isListening ? <><IconStop /> Стоп</> : <><IconMic /> Слушать</>}
        </button>
      </div>
    </div>
  );
};

// === ПОИСК — без изменений ===
const SearchView = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setStatus('loading');
    setResults([]);
    try {
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=15`;
      const response = await fetch(itunesUrl);
      const data = await response.json();
      let tracks = [];
      if (data.results) {
        tracks = data.results.map(item => ({
          title: item.trackName,
          artist: item.artistName,
          cover: item.artworkUrl100?.replace('100x100', '400x400') || '',
          url: item.trackViewUrl || '#'
        }));
      }
      setResults(tracks);
      setStatus(tracks.length > 0 ? 'success' : 'empty');
    } catch (err) { setStatus('error'); }
  };

  return (
    <div className="view-container search-view">
      <h2 className="section-title">Поиск Музыки</h2>
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найти трек или артиста..."
          className="search-input"
          disabled={status === 'loading'}
        />
        <button type="submit" className="search-btn" disabled={status === 'loading'}>
          {status === 'loading' ? <span className="loader"></span> : <IconSearch />}
        </button>
      </form>
      
      {status === 'empty' && <div className="empty-state">Ничего не найдено 😔</div>}
      
      <div className="results-list">
        {results.map((track, index) => (
          <a key={index} href={track.url} target="_blank" rel="noopener noreferrer" className="result-card">
            <img src={track.cover} alt={track.title} className="cover-img" onError={(e) => { e.target.style.display='none'; }} />
            <div className="track-info">
              <h4>{track.title}</h4>
              <p>{track.artist}</p>
            </div>
            <div className="play-icon">▶</div>
          </a>
        ))}
      </div>
    </div>
  );
};

// === ГИТАРА / АККОРДЫ — исправлена логика захвата нот ===
const GuitarView = () => {
  const [savedSongs, setSavedSongs] = useState(() => {
    try { const stored = localStorage.getItem('octave_songs'); return stored ? JSON.parse(stored) : []; } catch { return []; }
  });
  const [newSongName, setNewSongName] = useState('');
  const [currentChords, setCurrentChords] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [lastDetectedNote, setLastDetectedNote] = useState(null);
  const [detectionError, setDetectionError] = useState(null);
  const audioCtxRef = useRef(null), analyserRef = useRef(null), sourceRef = useRef(null), rafRef = useRef(null);
  const lastDetectedNoteRef = useRef(null), noteStabilityCounterRef = useRef(0), freqHistoryRef = useRef([]);

  const startRecording = async () => {
    try {
      setDetectionError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096; 
      analyserRef.current.smoothingTimeConstant = 0.2;
      sourceRef.current = audioCtxRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      setIsRecording(true); 
      lastDetectedNoteRef.current = null; 
      noteStabilityCounterRef.current = 0;
      freqHistoryRef.current = [];
      processGuitarAudio();
    } catch (err) { 
      setDetectionError('Нет доступа к микрофону'); 
    }
  };

  const stopRecording = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current.mediaStream.getTracks().forEach(track => track.stop()); }
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    setIsRecording(false); 
    setLastDetectedNote(null);
  };

  const processGuitarAudio = () => {
    if (!analyserRef.current || !audioCtxRef.current) return;
    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);
    
    let rms = 0;
    for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i];
    rms = Math.sqrt(rms / buffer.length);
    
    if (rms < 0.025) { 
      noteStabilityCounterRef.current = 0; 
      freqHistoryRef.current = [];
      rafRef.current = requestAnimationFrame(processGuitarAudio); 
      return; 
    }
    
    const freq = autoCorrelate(buffer, audioCtxRef.current.sampleRate);
    
    if (freq !== -1) {
      // Накопление частот для медианного фильтра
      freqHistoryRef.current.push(freq);
      if (freqHistoryRef.current.length > 9) freqHistoryRef.current.shift();
      
      // Медиана для подавления выбросов
      const sorted = [...freqHistoryRef.current].sort((a, b) => a - b);
      const medianFreq = sorted[Math.floor(sorted.length / 2)];
      
      const { note, cents, valid } = getNoteFromFrequency(medianFreq);
      
      if (valid && note !== '--') {
        if (note === lastDetectedNoteRef.current) {
          noteStabilityCounterRef.current++;
          // Добавляем ноту только после стабильного удержания
          if (noteStabilityCounterRef.current >= STABILITY_COUNT) {
            setCurrentChords(prev => { 
              if (prev.length === 0 || prev[prev.length - 1] !== note) {
                return [...prev, note]; 
              }
              return prev; 
            });
            noteStabilityCounterRef.current = 0;
            freqHistoryRef.current = []; // Сброс после захвата
          }
        } else { 
          lastDetectedNoteRef.current = note; 
          noteStabilityCounterRef.current = 1; 
          setLastDetectedNote(note); 
        }
      }
    } else {
      noteStabilityCounterRef.current = 0;
    }
    rafRef.current = requestAnimationFrame(processGuitarAudio);
  };

  const saveSong = () => {
    if (!newSongName.trim() || currentChords.length === 0) return;
    const song = { id: Date.now(), name: newSongName.trim(), chords: [...currentChords], date: new Date().toISOString() };
    const updated = [...savedSongs, song];
    setSavedSongs(updated); 
    localStorage.setItem('octave_songs', JSON.stringify(updated));
    setNewSongName(''); 
    setCurrentChords([]); 
    lastDetectedNoteRef.current = null; 
    setLastDetectedNote(null);
    freqHistoryRef.current = [];
    noteStabilityCounterRef.current = 0;
  };

  const deleteSong = (id) => { 
    const updated = savedSongs.filter(s => s.id !== id); 
    setSavedSongs(updated); 
    localStorage.setItem('octave_songs', JSON.stringify(updated)); 
  };

  const exportSong = (song) => {
    const content = `Композиция: ${song.name}\nДата: ${new Date(song.date).toLocaleDateString()}\n\nАккорды:\n${song.chords.join(' - ')}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `${song.name}.txt`; 
    document.body.appendChild(a); 
    a.click(); 
    document.body.removeChild(a); 
    URL.revokeObjectURL(url);
  };

  useEffect(() => { return () => { stopRecording(); }; }, []);

  return (
    <div className="view-container guitar-view">
      <div className="recorder-panel glass-panel">
        <input 
          type="text" 
          value={newSongName} 
          onChange={(e) => setNewSongName(e.target.value)} 
          placeholder="Название композиции..." 
          className="song-name-input" 
          onKeyDown={(e) => e.key === 'Enter' && saveSong()} 
        />
        
        <div className="controls-row">
          <button className={`control-btn ${isRecording ? 'btn-stop' : 'btn-start'}`} onClick={isRecording ? stopRecording : startRecording}>
            {isRecording ? <><IconStop /> Стоп</> : <><IconMic /> Запись</>}
          </button>
          <button className="control-btn btn-save" onClick={saveSong} disabled={!newSongName.trim() || currentChords.length === 0}>
            <IconSave /> Сохранить
          </button>
          {currentChords.length > 0 && (
            <button className="control-btn btn-secondary" onClick={() => setCurrentChords([])}>Сброс</button>
          )}
        </div>

        {detectionError && <div className="error-msg">{detectionError}</div>}

        {isRecording && (
          <div className="listening-status">
            <span className="pulse-dot"></span>
            <span>Слушаю... {lastDetectedNote && <strong className="highlight-note">{lastDetectedNote}</strong>}</span>
          </div>
        )}

        {currentChords.length > 0 && (
          <div className="progression-container">
            <div className="progression-header">
              <span>Прогрессия</span>
              <button className="copy-btn" onClick={() => navigator.clipboard.writeText(currentChords.join(' '))}>
                <IconCopy /> Копировать
              </button>
            </div>
            <div className="chords-grid">
              {currentChords.map((chord, idx) => (
                <span key={idx} className="chord-tag">{chord}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {savedSongs.length > 0 && (
        <div className="saved-songs-section">
          <div className="section-header">
            <h3>Мои Композиции</h3>
            <button onClick={() => { if(window.confirm('Удалить всё?')) { setSavedSongs([]); localStorage.removeItem('octave_songs'); } }} className="text-btn danger">
              Очистить
            </button>
          </div>
          <div className="songs-grid">
            {savedSongs.slice().reverse().map(song => (
              <div key={song.id} className="song-card-item glass-panel">
                <div className="song-header">
                  <h4>{song.name}</h4>
                  <div className="song-actions">
                    <button onClick={() => exportSong(song)} title="Скачать"><IconDownload /></button>
                    <button onClick={() => deleteSong(song.id)} className="danger" title="Удалить"><IconTrash /></button>
                  </div>
                </div>
                <div className="mini-chords">
                  {song.chords.slice(0, 6).map((c, i) => <span key={i}>{c}</span>)}
                  {song.chords.length > 6 && <span>+{song.chords.length - 6}</span>}
                </div>
                <div className="song-meta">
                  {new Date(song.date).toLocaleDateString()} • {song.chords.length} аккордов
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {savedSongs.length === 0 && currentChords.length === 0 && (
        <div className="empty-state-large">
          <IconGuitar />
          <p>Включите запись и сыграйте что-нибудь</p>
        </div>
      )}
    </div>
  );
};

function App() {
  const [view, setView] = useState('tuner');
  return (
    <div className="app-wrapper">
      <StarryBackground />
      <header className="app-header glass-header">
        <div className="logo">OCTAVE</div>
        <nav className="top-nav">
          <button className={view === 'tuner' ? 'active' : ''} onClick={() => setView('tuner')}>Тюнер</button>
          <button className={view === 'guitar' ? 'active' : ''} onClick={() => setView('guitar')}>Запись</button>
          <button className={view === 'search' ? 'active' : ''} onClick={() => setView('search')}>Поиск</button>
        </nav>
      </header>
      
      <main className="app-main">
        {view === 'tuner' && <TunerView />}
        {view === 'search' && <SearchView />}
        {view === 'guitar' && <GuitarView />}
      </main>
    </div>
  );
}

export default App;