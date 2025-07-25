import React, { useState, useRef, useEffect } from 'react';
import './App.css';

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
  
  // Dashboard states
  const [patients, setPatients] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'reports' | 'health'>('profile');
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
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch patient data when selected patient changes (for doctor/caregiver view)
  useEffect(() => {
    if (user && (user.role === 'doctor' || user.role === 'caregiver') && selectedPatient) {
      fetchPatientData(selectedPatient._id);
    }
  }, [user, selectedPatient]);

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const transcribeAudio = async () => {
    if (!audioBlob) return;
    
    setIsTranscribing(true);
    try {
      // For now, we'll simulate transcription
      // In a real app, you'd send the audio to a speech-to-text service
      setTimeout(() => {
        setTranscription("This is a simulated transcription of your voice recording. In a real application, this would be processed by a speech-to-text service like Google Speech-to-Text, Azure Speech Services, or OpenAI Whisper.");
        setIsTranscribing(false);
      }, 2000);
      
      // Example of how you'd send to a real API:
      // const formData = new FormData();
      // formData.append('audio', audioBlob, 'recording.wav');
      // const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
      // const result = await response.json();
      // setTranscription(result.text);
      
    } catch (error) {
      console.error('Error transcribing audio:', error);
      setIsTranscribing(false);
    }
  };

  const clearRecording = () => {
    setAudioBlob(null);
    setAudioUrl('');
    setTranscription('');
    setRecordingTime(0);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
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
      
      // Prepare the data to send
      const onboardingData = {
        textData: combinedText,
        summary: `Patient information provided via onboarding. Text: ${combinedText}`
      };
      
      const response = await fetch(`${API_URL}/patient/${user._id}/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onboardingData)
      });
      
      if (response.ok) {
        setShowOnboarding(false);
        // Fetch the patient data after onboarding
        const patientsResponse = await fetch(`${API_URL}/patients/${user._id}`);
        if (patientsResponse.ok) {
          const patientList = await patientsResponse.json();
          if (patientList.length > 0) {
            await fetchPatientData(patientList[0]._id);
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

  // Fetch patient data
  const fetchPatientData = async (patientId: string) => {
    try {
      // Fetch profile
      const profileResponse = await fetch(`${API_URL}/patient/${patientId}`);
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        setPatientProfile(profile);
        setProfileEdit({
          name: profile.name || '',
          age: profile.age?.toString() || '',
          address: profile.address || '',
          phone: profile.phone || '',
          notes: profile.notes || ''
        });
      }
      
      // Fetch medicines
      const medsResponse = await fetch(`${API_URL}/medicines/${patientId}`);
      if (medsResponse.ok) {
        const meds = await medsResponse.json();
        setMedicines(meds);
      }
      
      // Fetch appointments
      const appsResponse = await fetch(`${API_URL}/appointments/${patientId}`);
      if (appsResponse.ok) {
        const apps = await appsResponse.json();
        setAppointments(apps);
      }
      
      // Fetch logs
      const logsResponse = await fetch(`${API_URL}/logs/${patientId}`);
      if (logsResponse.ok) {
        const logs = await logsResponse.json();
        setLogs(logs);
      }
      
      // Fetch reports
      const reportsResponse = await fetch(`${API_URL}/patient/${patientId}/reports`);
      if (reportsResponse.ok) {
        const reports = await reportsResponse.json();
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
    setUser(null);
    setUsername('');
    setPassword('');
    setLoginError('');
    setSignupError('');
    setShowOnboarding(false);
    setPatients([]);
    setPatientProfile(null);
    setSelectedPatient(null);
    setActiveTab('profile');
    clearRecording();
  };

  // Profile handlers
  const handleProfileChange = (field: string, value: string) => {
    setProfileEdit(prev => ({ ...prev, [field]: value }));
  };

  const handleProfileSave = async () => {
    setProfileLoading(true);
    setProfileMsg('');
    
    try {
      const response = await fetch(`${API_URL}/patient/${patientProfile._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileEdit.name,
          age: profileEdit.age ? parseInt(profileEdit.age) : null,
          address: profileEdit.address,
          phone: profileEdit.phone,
          notes: profileEdit.notes
        })
      });
      
      if (response.ok) {
        setProfileMsg('Profile updated successfully!');
        await fetchPatientData(patientProfile._id);
      } else {
        setProfileMsg('Failed to update profile');
      }
    } catch (error) {
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
    return date.toISOString().split('T')[0];
  };

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
              <label>Voice Recording:</label>
              <div className="voice-recorder">
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
                      <span className="voice-text">Start Recording</span>
                    </>
                  )}
                </button>
                
                {audioUrl && (
                  <div className="voice-controls">
                    <audio controls src={audioUrl} className="audio-player" />
                    <button
                      type="button"
                      onClick={transcribeAudio}
                      className="transcribe-btn"
                      disabled={isTranscribing}
                    >
                      {isTranscribing ? 'Transcribing...' : 'Transcribe'}
                    </button>
                    <button
                      type="button"
                      onClick={clearRecording}
                      className="clear-btn"
                    >
                      Clear
                    </button>
                  </div>
                )}
                
                {transcription && (
                  <div className="transcription">
                    <label>Transcription:</label>
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
          <h1>Welcome, {user.name}!</h1>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </header>
        
        <div className="tab-bar">
          <button 
            className={activeTab === 'profile' ? 'tab active' : 'tab'} 
            onClick={() => setActiveTab('profile')}
          >
            Profile & Reports
          </button>
          <button 
            className={activeTab === 'health' ? 'tab active' : 'tab'} 
            onClick={() => setActiveTab('health')}
          >
            Health
          </button>
        </div>
        
        {activeTab === 'profile' && (
          <div className="dashboard-content">
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
                  <div key={report.file_id} className="report-item">
                    <span>{report.filename}</span>
                    <div className="report-actions">
                      <button 
                        onClick={() => window.open(`${API_URL}/patient/${patientProfile._id}/reports/${report.file_id}`)}
                        className="icon-btn edit"
                      >
                        📥
                      </button>
                      <button 
                        onClick={() => handleReportDelete(report.file_id)}
                        className="icon-btn delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="health-lists">
              <div className="medicines-section">
                <h2>Medicines</h2>
                <form onSubmit={(e) => { e.preventDefault(); handleMedSave(); }} className="med-form">
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Medicine name"
                      value={medForm.name}
                      onChange={(e) => setMedForm(prev => ({ ...prev, name: e.target.value }))}
                      className="form-input"
                    />
                    <input
                      type="text"
                      placeholder="Dosage"
                      value={medForm.dosage}
                      onChange={(e) => setMedForm(prev => ({ ...prev, dosage: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Frequency"
                      value={medForm.frequency}
                      onChange={(e) => setMedForm(prev => ({ ...prev, frequency: e.target.value }))}
                      className="form-input"
                    />
                    <input
                      type="text"
                      placeholder="Time"
                      value={medForm.time}
                      onChange={(e) => setMedForm(prev => ({ ...prev, time: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Notes"
                    value={medForm.notes}
                    onChange={(e) => setMedForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="form-input"
                  />
                  <button type="submit" className="icon-btn add" disabled={medLoading}>
                    <span role="img" aria-label="add">+</span>
                  </button>
                </form>
                {medMsg && <div className="msg">{medMsg}</div>}
                
                <div className="med-list">
                  {medicines.map((med) => (
                    <div key={med._id} className="med-item">
                      <div className="med-info">
                        <strong>{med.name}</strong> - {med.dosage} - {med.frequency} - {med.time}
                        {med.notes && <div className="med-notes">{med.notes}</div>}
                      </div>
                      <div className="med-actions">
                        <button 
                          onClick={() => {
                            setMedForm({
                              name: med.name,
                              dosage: med.dosage,
                              frequency: med.frequency,
                              time: med.time,
                              notes: med.notes || ''
                            });
                            setMedEditId(med._id);
                          }}
                          className="icon-btn edit"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleMedDelete(med._id)}
                          className="icon-btn delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="appointments-section">
                <h2>Appointments</h2>
                <form onSubmit={(e) => { e.preventDefault(); handleAppSave(); }} className="app-form">
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Appointment title"
                      value={appForm.title}
                      onChange={(e) => setAppForm(prev => ({ ...prev, title: e.target.value }))}
                      className="form-input"
                    />
                    <input
                      type="date"
                      value={appForm.date}
                      onChange={(e) => setAppForm(prev => ({ ...prev, date: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="time"
                      value={appForm.time}
                      onChange={(e) => setAppForm(prev => ({ ...prev, time: e.target.value }))}
                      className="form-input"
                    />
                    <input
                      type="text"
                      placeholder="Doctor"
                      value={appForm.doctor}
                      onChange={(e) => setAppForm(prev => ({ ...prev, doctor: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Notes"
                    value={appForm.notes}
                    onChange={(e) => setAppForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="form-input"
                  />
                  <button type="submit" className="icon-btn add" disabled={appLoading}>
                    <span role="img" aria-label="add">+</span>
                  </button>
                </form>
                {appMsg && <div className="msg">{appMsg}</div>}
                
                <div className="app-list">
                  {appointments.map((app) => (
                    <div key={app._id} className="app-item">
                      <div className="app-info">
                        <strong>{app.title}</strong> - {app.date} at {app.time} with {app.doctor}
                        {app.notes && <div className="app-notes">{app.notes}</div>}
                      </div>
                      <div className="app-actions">
                        <button 
                          onClick={() => {
                            setAppForm({
                              title: app.title,
                              date: app.date,
                              time: app.time,
                              doctor: app.doctor,
                              notes: app.notes || ''
                            });
                            setAppEditId(app._id);
                          }}
                          className="icon-btn edit"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleAppDelete(app._id)}
                          className="icon-btn delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="center-btn-row">
              <button className="submit-btn" onClick={handleProfileSave} disabled={profileLoading}>
                Save
              </button>
            </div>
          </div>
        )}
        
        {activeTab === 'health' && (
          <div className="dashboard-content">
            <div className="calendar-section">
              <h2>Health Calendar - {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
              
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
        )}
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
