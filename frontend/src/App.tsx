import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const API_URL = 'http://localhost:8000';

function App() {
  // Auth states
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  
  // Signup states
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupError, setSignupError] = useState('');
  
  // Onboarding states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingText, setOnboardingText] = useState('');
  const [onboardingFile, setOnboardingFile] = useState<File | null>(null);
  const [onboardingVoice, setOnboardingVoice] = useState<File | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState('');
  const [voiceInputMode, setVoiceInputMode] = useState<'manual' | 'speech' | 'none'>('manual');
  
  // Dashboard states
  const [patients, setPatients] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'reports' | 'health'>('health'); // Default to health for existing users
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [profileEdit, setProfileEdit] = useState({
    name: '',
    age: '',
    address: '',
    phone: '',
    notes: ''
  });
  const [profileMsg, setProfileMsg] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Reports states
  const [reports, setReports] = useState<any[]>([]);
  const [reportMsg, setReportMsg] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  
  // Medicines states
  const [medicines, setMedicines] = useState<any[]>([]);
  const [medMsg, setMedMsg] = useState('');
  const [medLoading, setMedLoading] = useState(false);
  const [medForm, setMedForm] = useState({
    name: '',
    dosage: '',
    frequency: '',
    time: '',
    notes: ''
  });
  const [medEditId, setMedEditId] = useState<string | null>(null);
  
  // Appointments states
  const [appointments, setAppointments] = useState<any[]>([]);
  const [appMsg, setAppMsg] = useState('');
  const [appLoading, setAppLoading] = useState(false);
  const [appForm, setAppForm] = useState({
    title: '',
    date: '',
    time: '',
    doctor: '',
    notes: ''
  });
  const [appEditId, setAppEditId] = useState<string | null>(null);
  
  // Logs and calendar states
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  
  // AI states
  const [aiExtractedInfo, setAiExtractedInfo] = useState<any>(null);
  const [showAiResults, setShowAiResults] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [medicineRecommendations, setMedicineRecommendations] = useState<any>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  
  // NLX Voice Agent states
  const [voiceAgentActive, setVoiceAgentActive] = useState(false);
  const [voiceAgentListening, setVoiceAgentListening] = useState(false);
  const [voiceAgentTranscript, setVoiceAgentTranscript] = useState('');
  const [voiceAgentResponse, setVoiceAgentResponse] = useState('');
  const [voiceAgentProcessing, setVoiceAgentProcessing] = useState(false);
  const [voiceAgentHistory, setVoiceAgentHistory] = useState<Array<{role: string, content: string}>>([]);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  // Fetch patient data when selected patient changes (for doctor/caregiver view)
  useEffect(() => {
    if (user && (user.role === 'doctor' || user.role === 'caregiver') && selectedPatient) {
      fetchPatientData(selectedPatient._id);
    }
  }, [user, selectedPatient]);

  // Voice recording functions
  const startRecording = async () => {
    try {
      // Reset states
      setVoiceInputMode('speech');
      setLiveTranscription('');
      setTranscription('');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start audio recording
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Try speech recognition
      await startSpeechRecognition();
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setVoiceInputMode('manual');
      alert('Microphone access failed. Please use manual text input.');
    }
  };

  const startSpeechRecognition = async () => {
    try {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
          setIsListening(true);
          setLiveTranscription('');
          console.log('Speech recognition started successfully');
        };
        
        recognition.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          const fullTranscript = finalTranscript + interimTranscript;
          setLiveTranscription(fullTranscript);
        };
        
        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          setVoiceInputMode('manual');
          setLiveTranscription('Speech recognition failed. Please use manual input below.');
        };
        
        recognition.onend = () => {
          setIsListening(false);
          console.log('Speech recognition ended');
        };
        
        recognition.start();
      } else {
        console.log('Speech recognition not supported');
        setVoiceInputMode('manual');
        setLiveTranscription('Speech recognition not supported. Please use manual input below.');
      }
    } catch (speechError) {
      console.error('Speech recognition failed:', speechError);
      setVoiceInputMode('manual');
      setLiveTranscription('Speech recognition failed. Please use manual input below.');
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
    }
    
    // Stop speech recognition
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    
    // If we have recorded audio, try Google Speech-to-Text
    if (audioBlob && !liveTranscription.trim()) {
      try {
        setIsTranscribing(true);
        const transcript = await transcribeWithGoogle(audioBlob);
        setLiveTranscription(transcript);
        console.log('Google Speech-to-Text result:', transcript);
      } catch (error) {
        console.error('Google transcription failed:', error);
        setVoiceInputMode('manual');
        setLiveTranscription('Voice transcription failed. Please use manual input below.');
      } finally {
        setIsTranscribing(false);
      }
    }
    
    // If no speech input was captured, switch to manual mode
    if (!liveTranscription.trim() || liveTranscription.includes('failed') || liveTranscription.includes('not supported')) {
      setVoiceInputMode('manual');
      if (!liveTranscription.trim()) {
        setLiveTranscription('');
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const transcribeAudio = async () => {
    const inputText = liveTranscription.trim();
    
    if (!inputText) {
      alert('Please enter your information in the text area above.');
      return;
    }
    
    // Check for error messages
    if (inputText.includes('failed') || inputText.includes('not supported') || inputText.includes('Please use manual input')) {
      alert('Please enter your actual information in the text area, not the error message.');
      return;
    }
    
    setIsTranscribing(true);
    try {
      const extractedInfo = extractKeyInfo(inputText);
      setTranscription(extractedInfo);
    } catch (error) {
      console.error('Error processing input:', error);
      setTranscription('Error processing your input. Please try again with clearer information.');
    } finally {
        setIsTranscribing(false);
    }
  };

  // Google Speech-to-Text transcription
  const transcribeWithGoogle = async (audioBlob: Blob): Promise<string> => {
    try {
      // Convert audio blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
      
      // Prepare the request for Google Speech-to-Text API
      const requestBody = {
        config: {
          encoding: 'WEBM_OPUS', // or 'LINEAR16' depending on your audio format
          sampleRateHertz: 48000,
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: false,
          enableWordConfidence: false,
        },
        audio: {
          content: base64Audio
        }
      };

      // You'll need to set up a backend endpoint to handle Google Speech-to-Text API calls
      // This is because the API key should not be exposed in the frontend
      const response = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const result = await response.json();
      
      if (result.transcript) {
        return result.transcript;
      } else {
        throw new Error('No transcript received');
      }
      
    } catch (error) {
      console.error('Google Speech-to-Text error:', error);
      throw new Error('Voice transcription failed. Please use manual input.');
    }
  };

  // Function to process audio data and extract text
  const processAudioData = async (audioData: string): Promise<string> => {
    // This is a simplified version - in production you'd use a real speech-to-text service
    // For now, we'll simulate processing based on audio characteristics
    
    try {
      // Create a temporary audio element to analyze the recording
      const audio = new Audio();
      const blob = new Blob([audioBlob!], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      audio.src = url;
      
      // Simulate processing time based on audio duration
      await new Promise(resolve => {
        audio.addEventListener('loadedmetadata', () => {
          const duration = audio.duration;
          // Simulate processing time proportional to audio length
          setTimeout(resolve, Math.min(duration * 1000, 3000));
        });
        audio.addEventListener('error', () => resolve);
      });
      
      // For demo purposes, return a template that the user can modify
      // In a real app, this would be the actual transcribed text
      return "Please speak clearly about your medical information. For example: 'My name is [Your Name], I'm [Age] years old, I live at [Address], my phone is [Phone], I have [Medical Conditions], I take [Medications], I see Dr. [Doctor Name]'";
      
    } catch (error) {
      return "Audio processing failed. Please try recording again or use text input.";
    }
  };

  // Function to extract key information from voice input
  const extractKeyInfo = (voiceText: string): string => {
    const info: any = {};
    
    // Extract name
    const nameMatch = voiceText.match(/my name is ([^,]+)/i) || voiceText.match(/i'm ([^,]+)/i) || voiceText.match(/i am ([^,]+)/i);
    if (nameMatch) info.name = nameMatch[1].trim();
    
    // Extract age
    const ageMatch = voiceText.match(/(\d+)\s*years?\s*old/i) || voiceText.match(/age\s*(\d+)/i);
    if (ageMatch) info.age = ageMatch[1];
    
    // Extract address
    const addressMatch = voiceText.match(/live at ([^.]+)/i) || voiceText.match(/address is ([^.]+)/i);
    if (addressMatch) info.address = addressMatch[1].trim();
    
    // Extract phone
    const phoneMatch = voiceText.match(/(\d{3}[-.]?\d{3}[-.]?\d{4})/);
    if (phoneMatch) info.phone = phoneMatch[1];
    
    // Extract medical conditions
    const conditions = [];
    if (voiceText.match(/diabetes/i)) conditions.push('Diabetes');
    if (voiceText.match(/hypertension/i)) conditions.push('Hypertension');
    if (voiceText.match(/heart disease/i)) conditions.push('Heart Disease');
    if (voiceText.match(/asthma/i)) conditions.push('Asthma');
    if (voiceText.match(/arthritis/i)) conditions.push('Arthritis');
    if (conditions.length > 0) info.conditions = conditions;
    
    // Extract medications
    const medications = [];
    const medMatches = voiceText.match(/(?:take|taking|medication|medicine)\s+([^.]+)/gi);
    if (medMatches) {
      medMatches.forEach(match => {
        const med = match.replace(/(?:take|taking|medication|medicine)\s+/i, '').trim();
        if (med && !medications.includes(med)) medications.push(med);
      });
    }
    if (medications.length > 0) info.medications = medications;
    
    // Extract doctor
    const doctorMatch = voiceText.match(/dr\.?\s*([^.]+)/i) || voiceText.match(/doctor ([^.]+)/i);
    if (doctorMatch) info.doctor = doctorMatch[1].trim();
    
    // Build summary
    let summary = "Voice Input Summary:\n\n";
    
    if (info.name) summary += `Name: ${info.name}\n`;
    if (info.age) summary += `Age: ${info.age}\n`;
    if (info.address) summary += `Address: ${info.address}\n`;
    if (info.phone) summary += `Phone: ${info.phone}\n`;
    if (info.conditions && info.conditions.length > 0) {
      summary += `Medical Conditions: ${info.conditions.join(', ')}\n`;
    }
    if (info.medications && info.medications.length > 0) {
      summary += `Current Medications: ${info.medications.join(', ')}\n`;
    }
    if (info.doctor) summary += `Primary Doctor: ${info.doctor}\n`;
    
    // Add original voice text for reference
    summary += `\nOriginal Voice Input: "${voiceText}"`;
    
    return summary;
  };

  const clearRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl('');
    setTranscription('');
    setLiveTranscription('');
    setRecordingTime(0);
    setIsRecording(false);
    setIsListening(false);
    setIsTranscribing(false);
    setVoiceInputMode('manual');
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        
        // Check if this is a new patient who needs onboarding
        if (userData.role === 'patient' && !userData.profileComplete) {
          setShowOnboarding(true);
        } else {
          // Fetch user's data
          if (userData.role === 'patient') {
            const patientsResponse = await fetch(`${API_URL}/patients/${userData._id}`);
            if (patientsResponse.ok) {
              const patientList = await patientsResponse.json();
              if (patientList.length > 0) {
                await fetchPatientData(patientList[0]._id);
              }
            }
          } else {
            const patientsResponse = await fetch(`${API_URL}/patients/${userData._id}`);
            if (patientsResponse.ok) {
              const patientList = await patientsResponse.json();
              setPatients(patientList);
            }
          }
        }
      } else {
        const error = await response.json();
        setLoginError(error.detail || 'Login failed');
      }
    } catch (error) {
      setLoginError('Network error');
    }
  };

  // Handle signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    
    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          name: signupName,
          email: signupEmail
        })
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setShowOnboarding(true); // New users always go to onboarding
      } else {
        const error = await response.json();
        setSignupError(error.detail || 'Signup failed');
      }
    } catch (error) {
      setSignupError('Network error');
    }
  };

  // Handle onboarding submission
  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingLoading(true);
    setOnboardingError('');
    
    try {
      // Combine all input methods
      let combinedText = onboardingText;
      
      if (transcription) {
        combinedText += (combinedText ? '\n\n' : '') + `Voice Transcription: ${transcription}`;
      }
      
      // Prepare the data to send (compatible with our enhanced backend)
      const onboardingData = {
        raw_text_data: combinedText,
        voice_transcription: transcription || null,
        file_uploads: onboardingFile ? [onboardingFile.name] : []
      };
      
      const response = await fetch(`${API_URL}/patient/${user._id}/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onboardingData)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Check if AI extraction was successful
        if (result.ai_extracted_info && !result.ai_extracted_info.error) {
          setAiExtractedInfo(result.ai_extracted_info);
          setShowAiResults(true);
        } else {
          // If no AI extraction or error, proceed to dashboard
        setShowOnboarding(false);
        // Fetch the patient data after onboarding
        const patientsResponse = await fetch(`${API_URL}/patients/${user._id}`);
        if (patientsResponse.ok) {
          const patientList = await patientsResponse.json();
          if (patientList.length > 0) {
            await fetchPatientData(patientList[0]._id);
            }
          }
        }
      } else {
        const error = await response.json();
        setOnboardingError(error.detail || 'Onboarding failed');
      }
    } catch (error) {
      setOnboardingError('Network error');
    } finally {
      setOnboardingLoading(false);
    }
  };

  // Function to parse transcription and extract structured data
  const parseTranscription = (transcription: string): any => {
    const info: any = {};
    
    // Extract name
    const nameMatch = transcription.match(/Name:\s*([^\n]+)/);
    if (nameMatch) info.name = nameMatch[1].trim();
    
    // Extract age
    const ageMatch = transcription.match(/Age:\s*(\d+)/);
    if (ageMatch) info.age = parseInt(ageMatch[1]);
    
    // Extract address
    const addressMatch = transcription.match(/Address:\s*([^\n]+)/);
    if (addressMatch) info.address = addressMatch[1].trim();
    
    // Extract phone
    const phoneMatch = transcription.match(/Phone:\s*([^\n]+)/);
    if (phoneMatch) info.phone = phoneMatch[1].trim();
    
    // Extract medical conditions
    const conditionsMatch = transcription.match(/Medical Conditions:\s*([^\n]+)/);
    if (conditionsMatch) info.conditions = conditionsMatch[1].trim();
    
    // Extract medications
    const medicationsMatch = transcription.match(/Current Medications:\s*([^\n]+)/);
    if (medicationsMatch) info.medications = medicationsMatch[1].trim();
    
    // Extract doctor
    const doctorMatch = transcription.match(/Primary Doctor:\s*([^\n]+)/);
    if (doctorMatch) info.doctor = doctorMatch[1].trim();
    
    return info;
  };

  // Fetch patient data
  const fetchPatientData = async (patientId: string) => {
    try {
      // Fetch profile
      const profileResponse = await fetch(`${API_URL}/patient/${patientId}`);
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        console.log('Fetched patient profile:', profile);
        setPatientProfile(profile);
        const profileEditData = {
          name: profile.name || '',
          age: profile.age?.toString() || '',
          address: profile.address || '',
          phone: profile.phone || '',
          notes: profile.notes || ''
        };
        console.log('Setting profileEdit to:', profileEditData);
        setProfileEdit(profileEditData);
      }
      
      // Fetch onboarding data
      const onboardingResponse = await fetch(`${API_URL}/onboarding/${patientId}/latest`);
      if (onboardingResponse.ok) {
        const onboarding = await onboardingResponse.json();
        console.log('Fetched onboarding data:', onboarding);
        setOnboardingData(onboarding);
      }
      
      // Fetch medicines
      const medsResponse = await fetch(`${API_URL}/medicines/${patientId}`);
      if (medsResponse.ok) {
        const meds = await medsResponse.json();
        console.log('Fetched medicines:', meds);
        setMedicines(meds);
      }
      
      // Fetch appointments
      const appsResponse = await fetch(`${API_URL}/appointments/${patientId}`);
      if (appsResponse.ok) {
        const apps = await appsResponse.json();
        console.log('Fetched appointments:', apps);
        setAppointments(apps);
      }
      
      // Fetch logs
      const logsResponse = await fetch(`${API_URL}/logs/${patientId}`);
      if (logsResponse.ok) {
        const logs = await logsResponse.json();
        console.log('Fetched logs:', logs);
        setLogs(logs);
      }
      
      // Fetch reports
      const reportsResponse = await fetch(`${API_URL}/patient/${patientId}/reports`);
      if (reportsResponse.ok) {
        const reports = await reportsResponse.json();
        console.log('Fetched reports:', reports);
        setReports(reports);
      }
    } catch (error) {
      console.error('Error fetching patient data:', error);
    }
  };

  // Handle patient selection (for doctor/caregiver)
  const handleSelectPatient = (patient: any) => {
    setSelectedPatient(patient);
  };

  // Handle logout
  const handleLogout = () => {
    // Clear all auth states
    setUser(null);
    setUsername('');
    setPassword('');
    setLoginError('');
    setSignupError('');
    
    // Clear onboarding states
    setShowOnboarding(false);
    setOnboardingText('');
    setOnboardingFile(null);
    setOnboardingVoice(null);
    setOnboardingLoading(false);
    setOnboardingError('');
    
    // Clear voice recording states
    clearRecording();
    setVoiceInputMode('manual');
    
    // Clear dashboard states
    setPatients([]);
    setPatientProfile(null);
    setSelectedPatient(null);
    setActiveTab('profile');
    
    // Clear profile states
    setProfileEdit({
      name: '',
      age: '',
      address: '',
      phone: '',
      notes: ''
    });
    setProfileMsg('');
    setProfileLoading(false);
    
    // Clear reports states
    setReports([]);
    setReportMsg('');
    setReportLoading(false);
    
    // Clear medicines states
    setMedicines([]);
    setMedMsg('');
    setMedLoading(false);
    setMedForm({
      name: '',
      dosage: '',
      frequency: '',
      time: '',
      notes: ''
    });
    setMedEditId(null);
    
    // Clear appointments states
    setAppointments([]);
    setAppMsg('');
    setAppLoading(false);
    setAppForm({
      title: '',
      date: '',
      time: '',
      doctor: '',
      notes: ''
    });
    setAppEditId(null);
    
    // Clear logs and calendar states
    setLogs([]);
    setCalendarMonth(new Date());
    
    // Clear AI states
    setAiExtractedInfo(null);
    setShowAiResults(false);
    setOnboardingData(null);
    setMedicineRecommendations(null);
    setRecommendationsLoading(false);
    
    // Clear Voice Agent states
    setVoiceAgentActive(false);
    setVoiceAgentListening(false);
    setVoiceAgentTranscript('');
    setVoiceAgentResponse('');
    setVoiceAgentProcessing(false);
    setVoiceAgentHistory([]);
    
    // Clear file inputs
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (voiceInputRef.current) {
      voiceInputRef.current.value = '';
    }
    
    console.log('Logout completed - all states reset');
  };

  // Get AI medicine recommendations
  const getMedicineRecommendations = async () => {
    if (!patientProfile?._id) return;
    
    setRecommendationsLoading(true);
    try {
      const response = await fetch(`${API_URL}/patient/${patientProfile._id}/recommend-medicines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        setMedicineRecommendations(result);
      } else {
        console.error('Failed to get recommendations');
      }
    } catch (error) {
      console.error('Error getting recommendations:', error);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // NLX Voice Agent Functions
  const startVoiceAgent = () => {
    setVoiceAgentActive(true);
    setVoiceAgentHistory([]);
    setVoiceAgentTranscript('');
    setVoiceAgentResponse('');
  };

  const stopVoiceAgent = () => {
    setVoiceAgentActive(false);
    setVoiceAgentListening(false);
    setVoiceAgentProcessing(false);
  };

  const startVoiceAgentListening = () => {
    if (!voiceAgentActive) return;
    
    setVoiceAgentListening(true);
    setVoiceAgentTranscript('');
    
    // Initialize speech recognition for voice agent
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceAgentTranscript(transcript);
        processVoiceAgentInput(transcript);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Voice agent recognition error:', event.error);
        setVoiceAgentListening(false);
      };
      
      recognition.onend = () => {
        setVoiceAgentListening(false);
      };
      
      recognition.start();
    }
  };

  const processVoiceAgentInput = async (transcript: string) => {
    if (!patientProfile?._id) return;
    
    setVoiceAgentProcessing(true);
    
    // Add user message to history
    const updatedHistory = [...voiceAgentHistory, { role: 'user', content: transcript }];
    setVoiceAgentHistory(updatedHistory);
    
    try {
      const response = await fetch(`${API_URL}/voice-agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientProfile._id,
          message: transcript,
          history: updatedHistory
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setVoiceAgentResponse(result.response);
        
        // Add assistant response to history
        setVoiceAgentHistory([...updatedHistory, { role: 'assistant', content: result.response }]);
        
        // If actions were performed, refresh data
        if (result.actions_performed && result.actions_performed.length > 0) {
          await fetchPatientData(patientProfile._id);
        }
      } else {
        setVoiceAgentResponse('Sorry, I encountered an error. Please try again.');
      }
    } catch (error) {
      console.error('Error processing voice agent input:', error);
      setVoiceAgentResponse('Sorry, I encountered an error. Please try again.');
    } finally {
      setVoiceAgentProcessing(false);
    }
  };

  const clearVoiceAgentHistory = () => {
    setVoiceAgentHistory([]);
    setVoiceAgentTranscript('');
    setVoiceAgentResponse('');
  };

  // Profile handlers
  const handleProfileChange = (field: string, value: string) => {
    setProfileEdit(prev => ({ ...prev, [field]: value }));
  };

  const handleProfileSave = async () => {
    setProfileLoading(true);
    setProfileMsg('');
    
    const updateData = {
          name: profileEdit.name,
          age: profileEdit.age ? parseInt(profileEdit.age) : null,
          address: profileEdit.address,
          phone: profileEdit.phone,
          notes: profileEdit.notes
    };
    
    console.log('Saving profile with data:', updateData);
    console.log('Patient ID:', patientProfile._id);
    
    try {
      const response = await fetch(`${API_URL}/patient/${patientProfile._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      console.log('Profile save response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Profile save success:', result);
        setProfileMsg('Profile updated successfully!');
        await fetchPatientData(patientProfile._id);
      } else {
        const errorText = await response.text();
        console.error('Profile save failed:', errorText);
        setProfileMsg('Failed to update profile');
      }
    } catch (error) {
      console.error('Profile save network error:', error);
      setProfileMsg('Network error');
    } finally {
      setProfileLoading(false);
    }
  };

  // Report handlers
  const handleReportUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileInputRef.current?.files?.[0]) return;
    
    setReportLoading(true);
    setReportMsg('');
    
    const formData = new FormData();
    formData.append('file', fileInputRef.current.files[0]);
    
    try {
      const response = await fetch(`${API_URL}/patient/${patientProfile._id}/reports`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        setReportMsg('Report uploaded successfully!');
        fileInputRef.current.value = '';
        await fetchPatientData(patientProfile._id);
      } else {
        setReportMsg('Failed to upload report');
      }
    } catch (error) {
      setReportMsg('Network error');
    } finally {
      setReportLoading(false);
    }
  };

  const handleReportDelete = async (fileId: string) => {
    try {
      const response = await fetch(`${API_URL}/patient/${patientProfile._id}/reports/${fileId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchPatientData(patientProfile._id);
      }
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  };

  // Medicine handlers
  const handleMedSave = async () => {
    if (!medForm.name || !medForm.dosage || !medForm.frequency || !medForm.time) return;
    
    setMedLoading(true);
    setMedMsg('');
    
    try {
      const url = medEditId 
        ? `${API_URL}/medicines/${medEditId}`
        : `${API_URL}/medicines/${patientProfile._id}`;
      
      const method = medEditId ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(medForm)
      });
      
      if (response.ok) {
        setMedMsg(medEditId ? 'Medicine updated!' : 'Medicine added!');
        setMedForm({ name: '', dosage: '', frequency: '', time: '', notes: '' });
        setMedEditId(null);
        await fetchPatientData(patientProfile._id);
      } else {
        setMedMsg('Failed to save medicine');
      }
    } catch (error) {
      setMedMsg('Network error');
    } finally {
      setMedLoading(false);
    }
  };

  const handleMedDelete = async (med_id: string) => {
    try {
      const response = await fetch(`${API_URL}/medicines/${med_id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchPatientData(patientProfile._id);
      }
    } catch (error) {
      console.error('Error deleting medicine:', error);
    }
  };

  // Appointment handlers
  const handleAppSave = async () => {
    if (!appForm.title || !appForm.date || !appForm.time || !appForm.doctor) return;
    
    setAppLoading(true);
    setAppMsg('');
    
    try {
      const url = appEditId 
        ? `${API_URL}/appointments/${appEditId}`
        : `${API_URL}/appointments/${patientProfile._id}`;
      
      const method = appEditId ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appForm)
      });
      
      if (response.ok) {
        setAppMsg(appEditId ? 'Appointment updated!' : 'Appointment added!');
        setAppForm({ title: '', date: '', time: '', doctor: '', notes: '' });
        setAppEditId(null);
        await fetchPatientData(patientProfile._id);
      } else {
        setAppMsg('Failed to save appointment');
      }
    } catch (error) {
      setAppMsg('Network error');
    } finally {
      setAppLoading(false);
    }
  };

  const handleAppDelete = async (app_id: string) => {
    try {
      const response = await fetch(`${API_URL}/appointments/${app_id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchPatientData(patientProfile._id);
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
    }
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfWeek = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date: Date) => {
    // Check if date is valid before calling toISOString
    if (!date || isNaN(date.getTime())) {
      return '';
    }
    try {
    return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return '';
    }
  };

  // Debug profile data when profile tab is active
  useEffect(() => {
    if (activeTab === 'profile' && patientProfile) {
      console.log('Profile tab active - profileEdit state:', profileEdit);
      console.log('Patient profile data:', patientProfile);
    }
  }, [activeTab, profileEdit, patientProfile]);

  // Onboarding page
  if (showOnboarding) {
    return (
      <div className="login-page cool-bg">
        <div className="login-container">
          <h1>Welcome to CareMate!</h1>
          <p>Let's get to know you better. Please provide your information using any of the methods below:</p>
          
          <form onSubmit={handleOnboardingSubmit} className="onboarding-form">
            <div className="input-group">
              <label>Text Information:</label>
              <textarea
                value={onboardingText}
                onChange={(e) => setOnboardingText(e.target.value)}
                placeholder="Enter your information here (name, age, medical history, etc.)"
                rows={6}
                className="form-input"
              />
            </div>
            
            <div className="input-group">
              <label>Upload Medical Records (PDF/Image):</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setOnboardingFile(e.target.files?.[0] || null)}
                className="form-input"
              />
            </div>
            
            <div className="input-group">
              <label>Voice Input:</label>
              <div className="voice-recorder">
                {/* Voice recording button */}
                <div className="voice-controls-main">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`voice-btn ${isRecording ? 'recording' : ''}`}
                  disabled={isTranscribing}
                >
                  {isRecording ? (
                    <>
                      <span className="voice-icon">⏹️</span>
                      <span className="voice-text">Stop Recording ({formatTime(recordingTime)})</span>
                    </>
                  ) : (
                    <>
                      <span className="voice-icon">🎤</span>
                        <span className="voice-text">Try Voice Recording</span>
                    </>
                  )}
                </button>
                
                  <div className="voice-status">
                    {isRecording && isListening && <span className="status-listening">🎤 Listening...</span>}
                    {isRecording && !isListening && <span className="status-recording">🔴 Recording Audio</span>}
                    {!isRecording && isTranscribing && <span className="status-processing">🤖 Processing with Google...</span>}
                    {!isRecording && !isTranscribing && voiceInputMode === 'manual' && <span className="status-manual">✏️ Manual Input Mode</span>}
                  </div>
                </div>
                
                {/* Live transcription feedback */}
                {isListening && liveTranscription && (
                  <div className="live-transcription">
                    <label>Live Speech Recognition:</label>
                    <div className="live-text">{liveTranscription}</div>
                  </div>
                )}
                
                {/* Manual voice input */}
                <div className="manual-voice-input">
                  <label>Enter Your Information:</label>
                  <div className="voice-help-text">
                    💡 <strong>Instructions:</strong> Type your medical information naturally, as if you were talking to someone. 
                    Include your name, age, address, phone, medical conditions, medications, and doctor information.
                  </div>
                  <textarea
                    placeholder="Example: My name is John Doe, I'm 65 years old, I live at 123 Main Street, my phone is 555-1234, I have diabetes and hypertension, I take Metformin twice daily and Lisinopril in the morning, I see Dr. Smith every month for checkups"
                    value={liveTranscription}
                    onChange={(e) => setLiveTranscription(e.target.value)}
                    className="manual-input"
                    rows={4}
                  />
                </div>
                
                {/* Process and clear buttons */}
                  <div className="voice-controls">
                    <button
                      type="button"
                      onClick={transcribeAudio}
                      className="transcribe-btn"
                    disabled={isTranscribing || !liveTranscription.trim()}
                    >
                    {isTranscribing ? 'Processing...' : 'Extract Information'}
                    </button>
                  <button type="button" onClick={clearRecording} className="clear-btn">
                    Clear All
                    </button>
                  </div>
                
                {/* Processed information display */}
                {transcription && (
                  <div className="transcription">
                    <label>Extracted Information:</label>
                    <div className="transcription-text">{transcription}</div>
                  </div>
                )}
              </div>
            </div>
            
            {onboardingError && <div className="error-msg">{onboardingError}</div>}
            
            <button type="submit" className="submit-btn" disabled={onboardingLoading}>
              {onboardingLoading ? 'Processing...' : 'Complete Onboarding'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // AI Results page
  if (showAiResults && aiExtractedInfo) {
    return (
      <div className="login-page cool-bg">
        <div className="login-container">
          <h1>AI Analysis Complete! 🤖</h1>
          <p>Here's what we extracted from your information:</p>
          
          <div className="ai-results">
            <div className="result-section">
              <h3>Extracted Medical Information</h3>
              <div className="result-grid">
                {aiExtractedInfo.name && (
                  <div className="result-item">
                    <label>Name:</label>
                    <span>{aiExtractedInfo.name}</span>
                  </div>
                )}
                {aiExtractedInfo.age && (
                  <div className="result-item">
                    <label>Age:</label>
                    <span>{aiExtractedInfo.age}</span>
                  </div>
                )}
                {aiExtractedInfo.diagnosis && (
                  <div className="result-item">
                    <label>Diagnosis:</label>
                    <span>{aiExtractedInfo.diagnosis}</span>
                  </div>
                )}
                {aiExtractedInfo.medications && (
                  <div className="result-item">
                    <label>Medications:</label>
                    <span>{aiExtractedInfo.medications}</span>
                  </div>
                )}
                {aiExtractedInfo.allergies && (
                  <div className="result-item">
                    <label>Allergies:</label>
                    <span>{aiExtractedInfo.allergies}</span>
                  </div>
                )}
                {aiExtractedInfo.notes && (
                  <div className="result-item">
                    <label>Notes:</label>
                    <span>{aiExtractedInfo.notes}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="result-actions">
              <button 
                onClick={() => {
                  setShowAiResults(false);
                  // Fetch the patient data after onboarding
                  const patientsResponse = fetch(`${API_URL}/patients/${user._id}`);
                  if (patientsResponse) {
                    patientsResponse.then(response => {
                      if (response.ok) {
                        return response.json();
                      }
                    }).then(patientList => {
                      if (patientList && patientList.length > 0) {
                        fetchPatientData(patientList[0]._id);
                      }
                    });
                  }
                }} 
                className="submit-btn"
              >
                Continue to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login/Signup page
  if (!user) {
    return (
      <div className="login-page cool-bg">
        <div className="login-container">
          <h1>CareMate</h1>
          <p>AI Companion for Seniors</p>
          
          <div className="auth-toggle">
            <button 
              className={!isSignup ? 'active' : ''} 
              onClick={() => setIsSignup(false)}
            >
              Login
            </button>
            <button 
              className={isSignup ? 'active' : ''} 
              onClick={() => setIsSignup(true)}
            >
              Sign Up
            </button>
          </div>
          
          {isSignup ? (
            <form onSubmit={handleSignup} className="login-form">
              <div className="input-group">
                <label>Username:</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              
              <div className="input-group">
                <label>Password:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              
              <div className="input-group">
                <label>Full Name:</label>
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              
              <div className="input-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              
              {signupError && <div className="error-msg">{signupError}</div>}
              
              <button type="submit" className="submit-btn">Sign Up</button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="login-form">
              <div className="input-group">
                <label>Username:</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              
              <div className="input-group">
                <label>Password:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              
              {loginError && <div className="error-msg">{loginError}</div>}
              
              <button type="submit" className="submit-btn">Login</button>
            </form>
          )}
          
          <div className="demo-credentials">
            <h3>Demo Credentials:</h3>
            <p><strong>Patient:</strong> patjane / password123</p>
            <p><strong>Doctor:</strong> drsmith / password123</p>
            <p><strong>Caregiver:</strong> caregiver1 / password123</p>
          </div>
        </div>
      </div>
    );
  }

  // Patient Dashboard
  if (user.role === 'patient' && patientProfile) {
    return (
      <div className="dashboard-page cool-bg">
        <header className="dashboard-header">
          <div className="header-left">
            <h1>Welcome back, {user.name}!</h1>
          </div>
          <div className="header-right">
            <div className="user-menu">
              <button 
                className="user-menu-btn"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <span className="user-avatar">👤</span>
                <span className="username">{user.name}</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              {showUserMenu && (
                <div className="user-dropdown">
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      setActiveTab('profile');
                      setShowUserMenu(false);
                    }}
                  >
                    📋 Profile & Reports
                  </button>
                  <button 
                    className="dropdown-item logout-btn"
                    onClick={handleLogout}
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        
        <div className="dashboard-content">
          {/* Main Health Section */}
          <div className="health-main-section">
            <div className="health-calendar-section">
              <h2>Health Calendar</h2>
              <div className="calendar-controls">
                <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
                  ← Previous
                </button>
                <span className="current-month">
                  {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                  Next →
                </button>
              </div>
              
              <div className="calendar">
                <div className="calendar-header">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="calendar-day-header">{day}</div>
                  ))}
                </div>
                <div className="calendar-body">
                  {Array.from({ length: getFirstDayOfWeek(calendarMonth) }, (_, i) => (
                    <div key={`empty-${i}`} className="calendar-day empty"></div>
                  ))}
                  {Array.from({ length: getDaysInMonth(calendarMonth) }, (_, i) => {
                    const day = i + 1;
                    const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                    const dateStr = formatDate(date);
                    const today = new Date();
                    const isToday = formatDate(date) === formatDate(today);
                    
                    const dayMedicines = medicines.filter(med => {
                      try {
                        const medDate = new Date(med.date);
                        return formatDate(medDate) === dateStr && formatDate(medDate) !== '';
                      } catch (error) {
                        console.error('Invalid medicine date:', med.date);
                        return false;
                      }
                    });
                    
                    const dayAppointments = appointments.filter(app => {
                      try {
                        const appDate = new Date(app.date);
                        return formatDate(appDate) === dateStr && formatDate(appDate) !== '';
                      } catch (error) {
                        console.error('Invalid appointment date:', app.date);
                        return false;
                      }
                    });
                    
                    const dayLogs = logs.filter(log => {
                      try {
                        const logDate = new Date(log.date);
                        return formatDate(logDate) === dateStr && formatDate(logDate) !== '';
                      } catch (error) {
                        console.error('Invalid log date:', log.date);
                        return false;
                      }
                    });
                    
                    return (
                      <div key={day} className={`calendar-day ${isToday ? 'today' : ''}`}>
                        <div className="day-number">{day}</div>
                        {dayMedicines.length > 0 && (
                          <div className="day-medicines">
                            {dayMedicines.map(med => (
                              <div key={med._id} className="day-item medicine" title={`${med.name} - ${med.time}`}>
                                💊 {med.name}
                              </div>
                            ))}
                          </div>
                        )}
                        {dayAppointments.length > 0 && (
                          <div className="day-appointments">
                            {dayAppointments.map(app => (
                              <div key={app._id} className="day-item appointment" title={`${app.title} - ${app.time}`}>
                                📅 {app.title}
                              </div>
                            ))}
                          </div>
                        )}
                        {dayLogs.length > 0 && (
                          <div className="day-logs">
                            {dayLogs.map(log => (
                              <div key={log._id} className="day-item log" title={`${log.type} - ${log.time}`}>
                                ⚠️ {log.type === 'missed_medicine' ? 'Missed Med' : 'Missed Appt'}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* NLX Voice Agent Section */}
            <div className="voice-agent-section">
              <h2>🤖 AI Voice Assistant</h2>
              <p>Talk to me to add medicine reminders or doctor appointments!</p>
              
              {!voiceAgentActive ? (
          <button 
                  onClick={startVoiceAgent} 
                  className="voice-agent-start-btn"
          >
                  🎤 Start Voice Assistant
          </button>
              ) : (
                <div className="voice-agent-active">
                  <div className="voice-agent-controls">
          <button 
                      onClick={voiceAgentListening ? undefined : startVoiceAgentListening}
                      className={`voice-agent-listen-btn ${voiceAgentListening ? 'listening' : ''}`}
                      disabled={voiceAgentProcessing}
                    >
                      {voiceAgentListening ? '🎤 Listening...' : '🎤 Start Listening'}
                    </button>
                    <button 
                      onClick={stopVoiceAgent} 
                      className="voice-agent-stop-btn"
                    >
                      ⏹️ Stop Assistant
                    </button>
                    <button 
                      onClick={clearVoiceAgentHistory} 
                      className="voice-agent-clear-btn"
                    >
                      🗑️ Clear History
          </button>
        </div>
        
                  <div className="voice-agent-conversation">
                    {voiceAgentHistory.length > 0 && (
                      <div className="conversation-history">
                        {voiceAgentHistory.map((msg, index) => (
                          <div key={index} className={`conversation-message ${msg.role}`}>
                            <div className="message-role">{msg.role === 'user' ? '👤 You' : '🤖 Assistant'}</div>
                            <div className="message-content">{msg.content}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {voiceAgentProcessing && (
                      <div className="voice-agent-processing">
                        <div className="processing-indicator">🤖 Processing...</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="voice-agent-examples">
                    <h4>💡 Try saying:</h4>
                    <ul>
                      <li>"Add a medicine reminder for Metformin at 8 AM tomorrow"</li>
                      <li>"Schedule a doctor appointment with Dr. Smith on Friday at 2 PM"</li>
                      <li>"Remind me to take my blood pressure medication every morning"</li>
                      <li>"Book an appointment with Dr. Johnson next Tuesday at 10 AM"</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
            
            {/* Todo List Section */}
            <div className="todo-section">
              <h2>Today's Tasks</h2>
              <div className="todo-list">
                {/* Today's Medicines */}
                <div className="todo-category">
                  <h3>💊 Medicines to Take</h3>
                  {medicines.filter(med => {
                    try {
                      const today = new Date();
                      const medDate = new Date(med.date);
                      return formatDate(medDate) === formatDate(today) && formatDate(medDate) !== '';
                    } catch (error) {
                      console.error('Invalid medicine date in todo filter:', med.date);
                      return false;
                    }
                  }).map(med => (
                    <div key={med._id} className="todo-item medicine">
                      <span className="todo-time">{med.time}</span>
                      <span className="todo-text">{med.name} - {med.dosage}</span>
                      <span className="todo-frequency">{med.frequency}</span>
                    </div>
                  ))}
                  {medicines.filter(med => {
                    try {
                      const today = new Date();
                      const medDate = new Date(med.date);
                      return formatDate(medDate) === formatDate(today) && formatDate(medDate) !== '';
                    } catch (error) {
                      console.error('Invalid medicine date in todo filter:', med.date);
                      return false;
                    }
                  }).length === 0 && (
                    <div className="todo-empty">No medicines scheduled for today</div>
                  )}
                </div>
                
                {/* Today's Appointments */}
                <div className="todo-category">
                  <h3>📅 Appointments</h3>
                  {appointments.filter(app => {
                    try {
                      const today = new Date();
                      const appDate = new Date(app.date);
                      return formatDate(appDate) === formatDate(today) && formatDate(appDate) !== '';
                    } catch (error) {
                      console.error('Invalid appointment date in todo filter:', app.date);
                      return false;
                    }
                  }).map(app => (
                    <div key={app._id} className="todo-item appointment">
                      <span className="todo-time">{app.time}</span>
                      <span className="todo-text">{app.title}</span>
                      <span className="todo-doctor">Dr. {app.doctor}</span>
                    </div>
                  ))}
                  {appointments.filter(app => {
                    try {
                      const today = new Date();
                      const appDate = new Date(app.date);
                      return formatDate(appDate) === formatDate(today) && formatDate(appDate) !== '';
                    } catch (error) {
                      console.error('Invalid appointment date in todo filter:', app.date);
                      return false;
                    }
                  }).length === 0 && (
                    <div className="todo-empty">No appointments scheduled for today</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Profile & Reports Section (Hidden by default, shown when accessed via user menu) */}
        {activeTab === 'profile' && (
            <div className="profile-reports-section">
            <div className="profile-section">
              <h2>Profile Information</h2>
              <div className="profile-form">
                <div className="form-row">
                  <div className="input-group">
                    <label>Name:</label>
                    <input
                      type="text"
                      value={profileEdit.name}
                      onChange={(e) => handleProfileChange('name', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="input-group">
                    <label>Age:</label>
                    <input
                      type="number"
                      value={profileEdit.age}
                      onChange={(e) => handleProfileChange('age', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
                
                <div className="input-group">
                  <label>Address:</label>
                  <input
                    type="text"
                    value={profileEdit.address}
                    onChange={(e) => handleProfileChange('address', e.target.value)}
                    className="form-input"
                  />
                </div>
                
                <div className="input-group">
                  <label>Phone:</label>
                  <input
                    type="text"
                    value={profileEdit.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    className="form-input"
                  />
                </div>
                
                <div className="input-group">
                  <label>Medical Notes:</label>
                  <textarea
                    value={profileEdit.notes}
                    onChange={(e) => handleProfileChange('notes', e.target.value)}
                    className="form-input"
                    rows={3}
                  />
                </div>
                  
                  <button onClick={handleProfileSave} className="save-btn" disabled={profileLoading}>
                    {profileLoading ? 'Saving...' : 'Save Profile'}
                  </button>
                  {profileMsg && <div className="msg">{profileMsg}</div>}
              </div>
            </div>
            
            <div className="reports-section">
              <h2>Medical Reports</h2>
              <form onSubmit={handleReportUpload} className="upload-form">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="form-input"
                />
                <button type="submit" className="upload-btn" disabled={reportLoading}>
                  Upload
                </button>
              </form>
              {reportMsg && <div className="msg">{reportMsg}</div>}
              
              <div className="report-list">
                {reports.map((report) => (
                    <div key={report._id} className="report-item">
                      <div className="report-info">
                        <span className="report-name">{report.filename}</span>
                        <span className="report-date">{new Date(report.upload_date).toLocaleDateString()}</span>
        </div>
                    <div className="report-actions">
                        <a href={`${API_URL}/patient/${patientProfile._id}/reports/${report._id}`} 
                           download className="download-btn">📥</a>
                        <button onClick={() => handleReportDelete(report._id)} className="delete-btn">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
              {/* Onboarding Data Section */}
              {onboardingData && (
                <div className="onboarding-section">
                  <h2>AI-Extracted Information 🤖</h2>
                  <div className="onboarding-data">
                    {onboardingData.ai_extracted_info && (
                      <div className="ai-data-grid">
                        {onboardingData.ai_extracted_info.name && (
                          <div className="ai-data-item">
                            <label>Name:</label>
                            <span>{onboardingData.ai_extracted_info.name}</span>
                  </div>
                        )}
                        {onboardingData.ai_extracted_info.age && (
                          <div className="ai-data-item">
                            <label>Age:</label>
                            <span>{onboardingData.ai_extracted_info.age}</span>
                  </div>
                        )}
                        {onboardingData.ai_extracted_info.diagnosis && (
                          <div className="ai-data-item">
                            <label>Diagnosis:</label>
                            <span>{onboardingData.ai_extracted_info.diagnosis}</span>
                      </div>
                        )}
                        {onboardingData.ai_extracted_info.medications && (
                          <div className="ai-data-item">
                            <label>Medications:</label>
                            <span>{onboardingData.ai_extracted_info.medications}</span>
                      </div>
                        )}
                        {onboardingData.ai_extracted_info.allergies && (
                          <div className="ai-data-item">
                            <label>Allergies:</label>
                            <span>{onboardingData.ai_extracted_info.allergies}</span>
                    </div>
                        )}
                        {onboardingData.ai_extracted_info.notes && (
                          <div className="ai-data-item">
                            <label>Notes:</label>
                            <span>{onboardingData.ai_extracted_info.notes}</span>
                </div>
                        )}
              </div>
                    )}
                    
                    {onboardingData.raw_text_data && (
                      <div className="raw-data">
                        <h3>Original Input:</h3>
                        <div className="raw-text">{onboardingData.raw_text_data}</div>
                  </div>
                    )}
                  </div>
                      </div>
              )}
              
              {/* AI Medicine Recommendations Section */}
              <div className="recommendations-section">
                <h2>AI Medicine Recommendations 💊</h2>
                        <button 
                  onClick={getMedicineRecommendations} 
                  className="recommend-btn"
                  disabled={recommendationsLoading}
                >
                  {recommendationsLoading ? 'Getting Recommendations...' : 'Get AI Recommendations'}
                        </button>
                
                {medicineRecommendations && (
                  <div className="recommendations-data">
                    {medicineRecommendations.recommendations?.recommended_medicines && (
                      <div className="medicines-list">
                        <h3>Recommended Medicines:</h3>
                        {medicineRecommendations.recommendations.recommended_medicines.map((med: any, index: number) => (
                          <div key={index} className="medicine-item">
                            <h4>{med.name}</h4>
                            <div className="medicine-details">
                              <p><strong>Dosage:</strong> {med.dosage}</p>
                              <p><strong>Frequency:</strong> {med.frequency}</p>
                              <p><strong>Time:</strong> {med.time}</p>
                              <p><strong>Reason:</strong> {med.reason}</p>
                              {med.notes && <p><strong>Notes:</strong> {med.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                    )}
                    
                    {medicineRecommendations.recommendations?.general_recommendations && (
                      <div className="general-recommendations">
                        <h3>General Recommendations:</h3>
                        <p>{medicineRecommendations.recommendations.general_recommendations}</p>
          </div>
        )}
        
                    {medicineRecommendations.recommendations?.warnings && (
                      <div className="warnings">
                        <h3>Warnings:</h3>
                        <p>{medicineRecommendations.recommendations.warnings}</p>
              </div>
                    )}
                    
                    {medicineRecommendations.recommendations?.follow_up && (
                      <div className="follow-up">
                        <h3>Follow-up:</h3>
                        <p>{medicineRecommendations.recommendations.follow_up}</p>
                            </div>
                          )}
                            </div>
                          )}
            </div>
          </div>
        )}
      </div>
      </div>
    );
  }

  // Doctor/Caregiver Dashboard
  if ((user.role === 'doctor' || user.role === 'caregiver')) {
    if (selectedPatient) {
      // Show selected patient's health tab (read-only)
      return (
        <div className="dashboard-page cool-bg">
          <header className="dashboard-header">
            <h1>{user.name} - Patient: {selectedPatient.name}</h1>
            <button onClick={() => setSelectedPatient(null)} className="submit-btn">Back to Patient List</button>
          </header>
          
          <div className="dashboard-content">
            <div className="calendar-section">
              <h2>Health Calendar - {selectedPatient.name} - {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
              
              <div className="calendar-header">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>
              
              {(() => {
                const daysInMonth = getDaysInMonth(calendarMonth);
                const firstDay = getFirstDayOfWeek(calendarMonth);
                const weeks = [];
                let day = 1;
                
                for (let week = 0; day <= daysInMonth; week++) {
                  const weekDays = [];
                  for (let i = 0; i < 7; i++) {
                    if ((week === 0 && i < firstDay) || day > daysInMonth) {
                      weekDays.push(<div key={`empty-${week}-${i}`} className="calendar-day empty"></div>);
                    } else {
                      const currentDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                      const dateStr = formatDate(currentDate);
                      
                      const dayMeds = medicines.filter(med => {
                        // Simple logic: show all meds for now
                        return true;
                      });
                      
                      const dayApps = appointments.filter(app => app.date === dateStr);
                      const dayLogs = logs.filter(log => log.date === dateStr);
                      
                      weekDays.push(
                        <div key={day} className="calendar-day">
                          <div className="date-number">{day}</div>
                          {dayMeds.length > 0 && (
                            <div className="day-meds">
                              {dayMeds.slice(0, 2).map((med, idx) => (
                                <div key={idx} className="day-item med">💊 {med.name}</div>
                              ))}
                              {dayMeds.length > 2 && <div className="day-item more">+{dayMeds.length - 2} more</div>}
                            </div>
                          )}
                          {dayApps.length > 0 && (
                            <div className="day-apps">
                              {dayApps.slice(0, 2).map((app, idx) => (
                                <div key={idx} className="day-item app">📅 {app.title}</div>
                              ))}
                              {dayApps.length > 2 && <div className="day-item more">+{dayApps.length - 2} more</div>}
                            </div>
                          )}
                          {dayLogs.length > 0 && (
                            <div className="day-logs">
                              {dayLogs.map((log, idx) => (
                                <div key={idx} className="day-item log missed">⚠️ {log.type === 'missed_medicine' ? `Missed ${log.medicine}` : `Missed ${log.appointment}`}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                      day++;
                    }
                  }
                  weeks.push(<div key={week} className="calendar-row">{weekDays}</div>);
                }
                return weeks;
              })()}
            </div>
          </div>
        </div>
      );
    } else {
      // Show list of patients
      return (
        <div className="dashboard-page cool-bg">
          <header className="dashboard-header">
            <h1>Welcome, {user.name}!</h1>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </header>
          
          <div className="dashboard-content">
            <h2>Your Patients</h2>
            <div className="patient-list">
              {patients.map((patient) => (
                <div key={patient._id} className="patient-item">
                  <div className="patient-info">
                    <h3>{patient.name}</h3>
                    <p>Age: {patient.age}</p>
                    <p>Phone: {patient.phone}</p>
                    {patient.notes && <p>Notes: {patient.notes}</p>}
                  </div>
                  <button 
                    onClick={() => handleSelectPatient(patient)}
                    className="submit-btn"
                  >
                    View Health
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
  }

  return <div>Loading...</div>;
}

export default App;
